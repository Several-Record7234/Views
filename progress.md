# Views — progress.md

## 2026-11-13: phase 4 confirmations + popover layout (committed + pushed)

**Resume from [cinematic-mode-plan.md](cinematic-mode-plan.md)** ("Phase 4" has the design and results).

### Done
- Merged the web-session branch `e61d964` (feature notes in FEATURES_BUGS.md) by fast-forward.
- **Phase 4** `4755454` + `aaec88a`: opt-in confirmations ("Ask players to confirm each Go",
  GM settings panel, Room key `c`, default off). Monitor row under Preview/Go/Stop: one icon per
  other client in party order, hover "<name>: <status>" (Waiting… / Arrived / Stopped / Failed /
  No response). Shots are all-or-nothing: a player's own jumps are refused during a GM shot, with
  an approved OBR toast "A GM Cinematic shot is playing; your Views preset was skipped."
- **Cinematic UI**: bar-arrow start/end markers at the outside edges; play/stop on Go/Stop; a
  filled slot clears on click (hover "<name> (Click to clear)" when truncated); clicking a row's
  picked marker again clears it.
- **Layout**: `#app` `min-width: 0` (measured cause of the sideways scrollbar); pinned header;
  thin themed scrollbar with a stable gutter; 0.5rem side margins; preset names 12px.
- Account signed in from two browsers listed once (`uniqueById`); React keys no longer spread
  (`0d8d12d`).
- All 13 phase 4 live checks PASSED. Capture: 6 clients = 7 sends, ~42 deliveries. 110 tests.

### Immediate next actions
- [ ] Help page: comprehensive `README.md` (incl. Cinematic Mode and confirmations), then
      `/help.html` via the template's CSP-safe `build-help.js` (see the item below).
- [ ] Phase 5 hardening (see plan).

### Open questions
- **Broadcast billing** (Andrew checking): does OBR bill a confirmed Go per send (1 + N) or per
  delivery (~N + N², since REMOTE fans each reply out)? Confirmations stay off by default meanwhile.
- Two clients on one account show two icons with the same tooltip name; disambiguate (eg. "(2)")?
  Needs wording.

## 2026-11-07: viewport animation via background page (committed + pushed)

**Resume from [cinematic-mode-plan.md](cinematic-mode-plan.md)**: measured SDK facts, the agreed
Cinematic Mode design, the phase list and every live-test result.

### Done (2026-11-06 to 11-07)
- **Phase 0** `7b823a1`: legacy migration fix (box computed from the transform, owner kept) and
  once-per-Scene repair. Migration live-tested; **the repair path is unit-tested only** (no Scene
  with damaged presets available).
- **Phase 1 core** `e07adff`: `curve.ts` (named easings, fitBox, fixed-point zoom) and
  `settings.ts` (`dev.views/anim` Room codec; fields renamed `cinematicMs`/`cinematicEaseIn`).
- **Phase 2 spike settled**: a background page gets NO requestAnimationFrame; a 16ms setTimeout
  clock runs ~59 frames/s and looks smooth with the popover closed.
- **Background animator** `227f502`: all recalls animate in the background page; recall curve
  is `expo-out` at **540ms** (native animateTo measured as an exponential, tau ~78ms; chosen by
  feel). Framing matches animateToBounds on wide and tall boxes.
- **Absent-background fallback** `f5e710b`: open-time ping/ready handshake; native jumps until
  ready; stopgap notice. All three cases live-tested (present, absent, late).
- All pushed to origin/main 2026-11-07. 62 tests, build clean.

### Done (2026-11-07 evening)
- **Phase 1 GM settings UI** `a74d77a`: gear button (GM only) opens an inline panel, Jump
  duration and Cinematic duration in seconds plus Cinematic ease-in. Saves on blur/Enter,
  Escape reverts, clamps to limits, fresh-read before write. Copy approved (Set A). Limits
  CONFIRMED: jump 0.1-2s (0.54), Cinematic 0.5-15s (3), ease-in on. Live tests 1-3 PASSED
  (2s jump on a player client; clamping/Escape; no gear for players). **Test 4 (locked note on
  a newer-format Room) not yet run.**
- **Title row** (Murmur/Flicker style): "Views - view presets", Discord then Help links. The
  in-popover `?` toggle is gone, which fixed the top-row overflow (confirmed, no scrollbar).
  "Player Images" renamed "Player Tokens" everywhere incl. the 0.1.0 changelog (approved).

### Done (2026-11-08)
- **Phase 3, Cinematic Mode + Sync**: GM-only panel (clapperboard toggle, A/B slots, swap;
  Preview/Go/Stop row and Current view row while on), per-row ▶/■ slot pickers, Sync with a
  fresh Party-roster GM check, Stop scoped to the shot id, Sync View paused for a shot and
  re-latched after, slots sent as the GM's framed area (no end-of-shot jolt). Settings panel
  notes when this device's background task is absent. All 32 checklist items PASSED live,
  incl. forged shot/stop refused. Sync View message costs measured (see plan). Chaining deferred.

- **Phase 3.5, synced jumps** (evening, `3b68767`, pushed): a GM preset or Player Tokens jump with Sync View
  latched is one `jump` message played on every client, paused and re-latched by the GM's
  background page. Measured 8 messages (6 predicted; 2 trailing mirror messages, accepted), so
  cost-neutral at 540ms; the gain is smooth motion on players. All 9 live checks passed.
- **Player Tokens** (`957a513`, pushed): fixed an infinite-box console error with no player tokens (predates 3.5),
  and the button is now greyed with the hover reason "No player-owned tokens in this Scene."
  (approved) via `scene.items.onChange`. Live checks 10-12 passed. 90 tests, build clean.

### Immediate next actions
- [x] Phase 4: confirmations + GM confidence monitor. DONE 2026-11-13 (see above).
- [ ] **Help page, AFTER phase 3** (Andrew, 2026-11-07): write a comprehensive `README.md`
      covering Cinematic Mode, then generate `/help.html` from it on CF Pages via the project
      template's CSP-safe `build-help.js` (JS in `public/help.js`, no inline `<script>`). Until
      then the title-row Help link (`https://views.several-record.com/help.html`) leads nowhere.
      Fold anything useful from the now-unused `src/components/Help.tsx` into the README, then
      delete that file.

### Open questions
- ~~Phase 4 cost: accept 1 + N, or opt-in?~~ Opt-in (Andrew, 2026-11-13).
- Help list wording "player-owned images (typically their character tokens)" may want to
  follow the Player Tokens rename (Andrew's call).
- ~~`#app` is 340px wide in a 300px popover~~ RESOLVED 2026-11-13 (measured): it shrinks to fit
  (268px), but as a flex item of `body` it would not shrink below its min-content, so the
  Cinematic top row with two long slot names (~315px) widened it and every row with it. Fixed
  with `min-width: 0` on `#app`. Two earlier guesses (`.slot-row` sizing, `flex-wrap: nowrap`
  on `.extension-section`) did not fix it; both kept as harmless and consistent.
- **Popover layout (2026-11-13, live-checked, committed `aaec88a`):** fixed header (title row + Reset /
  Player Tokens / Filter / Settings), everything else scrolls; 0.5rem side margins; thin themed
  scrollbar with a stable gutter, which the header also reserves so the right edges align;
  preset names 12px (`.owned`). Header pinned, no sideways shift, wider rows, focus rings all PASSED.
- Catch-up for late joiners to a Cinematic shot.
- **Unmerged branch `origin/claude/views-extension-notes-bmqu1w`** (noted 2026-11-13): one
  commit, `e61d964` "Add feature notes: back button, Scene object links, list sorting", made by a
  separate claude.ai web session (not this run of sessions). It adds 8 lines to
  `FEATURES_BUGS.md` only, on top of `4def2b1`, so it fast-forwards cleanly onto main. Authored as
  `Claude <noreply@anthropic.com>`, not the canonical identity. MERGED 2026-11-13 by fast-forward
  (Andrew's call, authorship kept as is).

## 2026-08-14: Manifest-version injection bug fixed (portfolio-wide audit)

The `generateBundle`/`bundle["manifest.json"]` hook in `vite.config.ts` was a silent no-op —
`public/` files bypass Rollup's bundle entirely, so it never ran. `package.json` and the
committed manifest happened to already match (`0.1.0`), so nothing was visibly wrong, but it
would have silently drifted on the next version bump. Replaced with the Forms-pattern
`closeBundle` hook that rewrites `dist/manifest.json` post-copy.

## Current state (2026-06-30, hardening session)

Hardening + push session. Now 12 commits on `main`, all pushed to origin (latest `75c1f44`).
29/29 tests, build clean. Version 0.1.0. Not yet deployed.

### Done this session
- **Security review** — `/security-review` pass on the branch: **zero findings**. Client-side
  React/TS, no injection sinks, no `dangerouslySetInnerHTML`; CSP already in `public/_headers`.
- **DoD review** — largely compliant; data is cold (no per-frame loop, tiny N). Documented the
  intentional `StarredBox | StarredLegacy` union divergence (transitional, migrate-on-jump) in
  CLAUDE.md. Flattened the render path in `Views.tsx` to a single-pass `Map<playerId, Preset[]>`
  + unowned bucket, replacing per-player re-scans and an O(presets×players) unowned filter. (`75c1f44`)
- **Git remote repointed** — GitHub repo renamed `jump-to-viewport` → `Views`; local `origin`
  set to `https://github.com/Several-Record7234/Views.git`.

### Immediate next actions
- [ ] Export `public/icon.png` (white-on-transparent SVG is invisible on light bg) — user owns this
- [ ] Live user testing in an OBR Room
- [ ] Deploy to views.several-record.com (Cloudflare Pages)

### Optional cleanups deferred
- Dead `button.toggled` CSS rule in index.css
- vite.config.ts dev CORS → `server.headers` form

- 2026-06-30 23:20 -- SESSION END: security review (zero findings) + DoD pass (union documented, render path flattened) + remote repointed; pushed

---

## Current state (2026-06-30)

Beta-prep session. 9 commits on `main` (697b17f…e3c9397). 29/29 tests, build clean.
Version 0.1.0. Not yet deployed.

### Done this session
- **Data-safety load path** — salvage malformed metadata entry-by-entry; block writes +
  warn when unreadable, instead of clobbering. (`2ffabe0`)
- **Namespace migration** — canonical key now `dev.views/metadata`; the original
  `com.omarbenmegdoul.jumpToViewport3/metadata` is read-only, imported once per Scene,
  never written/deleted. (`2ffabe0`)
- **0.1.0 release metadata** — version reconciled (pkg+manifest), author set, changelog
  styled to Murmur house format. (`19dad79`, `697b17f`)
- **Party subscription hoisted** to ContextWrapper (was duplicated per consumer);
  **fresh-read-before-write** on save/delete/overwrite. (`af689f0`)
- **Hardening** — self-hosted Roboto, Material Symbols replaced with 3 inline SVGs, strict
  `public/_headers` CSP + OBR CORS, dead `src/css` SCSS tree removed. Zero runtime external
  requests now. (`ea4071c`, `ca432f1`)
- **Packaging** — loading spinner, full README, author fit to OBR 46-char limit, homepage_url
  = views.several-record.com, "Reset" → "Reset View", Scene Default copy, support → OBR
  Discord, square icon buttons to fix row overflow. (`1603b85`, `5947087`, `e3c9397`)

### Immediate next actions
- [ ] Export `public/icon.png` (white-on-transparent SVG is invisible on light bg) — user owns this
- [ ] `/security-review` pass on the branch
- [ ] DOD data-structure review + live user testing
- [ ] Deploy to views.several-record.com (Cloudflare Pages)

### Optional cleanups deferred
- Dead `button.toggled` CSS rule in index.css
- vite.config.ts dev CORS → `server.headers` form

- 2026-06-30 22:48 -- SESSION END: data-safety + namespace migration + hardening + packaging for 0.1.0 beta

---

## Current state (2026-03-26)

All 8 remediation phases complete and pushed (`9585b81`).
29/29 tests passing. Build clean (267 kB JS, 9.98 kB CSS).

Remaining work: webstore submission prep (icon, store listing copy, screenshots).

## What was done (2026-03-26)

- Forked from `jump-to-viewport` by Omar Benmegdoul; renamed package to `views`.
- **package.json** — replaced with portfolio-standard stack; removed sass, eslint plugins,
  prettier, vite-plugin-mkcert, @types/node, globals; added vitest ^2, @tailwindcss/vite,
  @vitejs/plugin-react, react/react-dom 19, OBR SDK ^3.1.0. Kept zustand (see CLAUDE.md).
- **vite.config.ts** — replaced with portfolio standard (base "", react plugin, tailwindcss
  plugin, manifest-version injection, CORS for owlbear.rodeo).
- **tsconfig.json** — replaced with portfolio standard (moduleResolution: bundler, strict,
  noEmit, etc.). Removed baseUrl/paths that were causing bare module import issues.
- **.gitignore** — replaced with portfolio standard.
- **CSS migration** — removed SCSS dependency; created `src/index.css` with Tailwind
  `@import`, Catppuccin Mocha `@theme` tokens, and all component styles as plain CSS.
  Updated `main.ts` import from `./css/main.scss` to `./index.css`.
- **TypeScript fixes** — updated `ControlGroup.tsx` and `ViewportControl.tsx` to use
  relative `../helper/types` import (was bare `helper/types` relying on old baseUrl).
- **Tests** — created `src/tests/helpers.test.ts` with 22 tests covering `mod`, type guards
  (`isRecord`, `isObject`, `isStarredBox`, `isStarredLegacy`, `isValidStar`), and
  `validMetadata`. All pass.
- **Pre-commit hook** — installed at `.git/hooks/pre-commit`; runs `npm test && npm run build`.
- **UI polish** — all hardcoded colours replaced with Catppuccin CSS variables; full button
  and input theming added; `index.html` title and `manifest.json` updated.

## Build & test results (post-remediation)

- `npm run build`: PASS (zero errors, 267 kB JS, 9.98 kB CSS)
- `npm test`: PASS (29/29 tests)

---

## Remediation — COMPLETE (2026-03-26)

All 17 review issues resolved across 8 phases. Each phase built and tested clean before commit.

| Phase | Issues | Commit | Summary |
|---|---|---|---|
| 1 | #7 #11 #15 #17 | `989cefb` | Null guard in main.ts; rename `SceneReadyContext` → `useSceneReady`; remove dead `mod`; `starViewport` name validation |
| 2 | #10 | `52c2619` | `isStarredBox` now accepts `unknown`, matching `isStarredLegacy`; test casts removed |
| 3 | #4 #5 #6 | `af3b5c4` | `defaultSceneMetadata` at module level; `validMetadata` applied to live subscription; `currentUserId` in effect deps |
| 4 | #1 #2 #9 | `5e18d0b` | `[]` on party subscription; `onReadyChange` cleanup + guard; `getPlayers` parallelised |
| 5 | #3 #8 #12 | `cd4572a` | Removed duplicate `OBR.onReady`; added `OBR.player.onChange` subscription; `setPlayers` → `_setPlayers` (internal) |
| 6 | #16 | `5d8cb81` | `ErrorBoundary` wrapping full tree; shows recovery message on uncaught error |
| 7 | #13 | `89bd856` | Filters moved from shared scene metadata to `localStorage` (`views:filters:{userId}`); one-way migration from legacy data; `filterPlayer`/`filterAbsent` are now synchronous |
| 8 | #14 | `9585b81` | `deriveFilteredPlayerIds`, `applyViewportDelete`, `calcItemsBoundingBox` extracted to `viewportHelpers.ts`; 10 new tests |

## Security — Dependency Audit (2026-03-26, portfolio overseer)

**5 moderate** — all related to `esbuild <=0.24.2` via `vite`
- CVE: esbuild dev server allows cross-origin requests (GHSA-67mh-4wv8-2f99)
- **Assessment**: dev server only — not present in production static build. Low risk.
- Suggested fix (`npm audit fix --force`) would install Vite 8.0.3 — breaking change, not worth it
- No action required until a Vite 5-compatible esbuild patch is available

## Housekeeping — Next Session

- [ ] **Adopt the Conceal-style Action popover contrast border** _(deferred rollout of a shared pattern)_. The Catppuccin Base Action popover sits ~1.05:1 against OBR's dark Scene navy and dissolves into the canvas; separate it with a bordered edge, not a fill change (no dark Catppuccin fill beats the Scene).
  - Recipe + gotchas: `../owlbear-rodeo-extensions-SKILL-patterns.md` → `## Popover surface contrast`.
  - Live impls: `../Conceal/src/index.css` (standalone popover: `index.html` inline body style owns the fill) and `../Forms/src/components/ActionPanel.tsx` (multi-popover: an effect stamps the border on `document.body`, scoped to the Action popover's iframe).
  - Approach: if other popovers share `index.css`, use the Forms iframe-scoped effect (a plain CSS rule leaks the border to the tool/config popovers); if the Action popover is standalone, the Conceal `index.html` inline approach is simplest.
  - Details: 2px Overlay border (`#6c7086` dark / `#9ca0b0` light) + 16px radius to match OBR's popover mask; `box-border` so the border subtracts from the dynamic-height content box; bump the popover `HEIGHT_BUFFER` ~+4px to cover the body border the height math doesn't measure.
  - Acceptance: popover reads as a distinct panel in both light and dark themes, 16px matches OBR's corners, no scroll nub introduced.

- [x] Include What's New modal files in next commit: `src/changelog.ts`, `src/whatsNew.tsx`, `whats-new.html`, modified `src/components/ContextWrapper.tsx`, `vite.config.ts` — DONE (`697b17f`)
- [ ] Apply standard `.claude/settings.json` baseline template (see Recommendation B in `c:\Coding\agent-permissions-audit.md`)

---

## Session Log

- 2026-06-30 22:57 -- SESSION START: run /security-review pass on the branch

- 2026-11-06 21:00 -- SESSION START: viewport animation spike, then phases 0-2 of custom-curve + cinematic Sync (START recovered from transcript; logged late)
- 2026-11-06 23:30 -- SESSION END: viewport spike measured; phase 0 migration fix+repair and phase 1 animation core built (uncommitted); phase 2 background spike built, not run; Cinematic Mode design agreed (see cinematic-mode-plan.md)
- 2026-11-07 17:27 -- SESSION START: settings rename to cinematic-only ease-in, then phase 2 background-page spike
- 2026-11-07 20:56 -- SESSION END: background-page animator + exponential recall (540ms) + absent-background fallback built, live-tested, committed and pushed (f5e710b)
- 2026-11-07 21:28 -- SESSION START: phase 1 GM animation settings UI (recall + Cinematic durations, Cinematic ease-in)
- 2026-11-07 22:09 -- SESSION END: GM animation settings panel (a74d77a) + title row and Player Tokens rename (19d017c), live tests 1-3 passed, all pushed; help page moved after phase 3
- 2026-11-08 14:24 -- SESSION START: phase 3, Cinematic Mode strip (A/B slots, Preview, Go) + GM-verified Sync
- 2026-11-08 20:30 -- SESSION END: phase 3 Cinematic Mode + Sync built, 32 live checks passed, committed and pushed (ec73de1); Sync View message costs measured; phase 3.5 scoped (Sync View jumps as synced shots); next is phase 4
- 2026-11-08 20:53 -- SESSION START: phase 3.5, GM preset jumps with Sync View latched become a synced short shot (pending Andrew's go-ahead over phase 4)
- 2026-11-08 21:34 -- SESSION END: phase 3.5 synced jumps (3b68767) + Player Tokens greyed when no player token (957a513), all 12 live checks passed, pushed; next is phase 4
- 2026-11-13 11:56 -- SESSION START: resume Views; pulled origin, noted branch e61d964 (FEATURES_BUGS.md notes); next phase 4 confirmations + GM confidence monitor
- 2026-11-13 22:43 -- SESSION END: phase 4 confirmations (opt-in) + monitor, all-or-nothing shots, popover layout fixes, all 13 live checks passed; pushed; next is the README-based help page
