import { Vector2, ViewportTransform } from '@owlbear-rodeo/sdk';

export const metadataId = 'dev.views/metadata';
/**
 * Storage key used by the original jump-to-viewport extension. Read only, for
 * a one-time import into our own namespace; never written to.
 */
export const legacyMetadataId = 'com.omarbenmegdoul.jumpToViewport3/metadata';
export interface SceneMetadata {
    [metadataId]: {
        starredViewports: Array<StarredBox | StarredLegacy> | undefined;
        /** @deprecated Filter state is now stored in localStorage. Present only for migration. */
        filters?: Record<string, UserFilter>;
    };
}

export type UserFilter = {
    players: Record<string, boolean>;
    absents: boolean;
};

export type Starred = {
    id: string;
    name: string;
    playerId?: string;
};
export type StarredLegacy = Starred & {
    transform: ViewportTransform;
};

export type StarredBox = Starred & {
    boundingCorners: { max: Vector2; min: Vector2 };
};

export type ViewportHandler = (viewport: StarredLegacy | StarredBox) => Promise<void>;

export const isStarredBox = (value: unknown): value is StarredBox => {
    if (!isRecord(value)) return false;
    if (typeof value.id !== 'string' || !value.name) return false;
    const corners = value.boundingCorners;
    return isRecord(corners) && isVector2(corners.max) && isVector2(corners.min);
};

export function validMetadata(value: unknown): value is SceneMetadata {
    if (typeof value !== 'object' || value === null) return false;
    return metadataId in value && isViewportMetadata(value[metadataId]);
    // doesn't check filters
}

export function isViewportMetadata(value: unknown): value is SceneMetadata[typeof metadataId] {
    return hasStarredViewport(value) && isArrayofStarred(value.starredViewports);
}

export const isObject = (value: unknown): value is object => {
    return typeof value === 'object' && value !== null;
};

export const isRecord = (value: unknown): value is Record<string, unknown> => {
    return (
        typeof value === 'object' &&
        value !== null &&
        !Array.isArray(value) &&
        !(value instanceof Date) &&
        !(value instanceof RegExp)
    );
};

export const hasStarredViewport = (
    value: unknown,
): value is Record<'starredViewports', unknown> => {
    return isObject(value) && 'starredViewports' in value;
};

export const canSalvageViewportMetadata = (
    value: unknown,
): value is Record<'starredViewports', undefined | unknown[]> => {
    return (
        hasStarredViewport(value) &&
        (Array.isArray(value.starredViewports) || value.starredViewports === undefined)
    );
};

function isVector2(value: unknown): value is Vector2 {
    return (
        isObject(value) &&
        'x' in value &&
        typeof value.x === 'number' &&
        'y' in value &&
        typeof value.y === 'number'
    );
}

function isViewportTransform(value: unknown): value is ViewportTransform {
    return (
        isObject(value) &&
        'position' in value &&
        isVector2(value.position) &&
        'scale' in value &&
        typeof value.scale === 'number'
    );
}

export function isStarredLegacy(value: unknown): value is StarredLegacy {
    return (
        isObject(value) &&
        'id' in value &&
        typeof value.id === 'string' &&
        'name' in value &&
        typeof value.name === 'string' &&
        'transform' in value &&
        isViewportTransform(value.transform)
    );
}

export const isStarredBase = (value: unknown): value is Starred => {
    return isObject(value) && 'id' in value && typeof value.id === 'string' && 'name' in value;
};

export const isValidStar = (value: unknown): value is StarredBox | StarredLegacy => {
    return isStarredBase(value) && (isStarredLegacy(value) || isStarredBox(value));
};

function isArrayofStarred(value: unknown): value is StarredLegacy[] {
    return value === undefined || (Array.isArray(value) && value.every(isValidStar));
}
