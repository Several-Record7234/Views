import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createAnimator, AnimatorDeps, Shot } from "../animation/animator";
import { Transform, fitBox } from "../animation/curve";
import { isPresenceMessage, isRecallRequest } from "../animation/recallProtocol";

const size = { width: 1600, height: 900 };
const start: Transform = { position: { x: 0, y: 0 }, scale: 1 };
const target: Transform = { position: { x: -800, y: -450 }, scale: 2 };

interface Rig {
  deps: AnimatorDeps;
  applied: Transform[];
  maxConcurrent: () => number;
}

/** A fake viewport on the fake clock; each apply takes `applyMs` to resolve. */
const makeRig = (applyMs = 0, fail?: (callIndex: number) => boolean): Rig => {
  const applied: Transform[] = [];
  let concurrent = 0;
  let peak = 0;
  return {
    applied,
    maxConcurrent: () => peak,
    deps: {
      now: () => Date.now(),
      schedule: (callback) => {
        setTimeout(callback, 16);
      },
      readViewport: async () => ({ transform: start, size }),
      applyTransform: (transform) => {
        const callIndex = applied.length;
        applied.push(transform);
        concurrent++;
        peak = Math.max(peak, concurrent);
        return new Promise<void>((resolve, reject) => {
          setTimeout(() => {
            concurrent--;
            if (fail?.(callIndex)) reject(new Error("viewport refused"));
            else resolve();
          }, applyMs);
        });
      },
    },
  };
};

const last = <T,>(list: T[]): T | undefined => list[list.length - 1];

const shotTo = (transform: Transform, durationMs = 500): Shot => ({
  to: { kind: "transform", transform },
  durationMs,
  easing: "expo-out",
});

beforeEach(() => {
  vi.useFakeTimers();
});
afterEach(() => {
  vi.useRealTimers();
});

describe("createAnimator", () => {
  it("animates over the duration and lands exactly on the target last", async () => {
    const rig = makeRig();
    const result = createAnimator(rig.deps).play(shotTo(target));
    await vi.advanceTimersByTimeAsync(600);
    expect(await result).toEqual({ outcome: "completed" });
    expect(last(rig.applied)).toEqual(target);
    // ~500ms at 16ms per tick, plus the exact final frame.
    expect(rig.applied.length).toBeGreaterThan(25);
    expect(rig.applied.length).toBeLessThan(40);
  });

  it("does not resolve before the motion has finished", async () => {
    const rig = makeRig();
    let settled = false;
    void createAnimator(rig.deps).play(shotTo(target)).then(() => (settled = true));
    await vi.advanceTimersByTimeAsync(400);
    expect(settled).toBe(false);
    await vi.advanceTimersByTimeAsync(200);
    expect(settled).toBe(true);
  });

  it("scales up monotonically along the way (no overshoot)", async () => {
    const rig = makeRig();
    const result = createAnimator(rig.deps).play(shotTo(target));
    await vi.advanceTimersByTimeAsync(600);
    await result;
    const scales = rig.applied.map((t) => t.scale);
    for (let i = 1; i < scales.length; i++) expect(scales[i]).toBeGreaterThanOrEqual(scales[i - 1]);
    expect(Math.max(...scales)).toBe(2);
  });

  it("fits a box target to the viewport", async () => {
    const rig = makeRig();
    const box = { min: { x: 100, y: 100 }, max: { x: 500, y: 300 } };
    const result = createAnimator(rig.deps).play({ to: { kind: "box", box }, durationMs: 200, easing: "expo-out" });
    await vi.advanceTimersByTimeAsync(300);
    await result;
    expect(last(rig.applied)).toEqual(fitBox(box, size));
  });

  it("halts in place on cancel, without sending the final frame", async () => {
    const rig = makeRig();
    const animator = createAnimator(rig.deps);
    const result = animator.play(shotTo(target));
    await vi.advanceTimersByTimeAsync(200);
    animator.cancel();
    const sentAtCancel = rig.applied.length;
    await vi.advanceTimersByTimeAsync(600);
    expect(await result).toEqual({ outcome: "cancelled" });
    expect(rig.applied.length).toBe(sentAtCancel);
    expect(rig.applied).not.toContainEqual(target);
  });

  it("a new shot cancels the running one, and the newest wins", async () => {
    const rig = makeRig();
    const animator = createAnimator(rig.deps);
    const other: Transform = { position: { x: 400, y: 200 }, scale: 0.5 };
    const first = animator.play(shotTo(target));
    await vi.advanceTimersByTimeAsync(200);
    const second = animator.play(shotTo(other));
    await vi.advanceTimersByTimeAsync(700);
    expect(await first).toEqual({ outcome: "cancelled" });
    expect(await second).toEqual({ outcome: "completed" });
    expect(last(rig.applied)).toEqual(other);
    expect(rig.applied).not.toContainEqual(target);
  });

  it("skips ticks while a frame is in flight, never overlapping sends", async () => {
    const rig = makeRig(50); // each frame takes ~3 ticks to apply
    const result = createAnimator(rig.deps).play(shotTo(target));
    await vi.advanceTimersByTimeAsync(800);
    expect(await result).toEqual({ outcome: "completed" });
    expect(rig.maxConcurrent()).toBe(1);
    expect(rig.applied.length).toBeLessThan(15);
    expect(last(rig.applied)).toEqual(target);
  });

  it("reports a failed frame as failed, not completed", async () => {
    const rig = makeRig(0, (callIndex) => callIndex === 3);
    const result = createAnimator(rig.deps).play(shotTo(target));
    await vi.advanceTimersByTimeAsync(600);
    const outcome = await result;
    expect(outcome.outcome).toBe("failed");
    expect(rig.applied).not.toContainEqual(target);
  });

  it("a zero duration sends just the exact target", async () => {
    const rig = makeRig();
    const result = createAnimator(rig.deps).play(shotTo(target, 0));
    await vi.advanceTimersByTimeAsync(50);
    expect(await result).toEqual({ outcome: "completed" });
    expect(rig.applied).toEqual([target]);
  });

  it("starts from an explicit `from` target rather than the current viewport", async () => {
    const rig = makeRig();
    const from: Transform = { position: { x: 50, y: 50 }, scale: 4 };
    const result = createAnimator(rig.deps).play({ ...shotTo(target), from: { kind: "transform", transform: from } });
    await vi.advanceTimersByTimeAsync(600);
    await result;
    expect(rig.applied[0]).toEqual(from);
  });
});

describe("isRecallRequest", () => {
  const box = { min: { x: 0, y: 0 }, max: { x: 10, y: 10 } };

  it("accepts box and transform recalls", () => {
    expect(isRecallRequest({ kind: "recall", to: { kind: "box", box }, sentAt: 1 })).toBe(true);
    expect(isRecallRequest({ kind: "recall", to: { kind: "transform", transform: target }, sentAt: 1 })).toBe(true);
  });

  it("rejects malformed recalls", () => {
    expect(isRecallRequest(null)).toBe(false);
    expect(isRecallRequest({ kind: "recall", to: { kind: "box", box }, sentAt: "1" })).toBe(false);
    expect(isRecallRequest({ kind: "recall", to: { kind: "box", box: { min: { x: 0 } } }, sentAt: 1 })).toBe(false);
    expect(isRecallRequest({ kind: "recall", to: { kind: "transform", transform: { ...target, scale: 0 } }, sentAt: 1 })).toBe(false);
    expect(isRecallRequest({ kind: "recall", to: { kind: "transform", transform: { ...target, scale: NaN } }, sentAt: 1 })).toBe(false);
    expect(isRecallRequest({ kind: "jump", to: { kind: "box", box }, sentAt: 1 })).toBe(false);
  });
});

describe("isPresenceMessage", () => {
  it("accepts ping and ready only", () => {
    expect(isPresenceMessage({ kind: "ping" })).toBe(true);
    expect(isPresenceMessage({ kind: "ready" })).toBe(true);
    expect(isPresenceMessage({ kind: "recall" })).toBe(false);
    expect(isPresenceMessage(null)).toBe(false);
    expect(isPresenceMessage("ready")).toBe(false);
  });
});
