import OBR, { Player } from '@owlbear-rodeo/sdk';
import { PlayerContext } from '../context/PlayerContext.ts';
import { PropsWithChildren, useEffect, useState } from 'react';
import { PluginGate } from '../context/PluginGateContext.tsx';
import { PartyContext } from '../context/PartyContext.ts';
import { changelog, getUnseenEntries } from '../changelog.ts';

export const ContextWrapper = (props: PropsWithChildren) => {
    const [player, setPlayer] = useState<Player | null>(null);
    const [ready, setReady] = useState<boolean>(false);
    const [party, setParty] = useState<Player[] | null>(null);

    useEffect(() => {
        if (!OBR.isAvailable) return;
        OBR.onReady(async () => {
            setReady(true);
            const [role, id, color, syncView, metadata, connectionId, selection, name, party] =
                await Promise.all([
                    OBR.player.getRole(),
                    OBR.player.getId(),
                    OBR.player.getColor(),
                    OBR.player.getSyncView(),
                    OBR.player.getMetadata(),
                    OBR.player.getConnectionId(),
                    OBR.player.getSelection(),
                    OBR.player.getName(),
                    OBR.party.getPlayers(),
                ]);
            setPlayer({ role, id, color, syncView, metadata, connectionId, selection, name });
            setParty(party);
            // Keep player data current for the session (name, colour, role can change)
            OBR.player.onChange((updatedPlayer) => setPlayer(updatedPlayer));
            // Keep the party roster current (joins, leaves, role/colour changes).
            // Owned here so there is exactly one subscription, not one per consumer.
            OBR.party.onChange((updatedParty) => setParty(updatedParty));

            // What's New modal (GM only, fires once per new version)
            if (role === "GM") {
              const lastSeen = localStorage.getItem("views:lastSeenVersion");
              if (!lastSeen) {
                if (changelog.length > 0) localStorage.setItem("views:lastSeenVersion", changelog[0].version);
              } else {
                const unseen = getUnseenEntries(changelog, lastSeen);
                if (unseen.length > 0) {
                  OBR.modal.open({
                    id: "dev.views.whats-new",
                    url: `/whats-new.html?lastSeen=${encodeURIComponent(lastSeen)}`,
                    width: 360,
                    height: 480,
                  }).then(() => {
                    if (changelog.length > 0) localStorage.setItem("views:lastSeenVersion", changelog[0].version);
                  }).catch(() => {});
                }
              }
            }
        });
    }, []);

    if (ready) {
        return (
            <PluginGate>
                <PlayerContext.Provider value={player}>
                    <PartyContext.Provider
                        value={{
                            players: party,
                            nonGMPlayers:
                                [player, ...(party || [])].filter((player): player is Player =>
                                    Boolean(player && player.role !== 'GM'),
                                ) || null,
                        }}>
                        {props.children}
                    </PartyContext.Provider>
                </PlayerContext.Provider>
            </PluginGate>
        );
    } else {
        return '...';
    }
};
