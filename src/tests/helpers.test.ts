import { describe, it, expect } from "vitest";
import {
  metadataId,
  isStarredBox,
  isStarredLegacy,
  isRecord,
  isObject,
  validMetadata,
  isValidStar,
} from "../helper/types";
import {
  deriveFilteredPlayerIds,
  applyViewportDelete,
  calcItemsBoundingBox,
  legacyTransformToBox,
  restoreDamagedLegacy,
} from "../viewport/viewportHelpers";

describe("metadataId", () => {
  it("is a non-empty string", () => {
    expect(typeof metadataId).toBe("string");
    expect(metadataId.length).toBeGreaterThan(0);
  });
});

describe("isRecord", () => {
  it("returns true for plain objects", () => {
    expect(isRecord({ a: 1 })).toBe(true);
    expect(isRecord({})).toBe(true);
  });

  it("returns false for arrays, null, dates", () => {
    expect(isRecord([])).toBe(false);
    expect(isRecord(null)).toBe(false);
    expect(isRecord(new Date())).toBe(false);
  });

  it("returns false for primitives", () => {
    expect(isRecord(42)).toBe(false);
    expect(isRecord("string")).toBe(false);
  });
});

describe("isObject", () => {
  it("returns true for objects and arrays", () => {
    expect(isObject({})).toBe(true);
    expect(isObject([])).toBe(true);
  });

  it("returns false for null and primitives", () => {
    expect(isObject(null)).toBe(false);
    expect(isObject(42)).toBe(false);
    expect(isObject("str")).toBe(false);
  });
});

describe("isStarredBox", () => {
  const validBox = {
    id: "abc",
    name: "Test",
    boundingCorners: { max: { x: 10, y: 10 }, min: { x: 0, y: 0 } },
  };

  it("returns true for a valid StarredBox", () => {
    expect(isStarredBox(validBox)).toBe(true);
  });

  it("returns false when boundingCorners is missing", () => {
    expect(isStarredBox({ id: "abc", name: "Test" })).toBe(false);
  });

  it("returns false when corners have non-numeric coordinates", () => {
    const bad = {
      id: "abc",
      name: "Test",
      boundingCorners: { max: { x: "ten", y: 10 }, min: { x: 0, y: 0 } },
    };
    expect(isStarredBox(bad)).toBe(false);
  });
});

describe("isStarredLegacy", () => {
  const validLegacy = {
    id: "abc",
    name: "Test",
    transform: { position: { x: 0, y: 0 }, scale: 1 },
  };

  it("returns true for a valid StarredLegacy", () => {
    expect(isStarredLegacy(validLegacy)).toBe(true);
  });

  it("returns false when transform is missing", () => {
    expect(isStarredLegacy({ id: "abc", name: "Test" })).toBe(false);
  });

  it("returns false for non-objects", () => {
    expect(isStarredLegacy(null)).toBe(false);
    expect(isStarredLegacy("string")).toBe(false);
  });
});

describe("isValidStar", () => {
  it("returns true for a StarredBox", () => {
    expect(
      isValidStar({
        id: "x",
        name: "v",
        boundingCorners: { max: { x: 1, y: 1 }, min: { x: 0, y: 0 } },
      })
    ).toBe(true);
  });

  it("returns true for a StarredLegacy", () => {
    expect(
      isValidStar({ id: "x", name: "v", transform: { position: { x: 0, y: 0 }, scale: 1 } })
    ).toBe(true);
  });

  it("returns false for objects with neither boundingCorners nor transform", () => {
    expect(isValidStar({ id: "x", name: "v" })).toBe(false);
  });
});

describe("validMetadata", () => {
  it("returns true for valid metadata with empty starredViewports", () => {
    expect(validMetadata({ [metadataId]: { starredViewports: [], filters: {} } })).toBe(true);
  });

  it("returns true for metadata with starredViewports undefined", () => {
    expect(validMetadata({ [metadataId]: { starredViewports: undefined, filters: {} } })).toBe(
      true
    );
  });

  it("returns false for non-objects", () => {
    expect(validMetadata(null)).toBe(false);
    expect(validMetadata("string")).toBe(false);
  });

  it("returns false when metadataId key is absent", () => {
    expect(validMetadata({ other: {} })).toBe(false);
  });
});

describe("deriveFilteredPlayerIds", () => {
  it("returns IDs where show is false", () => {
    expect(deriveFilteredPlayerIds({ a: false, b: true, c: false })).toEqual(["a", "c"]);
  });

  it("returns empty array when all players are shown", () => {
    expect(deriveFilteredPlayerIds({ a: true, b: true })).toEqual([]);
  });

  it("returns empty array for empty filters", () => {
    expect(deriveFilteredPlayerIds({})).toEqual([]);
  });
});

describe("applyViewportDelete", () => {
  const vp1 = {
    id: "1", name: "A",
    boundingCorners: { min: { x: 0, y: 0 }, max: { x: 1, y: 1 } },
  };
  const vp2 = {
    id: "2", name: "B",
    boundingCorners: { min: { x: 0, y: 0 }, max: { x: 1, y: 1 } },
  };

  it("removes the viewport with the given id", () => {
    expect(applyViewportDelete([vp1, vp2], "1")).toEqual([vp2]);
  });

  it("returns undefined when the result would be empty", () => {
    expect(applyViewportDelete([vp1], "1")).toBeUndefined();
  });

  it("returns the full array when the id is not found", () => {
    expect(applyViewportDelete([vp1, vp2], "99")).toEqual([vp1, vp2]);
  });
});

describe("calcItemsBoundingBox", () => {
  const item = (px: number, py: number, w: number, h: number, sx = 1, sy = 1) => ({
    image: { width: w, height: h },
    scale: { x: sx, y: sy },
    position: { x: px, y: py },
  });

  it("calculates bounds for a single centred item", () => {
    expect(calcItemsBoundingBox([item(0, 0, 100, 100)])).toEqual({
      min: { x: -50, y: -50 },
      max: { x: 50, y: 50 },
    });
  });

  it("calculates bounds across multiple items", () => {
    expect(calcItemsBoundingBox([item(0, 0, 50, 50), item(100, 100, 50, 50)])).toEqual({
      min: { x: -25, y: -25 },
      max: { x: 125, y: 125 },
    });
  });

  it("respects non-uniform scale", () => {
    expect(calcItemsBoundingBox([item(0, 0, 100, 100, 2, 0.5)])).toEqual({
      min: { x: -100, y: -25 },
      max: { x: 100, y: 25 },
    });
  });

  it("handles a single item at a non-zero position", () => {
    expect(calcItemsBoundingBox([item(200, 300, 40, 60)])).toEqual({
      min: { x: 180, y: 270 },
      max: { x: 220, y: 330 },
    });
  });
});

describe("legacyTransformToBox", () => {
  it("maps the viewport's screen corners to world space", () => {
    // screen = world * scale + position, so world = (screen - position) / scale
    const box = legacyTransformToBox(
      { position: { x: -100, y: -50 }, scale: 2 },
      { width: 800, height: 600 },
    );
    expect(box).toEqual({ min: { x: 50, y: 25 }, max: { x: 450, y: 325 } });
  });
});

describe("restoreDamagedLegacy", () => {
  const legacy = {
    id: "L1",
    name: "Harbour",
    playerId: "owner",
    transform: { position: { x: 10, y: 20 }, scale: 1.5 },
  };
  const damaged = {
    id: "L1",
    name: "Harbour",
    playerId: "whoever-jumped",
    boundingCorners: { min: { x: 0, y: 0 }, max: { x: 1, y: 1 } },
  };
  const unrelated = {
    id: "B1",
    name: "Gate",
    playerId: "owner",
    boundingCorners: { min: { x: 5, y: 5 }, max: { x: 9, y: 9 } },
  };

  it("restores a box under a legacy id to the original entry, owner included", () => {
    const { stars, restoredCount } = restoreDamagedLegacy([damaged, unrelated], [legacy]);
    expect(stars).toEqual([legacy, unrelated]);
    expect(restoredCount).toBe(1);
  });

  it("leaves an unmigrated legacy entry and unrelated boxes alone", () => {
    const { stars, restoredCount } = restoreDamagedLegacy([legacy, unrelated], [legacy]);
    expect(stars).toEqual([legacy, unrelated]);
    expect(restoredCount).toBe(0);
  });

  it("ignores legacy-key entries that were already boxes", () => {
    const { restoredCount } = restoreDamagedLegacy([unrelated], [unrelated]);
    expect(restoredCount).toBe(0);
  });

  // Why the repair must run once and be marked done: a CORRECT migration also
  // leaves a box under a legacy id, which this function cannot tell apart.
  it("would revert a correct migration, so the caller must gate it to one run", () => {
    const correct = { ...damaged, playerId: "owner" };
    expect(restoreDamagedLegacy([correct], [legacy]).restoredCount).toBe(1);
  });
});
