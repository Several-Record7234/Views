import { describe, it, expect } from "vitest";
import {
  CinematicShotMessage,
  RosterEntry,
  SyncedJumpMessage,
  confirmationOutcome,
  isCinematicMessage,
  isShotConfirmation,
  shouldHonourCinematic,
  syncedJumpArea,
  toCinematicShot,
  toSyncedJumpShot,
} from "../animation/cinematicProtocol";
import { isRecallRefused } from "../animation/recallProtocol";

const shot: CinematicShotMessage = {
  kind: "shot",
  id: "s1",
  from: { min: { x: 0, y: 0 }, max: { x: 100, y: 50 } },
  to: { min: { x: 500, y: 500 }, max: { x: 600, y: 560 } },
  durationMs: 3000,
  easeIn: true,
  resumeSyncView: false,
};

const roster: RosterEntry[] = [
  { connectionId: "gm-conn", role: "GM" },
  { connectionId: "player-conn", role: "PLAYER" },
];

describe("isCinematicMessage", () => {
  it("accepts a well-formed shot and a stop", () => {
    expect(isCinematicMessage(shot)).toBe(true);
    expect(isCinematicMessage({ kind: "stop", id: "s1" })).toBe(true);
  });

  it("rejects a stop that names no shot", () => {
    expect(isCinematicMessage({ kind: "stop" })).toBe(false);
  });

  it("rejects malformed shots", () => {
    expect(isCinematicMessage(null)).toBe(false);
    expect(isCinematicMessage({ ...shot, kind: "recall" })).toBe(false);
    expect(isCinematicMessage({ ...shot, id: 7 })).toBe(false);
    expect(isCinematicMessage({ ...shot, from: { min: { x: 0, y: 0 } } })).toBe(false);
    expect(isCinematicMessage({ ...shot, to: { min: { x: NaN, y: 0 }, max: { x: 1, y: 1 } } })).toBe(false);
    expect(isCinematicMessage({ ...shot, durationMs: "3000" })).toBe(false);
    expect(isCinematicMessage({ ...shot, durationMs: Infinity })).toBe(false);
    expect(isCinematicMessage({ ...shot, easeIn: 1 })).toBe(false);
    expect(isCinematicMessage({ ...shot, resumeSyncView: undefined })).toBe(false);
  });
});

describe("shouldHonourCinematic", () => {
  it("obeys our own connection, whatever our role", () => {
    expect(shouldHonourCinematic("me", "me", [])).toBe(true);
  });

  it("obeys a GM in the roster", () => {
    expect(shouldHonourCinematic("gm-conn", "me", roster)).toBe(true);
  });

  it("ignores a player in the roster", () => {
    expect(shouldHonourCinematic("player-conn", "me", roster)).toBe(false);
  });

  it("ignores a connection missing from the roster", () => {
    expect(shouldHonourCinematic("stranger", "me", roster)).toBe(false);
  });

  it("matches on connectionId, not any other field", () => {
    // A player whose connection is stale (reconnected as a GM elsewhere) is not trusted by role alone.
    expect(shouldHonourCinematic("old-gm-conn", "me", [{ connectionId: "new-gm-conn", role: "GM" }])).toBe(false);
  });
});

describe("toCinematicShot", () => {
  it("snaps to A and animates to B, as boxes", () => {
    const result = toCinematicShot(shot);
    expect(result.from).toEqual({ kind: "box", box: shot.from });
    expect(result.to).toEqual({ kind: "box", box: shot.to });
    expect(result.durationMs).toBe(3000);
  });

  it("maps ease-in to the Cinematic curves", () => {
    expect(toCinematicShot(shot).easing).toBe("cubic-in-out");
    expect(toCinematicShot({ ...shot, easeIn: false }).easing).toBe("cubic-out");
  });

  it("clamps the duration to the Cinematic limits", () => {
    expect(toCinematicShot({ ...shot, durationMs: 10 }).durationMs).toBe(500);
    expect(toCinematicShot({ ...shot, durationMs: 1e9 }).durationMs).toBe(15000);
  });
});

const jump: SyncedJumpMessage = {
  kind: "jump",
  id: "j1",
  to: { min: { x: 500, y: 500 }, max: { x: 600, y: 560 } },
  durationMs: 540,
};

describe("synced jump", () => {
  it("accepts a well-formed jump and rejects malformed ones", () => {
    expect(isCinematicMessage(jump)).toBe(true);
    expect(isCinematicMessage({ ...jump, id: undefined })).toBe(false);
    expect(isCinematicMessage({ ...jump, to: { max: { x: 1, y: 1 } } })).toBe(false);
    expect(isCinematicMessage({ ...jump, durationMs: NaN })).toBe(false);
  });

  it("starts where each client is, on the recall curve", () => {
    const result = toSyncedJumpShot(jump);
    expect(result.from).toBeUndefined();
    expect(result.to).toEqual({ kind: "box", box: jump.to });
    expect(result.easing).toBe("expo-out");
    expect(result.durationMs).toBe(540);
  });

  it("clamps the duration to the Jump limits, not the Cinematic ones", () => {
    expect(toSyncedJumpShot({ ...jump, durationMs: 10 }).durationMs).toBe(100);
    expect(toSyncedJumpShot({ ...jump, durationMs: 3000 }).durationMs).toBe(2000);
  });

  it("sends a box as the area the sender's viewport shows for it", () => {
    // A 100x50 box on a square viewport is width-bound, so the area grows to 100x100.
    const area = syncedJumpArea({ kind: "box", box: { min: { x: 0, y: 0 }, max: { x: 100, y: 50 } } }, { width: 200, height: 200 });
    expect(area.min.x).toBeCloseTo(0);
    expect(area.max.x).toBeCloseTo(100);
    expect(area.min.y).toBeCloseTo(-25);
    expect(area.max.y).toBeCloseTo(75);
  });

  it("sends a transform (legacy preset) as the area it shows", () => {
    const area = syncedJumpArea({ kind: "transform", transform: { position: { x: -100, y: -50 }, scale: 2 } }, { width: 200, height: 100 });
    expect(area.min.x).toBeCloseTo(50);
    expect(area.min.y).toBeCloseTo(25);
    expect(area.max.x).toBeCloseTo(150);
    expect(area.max.y).toBeCloseTo(75);
  });
});

describe("confirm flag on a shot", () => {
  it("accepts a shot with or without it (older senders omit it)", () => {
    expect(isCinematicMessage({ ...shot, confirm: true })).toBe(true);
    expect(isCinematicMessage({ ...shot, confirm: false })).toBe(true);
    expect(isCinematicMessage(shot)).toBe(true);
  });

  it("rejects a non-boolean flag", () => {
    expect(isCinematicMessage({ ...shot, confirm: "yes" })).toBe(false);
  });
});

describe("isShotConfirmation", () => {
  it("accepts each outcome", () => {
    for (const outcome of ["completed", "stopped", "failed"]) {
      expect(isShotConfirmation({ kind: "confirm", id: "s1", outcome })).toBe(true);
    }
  });

  it("rejects unknown outcomes and malformed replies", () => {
    expect(isShotConfirmation({ kind: "confirm", id: "s1", outcome: "waiting" })).toBe(false);
    expect(isShotConfirmation({ kind: "confirm", id: "s1", outcome: "interrupted" })).toBe(false);
    expect(isShotConfirmation({ kind: "confirm", outcome: "completed" })).toBe(false);
    expect(isShotConfirmation({ kind: "stop", id: "s1", outcome: "completed" })).toBe(false);
    expect(isShotConfirmation(null)).toBe(false);
  });
});

describe("confirmationOutcome", () => {
  it("reports a completed or failed shot as such, whatever was recorded", () => {
    expect(confirmationOutcome("completed", null)).toBe("completed");
    expect(confirmationOutcome("completed", "stop")).toBe("completed");
    expect(confirmationOutcome("failed", "stop")).toBe("failed");
  });

  it("reports a GM's Stop or synced jump as stopped", () => {
    expect(confirmationOutcome("cancelled", "stop")).toBe("stopped");
    expect(confirmationOutcome("cancelled", "gm-jump")).toBe("stopped");
  });

  it("treats a cancel with no recorded cause as stopped", () => {
    expect(confirmationOutcome("cancelled", null)).toBe("stopped");
  });

  it("sends nothing when the GM's next shot replaced it", () => {
    expect(confirmationOutcome("cancelled", "newer-shot")).toBeNull();
  });
});

describe("isRecallRefused", () => {
  it("accepts the Cinematic refusal and nothing else", () => {
    expect(isRecallRefused({ kind: "refused", reason: "cinematic" })).toBe(true);
    expect(isRecallRefused({ kind: "refused" })).toBe(false);
    expect(isRecallRefused({ kind: "recall", reason: "cinematic" })).toBe(false);
    expect(isRecallRefused(null)).toBe(false);
  });
});
