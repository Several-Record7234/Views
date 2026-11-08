// Popover state for Cinematic Mode (GM only): the A and B slots, the running
// shot (so Stop can name it) and a status notice. Slots live in React state:
// a closed popover's iframe stays loaded, so they survive a close, not a reload.
import OBR from '@owlbear-rodeo/sdk';
import { useEffect, useRef, useState } from 'react';
import { StarredBox, StarredLegacy } from '../helper/types';
import { useAnimationSettings } from '../animation/useAnimationSettings';
import {
    CinematicSlot,
    captureCurrentView,
    playCinematic,
    releaseSyncView,
    resolveSlot,
    stopCinematic,
} from './cinematic';

/** `syncViewPaused` marks the one notice that clears itself when Sync View comes back on. */
type Notice = { tone: 'info' | 'error'; text: string; syncViewPaused?: true };
type SlotName = 'start' | 'end';

const sameSlot = (a: CinematicSlot | null, b: CinematicSlot | null) =>
    a?.kind === 'preset' && b?.kind === 'preset' && a.presetId === b.presetId;

export const useCinematic = (presets: ReadonlyArray<StarredBox | StarredLegacy>) => {
    const { settings } = useAnimationSettings();
    const [slots, setSlots] = useState<Record<SlotName, CinematicSlot | null>>({ start: null, end: null });
    const [runningShotId, setRunningShotId] = useState<string | null>(null);
    const [notice, setNotice] = useState<Notice | null>(null);
    const runningTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(() => () => {
        if (runningTimer.current) clearTimeout(runningTimer.current);
    }, []);

    // The background page re-latches Sync View when the shot ends (completed,
    // stopped or replaced); the "paused" note goes exactly then, whatever the timing.
    useEffect(
        () =>
            OBR.player.onChange((player) => {
                if (player.syncView) setNotice((prev) => (prev?.syncViewPaused ? null : prev));
            }),
        [],
    );

    // One preset cannot fill both slots: picking it for one empties the other.
    const assign = (name: SlotName, slot: CinematicSlot) =>
        setSlots((prev) => {
            const other: SlotName = name === 'start' ? 'end' : 'start';
            return { ...prev, [name]: slot, [other]: sameSlot(prev[other], slot) ? null : prev[other] };
        });

    const setPreset = (name: SlotName, presetId: string) => assign(name, { kind: 'preset', presetId });

    // Reverses the shot. Matters most for a Captured view, which no preset row can re-pick.
    const swap = () => setSlots((prev) => ({ start: prev.end, end: prev.start }));

    const capture = async (name: SlotName) => {
        try {
            assign(name, { kind: 'captured', box: await captureCurrentView() });
        } catch (error) {
            console.error('[Views] could not capture the current view', error);
            setNotice({ tone: 'error', text: 'Could not capture the current view.' });
        }
    };

    const labelOf = (slot: CinematicSlot | null): string | null => {
        if (!slot) return null;
        if (slot.kind === 'captured') return 'Captured view';
        return presets.find(({ id }) => id === slot.presetId)?.name ?? null;
    };

    const slotOf = (presetId: string): SlotName | null => {
        if (slots.start?.kind === 'preset' && slots.start.presetId === presetId) return 'start';
        if (slots.end?.kind === 'preset' && slots.end.presetId === presetId) return 'end';
        return null;
    };

    const play = async (audience: 'preview' | 'everyone') => {
        if (!slots.start || !slots.end) return;
        try {
            const [from, to] = await Promise.all([resolveSlot(slots.start, presets), resolveSlot(slots.end, presets)]);
            if (!from || !to) {
                setNotice({ tone: 'error', text: 'A picked preset has been deleted. Choose another.' });
                return;
            }
            // Before ANY shot, Preview included: with Sync View on, the players
            // would follow even a Preview, frame by frame.
            const released = await releaseSyncView();
            const shotId = await playCinematic(from, to, settings, audience, released);
            setNotice(
                released ? { tone: 'info', text: 'Sync View paused for the shot.', syncViewPaused: true } : null,
            );
            setRunningShotId(shotId);
            if (runningTimer.current) clearTimeout(runningTimer.current);
            runningTimer.current = setTimeout(() => setRunningShotId(null), settings.cinematicMs);
        } catch (error) {
            console.error('[Views] could not start the Cinematic shot', error);
            setNotice({ tone: 'error', text: 'Could not start the shot.' });
        }
    };

    const stop = async () => {
        if (!runningShotId) return;
        try {
            await stopCinematic(runningShotId);
            setRunningShotId(null);
        } catch (error) {
            console.error('[Views] could not stop the Cinematic shot', error);
            setNotice({ tone: 'error', text: 'Could not stop the shot.' });
        }
    };

    return {
        startLabel: labelOf(slots.start),
        endLabel: labelOf(slots.end),
        slotOf,
        setPreset,
        swap,
        capture,
        preview: () => play('preview'),
        go: () => play('everyone'),
        stop,
        canStop: runningShotId !== null,
        notice,
    };
};
