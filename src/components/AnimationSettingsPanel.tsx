import { useEffect, useRef, useState } from 'react';
import { durationLimits } from '../animation/settings';
import { DurationKey, formatSeconds, parseSecondsInput } from '../animation/settingsInput';
import { useAnimationSettings } from '../animation/useAnimationSettings';
import { useBackgroundStatus } from '../context/useBackgroundStatus';

// GM-only: shown from the gear button in the top row. Writes go to Room
// metadata, which the background page on every client already follows.
export const AnimationSettingsPanel = () => {
    const { settings, writable, loaded, save } = useAnimationSettings();
    const disabled = !writable;
    const backgroundMissing = useBackgroundStatus((store) => store.status) === 'missing';

    const saveOrLog = (change: Parameters<typeof save>[0]) =>
        save(change).catch((error: unknown) => {
            console.error('[Views] could not save animation settings', error);
            throw error;
        });

    return (
        <div className="filter text-xs">
            {/* Settings stay editable: they live in the Room, and other clients' background pages still use them. */}
            {backgroundMissing && (
                <div className="background-notice" role="status">
                    Views' background task is absent, so this device uses the default animation. Changes
                    still apply to other players.
                </div>
            )}
            <DurationField
                id="anim-functional"
                label="Jump duration"
                durationKey="functionalMs"
                step="0.01"
                savedMs={settings.functionalMs}
                disabled={disabled}
                onCommit={(ms) => saveOrLog({ functionalMs: ms })}
            />
            <DurationField
                id="anim-cinematic"
                label="Cinematic duration"
                durationKey="cinematicMs"
                step="0.1"
                savedMs={settings.cinematicMs}
                disabled={disabled}
                onCommit={(ms) => saveOrLog({ cinematicMs: ms })}
            />
            <div className="flex items-center justify-between gap-2">
                <span id="anim-ease-in-label">Cinematic ease-in</span>
                <label className="switch">
                    <input
                        type="checkbox"
                        checked={settings.cinematicEaseIn}
                        disabled={disabled}
                        onChange={(ev) => {
                            saveOrLog({ cinematicEaseIn: ev.target.checked }).catch(() => undefined);
                        }}
                        aria-labelledby="anim-ease-in-label"
                    />
                    <span
                        className="slider round"
                        style={
                            settings.cinematicEaseIn
                                ? { backgroundColor: 'var(--color-lavender)', borderColor: 'var(--color-lavender)' }
                                : { borderColor: 'var(--color-lavender)' }
                        }></span>
                </label>
            </div>
            <div className="flex items-center justify-between gap-2">
                <span id="anim-confirm-label">Ask players to confirm each Go</span>
                <label className="switch">
                    <input
                        type="checkbox"
                        checked={settings.cinematicConfirm}
                        disabled={disabled}
                        onChange={(ev) => {
                            saveOrLog({ cinematicConfirm: ev.target.checked }).catch(() => undefined);
                        }}
                        aria-labelledby="anim-confirm-label"
                    />
                    <span
                        className="slider round"
                        style={
                            settings.cinematicConfirm
                                ? { backgroundColor: 'var(--color-lavender)', borderColor: 'var(--color-lavender)' }
                                : { borderColor: 'var(--color-lavender)' }
                        }></span>
                </label>
            </div>
            {loaded && !writable ? (
                <div className="background-notice" role="status">
                    These settings were saved by a newer version of Views and can't be changed here.
                </div>
            ) : (
                <div className="text-subtext0">Applies to everyone in the Room.</div>
            )}
        </div>
    );
};

interface DurationFieldProps {
    id: string;
    label: string;
    durationKey: DurationKey;
    step: string;
    savedMs: number;
    disabled: boolean;
    /** Rejects if the save failed; the field then shows the saved value again. */
    onCommit: (ms: number) => Promise<void>;
}

const DurationField = ({ id, label, durationKey, step, savedMs, disabled, onCommit }: DurationFieldProps) => {
    const [draft, setDraft] = useState(() => formatSeconds(savedMs));
    const editing = useRef(false);
    // Escape blurs the field, and blur commits: this tells that commit to discard.
    const reverting = useRef(false);
    const { min, max } = durationLimits[durationKey];

    // Follow changes saved elsewhere (another GM, or the clamped echo of our
    // own save), but never overwrite what the GM is in the middle of typing.
    useEffect(() => {
        if (!editing.current) setDraft(formatSeconds(savedMs));
    }, [savedMs]);

    const commit = () => {
        editing.current = false;
        const ms = reverting.current ? null : parseSecondsInput(draft, durationKey);
        reverting.current = false;
        if (ms === null) {
            setDraft(formatSeconds(savedMs));
            return;
        }
        setDraft(formatSeconds(ms));
        if (ms !== savedMs) onCommit(ms).catch(() => setDraft(formatSeconds(savedMs)));
    };

    return (
        <div className="flex items-center justify-between gap-2">
            <label htmlFor={id}>{label}</label>
            <span className="flex items-center gap-1">
                <input
                    id={id}
                    type="number"
                    inputMode="decimal"
                    className="w-16!"
                    min={min / 1000}
                    max={max / 1000}
                    step={step}
                    value={draft}
                    disabled={disabled}
                    onFocus={() => {
                        editing.current = true;
                    }}
                    onChange={(ev) => setDraft(ev.target.value)}
                    onBlur={commit}
                    onKeyDown={(ev) => {
                        if (ev.key === 'Enter') ev.currentTarget.blur();
                        if (ev.key === 'Escape') {
                            reverting.current = true;
                            ev.currentTarget.blur();
                        }
                    }}
                />
                s
            </span>
        </div>
    );
};
