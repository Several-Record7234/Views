// The GM's view of one confirmed Go: who was in the Room when it went out, and
// how the shot ended for each of them. Pure, so it runs under Vitest.
import { ConfirmationOutcome, ShotConfirmation } from './cinematicProtocol';

export type ConfirmationStatus = 'waiting' | ConfirmationOutcome | 'no-response';

export interface MonitorEntry {
    connectionId: string;
    name: string;
    status: ConfirmationStatus;
}

export interface ConfirmationMonitor {
    shotId: string;
    entries: MonitorEntry[];
}

/**
 * Allowance on top of the shot's duration before a silent client is marked
 * "no response": broadcast latency plus the frames the animator still sends.
 */
export const RESPONSE_SLACK_MS = 2000;

export const responseDeadlineMs = (durationMs: number) => durationMs + RESPONSE_SLACK_MS;

export const startMonitor = (
    shotId: string,
    roster: ReadonlyArray<{ connectionId: string; name: string }>,
): ConfirmationMonitor => ({
    shotId,
    entries: roster.map(({ connectionId, name }) => ({ connectionId, name, status: 'waiting' })),
});

/**
 * Records a reply. `senderConnectionId` is the server-stamped broadcast sender,
 * so a client can only ever report for itself; a reply for another shot, or from
 * a client not in the Room at Go, is ignored. A late reply replaces "no
 * response", since it is the truer account of what that client saw.
 */
export const applyConfirmation = (
    monitor: ConfirmationMonitor,
    senderConnectionId: string,
    confirmation: ShotConfirmation,
): ConfirmationMonitor => {
    if (confirmation.id !== monitor.shotId) return monitor;
    const index = monitor.entries.findIndex(({ connectionId }) => connectionId === senderConnectionId);
    if (index === -1) return monitor;
    const current = monitor.entries[index].status;
    if (current !== 'waiting' && current !== 'no-response') return monitor;
    const entries = monitor.entries.slice();
    entries[index] = { ...entries[index], status: confirmation.outcome };
    return { ...monitor, entries };
};

/** At the deadline: everyone still waiting becomes "no response". */
export const expireMonitor = (monitor: ConfirmationMonitor): ConfirmationMonitor =>
    monitor.entries.some(({ status }) => status === 'waiting')
        ? {
              ...monitor,
              entries: monitor.entries.map((entry) =>
                  entry.status === 'waiting' ? { ...entry, status: 'no-response' } : entry,
              ),
          }
        : monitor;

/** Counts by status, for a one-line summary. */
export const summariseMonitor = (monitor: ConfirmationMonitor): Record<ConfirmationStatus, number> => {
    const counts: Record<ConfirmationStatus, number> = {
        waiting: 0,
        completed: 0,
        stopped: 0,
        failed: 0,
        'no-response': 0,
    };
    for (const { status } of monitor.entries) counts[status]++;
    return counts;
};
