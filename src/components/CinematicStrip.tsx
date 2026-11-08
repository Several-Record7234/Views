import { Button } from './atoms/Button';
import { Icon } from './atoms/Icon';

type CinematicStripProps = {
    /** Cinematic Mode is switched on (and available). */
    active: boolean;
    /** The background page is running; without it there is no Cinematic Mode. */
    available: boolean;
    /** Why the toggle is disabled, shown on hover; null while available. */
    unavailableReason: string | null;
    onToggle: () => void;
    /** Slot labels, or null while the slot is empty. */
    startLabel: string | null;
    endLabel: string | null;
    onSwap: () => void;
    onCaptureStart: () => void;
    onCaptureEnd: () => void;
    onPreview: () => void;
    onGo: () => void;
    onStop: () => void;
    /** A shot id is running that Stop can halt. */
    canStop: boolean;
    notice: { tone: 'info' | 'error'; text: string } | null;
};

// GM-only. The first row is always shown: the toggle plus the A and B slots,
// greyed while the mode is off. Switching it on adds the transport row and the
// Current view row. Broadcast-switcher metaphor: slots change freely, Go fires.
export const CinematicStrip: React.FC<CinematicStripProps> = ({
    active,
    available,
    unavailableReason,
    onToggle,
    startLabel,
    endLabel,
    onSwap,
    onCaptureStart,
    onCaptureEnd,
    onPreview,
    onGo,
    onStop,
    canStop,
    notice,
}) => {
    const ready = startLabel !== null && endLabel !== null;
    const slotClass = (label: string | null, filled: string) =>
        `cinematic-slot ${!active ? 'slot-inactive' : label ? filled : 'slot-empty'}`;
    return (
        <div className="cinematic-strip">
            <div className="row">
                <Button
                    aria-label="Cinematic Mode (GM)"
                    aria-pressed={active}
                    title={unavailableReason ?? 'Cinematic Mode (GM)'}
                    disabled={!available}
                    className={`narrowest-cell ${active ? 'enabled' : ''}`}
                    onClick={onToggle}>
                    <Icon name="clapperboard" size="large" />
                </Button>
                <span className={slotClass(startLabel, 'slot-start')}>
                    <Icon name="play_arrow" size="small" />
                    <span className="ellipsis">{startLabel ?? 'Pick a start'}</span>
                </span>
                <Button
                    className="narrowest-cell"
                    title="Swap start and end"
                    aria-label="Swap start and end"
                    disabled={!active || (startLabel === null && endLabel === null)}
                    onClick={onSwap}>
                    <Icon name="swap_horiz" size="small" />
                </Button>
                <span className={slotClass(endLabel, 'slot-end')}>
                    <Icon name="stop" size="small" />
                    <span className="ellipsis">{endLabel ?? 'Pick an end'}</span>
                </span>
            </div>
            {active && (
                <>
                    <div className="row">
                        <Button className="cinematic-action" title="Play on your screen only" disabled={!ready} onClick={onPreview}>
                            Preview
                        </Button>
                        <Button className="cinematic-action" title="Play for everyone" disabled={!ready} onClick={onGo}>
                            Go
                        </Button>
                        <Button className="cinematic-action" title="Stop the shot for everyone" disabled={!canStop} onClick={onStop}>
                            Stop
                        </Button>
                    </div>
                    <div className="row">
                        <span className="wide-cell cinematic-current">Current view</span>
                        <Button className="narrowest-cell" title="Set as start" aria-label="Set current view as start" onClick={onCaptureStart}>
                            <Icon name="play_arrow" size="small" />
                        </Button>
                        <Button className="narrowest-cell" title="Set as end" aria-label="Set current view as end" onClick={onCaptureEnd}>
                            <Icon name="stop" size="small" />
                        </Button>
                    </div>
                    {notice && (
                        <div className={notice.tone === 'error' ? 'metadata-error' : 'cinematic-notice'} role="status">
                            {notice.text}
                        </div>
                    )}
                </>
            )}
        </div>
    );
};
