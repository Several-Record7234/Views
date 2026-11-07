// Pure conversion between the GM panel's seconds fields and the stored
// millisecond durations. Kept apart from the panel so it can be unit-tested
// without the OBR SDK (which needs a window).
import { durationLimits } from './settings';

export type DurationKey = keyof typeof durationLimits;

/** 540 -> "0.54", 3000 -> "3", 2500 -> "2.5". */
export const formatSeconds = (ms: number): string => String(Math.round(ms) / 1000);

/**
 * Parses a typed seconds value into clamped milliseconds, or null when the text
 * is not a number (the caller then reverts the field to the saved value).
 */
export const parseSecondsInput = (text: string, key: DurationKey): number | null => {
    const trimmed = text.trim();
    if (trimmed === '') return null;
    const seconds = Number(trimmed);
    if (!Number.isFinite(seconds)) return null;
    const { min, max } = durationLimits[key];
    return Math.min(max, Math.max(min, Math.round(seconds * 1000)));
};
