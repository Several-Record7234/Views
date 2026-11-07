// Popover side of the GM animation settings. The background page reads the
// same Room key live (background.ts), so a saved change applies to the next
// jump on every client without any extra message.
import OBR, { Metadata } from '@owlbear-rodeo/sdk';
import { useCallback, useEffect, useState } from 'react';
import {
    AnimationSettings,
    animationSettingsId,
    decodeAnimationSettings,
    defaultAnimationSettings,
    encodeAnimationSettings,
} from './settings';

export interface AnimationSettingsState {
    settings: AnimationSettings;
    /** False while loading, and when the Room holds a newer format this build must not overwrite. */
    writable: boolean;
    loaded: boolean;
    save: (change: Partial<AnimationSettings>) => Promise<void>;
}

export const useAnimationSettings = (): AnimationSettingsState => {
    const [settings, setSettings] = useState<AnimationSettings>(defaultAnimationSettings);
    const [writable, setWritable] = useState(false);
    const [loaded, setLoaded] = useState(false);

    useEffect(() => {
        const apply = (metadata: Metadata) => {
            const decoded = decodeAnimationSettings(metadata[animationSettingsId]);
            setSettings(decoded.settings);
            setWritable(decoded.writable);
            setLoaded(true);
        };
        const unsubscribe = OBR.room.onMetadataChange(apply);
        OBR.room
            .getMetadata()
            .then(apply)
            .catch((error: unknown) => console.error('[Views] could not read animation settings', error));
        return unsubscribe;
    }, []);

    // Re-read the Room just before writing, so a field another GM changed a
    // moment ago is kept rather than overwritten with this popover's stale copy.
    const save = useCallback(async (change: Partial<AnimationSettings>) => {
        const current = decodeAnimationSettings((await OBR.room.getMetadata())[animationSettingsId]);
        if (!current.writable) {
            throw new Error('Room animation settings use a newer format; not overwriting them');
        }
        await OBR.room.setMetadata({
            [animationSettingsId]: encodeAnimationSettings({ ...current.settings, ...change }),
        });
    }, []);

    return { settings, writable, loaded, save };
};
