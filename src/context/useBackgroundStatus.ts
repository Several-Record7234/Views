import { create } from 'zustand';

/**
 * Whether this client's background page (which animates every jump) is running.
 * `checking` until it answers or the wait runs out; recalls use OBR's native
 * animation unless the status is `ready`.
 */
export type BackgroundStatus = 'checking' | 'ready' | 'missing';

export type BackgroundStatusStore = {
    status: BackgroundStatus;
    setStatus: (status: BackgroundStatus) => void;
};

export const useBackgroundStatus = create<BackgroundStatusStore>()((set) => ({
    status: 'checking',
    setStatus: (status) => set(() => ({ status })),
}));
