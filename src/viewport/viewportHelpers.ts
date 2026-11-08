import { StarredBox, StarredLegacy, isStarredBox, isStarredLegacy } from '../helper/types';

type Vector = { x: number; y: number };

/**
 * World-space corners a legacy transform shows on a viewport of the given size.
 * Computed rather than read back after a jump, because animateTo resolves
 * before the viewport has moved.
 */
export const legacyTransformToBox = (
    transform: { position: Vector; scale: number },
    viewportSize: { width: number; height: number },
): { min: Vector; max: Vector } => {
    const { position, scale } = transform;
    return {
        min: { x: -position.x / scale, y: -position.y / scale },
        max: {
            x: (viewportSize.width - position.x) / scale,
            y: (viewportSize.height - position.y) / scale,
        },
    };
};

/**
 * Undo the broken legacy migration: it saved the pre-jump viewport over the
 * preset and reassigned its owner to whoever jumped. That migration was the
 * only writer of a box under a legacy id, so any box whose id matches a legacy
 * transform entry is damaged and is restored verbatim from the legacy key.
 */
export const restoreDamagedLegacy = (
    current: Array<StarredBox | StarredLegacy>,
    legacyStars: Array<StarredBox | StarredLegacy>,
): { stars: Array<StarredBox | StarredLegacy>; restoredCount: number } => {
    const originals = new Map(legacyStars.filter(isStarredLegacy).map((star) => [star.id, star]));
    let restoredCount = 0;
    const stars = current.map((star) => {
        const original = isStarredBox(star) ? originals.get(star.id) : undefined;
        if (!original) return star;
        restoredCount++;
        return original;
    });
    return { stars, restoredCount };
};

export const deriveFilteredPlayerIds = (playerFilters: Record<string, boolean>): string[] =>
    Object.entries(playerFilters)
        .filter(([, show]) => !show)
        .map(([id]) => id);

export const applyViewportDelete = (
    current: Array<StarredBox | StarredLegacy>,
    id: string,
): Array<StarredBox | StarredLegacy> | undefined => {
    const filtered = current.filter((v) => v.id !== id);
    return filtered.length ? filtered : undefined;
};

/**
 * What the Player Tokens button frames: an image created by a non-GM player now in
 * the party. Shared by the jump and the button's enabled state, so they never
 * disagree. `type === 'IMAGE'` is exactly the SDK's `isImage`, which can't be
 * imported here (the SDK does not load under Vitest).
 */
export const isPlayerOwnedImage = (
    item: { type: string; createdUserId: string },
    nonGMids: readonly string[],
): boolean => item.type === 'IMAGE' && nonGMids.includes(item.createdUserId);

type ItemBounds = {
    image: { width: number; height: number };
    scale: { x: number; y: number };
    position: { x: number; y: number };
};

export const calcItemsBoundingBox = (
    items: ItemBounds[],
): { min: { x: number; y: number }; max: { x: number; y: number } } | null => {
    // No items has no bounds. The fold below would return an infinite box, which
    // the recall validator rightly rejects (and animateToBounds was once handed).
    if (items.length === 0) return null;
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    items.forEach((item) => {
        const halfWidth = (item.image.width * item.scale.x) / 2;
        const halfHeight = (item.image.height * item.scale.y) / 2;
        if (item.position.x - halfWidth < minX) minX = item.position.x - halfWidth;
        if (item.position.y - halfHeight < minY) minY = item.position.y - halfHeight;
        if (item.position.x + halfWidth > maxX) maxX = item.position.x + halfWidth;
        if (item.position.y + halfHeight > maxY) maxY = item.position.y + halfHeight;
    });
    return { min: { x: minX, y: minY }, max: { x: maxX, y: maxY } };
};
