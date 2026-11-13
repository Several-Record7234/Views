// A player's jump refused by their own background page while a GM's Cinematic
// shot plays: say so with a toast, rather than let the click silently do nothing.
// Shown from the popover, which is open (the click came from it); whether a
// background page can raise a notification has not been verified.
import OBR from '@owlbear-rodeo/sdk';
import { useEffect } from 'react';
import { isRecallRefused, recallRefusedChannel } from '../animation/recallProtocol';

export const useRefusedRecallNotice = (): void => {
    useEffect(() => {
        let unsubscribe: (() => void) | null = null;
        let stopped = false;
        // Repeated clicks replace the toast rather than stack copies of it.
        let shownId: string | null = null;
        const show = async () => {
            // The old toast may have timed out already; a failed close must not cost the new one.
            if (shownId) {
                await OBR.notification
                    .close(shownId)
                    .catch((error: unknown) => console.warn('[Views] could not close the previous notice', error));
            }
            shownId = await OBR.notification.show('A GM Cinematic shot is playing; your Views preset was skipped.', 'WARNING');
        };
        OBR.player
            .getConnectionId()
            .then((ownConnectionId) => {
                if (stopped) return;
                unsubscribe = OBR.broadcast.onMessage(recallRefusedChannel, (event) => {
                    if (event.connectionId !== ownConnectionId || !isRecallRefused(event.data)) return;
                    show().catch((error: unknown) => console.error('[Views] could not show the skipped-jump notice', error));
                });
            })
            .catch((error: unknown) => console.error('[Views] could not listen for refused jumps', error));
        return () => {
            stopped = true;
            unsubscribe?.();
        };
    }, []);
};
