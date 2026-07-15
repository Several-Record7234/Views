# Views — progress.md

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

