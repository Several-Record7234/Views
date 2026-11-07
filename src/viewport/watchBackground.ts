// Popover side of the presence handshake (see recallProtocol.ts). Event-driven:
// one ping when the popover opens, never a poll. The wait only decides when to
// show the notice; clicks never wait on it, they just use native animation
// until the background page has answered.
import OBR from '@owlbear-rodeo/sdk';
import { PresenceMessage, isPresenceMessage, presenceChannel } from '../animation/recallProtocol';
import { useBackgroundStatus } from '../context/useBackgroundStatus';

// A LOCAL round trip measured 1-3ms; this only has to outlast a background page
// that is still loading when the popover opens.
const READY_WAIT_MS = 1000;

/** Starts watching; returns the cleanup. A late `ready` still flips the status. */
export const watchBackground = (): (() => void) => {
    const { setStatus } = useBackgroundStatus.getState();
    let stopped = false;
    let unsubscribe: (() => void) | null = null;

    const timer = setTimeout(() => {
        if (useBackgroundStatus.getState().status === 'checking') {
            setStatus('missing');
            console.warn('[Views] background page did not answer; jumps use native animation');
        }
    }, READY_WAIT_MS);

    const start = async () => {
        const ownConnectionId = await OBR.player.getConnectionId();
        if (stopped) return;
        unsubscribe = OBR.broadcast.onMessage(presenceChannel, (event) => {
            if (event.connectionId !== ownConnectionId) return;
            if (isPresenceMessage(event.data) && event.data.kind === 'ready') setStatus('ready');
        });
        const ping: PresenceMessage = { kind: 'ping' };
        await OBR.broadcast.sendMessage(presenceChannel, ping, { destination: 'LOCAL' });
    };
    start().catch((error: unknown) => console.error('[Views] could not check for the background page', error));

    return () => {
        stopped = true;
        clearTimeout(timer);
        unsubscribe?.();
    };
};
