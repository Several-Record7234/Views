// Messages from the popover to its own client's background page, which owns all
// viewport animation (an iframe only animates while it renders, and the popover
// stops rendering when closed). Always sent with destination LOCAL.
import { ShotTarget } from './animator';

export const recallChannel = 'dev.views/recall';

export interface RecallRequest {
    kind: 'recall';
    to: ShotTarget;
    /** Epoch ms (`performance.timeOrigin + performance.now()`), comparable across iframes. */
    sentAt: number;
}

const isVector = (value: unknown): boolean => {
    const v = value as Record<string, unknown> | null;
    return typeof v === 'object' && v !== null && Number.isFinite(v.x) && Number.isFinite(v.y);
};

const isShotTarget = (value: unknown): value is ShotTarget => {
    if (typeof value !== 'object' || value === null) return false;
    const target = value as Record<string, unknown>;
    if (target.kind === 'box') {
        const box = target.box as Record<string, unknown> | null;
        return typeof box === 'object' && box !== null && isVector(box.min) && isVector(box.max);
    }
    if (target.kind === 'transform') {
        const transform = target.transform as Record<string, unknown> | null;
        return (
            typeof transform === 'object' &&
            transform !== null &&
            isVector(transform.position) &&
            typeof transform.scale === 'number' &&
            transform.scale > 0 &&
            Number.isFinite(transform.scale)
        );
    }
    return false;
};

export const isRecallRequest = (value: unknown): value is RecallRequest => {
    if (typeof value !== 'object' || value === null) return false;
    const request = value as Record<string, unknown>;
    return request.kind === 'recall' && isShotTarget(request.to) && Number.isFinite(request.sentAt);
};

export const epochNow = () => performance.timeOrigin + performance.now();
