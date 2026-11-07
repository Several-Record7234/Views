// Popover side of a recall: hand the target to this client's background page,
// which animates it. Fire-and-forget: the motion outlives the popover. Until
// the background page has answered the presence check, fall back to OBR's
// native animation so a jump is never silently dropped.
import OBR, { Math2 } from '@owlbear-rodeo/sdk';
import { ShotTarget } from '../animation/animator';
import { RecallRequest, epochNow, recallChannel } from '../animation/recallProtocol';
import { useBackgroundStatus } from '../context/useBackgroundStatus';

const nativeRecall = async (to: ShotTarget): Promise<void> => {
    if (to.kind === 'box') await OBR.viewport.animateToBounds(Math2.boundingBox([to.box.min, to.box.max]));
    else await OBR.viewport.animateTo(to.transform);
};

export const requestRecall = async (to: ShotTarget): Promise<void> => {
    if (useBackgroundStatus.getState().status !== 'ready') return nativeRecall(to);
    const request: RecallRequest = { kind: 'recall', to, sentAt: epochNow() };
    await OBR.broadcast.sendMessage(recallChannel, request, { destination: 'LOCAL' });
};
