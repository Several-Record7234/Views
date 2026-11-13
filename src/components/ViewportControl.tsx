import { StarredBox, StarredLegacy, ViewportHandler } from '../helper/types';
import { useState } from 'react';
import { Button } from './atoms/Button';
import { Icon } from './atoms/Icon';

/** Present only while the GM is in Cinematic Mode: the row's delete button gives way to slot pickers. */
export type CinematicRowControls = {
    slot: 'start' | 'end' | null;
    onSetStart: () => void;
    onSetEnd: () => void;
};

type ViewportControlProps = {
    viewport: StarredBox | StarredLegacy;
    deleteViewport: ViewportHandler;
    jumpTo: ViewportHandler;
    color?: string;
    disableDeletion: boolean;
    cinematic?: CinematicRowControls;
};
export const ViewportControl: React.FC<ViewportControlProps> = ({
    viewport,
    jumpTo,
    color,
    deleteViewport,
    disableDeletion,
    cinematic,
}) => {
    const [deleting, setDeleting] = useState<boolean>(false);
    if (cinematic) {
        const slotClass = cinematic.slot === 'start' ? 'slot-start' : cinematic.slot === 'end' ? 'slot-end' : '';
        return (
            <li className="row" key={viewport.id}>
                <Button
                    aria-label={`Go to viewport: ${viewport.name}`}
                    onClick={() => jumpTo(viewport)}
                    className={`wide-cell owned slot-row ${slotClass}`}
                    style={{ borderColor: color }}>
                    {cinematic.slot === 'start' && <Icon name="shot_start" size="small" />}
                    <span className="slot-name">{viewport.name}</span>
                    {cinematic.slot === 'end' && <Icon name="shot_end" size="small" />}
                </Button>
                <Button
                    className={`narrowest-cell ${cinematic.slot === 'start' ? 'enabled' : ''}`}
                    title={cinematic.slot === 'start' ? 'Clear start' : 'Set as start'}
                    aria-label={cinematic.slot === 'start' ? 'Clear start' : `Set ${viewport.name} as start`}
                    aria-pressed={cinematic.slot === 'start'}
                    onClick={cinematic.onSetStart}>
                    <Icon name="shot_start" size="small" />
                </Button>
                <Button
                    className={`narrowest-cell ${cinematic.slot === 'end' ? 'enabled' : ''}`}
                    title={cinematic.slot === 'end' ? 'Clear end' : 'Set as end'}
                    aria-label={cinematic.slot === 'end' ? 'Clear end' : `Set ${viewport.name} as end`}
                    aria-pressed={cinematic.slot === 'end'}
                    onClick={cinematic.onSetEnd}>
                    <Icon name="shot_end" size="small" />
                </Button>
            </li>
        );
    }
    return (
        <li className="row" key={viewport.id}>
            {deleting ? (
                <>
                    <Button
                        aria-label="Cancel"
                        onClick={() => setDeleting(false)}
                        className="narrow-cell owned">
                        Cancel
                    </Button>
                    <Button
                        onClick={() => deleteViewport(viewport)}
                        aria-label={`Delete ${viewport.name}`}
                        className="wide-cell owned pulse-border"
                        disabled={disableDeletion}>
                        Delete {viewport.name}
                    </Button>
                </>
            ) : (
                <>
                    <Button
                        aria-label={`Go to viewport: ${viewport.name}`}
                        onClick={() => jumpTo(viewport)}
                        className="wide-cell owned"
                        style={{ borderColor: color }}>
                        {viewport.name}
                    </Button>
                    <Button
                        onClick={() => setDeleting(true)}
                        aria-label={`Delete ${viewport.name}`}
                        className="narrow-cell"
                        disabled={disableDeletion}>
                        <Icon name="delete" />
                    </Button>
                </>
            )}
        </li>
    );
};
