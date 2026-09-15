# PLAN.md — Phased Build Plan

Reference: `SPEC.md` for full requirements. This plan sequences work so
that data correctness and the 3D/motion showpiece are both built and
validated early, rather than motion being a coat of paint applied at the
end. Each phase should leave the app in a runnable state.

Suggested stack setup: Vite + React + TypeScript, Tailwind, react-router,
TanStack Query (+ IndexedDB persister), react-three-fiber + drei, GSAP
(+ ScrollTrigger). Package manager: npm.

**Deploy target: Vercel, live from Phase 4 onward.** The project ships to
a real Vercel URL right after the static layout pass, while it's still
small, so deploy/config issues surface early rather than at the end.
Every phase from Phase 4 on ends with a push to that same URL — "deploy"
is not a separate final step, it's the last bullet of each phase.

**This is a mobile-first project (SPEC §7).** Most league members will
open this on a phone, so every phase below builds and checks the ~390px
layout first, not as an afterthought to a desktop design. From Phase 4
onward, once there's a live URL, each phase's deploy step is followed by
a real-device check — open the actual Vercel URL on an actual phone, not
just Chrome DevTools' device emulator (which does not reflect real GPU/
thermal performance, especially for the 3D work starting Phase 5). This
matters most for Phase 5 onward, where mobile 3D performance is a hard
requirement per SPEC §7.2, not a polish-pass concern.

## Phase 0 — Scaffolding

- `npm create vite` (React + TypeScript), Tailwind setup, ESLint/Prettier.
- Repo init, `.gitignore`, base folder structure (see CLAUDE.md).
- Design tokens in Tailwind config: palette (§5.1), type scale, easing
  curve tokens (§5.5) — even before they're used anywhere.

## Phase 1 — Sleeper data layer (no UI polish)

- Typed API client for the Sleeper endpoints in SPEC §6.1.
- Season-chain resolver: walk `previous_league_id` from the configured
  league ID, build the `season -> league_id` map, cache it.
- CDN helper functions for avatar/headshot URLs (SPEC §6.2) — single
  source of truth, never inline template strings elsewhere.
- TanStack Query setup with the tiered caching strategy from SPEC §6.3
  (IndexedDB persister, long staleTime for immutable weeks/seasons, short
  staleTime for the live week, 24h TTL for `/players/nfl`).
- Prove this phase with a throwaway debug route that dumps raw
  standings/rosters/matchups as JSON — validates data correctness before
  any design work sits on top of it.

## Phase 2 — Password gate + app shell

- Full-screen gate component (marble/gold styling from the start, not a
  bare `<input>` — it's the first impression per SPEC §3).
- `sessionStorage` flag, route guard.
- Router shell: Home, 12 Team routes, League History route.
- Reduced-motion detection wired up globally (context/hook) even though
  nothing depends on it yet.

## Phase 3 — Static layout pass (2D, real data, no 3D/motion yet)

**Status: Complete.** Home, Team page, and League History are built with
real Sleeper data, the mobile-first nav overlay, and the marble/gold
visual system (including a follow-up materiality pass: card contrast
against the marble background, gold-gradient borders/dividers/numerals).
Verified via a real Playwright screenshot pass at 390px width, not just
the DevTools emulator. Good enough to move forward, not polished to a
final degree — that's expected at this stage, not a gap to close before
Phase 4.

- Build Home, Team page, and League History with real data and the
  palette/typography system, but as plain 2D layouts (no r3f, no GSAP).
  Design mobile-first (~390px) and scale up per SPEC §7 — don't design
  at desktop width and squeeze it down afterward.
- The 14-target nav (Home, League History, 12 teams) needs the real
  mobile pattern from SPEC §7.1 (a menu/overlay, not a horizontal
  scrolling tab bar) — this is shared chrome every page depends on, so
  it's cheaper to get right now than to retrofit once Team/History pages
  also depend on it.
- Goal: information architecture and data are fully correct and
  legible before any motion/3D is layered on. Use 21st MCP to generate/
  iterate the React components for these views.
- Accessibility pass on this static version: contrast, keyboard nav,
  alt text — cheaper to fix now than after 3D is layered in.

## Phase 4 — First deploy to Vercel

- Create the Vercel project, connect the repo, configure any env vars
  (e.g. the Sleeper league ID) needed in production.
- Deploy what exists so far (gate + static 2D Home/Team/History pages)
  to a real production URL.
- Confirm end-to-end in production: password gate works, live Sleeper
  data loads, historical seasons resolve correctly — not just that the
  build succeeds. This is the point of moving deploy early: catch
  hosting/env/build issues while the app is still small and easy to
  debug.
- Real-device check: open the live URL on an actual phone and confirm
  the gate and static pages work — this is the cheapest phase to catch
  a mobile issue in, before any 3D/motion is layered on.
- This becomes the permanent URL. Every phase below ends by deploying
  to it.

## Phase 5 — Shared 3D gallery scene (foundation)

**Status: Complete, verified on the live production URL.** One
persistent r3f canvas (mounted in `Layout`, given visible height only on
Home for now — see Phase 7) with a studio HDRI environment,
marble/ivory/gold/brass PBR materials, and instanced gallery geometry:
12 marble plinths with gold trophy toppers, a 12-panel gold-framed
portrait wall (untextured ivory canvases — real avatar photos land in
Phase 7, once cross-origin texture loading from the Sleeper CDN is
verified in-browser), and a three-tier marble podium.

Two issues only showed up once deployed and screenshotted live (not
caught by `tsc`/build/lint, which all passed from the first pass) —
worth noting since they'll recur in later 3D phases:

- The initial arc spread put outer plinths/frames near edge-on to the
  fixed camera and cropped at the canvas edge. Fixed by narrowing both
  arcs and pulling the camera back slightly.
- The initial gold material (metalness 0.9-0.95) went visually black on
  instances not facing the studio HDRI's one bright softbox — a single
  environment map lights a mirror-like metal very unevenly across
  differently-rotated instances, and extra scene lights/envMapIntensity
  don't fix this (a near-mirror surface's color comes from the
  reflection, not scene lights). Fixed by dropping metalness to ~0.4-0.45
  so the evenly-lit diffuse term carries real visual weight — a
  deliberate legibility-over-strict-PBR-realism tradeoff for a wall of
  12 same-colored instances facing different directions.

Static camera framing, capped devicePixelRatio, no post-processing.
Checked at 375px width (holds up) and via console (no errors, only
benign THREE.Clock/shader-precision warnings) on the live URL — not yet
checked on an actual phone's GPU, which is what SPEC §7.2's frame-budget
requirement is really about; that real-device pass is still outstanding
(see below).

This is the first showpiece phase — treat it as core work, not polish.

- One persistent r3f canvas/scene shell (not remounted per route) with
  HDRI environment lighting (Poly Haven studio/gallery HDRI) and the
  marble/gold PBR materials defined in SPEC §5.4.
- Build the base gallery geometry: plinths, a portrait wall, a podium —
  reusable primitives, instanced where the same shape repeats (12 team
  portraits, plinths, etc).
- No scroll-driven camera yet — just get the scene lit, materialed, and
  performant with placeholder camera framing.
- Perf checkpoint against the SPEC §7.2 frame budget (≥60fps desktop,
  ≥30fps floor on mid-range mobile): confirm frame rate is acceptable
  with all 12 team portraits + trophies present before adding camera
  motion on top. Apply the mobile requirements from the start —
  capped devicePixelRatio, compressed (KTX2/Basis) textures, low draw
  calls/lights, no heavy post-processing on mobile — not as a later
  optimization pass.
- Deploy to the live URL; check 3D asset loading (HDRI, textures) works
  in production, not just locally — CDN/CORS/asset-path issues for 3D
  assets are worth catching now.
- Real-device check: open the live URL on an actual phone (not just
  Chrome DevTools' emulator, which doesn't reflect real GPU/thermal
  behavior) and check the frame budget holds with the base scene loaded.

**Update (Phase 7):** this scene (renamed `TrophyRoomScene`) now lives on
League History instead of Home, and the canvas is no longer mounted once
in `Layout` and shared across every route — each page mounts its own.
See Phase 7 below for why and what changed.

## Phase 6 — Scroll-driven camera + GSAP motion system

**Status: Complete, verified on the live production URL.** GSAP +
ScrollTrigger drives the persistent gallery camera on Home
(three/ScrollCameraRig.tsx), shared ease tokens mirror the CSS
`--ease-weighted` custom properties (motion/gsapSetup.ts), and two named
stepped/stop-motion beats are in place: the trophy toppers clicking up
on the gallery's first mount, and the Storylines numbers ticking up in
steps once scrolled into view (motion/StatCountUp.tsx). All respect
`prefers-reduced-motion`.

One real bug only showed up live, same lesson as Phase 5 — worth
repeating since it'll keep applying: the first deploy had the camera
tween timed against the _whole document's_ scroll range, but the canvas
itself (58-68vh tall) scrolled off screen within the first fraction of
a multi-viewport page, so the camera had barely moved by the time it
disappeared — the effect was nearly invisible in practice despite
"working" by every code-level check. Fixed by wrapping the canvas in a
taller `sticky top-0` track (`#gallery-scroll-track`) so it stays on
screen for a real span of scroll, and re-pointing the camera tween's
scroll range at that element instead of the document body. Verified
live by actually scrolling the page and watching the camera move,
which is the only way this class of bug shows up — `tsc`/build/lint
all passed on the broken version too.

Not yet checked: touch scroll / iOS Safari momentum behavior (SPEC.md
§7.2) and the real-device frame-budget check, both still only doable on
an actual phone.

- GSAP + ScrollTrigger wired to the r3f camera: scrolling Home moves the
  camera through the gallery scene past standings/storylines (SPEC §5.5).
- Define the shared easing/duration tokens as actual GSAP eases/timeline
  helpers (not one-off magic numbers per component).
- Build 1–2 deliberate stop-motion/stepped-easing beats (e.g. a trophy
  "clicking" into place, a stepped score count-up) as named, reusable
  animation primitives, not bespoke one-offs.
- Wire `prefers-reduced-motion` to a real reduced variant (no
  scroll-camera, shorter/no transitions) — test it, don't just stub it.
- Build the scroll-driven camera against touch scroll and iOS Safari's
  momentum/rubber-banding behavior from the start (SPEC §7.2), not just
  desktop wheel events — these behave differently enough that
  wheel-only testing will feel wrong on an actual iPhone.
- Deploy; verify scroll-driven motion feels right on the production
  build (motion/perf can behave differently than local dev).
- Real-device check: the scroll-driven camera and stepped-easing beats
  on an actual phone, touch-scrolling (not a trackpad or mouse wheel) —
  check against the SPEC §7.2 frame budget.

**Update (Phase 7):** `ScrollCameraRig` described above was generalized
to take `trackId`/`restPosition`/`scrolledPosition`/`lookTarget` as props
instead of being hardcoded to Home's `#gallery-scroll-track`, so more
than one page's canvas can drive it with its own scroll track and camera
path. The trophy gallery this originally scrolled through now lives on
League History, not Home — see Phase 7 below.

## Phase 7 — Split the shared scene: Home gets a live standings podium, the trophy room moves to League History

**Status: Complete against the code; verified with `tsc -b`, `oxlint`,
and a production `vite build` locally — not yet deployed or checked on a
real device (see the gaps below).** This phase was originally scoped as
"bring team pages into the shared gallery scene" (the original bullets
are kept below, now deferred/re-scoped, not built). What actually
happened instead, from live feedback while Phase 6 was underway: Home
should be a page worth revisiting every week, not a static display, so
the generic marble/gold trophy gallery didn't belong there. It moved to
League History instead — the one page that's genuinely about looking
back at the league's permanent record — and Home got a scene of its own
built from real data.

What changed:

- `GalleryScene`/`GalleryCanvas` renamed to `TrophyRoomScene`/
  `TrophyRoomCanvas` (three/) and moved onto League History
  (pages/HistoryPage.tsx), matching the "Trophy Room" name already used
  in the site's own nav branding.
- `ScrollCameraRig` generalized (see the Phase 6 update note above) so
  each page's canvas supplies its own scroll-track id and camera framing
  instead of one hardcoded to Home.
- Shared arc-placement math (three/arcLayout.ts), the lighting rig
  (three/SceneLighting.tsx), and the marble floor (three/SceneFloor.tsx)
  were extracted out of the original scene so both scenes stay visually
  consistent without duplicating code.
- `Layout.tsx` no longer mounts a shared canvas across every route —
  each page mounts its own now that Home and League History have
  unrelated scenes with nothing to gain from one shared GL context. This
  revises SPEC §5.4's "keep one shared canvas/renderer where possible"
  guidance; see the note added there.
- Home has a new scene instead (three/WeeklySummaryScene.tsx,
  three/WeeklySummaryCanvas.tsx): a live standings podium built from
  real data, not a generic display — top 3 by current record/points get
  their own medal-stand podium blocks (1st centered/tallest), ranks 4-12
  sit on the same portrait-wall arc style the trophy room uses, and
  every portrait shows the team's actual Sleeper avatar rather than a
  blank canvas.
- Real avatar photos were verified safe to load before building against
  them: a live-browser test (a canvas cross-origin-taint check with
  `crossOrigin: 'anonymous'`, the same failure mode three.js's
  `TextureLoader` hits) confirmed Sleeper's avatar CDN sends proper CORS
  headers. Each portrait's texture load still gets its own Suspense +
  error-boundary fallback to a blank ivory canvas, so one bad/slow avatar
  URL can't blank out the whole scene.
- Home's page heading changed from "The Gallery" to "Scoreboard" to
  match what it actually shows now (SPEC §4 updated to match).

Known gaps against this phase's own bar (SPEC §7.2, and PLAN's own
"deploy + real-device check every 3D phase" pattern) — not yet closed:

- Not yet deployed to the production URL, and not checked on a real
  device at all. Everything above is only verified locally.
- Avatar textures load as plain JPGs straight from Sleeper's CDN
  (~400×400 each), not KTX2/Basis-compressed like SPEC §7.2 calls for —
  probably fine at twelve small images, but worth confirming against the
  frame/load-time budget on an actual mid-range phone rather than
  assuming.
- Touch-scroll/iOS Safari momentum behavior hasn't been re-verified on
  either page's new scroll track (`weekly-summary-scroll-track`,
  `trophy-room-scroll-track`) — Phase 6 found a real bug here that only
  showed up on an actual device, so the same check applies to both new
  tracks before calling this phase done.

**Update — entrance motion for Home's scene, plus a lighting degrade
path.** Two things landed after the above.

Home's standings scene had no entrance motion at all: podium portraits
and the wall arc appeared the instant standings resolved, while League
History's trophy room next door has the stepped "click into place" beat
from SPEC §5.5. Portraits now scale in from 0 with the same
`ease: 'steps(6)'` tween `TrophyToppers` uses (`usePortraitReveal` in
three/WeeklySummaryScene.tsx — a local copy rather than shared code,
since that component tweens instanced cup/base pairs, this one tweens
whole `<group>` portraits, and the two want different reveal orders).
The podium reveals 3rd, then 2nd, then 1st at 0.18s per step; the wall
sweeps left-to-right at the 0.045s TrophyRoomScene already established.
The podium's slower pacing is deliberate — at 0.045s three items land
within 90ms of each other and the ordering may as well not exist, while
at 0.18s the champion's portrait lands at 0.36s, exactly when a full
12-team wall sweep finishes, so the room finishes filling and the winner
arrives on the same beat. Two subtleties worth not re-learning: it is a
`useLayoutEffect` keyed on the mounted-portrait count, because standings
arrive async and an effect keyed only on the delay array never re-runs
when the data lands (the podium would pop in at full size — the exact
problem being fixed); and the wall's delays are built from the count
rather than `rest.map`, so scores reshuffling mid-week doesn't restart
the tween.

`SceneLighting` now wraps `<Environment>` in an error boundary. drei
fetches that HDRI at runtime from a third-party CDN (raw.githack.com),
and with nothing catching a failed fetch the error propagates out of the
`<Canvas>` and unmounts the _entire_ scene — a blank page on both Home
and League History rather than a degraded one. Not theoretical: it
happened in this project's own cloud dev environment, where that host
isn't reachable — empty root element, no canvas at all. The fill lights
carry either scene on their own (flatter, less specular bounce on the
gold and marble, but fully legible), so the boundary turns a total
failure into the degrade path SPEC §5.4 asks for.

Verified: entrance timing was measured by sampling actual `scale` values
per frame in headless Chromium rather than by eye — wall items 37-50ms
apart, podium steps 185ms and 168ms apart, 1st place and the last wall
portrait starting on the same frame and finishing together, values
landing exactly on 0, 1/6 … 1 (the stepped ease, no smoothing), and all
twelve portraits at full scale on the first frame under
`prefers-reduced-motion`. The lighting boundary was verified by loading
the real canvas with the HDRI host blocked: before, no canvas and an
empty root; after, the full scene renders. `tsc -b`, `oxlint` (0 errors,
same pre-existing warnings) and a production `vite build` all pass.
Both changes still inherit the gaps above — not deployed, not checked on
a real device.

Original Phase 7 scope, deferred and re-scoped rather than built as
written — the single shared gallery scene it assumed no longer exists,
so this needs fresh thinking, not just resuming the plan below as-is:

- Bring the Phase 3 team page layouts into a 3D scene — whether that's
  still the right call, and what a team page's own scene would even
  show, is now an open design question rather than an assumed extension
  of one shared gallery.
- Season selector and week-by-week roster/results views, with player
  headshots, inside whatever that ends up being.
- Transition between team tabs is a first-class animation, not
  incidental — this is explicitly called out in SPEC §5.5 as a core
  interaction, budget real time for it.
- Deploy.
- Real-device check: team-to-team transitions and roster/headshot
  loading on an actual phone, against the SPEC §7.2 frame budget.

## Phase 8 — League History, records, and lore surfacing

(League History already carries the trophy-room 3D scene as of Phase 7 —
its real-device check above should cover this page's 3D too, not just
the 2D content below.)

**Status: built, pending deploy and a real-device check.** The records
half of this phase was already standing from Phase 3 —
`api/leagueRecords.ts` computes championships, best single week, longest
win streak and head-to-head off the season chain, and League History
renders them. What landed here is the lore half.

`src/content/lore/` holds the three hand-authored data files SPEC §6.4
proposed (teams, rivalries, events), a shared `types.ts`, and an
`index.ts` that is the only module pages import from — so no page
reimplements matching and the data files stay pure content. All three
ship empty, which is a supported state rather than a TODO: every lore
block is guarded, so with nothing authored the pages render exactly as
they did before — no empty headings, no "no rivalries yet" placeholder
copy (CLAUDE.md).

Where it surfaces, rather than on one dedicated lore page:

- Team page header: nickname, tagline, bio.
- Team page week rows: a rivalry callout on the weeks against that
  manager's rival, matched in either authored direction.
- Team page: that manager's notable events, merged from their own
  entries plus any league event or rivalry game naming them.
- League History: a Rivalries section, and a league-wide Notable Events
  timeline merged from all three files.

Verified by exercising the lookups against a temporarily populated copy
of all three files, then reverting: `rivalryBetween` matches both
authored directions, non-rivals and null ids return nothing,
`eventsForUser` merges the three sources newest-first, and `allEvents`
sorts week-less entries last. Re-ran empty afterwards to confirm every
accessor returns nothing and the guards hold. `tsc -b`, `oxlint` (0
errors, same 5 warnings) and a production `vite build` pass in both
states.

Worth knowing for the real-device check: the deployed site shows the
empty state until lore is actually authored, so what to look for on a
phone is that nothing renders oddly, not that the sections look right.

- Cross-season leaderboards/records (SPEC §4).
- Wire up the hand-authored lore data structures (SPEC §6.4) as empty
  stubs the user can fill in; verify the UI degrades gracefully with no
  lore content present (no placeholder text, sections just don't render).
- Surface lore contextually (e.g. a rivalry callout on the relevant team
  page's matchup row), not only on a single dedicated lore page.
- Deploy.
- Real-device check: lore/records content on an actual phone — this
  phase is lighter on 3D so the main thing to verify is layout, not
  frame budget.

## Phase 9 — Polish and cross-cutting QA

- Full accessibility re-pass now that 3D/motion is in place: contrast
  still holds, keyboard/reduced-motion paths still work, focus states
  visible against marble/gold.
- Final mobile performance pass on real devices (not just emulators),
  checked against the SPEC §7.2 frame budget (≥60fps desktop, ≥30fps
  floor on mid-range mobile) — this is a verification pass on
  requirements every phase since Phase 4 was already building against,
  not the first time mobile is considered. Confirm the reduced-quality
  tier actually kicks in on a genuinely low-end device.
- Performance pass: bundle size, lazy-loading of the 3D canvas and
  below-the-fold images, HDRI/texture sizes.
- Cross-browser smoke test (evergreen browsers per SPEC §7).
- Deploy.
- Real-device check: full end-to-end pass on at least one real iOS and
  one real Android phone.

## Phase 10 — Handoff

- Custom domain on the existing Vercel project, if desired (no new
  deploy pipeline — same project from Phase 4).
- Note in README/CLAUDE.md how to add a new season each year (the
  `previous_league_id` chain should pick it up automatically once the
  league ID env var/config is updated for the new season) and how to add
  lore content.
