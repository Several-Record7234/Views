import { Player } from '@owlbear-rodeo/sdk';
import { StarredBox, StarredLegacy, ViewportHandler } from '../helper/types';
import { CinematicRowControls, ViewportControl } from './ViewportControl';

type PlayerControlProps = {
    color?: string;
    viewports: Array<StarredBox | StarredLegacy>;
    currentUser: Player;
    deleteViewport: ViewportHandler;
    jumpTo: ViewportHandler;
    /** Cinematic Mode only: the slot controls for each preset. */
    cinematicFor?: (viewport: StarredBox | StarredLegacy) => CinematicRowControls;
};
export const ControlGroup: React.FC<PlayerControlProps> = ({
    viewports,
    color,
    currentUser,
    deleteViewport,
    jumpTo,
    cinematicFor,
}) =>
    viewports.map((viewport) => (
        <ViewportControl
            {...{
                key: viewport.id,
                viewport,
                deleteViewport,
                jumpTo,
                color,
                cinematic: cinematicFor?.(viewport),
                disableDeletion: Boolean(
                    currentUser.role !== 'GM' &&
                        viewport.playerId &&
                        currentUser.id !== viewport.playerId,
                ),
            }}
        />
    ));
