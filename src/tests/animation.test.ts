import { describe, it, expect } from "vitest";
import { ease, fitBox, framedBox, interpolate, centreOf, Transform, Easing } from "../animation/curve";
import {
  decodeAnimationSettings,
  encodeAnimationSettings,
  defaultAnimationSettings,
} from "../animation/settings";

const size = { width: 1600, height: 900 };
const toScreen = (t: Transform, p: { x: number; y: number }) => ({
  x: p.x * t.scale + t.position.x,
  y: p.y * t.scale + t.position.y,
});

describe("ease", () => {
  const easings: Easing[] = ["expo-out", "cubic-out", "cubic-in-out"];

  it("starts at 0 and ends at 1 on every curve, clamping outside the range", () => {
    for (const easing of easings) {
      expect(ease(0, easing)).toBe(0);
      expect(ease(1, easing)).toBe(1);
      expect(ease(-1, easing)).toBe(0);
      expect(ease(2, easing)).toBe(1);
    }
  });

  it("rises monotonically on every curve", () => {
    for (const easing of easings) {
      for (let i = 1; i <= 100; i++) expect(ease(i / 100, easing)).toBeGreaterThanOrEqual(ease((i - 1) / 100, easing));
    }
  });

  it("always eases out: the last tenth covers little ground", () => {
    for (const easing of easings) expect(1 - ease(0.9, easing)).toBeLessThan(0.01);
  });

  it("starts fast without ease-in and slowly with it", () => {
    expect(ease(0.1, "cubic-out")).toBeGreaterThan(0.2);
    expect(ease(0.1, "cubic-in-out")).toBeLessThan(0.01);
  });

  it("expo-out at the default 540ms tracks the measured native animateTo (tau ~78ms)", () => {
    // Measured 2026-11-07 (60Hz, pure pan): progress after 100/200/300ms of motion.
    const native = (ms: number) => 1 - Math.exp(-ms / 78);
    for (const ms of [100, 200, 300]) expect(Math.abs(ease(ms / defaultAnimationSettings.functionalMs, "expo-out") - native(ms))).toBeLessThan(0.005);
  });
});

describe("fitBox", () => {
  it("shows the whole box, touching the tighter axis, centred", () => {
    const box = { min: { x: 0, y: 0 }, max: { x: 400, y: 400 } };
    const t = fitBox(box, size);
    expect(t.scale).toBeCloseTo(900 / 400);
    expect(toScreen(t, box.min).y).toBeCloseTo(0);
    expect(toScreen(t, box.max).y).toBeCloseTo(900);
    expect(centreOf(t, size).x).toBeCloseTo(200);
  });
});

describe("interpolate", () => {
  const from: Transform = { position: { x: 0, y: 0 }, scale: 0.5 };
  const to = fitBox({ min: { x: 1000, y: 600 }, max: { x: 1200, y: 720 } }, size);

  it("lands exactly on both endpoints", () => {
    const start = interpolate(from, to, 0, size);
    const end = interpolate(from, to, 1, size);
    expect(start.scale).toBeCloseTo(from.scale);
    expect(start.position.x).toBeCloseTo(from.position.x);
    expect(end.scale).toBeCloseTo(to.scale);
    expect(end.position.x).toBeCloseTo(to.position.x);
    expect(end.position.y).toBeCloseTo(to.position.y);
  });

  it("zooms about the point that sits at the same screen spot in both shots", () => {
    // Fixed point P: P * s + p is equal for both transforms.
    const pivot = {
      x: (to.position.x - from.position.x) / (from.scale - to.scale),
      y: (to.position.y - from.position.y) / (from.scale - to.scale),
    };
    const expected = toScreen(from, pivot);
    for (const e of [0.25, 0.5, 0.75]) {
      const onScreen = toScreen(interpolate(from, to, e, size), pivot);
      expect(onScreen.x).toBeCloseTo(expected.x);
      expect(onScreen.y).toBeCloseTo(expected.y);
    }
  });

  it("moves the centre along a straight line", () => {
    const a = centreOf(from, size);
    const b = centreOf(to, size);
    const mid = centreOf(interpolate(from, to, 0.4, size), size);
    const cross = (mid.x - a.x) * (b.y - a.y) - (mid.y - a.y) * (b.x - a.x);
    expect(Math.abs(cross)).toBeLessThan(1e-6 * Math.hypot(b.x - a.x, b.y - a.y) ** 2);
  });

  it("pans linearly when the scale does not change", () => {
    const panTo: Transform = { position: { x: -800, y: 200 }, scale: from.scale };
    const half = interpolate(from, panTo, 0.5, size);
    expect(half.scale).toBeCloseTo(from.scale);
    expect(half.position.x).toBeCloseTo(-400);
    expect(half.position.y).toBeCloseTo(100);
  });
});

describe("animation settings codec", () => {
  it("round-trips every field", () => {
    const settings = { functionalMs: 350, cinematicMs: 6000, cinematicEaseIn: false };
    expect(decodeAnimationSettings(encodeAnimationSettings(settings))).toEqual({
      settings,
      writable: true,
    });
  });

  it("stays small: one-letter keys, whole numbers", () => {
    const encoded = JSON.stringify(encodeAnimationSettings(defaultAnimationSettings));
    expect(encoded).toBe('{"v":1,"f":540,"d":3000,"i":1}');
  });

  it("uses defaults and allows writes when the Room has nothing yet", () => {
    expect(decodeAnimationSettings(undefined)).toEqual({
      settings: defaultAnimationSettings,
      writable: true,
    });
  });

  it("refuses to overwrite an unknown (newer) format", () => {
    expect(decodeAnimationSettings({ v: 2, f: 1 }).writable).toBe(false);
  });

  it("clamps out-of-range and replaces malformed fields", () => {
    const { settings } = decodeAnimationSettings({ v: 1, f: 5, d: "slow", i: 7 });
    expect(settings.functionalMs).toBe(100);
    expect(settings.cinematicMs).toBe(defaultAnimationSettings.cinematicMs);
    expect(settings.cinematicEaseIn).toBe(defaultAnimationSettings.cinematicEaseIn);
  });
});

describe("framedBox", () => {
  const gm = { width: 1600, height: 900 };
  const tall = { min: { x: 0, y: 0 }, max: { x: 100, y: 400 } };

  it("contains the box and matches the viewport's aspect ratio", () => {
    const framed = framedBox(tall, gm);
    expect(framed.min.x).toBeLessThanOrEqual(0);
    expect(framed.max.x).toBeGreaterThanOrEqual(100);
    expect(framed.min.y).toBeCloseTo(0, 9);
    expect(framed.max.y).toBeCloseTo(400, 9);
    const width = framed.max.x - framed.min.x;
    const height = framed.max.y - framed.min.y;
    expect(width / height).toBeCloseTo(1600 / 900, 9);
  });

  it("keeps the box centred", () => {
    const framed = framedBox(tall, gm);
    expect((framed.min.x + framed.max.x) / 2).toBeCloseTo(50, 9);
  });

  it("fits to the same transform as the box it frames", () => {
    // So the GM's own shot is unchanged by sending the framed area instead of the preset box.
    const a = fitBox(tall, gm);
    const b = fitBox(framedBox(tall, gm), gm);
    expect(b.scale).toBeCloseTo(a.scale, 9);
    expect(b.position.x).toBeCloseTo(a.position.x, 6);
    expect(b.position.y).toBeCloseTo(a.position.y, 6);
  });
});
