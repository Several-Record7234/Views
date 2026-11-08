// Cinematic Mode messages: a GM plays an A-to-B shot on every client at once.
// One broadcast per Go or Stop, never per frame (OBR's host pays per message);
// each client animates locally from the boxes. No SDK imports, so it runs
// under Vitest.
import { Box } from './curve';
import { Shot } from './animator';
import { durationLimits } from './settings';

export const cinematicChannel = 'dev.views/cinematic';

export interface CinematicShotMessage {
    kind: 'shot';
    /** Unique per Go or Preview, for logging now and confirmations later. */
    id: string;
    from: Box;
    to: Box;
    durationMs: number;
    easeIn: boolean;
    /** The sender paused its latched Sync View for this shot; only the sender's own client acts on it. */
    resumeSyncView: boolean;
}

/** Halts the named shot only, so a player's own preset jump is never cut short. */
export interface CinematicStopMessage {
    kind: 'stop';
    id: string;
}

export type CinematicMessage = CinematicShotMessage | CinematicStopMessage;

const isVector = (value: unknown): boolean => {
    const v = value as Record<string, unknown> | null;
    return typeof v === 'object' && v !== null && Number.isFinite(v.x) && Number.isFinite(v.y);
};

const isBox = (value: unknown): value is Box => {
    const box = value as Record<string, unknown> | null;
    return typeof box === 'object' && box !== null && isVector(box.min) && isVector(box.max);
};

export const isCinematicMessage = (value: unknown): value is CinematicMessage => {
    if (typeof value !== 'object' || value === null) return false;
    const message = value as Record<string, unknown>;
    if (message.kind === 'stop') return typeof message.id === 'string';
    return (
        message.kind === 'shot' &&
        typeof message.id === 'string' &&
        isBox(message.from) &&
        isBox(message.to) &&
        Number.isFinite(message.durationMs) &&
        typeof message.easeIn === 'boolean' &&
        typeof message.resumeSyncView === 'boolean'
    );
};

/** Minimal roster entry: the two Party fields the trust check reads. */
export interface RosterEntry {
    connectionId: string;
    role: 'GM' | 'PLAYER';
}

/**
 * Whether to act on a Cinematic message. Our own connection is always obeyed
 * (a Preview, or the GM's own copy of a Go; a player sending to themselves can
 * only move their own view). Anyone else must be a GM in the Party roster:
 * `connectionId` is stamped by the server and `role` is server-authoritative,
 * whereas Room metadata is writable by any client and is no authority.
 */
export const shouldHonourCinematic = (
    senderConnectionId: string,
    ownConnectionId: string,
    roster: readonly RosterEntry[],
): boolean =>
    senderConnectionId === ownConnectionId ||
    roster.some((player) => player.connectionId === senderConnectionId && player.role === 'GM');

/** The shot each client plays: snap to A, then animate to B, fitted to its own viewport. */
export const toCinematicShot = (message: CinematicShotMessage): Shot => {
    const { min, max } = durationLimits.cinematicMs;
    return {
        from: { kind: 'box', box: message.from },
        to: { kind: 'box', box: message.to },
        durationMs: Math.round(Math.min(max, Math.max(min, message.durationMs))),
        easing: message.easeIn ? 'cubic-in-out' : 'cubic-out',
    };
};
