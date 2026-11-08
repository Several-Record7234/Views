// Background page: owns all viewport animation for this client. It keeps
// running when the popover is closed (measured 2026-11-07), where the popover's
// own loop would freeze mid-shot.
import OBR from '@owlbear-rodeo/sdk';
import { ShotTarget, createAnimator } from './animation/animator';
import { AnimationSettings, animationSettingsId, decodeAnimationSettings } from './animation/settings';
import {
    PresenceMessage,
    epochNow,
    isPresenceMessage,
    isRecallRequest,
    presenceChannel,
    recallChannel,
} from './animation/recallProtocol';
import {
    SyncedJumpMessage,
    cinematicChannel,
    isCinematicMessage,
    shouldHonourCinematic,
    syncedJumpArea,
    toCinematicShot,
    toSyncedJumpShot,
} from './animation/cinematicProtocol';

// A background page gets no requestAnimationFrame at all, even while it is
// "visible" (measured 2026-11-07), so the clock is a timer. 16ms gave ~59
// frames/s with a worst gap of 19ms and looked smooth.
const FRAME_INTERVAL_MS = 16;

// Dev timing only. Each recall gets its own record, so a recall cancelled by a
// newer one still reports when its own first frame went out.
let currentTiming: { firstFrameAt: number | null } = { firstFrameAt: null };

/** The Cinematic shot now playing, if any, so a Stop for an older shot is ignored. */
let runningCinematicId: string | null = null;

/** Our popover paused this GM's latched Sync View for a shot; turn it back on when the shot ends. */
let syncViewToResume = false;

const animator = createAnimator({
    now: () => performance.now(),
    schedule: (callback) => {
        setTimeout(callback, FRAME_INTERVAL_MS);
    },
    readViewport: async () => {
        const [position, scale, width, height] = await Promise.all([
            OBR.viewport.getPosition(),
            OBR.viewport.getScale(),
            OBR.viewport.getWidth(),
            OBR.viewport.getHeight(),
        ]);
        return { transform: { position, scale }, size: { width, height } };
    },
    applyTransform: async ({ position, scale }) => {
        currentTiming.firstFrameAt ??= epochNow();
        await Promise.all([OBR.viewport.setPosition(position), OBR.viewport.setScale(scale)]);
    },
});

OBR.onReady(async () => {
    let settings: AnimationSettings = decodeAnimationSettings(undefined).settings;
    const applyRoomMetadata = (metadata: Record<string, unknown>) => {
        settings = decodeAnimationSettings(metadata[animationSettingsId]).settings;
    };
    OBR.room.onMetadataChange(applyRoomMetadata);
    try {
        applyRoomMetadata(await OBR.room.getMetadata());
    } catch (error) {
        console.error('[Views] could not read animation settings; using defaults', error);
    }

    const ownConnectionId = await OBR.player.getConnectionId();

    const resumeSyncView = () => {
        syncViewToResume = false;
        OBR.player
            .setSyncView(true)
            .catch((error: unknown) => console.error('[Views] could not turn Sync View back on', error));
    };

    // A GM's latched Sync View makes OBR mirror every jump to the players at
    // ~10 messages/s, step-wise on their screens (measured 2026-11-08). A pause we
    // are still to undo counts as latched: a second jump mid-shot finds it off.
    const shouldSyncJump = async (): Promise<boolean> => {
        if (syncViewToResume) return true;
        const [role, syncView] = await Promise.all([OBR.player.getRole(), OBR.player.getSyncView()]);
        return role === 'GM' && syncView;
    };

    // Pause (2 messages), one shot to everyone (1), re-latch when it ends (3):
    // a flat cost, against ~2 + duration/100ms for the mirrored jump.
    const startSyncedJump = async (to: ShotTarget) => {
        const [width, height] = await Promise.all([OBR.viewport.getWidth(), OBR.viewport.getHeight()]);
        if (!syncViewToResume) await OBR.player.setSyncView(false);
        syncViewToResume = true;
        const message: SyncedJumpMessage = {
            kind: 'jump',
            id: crypto.randomUUID(),
            to: syncedJumpArea(to, { width, height }),
            durationMs: settings.functionalMs,
        };
        // Claimed before sending, so a shot that ends before our own copy
        // arrives does not re-latch Sync View under this jump.
        runningCinematicId = message.id;
        try {
            await OBR.broadcast.sendMessage(cinematicChannel, message, { destination: 'ALL' });
        } catch (error) {
            // Still move: re-latch first, so the players follow the mirrored jump as before.
            console.error('[Views] could not send the synced jump; mirroring it instead', error);
            runningCinematicId = null;
            resumeSyncView();
            await animator.play({ to, durationMs: settings.functionalMs, easing: 'expo-out' });
        }
    };

    OBR.broadcast.onMessage(recallChannel, async (event) => {
        // Any client can broadcast on this channel. Only our own popover may move our viewport.
        if (event.connectionId !== ownConnectionId) {
            if (import.meta.env.DEV) console.warn('[Views] ignored a recall from another connection', event.connectionId);
            return;
        }
        if (!isRecallRequest(event.data)) {
            console.error('[Views] malformed recall request', event.data);
            return;
        }
        const request = event.data;
        try {
            if (await shouldSyncJump()) {
                await startSyncedJump(request.to);
                return;
            }
        } catch (error) {
            console.error('[Views] could not check Sync View; jumping on this client only', error);
        }
        const receivedAt = epochNow();
        const timing = { firstFrameAt: null as number | null };
        currentTiming = timing;
        runningCinematicId = null; // this recall replaces any running shot
        const result = await animator.play({ to: request.to, durationMs: settings.functionalMs, easing: 'expo-out' });
        if (result.outcome === 'failed') console.error('[Views] recall animation failed', result.error);
        if (import.meta.env.DEV) {
            console.log('[Views] recall', {
                outcome: result.outcome,
                messageLatencyMs: Math.round((receivedAt - request.sentAt) * 10) / 10,
                clickToFirstFrameMs: timing.firstFrameAt === null ? null : Math.round((timing.firstFrameAt - request.sentAt) * 10) / 10,
                durationMs: settings.functionalMs,
                totalMs: Math.round(epochNow() - request.sentAt),
            });
        }
    });

    // Cinematic Mode: shots and stops from our own popover (Preview, and our own
    // copy of a Go) or from a GM's client. The roster is read fresh per message,
    // so a GM who has just been demoted is no longer obeyed.
    OBR.broadcast.onMessage(cinematicChannel, async (event) => {
        if (!isCinematicMessage(event.data)) {
            console.error('[Views] malformed Cinematic message', event.data);
            return;
        }
        const message = event.data;
        let trusted = event.connectionId === ownConnectionId;
        if (!trusted) {
            try {
                trusted = shouldHonourCinematic(event.connectionId, ownConnectionId, await OBR.party.getPlayers());
            } catch (error) {
                console.error('[Views] could not check who sent a Cinematic shot; ignoring it', error);
                return;
            }
        }
        if (!trusted) {
            console.warn('[Views] ignored a Cinematic message from a non-GM connection', event.connectionId);
            return;
        }
        if (message.kind === 'stop') {
            if (runningCinematicId === message.id) animator.cancel();
            return;
        }
        currentTiming = { firstFrameAt: null };
        runningCinematicId = message.id;
        // Held here, not per message: a second Go mid-shot finds Sync View already
        // off, so its own flag is false, yet the first shot's pause still needs undoing.
        if (message.kind === 'shot' && event.connectionId === ownConnectionId && message.resumeSyncView) {
            syncViewToResume = true;
        }
        const label = message.kind === 'shot' ? 'Cinematic shot' : 'synced jump';
        const result = await animator.play(message.kind === 'shot' ? toCinematicShot(message) : toSyncedJumpShot(message));
        if (result.outcome === 'failed') console.error(`[Views] ${label} failed`, message.id, result.error);
        if (import.meta.env.DEV) console.log(`[Views] ${label}`, { id: message.id, outcome: result.outcome });
        // Superseded by a newer shot or synced jump: its end will resume Sync View.
        if (runningCinematicId !== message.id && runningCinematicId !== null) return;
        runningCinematicId = null;
        if (syncViewToResume) resumeSyncView();
    });

    const announceReady = () => {
        const ready: PresenceMessage = { kind: 'ready' };
        OBR.broadcast
            .sendMessage(presenceChannel, ready, { destination: 'LOCAL' })
            .catch((error: unknown) => console.error('[Views] could not announce the background page', error));
    };
    OBR.broadcast.onMessage(presenceChannel, (event) => {
        if (event.connectionId !== ownConnectionId) return;
        if (isPresenceMessage(event.data) && event.data.kind === 'ping') announceReady();
    });
    // Covers a popover that loaded first and has already pinged.
    announceReady();
});
