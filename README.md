# <img src="public/icon.png" width="30" height="30"> Views

**Save named viewport bookmarks for any Owlbear Rodeo scene and jump back to them instantly.**

**Views** is an *Owlbear Rodeo* extension that lets you and your players save the current camera position as a named preset and return to it in one click. It is the successor to *Viewport Presets* by Omar Benmegdoul, rebuilt on a modern stack with safer scene-data handling.

> <img src="public/hero.png" width="1200">

## Table of Contents
- [Why Views?](#why-views)
- [Getting Started](#getting-started)
- [Saved Presets](#saved-presets)
- [Reset View and Player Images](#reset-view-and-player-images)
- [Filtering the List](#filtering-the-list)
- [GM and Player Capabilities](#gm-and-player-capabilities)
- [Troubleshooting](#troubleshooting)
- [Support](#support)
- [Privacy & Licensing](#privacy--licensing)
- [Icon Credits](#icon-credits)

---

## Why Views?

Large scenes are easy to get lost in. Panning back to the tavern, the boss arena, or the world map over and over breaks the flow of play. Views gives every table a shared set of named camera bookmarks, colour-coded by who made them, so the GM and players can all move to the same spot instantly. Presets live in the Scene, so they are there for everyone the next time the Scene is opened.

---

## Getting Started

### 1. Install the Extension

Copy the **Views** manifest URL:

```
https://views.several-record.com/manifest.json
```

Then head to your **Owlbear Rodeo Room** → **Extras** → **Extensions** → **+** (Add Custom Extension), paste the URL, and confirm.

### 2. Enable **Views** in Your Room

While still within the **Extensions Manager** popover, make sure **Views** is **toggled on** for this Room. You should see the <img src="public/icon.png" width="20" height="20"> **Views** icon appear in the top-left extension Action tray.

### 3. Save Your First View

Position the camera where you want it, type a name into the field at the bottom of the Views popover, and press **OK**.

---

## Saved Presets

> <img src="public/bookmarks.gif" width="600">

- Type a name and press **OK** to save the current camera position as a preset.
- Click any preset to fly the camera to it (the move is animated).
- Presets are **colour-coded by the player who created them**.
- Presets are stored in the Scene, so they persist for everyone and reappear the next time the Scene is loaded.
- If you previously used the original *Viewport Presets* extension, your existing bookmarks are imported automatically the first time you open a Scene in Views.

---

## Reset View and Player Images

> <img src="public/presets.gif" width="600">

- **Reset View** returns the camera to the Scene Default.
- **Player Images** flies the camera to frame all non-GM player tokens, wherever they currently are in the Scene. The button is disabled when no player tokens are present.

---

## Filtering the List

> <img src="public/filters.gif" width="600">

- Use the filter button to open the per-player toggles and hide presets you do not need to see.
- The **Absent players** toggle controls whether presets from players who are not currently connected are shown.
- Filter choices are personal: they are saved per user in your browser and do not affect anyone else's list.

---

## GM and Player Capabilities

| Action | Player | GM |
|---|---|---|
| Save a named preset | ✓ | ✓ |
| Jump to any preset | ✓ | ✓ |
| Reset View / Player Images | ✓ | ✓ |
| Filter the list (personal) | ✓ | ✓ |
| Delete **own** presets | ✓ | ✓ |
| Delete **any** preset | — | ✓ |
| "What's New" on version updates | — | ✓ |

---

## Troubleshooting

### "Saving is disabled and a corruption warning is shown"

- This appears only when the Scene holds viewport data that Views cannot read. To protect your existing presets from being overwritten, saving is blocked. Try reloading the Scene; if the warning persists, the Scene's viewport data may need to be cleared by the GM.

### "The popover looks wrong right after an update"

- Owlbear Rodeo can cache an older version. Refresh the browser tab to load the latest build. Closing and reopening the popover will not work, as Owlbear Rodeo keeps it loaded in the background rather than closing it.

---

## Support

Discord is the main OBR community hub and the place to find help and answers: join through this invite link https://discord.gg/u5RYMkV98s and search for "**Views**" to find the conversation about this extension, or open a new bug report in the **❓ | #extension-help** channel.

---

## Privacy & Licensing

**Views** is designed with privacy in mind:

- **No data collection.** Views has no analytics, telemetry, or external servers.
- **No external requests.** Fonts and icons are bundled with the extension; nothing is fetched from third-party CDNs at runtime.
- **Local processing.** Saved presets live in the Owlbear Rodeo Scene's own metadata. Your personal filter preferences are stored only in your browser's local storage.

Views is a fork of *Viewport Presets* by Omar Benmegdoul, used and continued with permission.

---

## Icon Credits

| Icon | Description | Author | Licence |
|------|-------------|--------|---------|
| filter_list, help, delete | Toolbar and row icons, inlined as SVG | [Google Material Symbols](https://fonts.google.com/icons) | Apache License 2.0 |

The Roboto typeface is bundled under the Apache License 2.0. The extension icon is original.
