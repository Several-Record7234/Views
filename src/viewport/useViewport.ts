import { useEffect, useState } from 'react';
import OBR, { Vector2, Math2, isImage } from '@owlbear-rodeo/sdk';
import {
    SceneMetadata,
    StarredBox,
    StarredLegacy,
    UserFilter,
    canSalvageViewportMetadata,
    isStarredBox,
    isStarredLegacy,
    isValidStar,
    legacyMetadataId,
    metadataId,
    validMetadata,
} from '../helper/types';
import { usePlayerContext } from '../context/PlayerContext';
import { usePartyContext } from '../context/PartyContext';
import { deriveFilteredPlayerIds, applyViewportDelete, calcItemsBoundingBox } from './viewportHelpers';

const makeId = () => {
    return crypto.randomUUID();
};
const reset = async () => {
    await OBR.viewport.reset();
};

const starred = (metadata: SceneMetadata | null) =>
    metadata && metadata[metadataId].starredViewports ? metadata[metadataId].starredViewports : [];

// Keep only the entries we can parse, discarding broken ones rather than
// rejecting the whole list.
const salvageStars = (value: unknown[] | undefined): Array<StarredBox | StarredLegacy> =>
    Array.isArray(value) ? value.filter(isValidStar) : [];

const defaultFilters: UserFilter = { players: {}, absents: true };

const filtersKey = (userId: string) => `views:filters:${userId}`;

const readLocalFilters = (userId: string): UserFilter => {
    try {
        const raw = localStorage.getItem(filtersKey(userId));
        if (!raw) return { ...defaultFilters };
        const parsed: unknown = JSON.parse(raw);
        if (typeof parsed !== 'object' || parsed === null) return { ...defaultFilters };
        const p = parsed as Record<string, unknown>;
        return {
            players: typeof p.players === 'object' && p.players !== null
                ? (p.players as Record<string, boolean>)
                : {},
            absents: typeof p.absents === 'boolean' ? p.absents : true,
        };
    } catch {
        return { ...defaultFilters };
    }
};

const writeLocalFilters = (userId: string, filters: UserFilter) => {
    localStorage.setItem(filtersKey(userId), JSON.stringify(filters));
};

const getViewportBounds = async () => {
    const [height, width, min] = await Promise.all([
        OBR.viewport.getHeight(),
        OBR.viewport.getWidth(),
        OBR.viewport.inverseTransformPoint({ x: 0, y: 0 }),
    ]);
    // get world coordinates for top-left of viewpoint
    const max = await OBR.viewport.inverseTransformPoint({ x: width, y: height });

    return { min, max };
};

const jumpToLegacy = async ({ transform }: StarredLegacy) => {
    await OBR.viewport.animateTo(transform);
};

const jumpToBoundingBox = async ({ boundingCorners }: Pick<StarredBox, 'boundingCorners'>) => {
    const { min, max } = boundingCorners;
    const bbox = Math2.boundingBox([min, max]);
    await OBR.viewport.animateToBounds(bbox);
};

const constructStarredBox = ({
    id,
    viewportName,
    min,
    max,
    currentUserId,
}: {
    id?: string;
    viewportName: string;
    min: Vector2;
    max: Vector2;
    currentUserId: string;
}): StarredBox => ({
    id: id ?? makeId(),
    name: viewportName,
    boundingCorners: { min, max },
    playerId: currentUserId,
});

const getPlayerImages = async (nonGMids: string[]) => {
    return (await OBR.scene.items.getItems((item) => nonGMids.includes(item.createdUserId))).filter(
        isImage,
    );
};


const defaultSceneMetadata: SceneMetadata = {
    [metadataId]: { starredViewports: [] },
};

export const useViewport = () => {
    const currentUser = usePlayerContext();
    const { id: currentUserId } = currentUser;
    const { nonGMPlayers } = usePartyContext();
    const [metadata, setMetadata] = useState<SceneMetadata>(defaultSceneMetadata);
    // 'error' means the scene held data under our key that we could not parse;
    // writes are blocked in that state so we never clobber unreadable presets.
    const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
    const [localFilters, setLocalFilters] = useState<UserFilter>(() =>
        readLocalFilters(currentUserId),
    );
    useEffect(() => {
        // Copy a user's prior filter prefs into localStorage on first sight,
        // unless they already have local prefs. Used for both our own legacy
        // (in-metadata) filters and those imported from jump-to-viewport.
        const migrateLegacyFilters = (filters: Record<string, UserFilter> | undefined) => {
            const legacyFilter = filters?.[currentUserId];
            if (legacyFilter && !localStorage.getItem(filtersKey(currentUserId))) {
                writeLocalFilters(currentUserId, legacyFilter);
                setLocalFilters(legacyFilter);
            }
        };

        const fetchMetadata = async () => {
            const sceneMetadata = await OBR.scene.getMetadata();
            if (validMetadata(sceneMetadata)) {
                setMetadata(sceneMetadata);
                migrateLegacyFilters(sceneMetadata[metadataId].filters);
                setStatus('ready');
                return;
            }
            // Our own key exists but the value is malformed. Salvage every valid
            // preset and discard only the broken entries, rather than letting the
            // next write overwrite the whole list. If nothing can be read, block
            // writes so we never clobber unreadable data.
            if (metadataId in sceneMetadata) {
                const raw = (sceneMetadata as Record<string, unknown>)[metadataId];
                if (canSalvageViewportMetadata(raw)) {
                    setMetadata({ [metadataId]: { starredViewports: salvageStars(raw.starredViewports) } });
                    setStatus('ready');
                    return;
                }
                console.error('Views: scene metadata is corrupt and could not be read', raw);
                setStatus('error');
                return;
            }
            // Our key is absent. One-time import from the original
            // jump-to-viewport extension, if this scene has presets stored under
            // its key. The legacy key is read only and left untouched.
            const legacyRaw = (sceneMetadata as Record<string, unknown>)[legacyMetadataId];
            if (canSalvageViewportMetadata(legacyRaw)) {
                const imported = salvageStars(legacyRaw.starredViewports);
                setMetadata({ [metadataId]: { starredViewports: imported } });
                migrateLegacyFilters(
                    (legacyRaw as { filters?: Record<string, UserFilter> }).filters,
                );
                if (imported.length) {
                    // Persist into our namespace so the import survives reloads
                    // and is visible to other clients. Idempotent across clients.
                    await OBR.scene.setMetadata({
                        [metadataId]: { starredViewports: imported },
                    });
                }
                setStatus('ready');
                return;
            }
            // Genuinely fresh scene, or legacy data too broken to import.
            setStatus('ready');
        };
        fetchMetadata();
    }, []);
    useEffect(() => {
        return OBR.scene.onMetadataChange((m) => {
            // Validate before trusting data from the SDK
            if (!validMetadata(m)) return;
            const obrMetadata = m;
            setMetadata((prev) => {
                if (JSON.stringify(obrMetadata[metadataId]) !== JSON.stringify(prev[metadataId])) {
                    return starred(obrMetadata).length ? obrMetadata : defaultSceneMetadata;
                }
                return prev;
            });
        });
    }, [currentUserId]);

    // Read the authoritative preset list straight from the scene immediately
    // before a write, so a concurrent save from another client is merged rather
    // than clobbered. Falls back to our last-known-good list only if the scene
    // somehow holds unreadable data mid-session.
    const readCurrentStarred = async (): Promise<Array<StarredBox | StarredLegacy>> => {
        const sceneMetadata = await OBR.scene.getMetadata();
        if (validMetadata(sceneMetadata)) {
            return sceneMetadata[metadataId].starredViewports ?? [];
        }
        if (metadataId in sceneMetadata) {
            const raw = (sceneMetadata as Record<string, unknown>)[metadataId];
            if (canSalvageViewportMetadata(raw)) return salvageStars(raw.starredViewports);
            return starred(metadata);
        }
        return [];
    };

    const starViewport = async (viewportName: string) => {
        if (status === 'error') return;
        const trimmed = viewportName.trim();
        if (!trimmed) throw new Error('Viewport name must not be blank');
        const { min, max } = await getViewportBounds();
        const current = await readCurrentStarred();
        if (current.some((v) => v.name === trimmed))
            throw new Error(`A viewport named "${trimmed}" already exists`);

        await OBR.scene.setMetadata({
            [metadataId]: {
                starredViewports: [
                    ...current,
                    constructStarredBox({ currentUserId, viewportName: trimmed, min, max }),
                ],
            },
        });
    };
    const deleteViewport = async (viewport: StarredLegacy | StarredBox) => {
        if (status === 'error') return;
        const current = await readCurrentStarred();
        await OBR.scene.setMetadata({
            [metadataId]: { starredViewports: applyViewportDelete(current, viewport.id) },
        });
    };

    const jumpTo = async ({ id }: StarredLegacy | StarredBox) => {
        const star = starred(metadata).find((v) => v.id === id);
        if (!star) {
            throw new Error(`Jumping Error: No viewport with id ${id} exists`);
        }
        if (isStarredBox(star)) {
            await jumpToBoundingBox(star);
        }

        if (isStarredLegacy(star)) {
            await jumpToLegacy(star);
            await overwriteViewport({ id });
        }
    };

    const filterPlayer = (filteredPlayerId: string, show: boolean) => {
        const updated: UserFilter = {
            ...localFilters,
            players: { ...localFilters.players, [filteredPlayerId]: show },
        };
        writeLocalFilters(currentUserId, updated);
        setLocalFilters(updated);
    };

    const filterAbsent = (show: boolean) => {
        const updated: UserFilter = { ...localFilters, absents: show };
        writeLocalFilters(currentUserId, updated);
        setLocalFilters(updated);
    };

    const overwriteViewport = async ({ id: idToBeOverwritten }: { id: string }) => {
        if (status === 'error') return;
        const current = await readCurrentStarred();
        const viewportToBeDeleted = current.find(({ id }) => id === idToBeOverwritten);
        if (!viewportToBeDeleted) {
            throw new Error(
                `Overwrite Viewport Error: No viewport with id ${idToBeOverwritten} exists`,
            );
        }
        const { min, max } = await getViewportBounds();
        await OBR.scene.setMetadata({
            [metadataId]: {
                starredViewports: [
                    ...current.filter(({ id }) => id !== idToBeOverwritten),
                    constructStarredBox({
                        viewportName: viewportToBeDeleted.name,
                        min,
                        max,
                        currentUserId,
                        id: idToBeOverwritten,
                    }),
                ],
            },
        });
    };
    const nonGMids = nonGMPlayers?.map(({ id }) => id) || [];

    const jumpToPlayerItems = async () => {
        const items = await getPlayerImages(nonGMids);
        await jumpToBoundingBox({ boundingCorners: calcItemsBoundingBox(items) });
    };

    const filteredPlayerIds = deriveFilteredPlayerIds(localFilters.players);

    return {
        starredViewports: starred(metadata),
        starViewport,
        deleteViewport,
        reset,
        jumpTo,
        filterPlayer,
        filterAbsent,
        jumpToPlayerItems,
        filteredPlayerIds,
        showAbsentPlayers: localFilters.absents,
        metadataError: status === 'error',
    };
};
