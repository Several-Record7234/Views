// Popover side of Cinematic Mode (GM only). Preview plays on this client
// alone (LOCAL); Go and Stop are one ALL broadcast each, which also reaches our
// own background page. Every client's background page animates locally.
import OBR from '@owlbear-rodeo/sdk';
import { Box, framedBox } from '../animation/curve';
import { AnimationSettings } from '../animation/settings';
import {
    CinematicShotMessage,
    CinematicStopMessage,
    cinematicChannel,
} from '../animation/cinematicProtocol';
import { StarredBox, StarredLegacy, isStarredBox } from '../helper/types';
import { legacyTransformToBox } from './viewportHelpers';

export type CinematicSlot =
    | { kind: 'preset'; presetId: string }
    /** "Current view", snapshotted when it was picked so the GM can pan away to prepare. */
    | { kind: 'captured'; box: Box };

const normalise = ({ min, max }: Box): Box => ({
    min: { x: Math.min(min.x, max.x), y: Math.min(min.y, max.y) },
    max: { x: Math.max(min.x, max.x), y: Math.max(min.y, max.y) },
});

export const captureCurrentView = async (): Promise<Box> => {
    const [width, height] = await Promise.all([OBR.viewport.getWidth(), OBR.viewport.getHeight()]);
    const [min, max] = await Promise.all([
        OBR.viewport.inverseTransformPoint({ x: 0, y: 0 }),
        OBR.viewport.inverseTransformPoint({ x: width, y: height }),
    ]);
    return { min, max };
};

/**
 * World box for a slot, or null if its preset has since been deleted: the area
 * the GM's own viewport shows for it, not the bare preset box. Each client fits
 * that, so everyone sees at least the GM's framing, and a player finishes on
 * exactly the area the GM's Sync View re-latch then pushes, so there is no
 * end-of-shot correction (measured as a visible eased jolt, 2026-11-08). A legacy
 * preset is a transform, which already IS such an area (the migration's conversion).
 */
export const resolveSlot = async (
    slot: CinematicSlot,
    presets: ReadonlyArray<StarredBox | StarredLegacy>,
): Promise<Box | null> => {
    const [width, height] = await Promise.all([OBR.viewport.getWidth(), OBR.viewport.getHeight()]);
    const size = { width, height };
    if (slot.kind === 'captured') return framedBox(normalise(slot.box), size);
    const preset = presets.find(({ id }) => id === slot.presetId);
    if (!preset) return null;
    if (isStarredBox(preset)) return framedBox(normalise(preset.boundingCorners), size);
    return normalise(legacyTransformToBox(preset.transform, size));
};

/**
 * With Sync View latched on, OBR mirrors the GM's viewport to the players, so it
 * would stream our animation (~10 messages/s, measured) and fight each client's
 * own copy. Turns it off before a shot; returns whether it had been on, so the
 * background page can turn it back on when the shot ends.
 */
export const releaseSyncView = async (): Promise<boolean> => {
    if (!(await OBR.player.getSyncView())) return false;
    await OBR.player.setSyncView(false);
    return true;
};

/**
 * `shotId` is chosen by the caller so a confirmation monitor can be in place
 * before the shot goes out. `confirm` asks every other client to reply when it ends.
 */
export const playCinematic = async (
    shotId: string,
    from: Box,
    to: Box,
    settings: AnimationSettings,
    audience: 'preview' | 'everyone',
    resumeSyncView: boolean,
    confirm: boolean,
): Promise<void> => {
    const message: CinematicShotMessage = {
        kind: 'shot',
        id: shotId,
        from,
        to,
        durationMs: settings.cinematicMs,
        easeIn: settings.cinematicEaseIn,
        resumeSyncView,
        confirm,
    };
    await OBR.broadcast.sendMessage(cinematicChannel, message, {
        destination: audience === 'preview' ? 'LOCAL' : 'ALL',
    });
};

/** ALL, so it also halts a Preview on this client; other clients ignore an id they are not playing. */
export const stopCinematic = async (shotId: string): Promise<void> => {
    const message: CinematicStopMessage = { kind: 'stop', id: shotId };
    await OBR.broadcast.sendMessage(cinematicChannel, message, { destination: 'ALL' });
};
