# Cinematic Mode & custom viewport animation: plan and resume notes

Started 2026-11-06. Goal: replace OBR's fixed `animateTo` curve with Views' own animation, and
add a GM-only **Cinematic Mode** that plays a dramatic A→B shot on the GM's screen and on every
player's screen at once, for narrative reveals on a map. Inspired by Foundry VTT's "Simple
Cinematic Pan".

## Repository state (2026-11-07)

Everything below phase 2 is COMMITTED and PUSHED: `7b823a1` (phase 0), `e07adff` (phase 1
core), `227f502` (background animator), `f5e710b` (absent-background fallback). 62 tests. The
spike was deleted before committing; a copy is in the 2026-11-07 session scratchpad only
(probeFit, probeNativeCurve, setFunctionalMs), so recreate from this plan if needed.

## Measured platform facts (spike, 2026-11-06, Chrome on the Windows PC)

Each one was MEASURED in a live Room, not inferred:

1. **Per-frame `setPosition`/`setScale` is cheap and local.** Pan: 60.8 sends/s, 0 skipped,
   round trip p50 0.7ms / max 1.1ms. Zoom (two calls per frame): 61/s, p50 1.6-1.8ms.
   **Viewport changes are never sent over the WebSocket** (CONFIRMED by Andrew 2026-11-07: moved
   items appear as messages on `/api/realtime/scene`, viewport changes never do).
2. **`setScale` zooms about the viewport ORIGIN (top-left)** and does not move `position`
   (scale 0.2856 → 0.4284, position unchanged).
3. **Two calls per frame do not wobble**, even `setScale` awaited before `setPosition`: the
   anchor stayed under the cursor by eye, and the reported anchor drift was 0.00px. Still use
   `Promise.all` (parallel) in production rather than relying on that.
4. **`animateTo` resolves after ~1ms, BEFORE the viewport moves.** Read straight afterwards,
   the viewport is still at the start (`readImmediately === from`). It reached the target by 2s.
5. **CORRECTED 2026-11-07: the native curve is ~500ms, ease-out** (fast start, gradual stop).
   The original "~250ms (15 frames at 60fps)" was WRONG: the screen recorder was set to 60fps
   but captured at 30fps, so 15 frames = 500ms. Agrees with the per-frame probe below
   (exponential, 99.9% at ~530ms).
6. **The animation loop only runs while its iframe renders.** With the Action popover hidden, the
   iframe's `requestAnimationFrame` never fires, so the loop silently hangs. This is why Sync
   needs a background page (phase 2).
7. The 1.5s ease-in-out spike runs looked "very aesthetically pleasing" to Andrew.

Candidate for the shared OBR skill corpus: facts 2, 4, 5, 6 (with fact 1 once the socket check
is done). Not yet written there; awaiting Andrew's approval.

## Phase 0: legacy migration bug (DONE in working tree)

Two bugs in the old jump-to-viewport legacy migration (`jumpTo` → `overwriteViewport`):
- It read the viewport straight after `animateTo` (fact 4), so it saved the PRE-jump view over
  the preset.
- It stamped `currentUserId`, so ownership moved to whoever jumped first.

Fix: `migrateLegacyViewport` computes the box from the legacy transform + viewport size
(`legacyTransformToBox`), keeps the owner and list position. `overwriteViewport` removed
(its only caller was the migration).

Repair: `repairLegacyMigrations` runs on load. Any box in `dev.views/metadata` whose id matches a
legacy-TRANSFORM entry under Omar's read-only key was written by the broken migration, so it is
restored verbatim from the legacy key (transform and owner) and re-migrates correctly on the next
jump. A separate marker key `dev.views/legacyRepaired` makes it once-per-Scene: it must be a
separate key, because every preset write replaces the whole `dev.views/metadata` object. The
marker is written whenever legacy transforms exist (even if nothing was damaged), and on a fresh
import, because a CORRECT migration also leaves a box under a legacy id (test pins this).

**Still to do:** live test in a Scene with jump-to-viewport data where a legacy preset had been
jumped to under the old code. Andrew to say whether such a Scene exists.

## Phase 1: animation engine + GM settings (core done, UI not started)

### Done
- `curve.ts`: `ease(t, easeIn)` (always eases out; cubic), `fitBox`, `interpolate`. Scale is
  interpolated logarithmically; the world centre moves in proportion to 1/scale, which pivots the
  zoom about the one world point at the same screen spot in both shots (a push-in holds its
  subject still, centre travels in a straight line). Pure pan reduces to linear.
- `settings.ts`: Room metadata key `dev.views/anim`, short-key codec with a format version
  (unknown version → defaults, writes blocked), every field written, durations clamped.
  Encoded default: `{"v":1,"f":500,"d":3000,"i":1}`.

### Decisions made at end of session
- **Functional recalls never ease in** (fast arrival). **The ease-in toggle applies to Cinematic
  Mode only.** Done 2026-11-07: `easeIn` → `cinematicEaseIn`, `dramaticMs` → `cinematicMs` in
  `settings.ts` (short keys unchanged, `i` / `d`). `curve.ts`'s `ease(t, easeIn)` keeps its
  generic parameter; functional recalls pass `false`.
- Defaults/limits: functional **540ms CONFIRMED 2026-11-07** (limits 100-2000 not yet confirmed); cinematic
  3000ms (500-15000) proposed, not yet confirmed.
- Settings are global, GM-controlled, Room metadata, minified.
- Curve strength stays fixed (cubic) for now; may become a parameter if one strength doesn't
  suit very different shot lengths.

### Animator + background host (BUILT 2026-11-07, unit-tested, NOT yet live-tested)
- `src/animation/animator.ts`: pure `createAnimator(deps)` (clock + viewport calls injected),
  12 tests incl. a mutation check on latest-wins. `src/animation/recallProtocol.ts`: LOCAL
  channel `dev.views/recall`, validated `RecallRequest`.
- `src/background.ts` + real `background.html` (Vite input added; `background_url` now
  PERMANENT, approved by Andrew). Ignores recalls whose `connectionId` isn't our own (any client
  can broadcast on the channel). VERIFIED LIVE 2026-11-07: a LOCAL message carries our own
  connection id (all recalls acted on).
- Live test 1 (6 preset clicks, popover open): popover→background hop 1.1-1.6ms,
  click-to-first-frame 1.7-2.6ms, total 507-519ms for 500ms. **The hop is irrelevant; recall
  feel is purely duration.** A stray `Uncaught (in promise) ... message channel closed` on the
  Room top frame is a browser extension's `chrome.runtime` listener, not Views (unconfirmed;
  check in incognito).
- Test 2 PASSED 2026-11-07: at 2000ms, closing the popover mid-jump, the recall carries on and
  lands, no stutter.
- Test 3 PASSED 2026-11-07 (busy Scene): players' presets and legacy presets recall; first frame
  1.5-2.0ms, totals 2003-2019ms for 2000. A mid-jump click cancels cleanly (newest wins). Dev-log
  fix: per-recall timing record (a cancelled recall had logged `clickToFirstFrameMs: null`).
- **Native `animateTo` curve MEASURED 2026-11-07** (`probeNativeCurve`, 3 identical runs, 60Hz,
  pure pan): an EXPONENTIAL approach, not a fixed-duration curve. Remaining distance x~0.805 per
  frame (tau 77-80ms). Fits (rms): exponential 0.0044, quint@491ms 0.0090, cubic@336ms 0.0160.
  90%/99%/99.9% at ~180/355/530ms (matches corrected fact 5: ~500ms in a 30fps recording).
  Our cubic@250 starts at native speed but stops 300ms early (Andrew: "much more abrupt");
  cubic@500 starts at half speed. Match: easeOutExpo `1 - 2^(-10t)` at ~530ms (500 ≈ native).
  Unknown: time-based vs per-frame (would differ at 120Hz). Skill-corpus candidate (replaces fact 5).
- **SWITCHED 2026-11-07 (Andrew approved):** `curve.ts` now has named easings
  (`Easing = 'expo-out' | 'cubic-out' | 'cubic-in-out'`; `Shot.easing` replaces `easeIn`).
  Functional recalls use `expo-out`; Cinematic maps `cinematicEaseIn` to `cubic-in-out`/`cubic-out`.
- **Default `functionalMs` = 540 (Andrew, by feel, A/B against an Outliner native jump).** Same
  time constant as native (10 ln2 / 540ms = 1/78ms); 500 felt quick off the mark. Test pins the
  default within 0.5% of measured native at 100/200/300ms. (Outliner selects the item before
  jumping, which adds its own start lag; the raw `animateTo` probe started within 1-2 frames.)
- Tests 4 (feel → 540ms) and 5 (wide/tall fit) DONE.
- **Absent-background fallback BUILT 2026-11-07** (Andrew approved): popover pings once on open
  (`dev.views/presence`, LOCAL), background announces `ready` on start and answers pings; both
  sides check `connectionId`. Status store `useBackgroundStatus` (checking/ready/missing); clicks
  use native animateTo/animateToBounds unless `ready` (never wait); 1s without `ready` → notice
  + console warning; a late `ready` recovers. Notice copy (Andrew's): "Views' background task
  absent; jumps use default animation, cinematic transitions unavailable." Test copy
  `public/manifest-nobg.json` (TEMPORARY, delete before commit).
- **Notice is a STOPGAP:** when the Cinematic Mode UI lands, replace it with the Cinematic switch
  greyed out plus a descriptive hover tip (Andrew, 2026-11-07). Players have no switch (GM-only),
  so they get no indicator; accepted, since their jumps still work natively and phase 4's
  confirmation monitor reports Cinematic failures to the GM.
- `useViewport` jumps (presets, legacy, Player Tokens) now `requestRecall` → background.
  Fire-and-forget: no fallback if the background page isn't running (open question).
- Spike trimmed to `viewportSpike.ts` only (probeFit takes corner fractions; `setFunctionalMs`).

### To do (original list; first item now built, above)
- Animator module (SDK-side): rAF/timer loop (clock per phase 2 result), `Promise.all`
  position+scale per frame, latest-wins (skip a frame if the last is in flight), frame computed
  from ELAPSED TIME (so a player panning away is pulled back onto the curve), exact final frame,
  cancellable, resolves when the motion has really finished (unlike `animateTo`).
- ~~`probeFit` decides whether `fitBox` must add padding~~ MEASURED 2026-11-07: `scaleRatio` 1,
  `positionDelta` {x: 3e-13, y: 0.071} px. `fitBox` matches `animateToBounds` framing with no
  padding; the 0.07px is sub-pixel (likely viewport-height rounding). One box/aspect only:
  recheck with a box much wider or taller than the viewport when the animator lands.
  **RECHECKED 2026-11-07, PASSED (test 5):** wide box (width-bound) scaleRatio 1, delta
  {x: 2e-13, y: 0.0714}; tall box (height-bound) scaleRatio 1.000138, delta {x: -0.24, y: -0.13}px.
  No padding on either axis; existing presets keep their framing. The residue fits one
  UNVERIFIED hypothesis: OBR's internal viewport height differs from `getHeight()` by ~1/7px
  (0.000138 x ~1030px; a centred box then shifts 1/14px = the constant 0.0714). Sub-pixel; ignore.
- Wire functional recall (preset rows, Player Tokens) through the animator with `functionalMs`.
- GM settings UI. **All labels/tooltips need Andrew's approval before going in.**

## Phase 2: background-page spike (BUILT, NOT YET RUN)

Question: with the popover closed, can a background page drive the curve, and with which clock?

How to run (dev server, `npm run dev`):
1. `public/manifest.json` now has `background_url: /background.html`: **remove and re-add the
   extension** from `http://localhost:5173/manifest.json` so OBR loads it. A background iframe
   should appear in the DevTools console context dropdown.
2. In the Views popover context:
   - `await viewportSpike.probeFit()`: `scaleRatio` ≈ 1 and `positionDelta` ≈ 0 means our fit
     matches native framing; otherwise OBR pads, and `fitBox` should match it.
   - `await viewportSpike.bg('raf', 0)`: control, popover open.
   - `await viewportSpike.bg('raf', 5000)`, then CLOSE the popover within 5s.
   - `await viewportSpike.bg('timeout', 5000)`, then close the popover the same way.
3. Results print as a table in the background iframe's console (and the popover's if open):
   `stalled`, `sentPerSecond`, `worstGapMs`, `visibilityAtStart`. Plus Andrew's eye on smoothness.

**Run 2 result (2026-11-07): rAF NEVER fires in the background page, even with the popover OPEN**
(`framesSent` 0, fallback tripped at 5012ms) while `document.visibilityState` read `'visible'`.
So rAF is out for the background page regardless of the popover; run 3 skipped as moot. Likely
cause (UNVERIFIED): OBR hosts the background iframe unrendered, and Chrome only runs rAF for
painted frames. Skill-corpus candidate: `visibilityState` is not a guard for rAF.

**Run 4 result (2026-11-07, popover CLOSED within ~1s, run twice): `setTimeout` clock works.**
178 frames / 3001ms, 59.3 sends/s, worst gap 19ms, not stalled (first run, popover state unsure:
identical, 59.1/s). Smoothness by eye: "very smooth zoom-in, no obvious judder" (Andrew). **PHASE 2 SETTLED:
background page, `setTimeout` clock, frames computed from elapsed time.**

Side finding: the popover's own result table ALSO printed while the popover was closed, so a
closed popover's iframe stays loaded and its JS keeps running (receives broadcasts); only
painting/rAF stops (cf. fact 6). NOT known: whether a never-opened popover's iframe exists at
all, which is why the Sync receiver stays in the background page.

Outcomes: rAF works → use rAF. rAF stalls, timer is smooth → timer clock. Both crawl → players'
side of Sync falls back to native `animateTo` (fixed ~500ms exponential curve), which would undercut the
cinematic idea and needs a rethink.

**Decided 2026-11-07: ALL animation runs in the background page**, functional recalls included
(one animator, one clock; closing the popover mid-jump can't freeze it). Popover → background is
a LOCAL broadcast. If functional recall feels laggy vs native `animateTo`: (1) measure
click-to-first-frame (animator logs it in dev); if under ~16ms the hop is irrelevant and the cure
is DURATION (measured: hop 1-2.6ms, so yes; native is ~500ms exponential, see below). (2) If the hop IS
perceptible, stamp the click time in the popover and compute elapsed from it, rather than
shortening the curve, which would not remove start latency.

## Cinematic Mode: agreed design (phases 3-5)

GM-only. Players only ever recall functionally, for themselves. Normal preset clicks are always
functional; Cinematic Mode is always dramatic, so there is NO per-preset recall-mode toggle.

Interaction (broadcast-switcher metaphor: Preview can change at any time, Go fires the transition):
- GM enters Cinematic Mode. A compact strip pinned above the preset list (popover is 300x400)
  shows the current A→B pair and options.
- GM picks a **start (A)** slot and an **end (B)** slot from the presets plus a **Current
  viewport** option, usable for either slot.
- **Current is snapshotted when its slot is picked**, not on Go (the GM can then pan away to
  prepare). Show a brief "captured" state.
- Slot styling: start slot gradient green (left) fading to the neutral fill (right); end slot
  neutral (left) fading to red (right); all other slots flat neutral for consistency. NOT colour
  alone: also icons, eg. play-arrow on start, stop-square on end. (Andrew said "white" for the
  neutral fill; check it against the dark Catppuccin theme, which may want Surface/Text instead.)
- **Preview** plays the shot on the GM's screen only. **Go** plays it for the GM and all players.
- **Chaining** (after Go, B becomes the next A) is an option, **OFF by default**; revisit after use.
- Go during a running shot cancels and restarts; a Stop control (or Esc) halts everyone in place.
  Andrew wants to try this before committing to it.
- Players' clients **snap to A, then animate to B** (deterministic; each client fits the boxes to
  its own aspect ratio, so everyone sees at least the GM's framing). A short functional lead-in to
  A is a later option if the snap feels jarring.

Sync protocol:
- One broadcast per Go (event-driven, never per frame, per the OBR host-cost rule): A box, B box
  (world space; a Current snapshot is just a box), duration, ease-in flag, a shot id.
- Each client animates locally. Receiver must be the background page (popover usually closed).
- **Trust:** act only on a sync whose sender `connectionId` maps to a GM in the Party roster.
  Room metadata is not role-restricted, so do not use it as the authority.
- Only new triggers apply (no catch-up for late joiners, for now; Andrew is considering the
  edge cases where catching up to the last shot would help).

Confirmations (phase 4): each player replies once per shot, event-driven, with an outcome
(`completed` / `sync off` / `failed`); no reply within duration plus slack → "no response". The GM
sees a per-player confidence monitor in the Cinematic strip. Purpose: troubleshooting, and
confidence during a big reveal that everyone is looking at the right part of the Scene.

## Phase 3: DONE 2026-11-08, all 32 live checks passed

Decisions (Andrew, 2026-11-08): slots are picked with per-row ▶/■ buttons that replace the
delete button in Cinematic Mode (to be reassessed after use); Stop built now; **Chaining
deferred** until the mode has been used (it may not be worthwhile); neutral slot fill is
Surface0, not white.
- `cinematicProtocol.ts` (pure, tested): channel `dev.views/cinematic`; `shot` {id, from, to,
  durationMs, easeIn} and `stop` {id}. Trust: own connection, or a GM in a FRESH
  `party.getPlayers()` per message. Duration clamped on receipt.
- Preview = LOCAL; Go and Stop = ALL. **Stop names the shot id**, and the background page
  only cancels if that shot is still running, so a player's own preset jump is never cut short.
- **Sync View**: Andrew expects the GM's latched Sync View to re-send every frame of the shot and
  fight each client's own animation, so before ANY shot (Preview included, else players would
  follow a Preview) the popover turns it off if on, and says so. **Re-latched when the shot
  ends** (completed, stopped, or replaced by a recall) by the background page, which carries
  the pending resume across a superseding Go (whose own `resumeSyncView` is false). Toggling is
  cheap (Andrew 2026-11-08). OFF = presence `change` patch (`/syncView: false`) + server
  `commit` ack, 2 messages, no viewport box. ON = 3 messages: FIRST a `custom` `id 3` carrying
  the GM's current view `{min, max}`, then the presence patch (`/syncView: true`) + ack. So
  re-latching pushes the GM's framing to players immediately. At a shot's end that means
  players re-fit from their own fit of B to the GM's visible area: a small shift where aspect
  ratios differ. Watch for a jolt in live testing; if jarring, fit B to the GM's viewport when
  building the shot so the re-latch has nothing to correct.
  Known gap: a GM who turns Sync View off themselves mid-shot gets it turned back on.
  **MEASURED 2026-11-08 (Andrew, `api/realtime/party` socket):** with Sync View latched, ANY
  viewport motion is mirrored as it moves: one full-state `custom` message (`id 1`, the view as
  a world box `viewport: {<id>: {state: {min, max}}}`), then `id 2` patches every ~100-117ms
  (throttled to ~10/s, not per frame), then an empty close `{item: {}, viewport: {}}`.
  - Native `animateTo` (Outliner double-click, and Views' jump while it briefly went native):
    **12-13 messages**, because its exponential tail keeps moving for ~1s. (An earlier capture
    reading "native = 2 messages" was abridged; superseded.)
  - Our custom recall: 22 messages for one ~2s jump (curve: x0.71 per 100ms = tau ~290ms =
    expo-out at 2000ms; INFERRED the Jump duration was still 2s). So ~2 + duration/100ms: about
    8 at the default 540ms, slightly CHEAPER than native because it stops dead.
  - So no Sync View special case for functional recalls: a brief native fallback was built and
    REVERTED the same day. Cinematic still pauses Sync View, since a 3s shot would be ~32
    messages and players would follow the GM's 10Hz samples instead of their own curve.
    Re-latch after a completed shot CONFIRMED live (3-message bundle on `/party`).
  - Outliner sent two extra `id 3` view-box messages before its jump (same shape as the first
    message of the re-latch bundle); cause not investigated. Skill-corpus candidate.
- The yellow background notice is gone: the 🎬 toggle is disabled with a hover reason instead.
- **End-of-shot jolt (test 27, 2026-11-08):** with Sync View re-latched, players eased from
  their own fit of B to the GM's visible area. Fix: slots are sent as `framedBox` (the area
  the GM's viewport shows for the box), so players end on exactly what the re-latch pushes.
  Players with a different aspect see the GM's framing plus a margin. Needs a retest.
- Dev builds expose `window.OBR` in the popover iframe (`main.ts`, `import.meta.env.DEV`
  only), for console tests such as the forged-Cinematic trust check.

## Phases

0. Migration fix + repair: done, needs live test. (approved)
1. Animation engine + GM settings: DONE 2026-11-07 (settings UI `a74d77a`, live tests 1-3 passed). (approved)
2. Background-page animation spike: DONE 2026-11-07, background page + timer clock. (approved)
3. Cinematic Mode + Sync (GM-verified A→B shots): DONE 2026-11-08. (approved)
4. Confirmations + GM confidence monitor. Needs approval.
5. Hardening: docs, help page, README, edge cases. Needs approval.

## Open questions for Andrew
- ~~Defaults/limits~~ CONFIRMED 2026-11-07: functional 540ms (100-2000), cinematic 3000ms (500-15000).
- Is there a Scene with jump-to-viewport data to live-test phase 0?
- Neutral slot fill: literal white, or a Catppuccin surface token?
- Commit phase 0 + phase 1 core before or after the live test?
