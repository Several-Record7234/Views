// Drives the viewport along a custom curve. No SDK imports: the clock and the
// viewport calls are passed in, so the loop runs under Vitest with fake timers.
import { Box, Easing, Transform, ViewportSize, ease, fitBox, interpolate } from './curve';

/** Where a shot starts or ends: a world-space box (fitted to this viewport) or a raw transform. */
export type ShotTarget = { kind: 'box'; box: Box } | { kind: 'transform'; transform: Transform };

export interface Shot {
    to: ShotTarget;
    /** Omitted: start from wherever the viewport is now. */
    from?: ShotTarget;
    durationMs: number;
    easing: Easing;
}

export type ShotOutcome =
    | { outcome: 'completed' }
    | { outcome: 'cancelled' }
    | { outcome: 'failed'; error: unknown };

export interface AnimatorDeps {
    now: () => number;
    /** Run `callback` on the next tick of the animation clock. */
    schedule: (callback: () => void) => void;
    readViewport: () => Promise<{ transform: Transform; size: ViewportSize }>;
    applyTransform: (transform: Transform) => Promise<void>;
}

export interface Animator {
    /** Starts a shot, cancelling any shot already running. Resolves once the motion has really finished. */
    play: (shot: Shot) => Promise<ShotOutcome>;
    /** Halts the running shot where it is. */
    cancel: () => void;
}

export const resolveTarget = (target: ShotTarget, size: ViewportSize): Transform =>
    target.kind === 'box' ? fitBox(target.box, size) : target.transform;

export const createAnimator = (deps: AnimatorDeps): Animator => {
    // Each shot owns a generation; a newer shot (or cancel) bumps it, and the
    // old loop notices on its next tick and resolves as cancelled.
    let generation = 0;
    let settleRunning: ((result: ShotOutcome) => void) | null = null;

    const cancel = () => {
        generation++;
        settleRunning?.({ outcome: 'cancelled' });
        settleRunning = null;
    };

    const play = (shot: Shot): Promise<ShotOutcome> => {
        cancel();
        const shotGeneration = generation;
        const isCurrent = () => shotGeneration === generation;

        return new Promise<ShotOutcome>((resolve) => {
            let settled = false;
            const settle = (result: ShotOutcome) => {
                if (settled) return;
                settled = true;
                if (isCurrent()) settleRunning = null;
                resolve(result);
            };
            settleRunning = settle;

            const run = async () => {
                const { transform: current, size } = await deps.readViewport();
                if (!isCurrent()) return;
                const from = shot.from ? resolveTarget(shot.from, size) : current;
                const to = resolveTarget(shot.to, size);
                const start = deps.now();
                // Latest-wins: while a frame is still being applied, later ticks skip
                // sending rather than queueing, so the viewport never lags behind the clock.
                let inFlight: Promise<void> | null = null;
                let failure: { error: unknown } | null = null;

                const send = (transform: Transform) => {
                    const sending = deps
                        .applyTransform(transform)
                        .catch((error: unknown) => {
                            failure = { error };
                        })
                        .finally(() => {
                            if (inFlight === sending) inFlight = null;
                        });
                    inFlight = sending;
                };

                const land = async () => {
                    // The exact final frame goes last, after any frame still in flight.
                    if (inFlight) await inFlight;
                    if (!isCurrent()) return;
                    if (failure) return settle({ outcome: 'failed', error: failure.error });
                    try {
                        await deps.applyTransform(to);
                    } catch (error) {
                        return settle({ outcome: 'failed', error });
                    }
                    if (isCurrent()) settle({ outcome: 'completed' });
                };

                const tick = () => {
                    if (!isCurrent()) return;
                    if (failure) return settle({ outcome: 'failed', error: failure.error });
                    // Progress comes from elapsed time, not frame count: a slow frame or a
                    // user dragging mid-shot is pulled back onto the curve by the next one.
                    const t = shot.durationMs > 0 ? (deps.now() - start) / shot.durationMs : 1;
                    if (t >= 1) {
                        void land();
                        return;
                    }
                    if (!inFlight) send(interpolate(from, to, ease(t, shot.easing), size));
                    deps.schedule(tick);
                };
                tick();
            };

            run().catch((error: unknown) => settle({ outcome: 'failed', error }));
        });
    };

    return { play, cancel };
};
