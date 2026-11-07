// Popover side of a recall: hand the target to this client's background page,
// which animates it. Fire-and-forget: the motion outlives the popover.
import OBR from '@owlbear-rodeo/sdk';
import { ShotTarget } from '../animation/animator';
import { RecallRequest, epochNow, recallChannel } from '../animation/recallProtocol';

export const requestRecall = async (to: ShotTarget): Promise<void> => {
    const request: RecallRequest = { kind: 'recall', to, sentAt: epochNow() };
    await OBR.broadcast.sendMessage(recallChannel, request, { destination: 'LOCAL' });
};
