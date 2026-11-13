// Cinematic Mode messages: a GM plays an A-to-B shot on every client at once.
// One broadcast per Go or Stop, never per frame (OBR's host pays per message);
// each client animates locally from the boxes. No SDK imports, so it runs
// under Vitest.
import { Box, ViewportSize, framedBox } from './curve';
import { Shot, ShotTarget } from './animator';
import { durationLimits } from './settings';
import { legacyTransformToBox } from '../viewport/viewportHelpers';

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
    /**
     * The GM opted in to confirmations: every other client replies once when the
     * shot ends. Optional so a shot from an older sender still validates.
     */
    confirm?: boolean;
}

/**
 * A GM's preset jump while their Sync View is latched, played on every client
 * instead of OBR mirroring it (~10 messages/s, step-wise on players). No `from`:
 * players are already on the GM's view, so each client starts where it is.
 * Sent by the GM's background page, which pauses and re-latches Sync View itself.
 */
export interface SyncedJumpMessage {
    kind: 'jump';
    id: string;
    to: Box;
    durationMs: number;
}

/** Halts the named shot only, so a player's own preset jump is never cut short. */
export interface CinematicStopMessage {
    kind: 'stop';
    id: string;
}

export type CinematicMessage = CinematicShotMessage | SyncedJumpMessage | CinematicStopMessage;

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
    if (message.kind === 'jump') {
        return typeof message.id === 'string' && isBox(message.to) && Number.isFinite(message.durationMs);
    }
    return (
        message.kind === 'shot' &&
        typeof message.id === 'string' &&
        isBox(message.from) &&
        isBox(message.to) &&
        Number.isFinite(message.durationMs) &&
        typeof message.easeIn === 'boolean' &&
        typeof message.resumeSyncView === 'boolean' &&
        (message.confirm === undefined || typeof message.confirm === 'boolean')
    );
};

// Confirmations (opt-in per Go): each other client replies once per shot, when
// it ends, so a confirmed Go costs 1 + N messages for N other clients. Sent
// REMOTE (the SDK cannot address one connection); only the GM's popover listens.
export const confirmationChannel = 'dev.views/confirm';

/**
 * How the shot ended on the replying client. `stopped`: halted by the GM (Stop,
 * or a GM's synced jump). A player cannot leave a GM's shot early: their own
 * jumps are refused while it plays, and a pan is overridden by its next frame.
 */
export type ConfirmationOutcome = 'completed' | 'stopped' | 'failed';

export interface ShotConfirmation {
    kind: 'confirm';
    id: string;
    outcome: ConfirmationOutcome;
}

const confirmationOutcomes: readonly string[] = ['completed', 'stopped', 'failed'];

export const isShotConfirmation = (value: unknown): value is ShotConfirmation => {
    if (typeof value !== 'object' || value === null) return false;
    const message = value as Record<string, unknown>;
    return (
        message.kind === 'confirm' &&
        typeof message.id === 'string' &&
        typeof message.outcome === 'string' &&
        confirmationOutcomes.includes(message.outcome)
    );
};

/** What cut a shot short on this client, recorded just before the cancel. */
export type ShotInterruption = 'stop' | 'gm-jump' | 'newer-shot';

/**
 * The reply for a shot that has ended, or null for none. A shot replaced by the
 * GM's next shot sends nothing: the GM's monitor has already moved on to it.
 */
export const confirmationOutcome = (
    result: 'completed' | 'cancelled' | 'failed',
    interruption: ShotInterruption | null,
): ConfirmationOutcome | null => {
    if (result === 'completed') return 'completed';
    if (result === 'failed') return 'failed';
    if (interruption === 'newer-shot') return null;
    return 'stopped';
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

/**
 * The area the sender's viewport shows at the end of the jump, which is what its
 * Sync View re-latch then pushes. Each client fits that, so players finish on
 * exactly the re-latched view (no end-of-shot correction, as for Cinematic slots).
 * A transform target (legacy preset) already IS such an area.
 */
export const syncedJumpArea = (target: ShotTarget, size: ViewportSize): Box =>
    target.kind === 'box' ? framedBox(target.box, size) : legacyTransformToBox(target.transform, size);

/** A synced jump: from wherever each client is, on the functional recall curve. */
export const toSyncedJumpShot = (message: SyncedJumpMessage): Shot => {
    const { min, max } = durationLimits.functionalMs;
    return {
        to: { kind: 'box', box: message.to },
        durationMs: Math.round(Math.min(max, Math.max(min, message.durationMs))),
        easing: 'expo-out',
    };
};

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
