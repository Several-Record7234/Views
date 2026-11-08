import { useViewport } from '../viewport/useViewport.ts';
import { ContextWrapper } from './ContextWrapper.tsx';
import { useSceneReady } from '../context/useSceneReady.ts';
import { useEffect, useState } from 'react';
import { usePlayerContext } from '../context/PlayerContext.ts';
import { usePartyContext } from '../context/PartyContext.ts';
import { Icon } from './atoms/Icon.tsx';
import { Button } from './atoms/Button.tsx';
import { ControlGroup } from './ControlGroup.tsx';
import { TitleRow } from './TitleRow.tsx';
import { AnimationSettingsPanel } from './AnimationSettingsPanel.tsx';
import { ErrorBoundary } from './ErrorBoundary.tsx';
import { useBackgroundStatus } from '../context/useBackgroundStatus.ts';
import { watchBackground } from '../viewport/watchBackground.ts';
import { useCinematic } from '../viewport/useCinematic.ts';
import { CinematicStrip } from './CinematicStrip.tsx';

export const Views = () => {
    const { isReady } = useSceneReady();
    return (
        <ErrorBoundary>
            <ContextWrapper>{isReady ? <Content /> : 'loading'}</ContextWrapper>
        </ErrorBoundary>
    );
};

const Content = () => {
    const {
        reset,
        deleteViewport,
        starViewport,
        starredViewports,
        filteredPlayerIds,
        jumpTo,
        filterPlayer,
        filterAbsent,
        showAbsentPlayers,
        jumpToPlayerItems,
        metadataError,
    } = useViewport();

    const backgroundStatus = useBackgroundStatus((store) => store.status);
    useEffect(() => watchBackground(), []);

    const [draftViewportName, setDraftViewportName] = useState<string>('');
    const { players, nonGMPlayers } = usePartyContext();
    const currentUser = usePlayerContext();
    const allPlayers = [currentUser, ...(players ?? [])];
    const [showFilters, setShowFilters] = useState<boolean>(false);
    const [showAnimationSettings, setShowAnimationSettings] = useState<boolean>(false);
    const isGM = currentUser.role === 'GM';
    const [cinematicOn, setCinematicOn] = useState<boolean>(false);
    const cinematic = useCinematic(starredViewports);
    // Cinematic shots are animated by the background page; without it there is no Cinematic Mode.
    const cinematicAvailable = backgroundStatus === 'ready';
    const showCinematic = isGM && cinematicOn && cinematicAvailable;
    const cinematicFor = showCinematic
        ? (viewport: (typeof starredViewports)[number]) => ({
              slot: cinematic.slotOf(viewport.id),
              onSetStart: () => cinematic.setPreset('start', viewport.id),
              onSetEnd: () => cinematic.setPreset('end', viewport.id),
          })
        : undefined;

    // Group presets by owner in a single pass. Presets whose owner is absent from
    // the party (no playerId, or an id not in allPlayers) fall into the unowned
    // bucket; everything else is keyed by playerId for O(1) per-player lookup.
    type Preset = (typeof starredViewports)[number];
    const allPlayerIds = new Set(allPlayers.map(({ id }) => id));
    const presetsByPlayer = new Map<string, Preset[]>();
    const unownedPresets: Preset[] = [];
    for (const viewport of starredViewports) {
        if (viewport.playerId && allPlayerIds.has(viewport.playerId)) {
            const bucket = presetsByPlayer.get(viewport.playerId);
            if (bucket) bucket.push(viewport);
            else presetsByPlayer.set(viewport.playerId, [viewport]);
        } else {
            unownedPresets.push(viewport);
        }
    }

    return (
        <div>
            <TitleRow />
            <section className="extension-section">
                <div className="row" key="default">
                    <Button onClick={reset} className="wide-cell" aria-label="Reset View">
                        Reset View
                    </Button>
                    <Button
                        onClick={jumpToPlayerItems}
                        className="wide-cell"
                        aria-label="Player Tokens"
                        disabled={!Boolean(nonGMPlayers?.length)}>
                        Player Tokens
                    </Button>
                    <Button
                        aria-label={showFilters ? 'Hide filters' : 'Show filters'}
                        className={`narrowest-cell ${showFilters ? 'enabled' : ''}`}
                        onClick={() => setShowFilters((prev) => !prev)}>
                        <Icon name="filter_list" size="small" />
                    </Button>
                    {isGM && (
                        <Button
                            aria-label="Animation settings (GM)"
                            aria-pressed={showAnimationSettings}
                            title="Animation settings (GM)"
                            className={`narrowest-cell ${showAnimationSettings ? 'enabled' : ''}`}
                            onClick={() => setShowAnimationSettings((prev) => !prev)}>
                            <Icon name="settings" size="small" />
                        </Button>
                    )}
                </div>
                {isGM && (
                    <CinematicStrip
                        active={showCinematic}
                        available={cinematicAvailable}
                        unavailableReason={
                            backgroundStatus === 'missing'
                                ? "Cinematic Mode unavailable: Views' background task is absent."
                                : null
                        }
                        onToggle={() => setCinematicOn((prev) => !prev)}
                        startLabel={cinematic.startLabel}
                        endLabel={cinematic.endLabel}
                        onSwap={cinematic.swap}
                        onCaptureStart={() => cinematic.capture('start')}
                        onCaptureEnd={() => cinematic.capture('end')}
                        onPreview={cinematic.preview}
                        onGo={cinematic.go}
                        onStop={cinematic.stop}
                        canStop={cinematic.canStop}
                        notice={cinematic.notice}
                    />
                )}
                {showFilters && (
                    <div className="filter">
                        <div className="filters-section flex-row">
                            {allPlayers?.map((player) => (
                                <label className="switch" key={player.id}>
                                    <span className="visually-hidden">
                                        Toggle player {player.name}
                                    </span>

                                    <input
                                        type="checkbox"
                                        checked={!filteredPlayerIds.includes(player.id)}
                                        onChange={(ev) => {
                                            filterPlayer(player.id, ev.target.checked);
                                        }}
                                        aria-labelledby={`playerToggleLabel-${player.id}`}
                                    />
                                    <span
                                        id={`playerToggleLabel-${player.id}`}
                                        className="slider round"
                                        style={
                                            !filteredPlayerIds.includes(player.id)
                                                ? {
                                                      backgroundColor: player.color,
                                                      borderColor: player.color,
                                                  }
                                                : { borderColor: player.color }
                                        }></span>
                                </label>
                            ))}
                        </div>
                        <div className="filters-section flex-row">
                            <span>Absent players:</span>
                            <label className="switch">
                                <span className="visually-hidden">Toggle absent players</span>
                                <input
                                    type="checkbox"
                                    checked={showAbsentPlayers}
                                    onChange={(ev) => {
                                        filterAbsent(ev.target.checked);
                                    }}
                                    aria-labelledby="absentToggleLabel"
                                />
                                <span
                                    id="absentToggleLabel"
                                    className="slider round"
                                    style={
                                        showAbsentPlayers
                                            ? {
                                                  backgroundColor: 'var(--color-crust)',
                                                  borderColor: 'var(--color-crust)',
                                              }
                                            : { borderColor: 'var(--color-crust)' }
                                    }></span>
                            </label>
                        </div>
                    </div>
                )}
                {isGM && showAnimationSettings && <AnimationSettingsPanel />}
            </section>
            <ul className="extension-section">
                {allPlayers
                    ?.filter(({ id }) => !filteredPlayerIds.includes(id))
                    .map((player) => (
                        <ControlGroup
                            {...{
                                currentUser,
                                deleteViewport,
                                color: player.color,
                                viewports: presetsByPlayer.get(player.id) ?? [],
                                jumpTo,
                                cinematicFor,
                                key: player.id,
                            }}
                        />
                    ))}
                <ControlGroup
                    {...{
                        currentUser,
                        deleteViewport,
                        viewports: unownedPresets,
                        jumpTo,
                        cinematicFor,
                    }}
                />
            </ul>
            <section className="extension-section">
                {metadataError && (
                    <div className="metadata-error" role="alert">
                        This Scene's saved viewports could not be read and may be corrupted. Saving
                        is disabled to avoid overwriting them. Try reloading the Scene.
                    </div>
                )}
                <form
                    className="row"
                    onSubmit={async (e) => {
                        e.preventDefault();
                        await starViewport(draftViewportName);
                        setDraftViewportName('');
                    }}>
                    <input
                        aria-label="Viewport Name"
                        placeholder="Enter viewport name"
                        value={draftViewportName}
                        onChange={(ev) => setDraftViewportName(ev.target.value)}
                        className="wide-cell"
                        disabled={metadataError}
                    />
                    <Button
                        aria-label="Save this viewport"
                        className="narrow-cell"
                        type="submit"
                        disabled={
                            metadataError ||
                            !draftViewportName ||
                            starredViewports.map(({ name }) => name).includes(draftViewportName)
                        }>
                        OK
                    </Button>
                </form>
            </section>
        </div>
    );
};
