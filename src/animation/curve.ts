// Pure viewport-animation maths: no SDK imports, so it runs under Vitest.

export type Vector = { x: number; y: number };
export type Box = { min: Vector; max: Vector };
export type ViewportSize = { width: number; height: number };
/** OBR viewport transform: screen = world * scale + position. */
export type Transform = { position: Vector; scale: number };

/** Below this log-ratio two scales are treated as equal (pure pan). */
const SAME_SCALE_EPSILON = 1e-6;

/**
 * Every curve eases out to a gradual stop.
 * - `expo-out`: functional recalls. Matches native `animateTo`, measured 2026-11-07 as an
 *   exponential approach (time constant ~77-80ms, 99.9% at ~530ms): at 540ms this has the
 *   same time constant, so it starts at native speed and glides in the same way. Reaches
 *   99.9% at t=1; the animator then places the exact final frame.
 * - `cubic-in-out` / `cubic-out`: Cinematic Mode, with and without its ease-in setting.
 */
export type Easing = 'expo-out' | 'cubic-out' | 'cubic-in-out';

const curves: Record<Easing, (t: number) => number> = {
    'expo-out': (t) => (t >= 1 ? 1 : 1 - Math.pow(2, -10 * t)),
    'cubic-out': (t) => 1 - Math.pow(1 - t, 3),
    'cubic-in-out': (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2),
};

export const ease = (t: number, easing: Easing): number => curves[easing](Math.min(1, Math.max(0, t)));

export const centreOf = (transform: Transform, size: ViewportSize): Vector => ({
    x: (size.width / 2 - transform.position.x) / transform.scale,
    y: (size.height / 2 - transform.position.y) / transform.scale,
});

const transformFor = (centre: Vector, scale: number, size: ViewportSize): Transform => ({
    scale,
    position: { x: size.width / 2 - centre.x * scale, y: size.height / 2 - centre.y * scale },
});

/** Largest scale that shows the whole box, centred, on this viewport. */
export const fitBox = (box: Box, size: ViewportSize): Transform => {
    const boxWidth = Math.max(box.max.x - box.min.x, Number.EPSILON);
    const boxHeight = Math.max(box.max.y - box.min.y, Number.EPSILON);
    const scale = Math.min(size.width / boxWidth, size.height / boxHeight);
    const centre = { x: (box.min.x + box.max.x) / 2, y: (box.min.y + box.max.y) / 2 };
    return transformFor(centre, scale, size);
};

/**
 * The world area a viewport of this size actually shows once `box` is fitted:
 * the box, padded out along one axis to the viewport's aspect ratio.
 */
export const framedBox = (box: Box, size: ViewportSize): Box => {
    const { position, scale } = fitBox(box, size);
    return {
        min: { x: -position.x / scale, y: -position.y / scale },
        max: { x: (size.width - position.x) / scale, y: (size.height - position.y) / scale },
    };
};

/**
 * The viewport at eased progress `e` (0..1) from `from` to `to`.
 *
 * Scale is interpolated logarithmically so the zoom rate looks even. The world
 * centre moves in proportion to 1/scale, which makes the zoom pivot about the
 * one world point that sits at the same screen position in both shots: a
 * push-in holds its point of interest still, and the centre still travels in a
 * straight line. With no change of scale this reduces to a linear pan.
 */
export const interpolate = (from: Transform, to: Transform, e: number, size: ViewportSize): Transform => {
    const fromCentre = centreOf(from, size);
    const toCentre = centreOf(to, size);
    const logRatio = Math.log(to.scale / from.scale);
    const scale = from.scale * Math.exp(logRatio * e);
    const progress =
        Math.abs(logRatio) < SAME_SCALE_EPSILON
            ? e
            : (1 / scale - 1 / from.scale) / (1 / to.scale - 1 / from.scale);
    const centre = {
        x: fromCentre.x + (toCentre.x - fromCentre.x) * progress,
        y: fromCentre.y + (toCentre.y - fromCentre.y) * progress,
    };
    return transformFor(centre, scale, size);
};
