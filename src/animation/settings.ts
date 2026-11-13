// GM-controlled animation settings, stored compactly in Room metadata.
// Room metadata is shared by every extension in the Room (16kB total), so
// fields are written under one-letter keys. Room metadata is writable by any
// client; these settings only shape animation, so that is an accepted risk.

export const animationSettingsId = 'dev.views/anim';
const FORMAT_VERSION = 1;

export interface AnimationSettings {
    functionalMs: number;
    cinematicMs: number;
    cinematicEaseIn: boolean;
    /** Players confirm each Go to the GM's monitor (1 + N messages per Go, so opt-in). */
    cinematicConfirm: boolean;
}

// Typed against the interface, so adding a field fails to compile until it has a key.
const shortKeys: Record<keyof AnimationSettings, string> = {
    functionalMs: 'f',
    cinematicMs: 'd',
    cinematicEaseIn: 'i',
    cinematicConfirm: 'c',
};
const VERSION_KEY = 'v';

export const defaultAnimationSettings: AnimationSettings = {
    // Matches native animateTo's curve (see curve.ts); confirmed by feel 2026-11-07.
    functionalMs: 540,
    cinematicMs: 3000,
    cinematicEaseIn: true,
    cinematicConfirm: false,
};

export const durationLimits = {
    functionalMs: { min: 100, max: 2000 },
    cinematicMs: { min: 500, max: 15000 },
} as const;

const clampDuration = (value: unknown, key: keyof typeof durationLimits): number => {
    const { min, max } = durationLimits[key];
    if (typeof value !== 'number' || !Number.isFinite(value)) return defaultAnimationSettings[key];
    return Math.round(Math.min(max, Math.max(min, value)));
};

/**
 * `writable: false` means the Room holds a format this build does not know (a
 * newer Views): use defaults locally, but never overwrite it.
 */
export const decodeAnimationSettings = (raw: unknown): { settings: AnimationSettings; writable: boolean } => {
    if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) {
        return { settings: { ...defaultAnimationSettings }, writable: true };
    }
    const record = raw as Record<string, unknown>;
    if (record[VERSION_KEY] !== FORMAT_VERSION) {
        return { settings: { ...defaultAnimationSettings }, writable: false };
    }
    const flag = (key: 'cinematicEaseIn' | 'cinematicConfirm'): boolean => {
        const value = record[shortKeys[key]];
        return value === 0 || value === 1 ? value === 1 : defaultAnimationSettings[key];
    };
    return {
        settings: {
            functionalMs: clampDuration(record[shortKeys.functionalMs], 'functionalMs'),
            cinematicMs: clampDuration(record[shortKeys.cinematicMs], 'cinematicMs'),
            cinematicEaseIn: flag('cinematicEaseIn'),
            // Absent in Rooms saved before confirmations existed: decodes as off, so no version bump.
            cinematicConfirm: flag('cinematicConfirm'),
        },
        writable: true,
    };
};

// Every field is written, so a later change of default never alters a saved Room.
export const encodeAnimationSettings = (settings: AnimationSettings): Record<string, number> => ({
    [VERSION_KEY]: FORMAT_VERSION,
    [shortKeys.functionalMs]: clampDuration(settings.functionalMs, 'functionalMs'),
    [shortKeys.cinematicMs]: clampDuration(settings.cinematicMs, 'cinematicMs'),
    [shortKeys.cinematicEaseIn]: settings.cinematicEaseIn ? 1 : 0,
    [shortKeys.cinematicConfirm]: settings.cinematicConfirm ? 1 : 0,
});
