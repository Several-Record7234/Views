import { Button } from './atoms/Button';
import { useRef, useState } from 'react';
import { Icon, IconProps } from './atoms/Icon';
import { ConfirmationMonitor, ConfirmationStatus } from '../animation/confirmationMonitor';

// Not colour alone: each status has its own glyph, and the tooltip names it.
const statusDisplay: Record<ConfirmationStatus, { icon: IconProps['name']; label: string }> = {
    waiting: { icon: 'play_arrow', label: 'Waiting…' },
    completed: { icon: 'check', label: 'Arrived' },
    stopped: { icon: 'stop', label: 'Stopped' },
    failed: { icon: 'close', label: 'Failed' },
    'no-response': { icon: 'question_mark', label: 'No response' },
};

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
    onClearStart: () => void;
    onClearEnd: () => void;
    onCaptureStart: () => void;
    onCaptureEnd: () => void;
    onPreview: () => void;
    onGo: () => void;
    onStop: () => void;
    /** A shot id is running that Stop can halt. */
    canStop: boolean;
    notice: { tone: 'info' | 'error'; text: string } | null;
    /** Replies to the last confirmed Go, or null. */
    monitor: ConfirmationMonitor | null;
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
    onClearStart,
    onClearEnd,
    onCaptureStart,
    onCaptureEnd,
    onPreview,
    onGo,
    onStop,
    canStop,
    notice,
    monitor,
}) => {
    const ready = startLabel !== null && endLabel !== null;
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
                <SlotChip which="start" label={startLabel} active={active} onClear={onClearStart} />
                <Button
                    className="narrowest-cell"
                    title="Swap start and end"
                    aria-label="Swap start and end"
                    disabled={!active || (startLabel === null && endLabel === null)}
                    onClick={onSwap}>
                    <Icon name="swap_horiz" size="small" />
                </Button>
                <SlotChip which="end" label={endLabel} active={active} onClear={onClearEnd} />
            </div>
            {active && (
                <>
                    <div className="row">
                        <Button className="cinematic-action" title="Play on your screen only" disabled={!ready} onClick={onPreview}>
                            Preview
                        </Button>
                        <Button className="cinematic-action" title="Play for everyone" disabled={!ready} onClick={onGo}>
                            <Icon name="play_arrow" size="small" />
                            Go
                        </Button>
                        <Button className="cinematic-action" title="Stop the shot for everyone" disabled={!canStop} onClick={onStop}>
                            <Icon name="stop" size="small" />
                            Stop
                        </Button>
                    </div>
                    {monitor && (
                        <div className="row confirmation-monitor">
                            {monitor.entries.map(({ connectionId, name, status }) => {
                                const { icon, label } = statusDisplay[status];
                                return (
                                    <span
                                        key={connectionId}
                                        className={`confirmation confirmation-${status}`}
                                        title={`${name}: ${label}`}
                                        role="img"
                                        aria-label={`${name}: ${label}`}>
                                        <Icon name={icon} size="small" />
                                    </span>
                                );
                            })}
                        </div>
                    )}
                    <div className="row">
                        <span className="wide-cell cinematic-current">Current view</span>
                        <Button className="narrowest-cell" title="Set as start" aria-label="Set current view as start" onClick={onCaptureStart}>
                            <Icon name="shot_start" size="small" />
                        </Button>
                        <Button className="narrowest-cell" title="Set as end" aria-label="Set current view as end" onClick={onCaptureEnd}>
                            <Icon name="shot_end" size="small" />
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

type SlotChipProps = {
    which: 'start' | 'end';
    /** The picked preset's name, or null while the slot is empty. */
    label: string | null;
    active: boolean;
    onClear: () => void;
};

// A filled slot is a button that clears it. Its marker sits at the outside edge
// (start left, end right), and the full name shows on hover only when truncated.
const SlotChip: React.FC<SlotChipProps> = ({ which, label, active, onClear }) => {
    const nameRef = useRef<HTMLSpanElement>(null);
    const [truncated, setTruncated] = useState(false);
    const state = !active ? 'slot-inactive' : label ? (which === 'start' ? 'slot-start' : 'slot-end') : 'slot-empty';
    const marker = <Icon key="marker" name={which === 'start' ? 'shot_start' : 'shot_end'} size="small" />;
    const name = (
        <span key="name" className="ellipsis slot-name" ref={nameRef}>
            {label ?? (which === 'start' ? 'Pick a start' : 'Pick an end')}
        </span>
    );
    const content = which === 'start' ? [marker, name] : [name, marker];
    if (!active || label === null) return <span className={`cinematic-slot ${state}`}>{content}</span>;
    const clearLabel = which === 'start' ? 'Clear start' : 'Clear end';
    return (
        <button
            type="button"
            className={`cinematic-slot ${state}`}
            title={truncated ? `${label} (Click to clear)` : clearLabel}
            aria-label={`${clearLabel}: ${label}`}
            onMouseEnter={() => {
                const element = nameRef.current;
                setTruncated(element !== null && element.scrollWidth > element.clientWidth);
            }}
            onClick={onClear}>
            {content}
        </button>
    );
};
