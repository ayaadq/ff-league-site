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

**Status: in progress — the performance/bundle item below is done, the
rest is not.**

The 3D canvas is now code-split. Both canvases are `React.lazy` imports
behind a `Suspense` boundary, which moves three, r3f, drei and gsap out
of the initial bundle: 1,380 kB down to 422 kB of initial JS (399 kB to
142 kB gzipped), with the renderer arriving in its own ~948 kB chunk
after the page paints. That is the single largest mobile win available
here, since none of it is needed to render either page's 2D content.
`fallback={null}` is deliberate — each canvas sits inside a fixed-height
scroll track, so the space is already reserved, nothing shifts when the
chunk lands, and ScrollTrigger isn't left measuring a moving target.

Verified in a browser, not just by reading the build output: the
lazy chunk is requested, the canvas mounts and renders, and the page
throws nothing. The same run confirmed the empty-lore path from Phase 8
— with no lore authored, neither the Rivalries nor the Notable Events
heading renders at all.

Also fixed here, found by checking the deployed site at 375px rather
than at desktop width: both 3D scenes were badly cropped on a phone.
`fov` in three.js is vertical, so a portrait viewport sees a
proportionally narrower horizontal slice at the same camera distance —
the canvas aspect is 0.69 on a phone against the 1.14 the camera poses
were framed for, and the podium's outer blocks and both ends of the
portrait arc simply fell outside the frame. `ScrollCameraRig` now
dollies back along the view axis by the ratio between those aspects,
scaling the offset from the look target so the shot stays aimed at the
same point. Desktop is untouched (the pullback floors at 1).

That surfaced a second bug worth recording: the scrub tween only writes
`camera.position` from its `onUpdate`, which ScrollTrigger doesn't fire
until the first scroll — so the first painted frame used the raw pose
from the `<Canvas>` camera prop regardless. On a phone that is precisely
the frame that was cropped. The rig now sets the fitted pose up front
and lets the tween take over from there.

Verified by projecting every frame, block and plinth to NDC at both
aspects: desktop holds at camera z 9.4 with both scenes inside ±0.73,
and at phone aspect the camera moves to z 16.1 with the trophy room
inside ±0.33 and the podium scene inside ±0.80 — previously outside ±1,
which is what the cropping was.

The accessibility re-pass is done and clean, measured on the deployed
site rather than locally: no text below 24px rendered in gold or brass
(SPEC §5.1's own rule), no WCAG AA contrast failures anywhere on Home or
a team page, proper `<th scope="col">` on the standings table, alt text
on all 37 images, correct landmarks and heading order, and a properly
labelled gate form. Also confirmed the dual mobile/desktop markup in the
result rows renders only one copy, so screen readers don't hear every
matchup twice.

Known issue, reported from a real phone and deliberately deferred: the
standings table on Home is stretched at phone width, and scrolling it
across to the PF column leaves that column looking faded and clipped
rather than fully revealed. The horizontal scroll container and its edge
gradient are the place to look. The user is handling this one.

Still open in this phase: the real-device performance and
reduced-quality-tier checks, HDRI/texture sizing, and the cross-browser
smoke test.

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

**Status: handoff docs written; custom domain is the owner's call.**

README.md now covers the two things this league actually needs year to
year. Adding a season is a one-line change to `SLEEPER_LEAGUE_ID` in
`src/config.ts` — Sleeper mints a new `league_id` each renewal and links
it back via `previous_league_id`, and `api/seasonChain.ts` walks that
chain, so the season selector, cross-season records and League History
all follow automatically with nothing to backfill. Authoring lore is
documented alongside it: the three files under `src/content/lore/`, how
to find a manager's `user_id` (it is in the team page URL), and a table
of which file surfaces where. CLAUDE.md gained a matching rule that lore
is read through `content/lore/index.ts`, never by importing the data
files directly.

- Custom domain on the existing Vercel project, if desired (no new
  deploy pipeline — same project from Phase 4).
- Note in README/CLAUDE.md how to add a new season each year (the
  `previous_league_id` chain should pick it up automatically once the
  league ID env var/config is updated for the new season) and how to add
  lore content.

## Phase 11 — Sound and scroll choreography

**Status: Home built and verified locally, pending deploy. League History
and team pages not yet done.**

Direction taken from a reference the user chose, leoparpeix.com — an
interactive designer's portfolio whose palette (cream, soft light,
refined serif) already sits close to this site's, so this is motion and
sound layered onto the existing visual system rather than a redesign.
Three decisions framed it, all the user's:

- Sound is a stadium ambience bed plus interaction one-shots, always
  opt-in.
- Motion is layered on; it never gates the data. The reference is a
  portfolio someone visits once, this is a scoreboard someone checks
  every week, and an opening sequence that is delightful on visit one is
  an obstacle on visit thirty.
- Home first, then the rest.

Audio is synthesised rather than sampled (`scratchpad/make-audio.py` in
the session that built it; regenerable from the recipe in this note).
Distant crowd noise is broadband noise band-passed to roughly 120 Hz -
1.8 kHz — the top end is what "distance" removes — shaped by two slow
random envelopes plus a few gaussian swells, then crossfaded head over
tail so the loop seam has no discontinuity. That reads as a venue
without ever resolving into anything recognisable, which is what lets it
loop under a scoreboard without becoming irritating. No sampled audio
means no third-party licensing attached to the site. Total ~150 KB,
fetched only if someone turns sound on.

What was built:

- `src/audio/` — a Web Audio provider that constructs nothing until the
  user opts in, a gapless looping bed with real fade curves, rate-limited
  one-shots, session-scoped preference, and a header toggle so sound can
  always be turned off from anywhere.
- `src/motion/Reveal.tsx` — scroll-triggered entrance for content blocks,
  `once: true` (an arrival, not a state), layout effect so nothing
  flashes before it hides, and a plain pass-through under
  `prefers-reduced-motion`.
- `src/components/Marquee.tsx` — travelling display type, content
  duplicated and translated -50% so the wrap needs no measurement.
- `src/components/ScrollCue.tsx` — hero "keep going" hint that retires
  itself once the visitor has scrolled.
- Keyframes in `index.css` as theme animations, each one disabled under
  `prefers-reduced-motion` individually rather than by a blanket kill —
  the sound bars still show state, they just hold still.

Cost: initial JS went 422 kB to 429 kB (gzip 142 to 144). The audio is
in `public/`, so it is never bundled.

Remaining: deploy and check on a real phone, then roll the same
treatment across League History and the team pages.

## Phase 12 — The weekly journey (Home rebuilt as a scroll experience)

**Status: acts 1, 3, 4, and 5 are built and in their final scroll
order** (Storylines → six-station journey → Awards → Efficiency chart →
Power rankings/closing → the standings finale cluster). **The skycam 3D
sequence itself (act 2) is built and scrubbing correctly** — this line
previously read "the 3D sequence not started," which stopped being true
once it shipped; see the commit history around "Add the skycam journey."
**Still open within act 2:** its four embellishments — score count-up on
arrival at each station, a real triggered "ignite" on the winning side
(currently just a static lit/unlit state), standout-player headshot
cards, and a visual promotion for game of the week (currently text-only).
**Two gaps outside this phase's own scope don't resolve when it does:**
Phase 11's sound/scroll rollout to League History and team pages (Home
only, still), and Phase 9's remaining real-device performance and
cross-browser QA.

Direction, decided with the user against two references: leoparpeix.com
for the motion feel, and their own Week 1 recap PDF for the content. The
brief is a skycam — the overhead cable camera NFL broadcasts use —
travelling between stations, one per matchup, through a dark night-stadium
world, then emerging back into the marble gallery for standings and
history. Motion never gates the data: this is a scoreboard people check
weekly, not a portfolio they visit once.

What already exists:

- `api/weeklyRecap.ts` — best legal lineup, efficiency, points left on
  the bench, per-matchup pairing, and the derivable awards. Verified
  12/12 against the numbers published in the user's own recap PDF.
- `content/recaps/` — the authored half (headlines, storylines, award
  roasts, ranking lines), one file per week, keyed by user_id, every
  field optional. Authored in a separate chat with the user; README
  documents the workflow and carries the user_id table.
- `motion/Reveal.tsx`, `components/Marquee.tsx`, `components/ScrollCue.tsx`,
  `audio/` — all shipped and verified on the three existing pages.

The acts, in scroll order:

1. Storylines — the recap's "what the hell just happened" openers.
2. Six matchup stations — the journey proper. Both portraits face off,
   scores count up on arrival, the winner's side ignites, that week's
   standout players appear as headshot cards. Game of the week gets
   promoted. Sleeper serves real player headshots and `PlayerHeadshot`
   already loads them — no stock photography.
3. Awards.
4. Actual-vs-perfect efficiency chart, which is the one section that is
   pure computation and needs no writing at all.
5. Power rankings, with the closing piece.

Then standings, still reachable below, as now.

Things to get right, learned the hard way earlier in this build:

- Camera framing must be fitted to viewport aspect (see
  `ScrollCameraRig`'s `fitToViewport`) or the whole thing crops on a
  phone, and the fitted pose must be applied on the first frame rather
  than waiting for the first scroll.
- Anything scroll-driven needs the `prefers-reduced-motion` branch built
  at the same time, not after. The user's own machine has the OS setting
  on, so they will see that branch by default.
- A week with no authored recap must render as pure data. That is the
  normal state most weeks, not an edge case.
- The 3D canvas is code-split and must stay that way; it is 948 kB and
  the page has to paint without it.

Known issue carried forward: the standings table on Home is stretched at
phone width and the PF column looks faded and clipped when scrolled to.
The user is handling that one.

**Update — podium removed, efficiency rows made tappable, crowd audio
re-synthesized.** Three items closed out of this phase's known issues.

- `WeeklySummaryScene.tsx`'s `StandingsPodium` (three literal marble
  podium blocks, ranks 1-3 raised above and reveal-staged separately from
  the rest) is gone. Every standings entry, including the top 3, now sits
  on one `StandingsWall` — the same `arcSlots` radius/height/spread
  `TrophyRoomScene`'s portrait wall uses, same frame, same left-to-right
  `steps(6)` reveal. `SceneFloor`, `Portrait`'s texture handling, and
  `SceneLighting` were untouched. SPEC.md §4 and §5.4 updated to match —
  they described the podium as a fixed part of the design, not a
  since-removed detail.
- The "What you scored vs what you had" efficiency rows
  (`EfficiencyChart.tsx`) opened their per-team detail box on
  `onMouseEnter` only — a real gap on a mobile-first site, since a phone
  has no hover event and nothing there was tappable. Fixed by driving the
  same box off a click/tap-toggled `openId` state (hover still sets it
  too, so desktop is unchanged), firing the same `play('click')` the
  `TeamPage.tsx` week-row `<details>` uses on toggle, for the same feel.
  Left `aria-hidden` as-is: the row markup is decorative, a real
  `<table className="sr-only">` already carries this data for screen
  readers, so no new focusable element was added there.
- Crowd audio was re-synthesized with `scripts/audio/make-crowd.py`
  ("take three" of the synthesis approach noted above) to fix a crest
  factor of ~33 dB that made the bed and roar sound like isolated
  firecracker claps rather than a stadium — the new script convolves a
  synthesised room impulse response into the applause so claps smear and
  fuse the way a real crowd does. Measured on this run: ambience 13.7 dB
  crest (target ≤16), roar 16.9 dB (0.9 dB over target, nowhere near the
  ~33 dB failure mode this was fixed for). The script writes `.wav`;
  since there's no `ffmpeg`/encoder in this environment normally, they
  were re-encoded to `.mp3` with a one-off `lamejs`-based script (not a
  project dependency) to stay in the same size class as the other audio
  assets (`public/audio/ambience.mp3` 288 KB → 189 KB, `roar.mp3` 110 KB
  → 124 KB) rather than shipping raw 16-bit PCM. `SoundProvider.tsx` was
  already wired to `/audio/ambience.mp3` and `/audio/roar.mp3` from
  Phase 11 — only the asset files changed, no code.

## Phase 13 — Full visual redesign: marble/gold → ink/paper/ignite

Full pivot away from the "trophy room" marble/gold aesthetic to a new
system inspired by foodnia.co.jp, lisa.locomotive.ca/en, and
designbomb.it — an alternating ink/paper canvas, a single "ignite" accent,
Space Grotesk display type, and "liquid motion" GSAP techniques (blob
morphs, clip-path wipes, velocity-skew). GSAP + ScrollTrigger stays the
only motion library — Framer Motion/Motion was explicitly considered and
rejected for this project. The full plan (token decisions, phase-by-phase
file list, the four open-decision resolutions for smack talk/game-of-the-
week/video/player cards) is in the session's plan file; this entry tracks
shipped status only. SPEC.md §5 now describes this system as binding; its
marble/gold section is kept as a historical record.

**Phase A — Tokens + static chrome. Status: complete, verified locally.**
`src/index.css`'s `@theme` block was remapped in place: the eight
marble/gold token _names_ kept their utility classes working everywhere
(`bg-marble`, `text-gold-bright`, etc. all still resolve), only their hex
values and roles changed (paper/ink/ignite/current), plus three new
tokens (`--color-ink`, `--color-ink-raised`, `--color-mute-on-ink`) for
the alternating-canvas pattern the old single-background model didn't
have. `--font-display` moved from Cormorant Garamond to Space Grotesk
(`@fontsource/cormorant-garamond` uninstalled, `@fontsource/space-grotesk`
installed) — a single token flip that retargets every `h1`-`h4` and
`font-display` usage app-wide with no per-component edits. The five
marble/gold-specific CSS classes (`.marble-surface`, renamed to
`.paper-surface`, plus `.gallery-card`, `.gold-divider`,
`.text-gold-metal`, `.gold-frame`) were redefined as flat equivalents —
no more hotlinked Unsplash marble photo, no more 3-stop metallic
gradients — while the latter four keep their original names since
they're still consumed by components not yet touched (Phases B–E). A
blob-morph keyframe (`--animate-blob`) was added for later liquid-motion
work, wired into the existing `prefers-reduced-motion` disable block
alongside the other ambient loops. `src/content/teamColors.ts`'s
`FALLBACK_PALETTE` got new, more saturated hex values — the old ones were
tuned to blend toward a warm neutral under `JourneyScene`'s 3D lighting
and would have read muddy as flat 2D fills. `PasswordGate.tsx`'s
submit-button hover state was changed from an ignite fill to a charcoal
(ink) fill with paper text — the direct gold-to-ignite swap would have
sat right at the edge of WCAG AA for a small button label, so this uses
the dark/light pair instead of the accent color as a
background-with-text-on-top.

Verified: `tsc -b`, `oxlint` (same pre-existing warnings, zero new),
`prettier --write`, and a production `vite build` all pass. Checked live
in the dev server at true 390×844 (an initial Playwright pass used an
unrecognized `--device` string and silently rendered at 569px wide —
caught by checking `window.innerWidth` before trusting the screenshots,
then re-verified at the real width): the gate screen, header nav,
full-screen nav overlay, and the still-unmigrated homepage content below
the fold all render coherently — new chrome and new type throughout,
ignite used only decoratively (dividers, borders, active-link underline,
scroll cue), and not-yet-restyled sections stay legible since they were
already consuming the same remapped tokens rather than hand-picked hex
values.

Not yet deployed to the production URL or checked on a real device —
that lands with the phase(s) that follow, per this project's own "deploy
every phase, real-device-check anything touching 3D/motion" pattern. No
3D/motion work happened in this phase, so a real-device check isn't
blocking yet, but is still owed before the redesign as a whole is called
done.

**Phase B — Hero + scroll-velocity audio. Status: complete, verified
locally.** `three/HeroScene.tsx` renders a small cluster of drei
`MeshDistortMaterial` blobs (ignite/current colored, three under the
`'full'` effects tier, one under `'reduced'` — a genuinely simpler scene,
not the same one slower) — the concrete, no-extra-dependency answer to
"liquid motion graphics" for a 3D mesh, the same way index.css's
`--animate-blob` keyframe answers it for a 2D div. `three/HeroCanvas.tsx`
follows the exact same Canvas/SceneLighting/ScrollCameraRig shape as
`WeeklySummaryCanvas`/`TrophyRoomCanvas`. `components/HeroSection.tsx` is
the new full-bleed ink hero: a `-mx-6` escape from `Layout.tsx`'s `px-6`
so it reaches true viewport edges (the other two 3D sections stay inside
the padded column, but a hero specifically reads as broken with a paper
gutter around it), the same sticky-track-inside-a-taller-wrapper pattern
as the other canvases, and a scrubbed GSAP fade/lift on the foreground
copy as the user scrolls past it (skipped entirely under
`prefers-reduced-motion`, matching `ScrollCameraRig`'s own parked-camera
behavior). `HomePage.tsx`'s old plain-text header (kicker, "Scoreboard",
divider, sound prompt, scroll cue) moved inside it unchanged in content,
restyled for the dark canvas. `SectionKicker`/`ScrollCue` gained an
optional `tone` prop (`'paper'` default, `'ink'` for the hero) so their
other call sites (History's kickers, History's own `ScrollCue`) are
unaffected. `EnableSoundPrompt.tsx` was restyled and, in the process, a
real pre-existing bug was found and fixed: it referenced
`border-gold-metal`/`bg-gold-metal`, which were never real Tailwind
utilities (`gold-metal` was only ever the CSS variable name inside
`.text-gold-metal`'s `background-clip: text` trick, not a `--color-*`
token) — the sound-prompt's ring and dot had been silently unstyled since
whenever that landed. Now uses the real ignite token.

Scroll-velocity ambience (`audio/SoundProvider.tsx`): a new `velocityGain`
node sits in series after the existing `ambienceGain`
(`source → ambienceGain → velocityGain → destination`) rather than
modulating `ambienceGain` directly, so it composes cleanly with the
already-scheduled fade-in/out and `duck()` envelopes on that node — the
new node only ever holds a continuous multiplier around 1, never a
scheduled ramp of its own, so it can't cancel or fight a `duck()` call
mid-swell. A rAF loop (running only while the bed is actually audible,
so a visitor who never opts into sound pays nothing extra) samples
`window.scrollY` each frame, smooths the resulting speed with an
exponential moving average, and drives the gain toward a target between
0.85× (at rest) and 1.4× (a fast flick) via `setTargetAtTime`. No new
public API surface — `useSound()`'s `play`/`duck`/`toggle` contract is
unchanged.

Verified: `tsc -b`, `oxlint` (same pre-existing warnings, zero new),
`prettier --write`, and a production `vite build` all pass. Checked live
in the dev server at true 390×844: the hero renders edge-to-edge black
with the "Scoreboard" title, ignite divider, and now-legible sound prompt
all correctly styled; scrolling into the hero fades the foreground copy
out and hands off cleanly into the first paper section
("What the hell just happened") with no layout shift; console shows only
the same pre-existing benign favicon/THREE warnings, nothing new. The
scroll-velocity gain modulation itself is exercised by the code path
(rAF loop, `setTargetAtTime` calls) but its audible effect can't be
verified by an automated screenshot pass — that's a real-device/real-ear
check, deferred to Phase F alongside the rest of this redesign's
outstanding real-device work.

**Phase C — Rotating player cards. Status: complete, verified locally.**
`api/seasonLeaders.ts` aggregates each starter's fantasy points across
every week of the season (only counting weeks a player was actually
started, not bench points) into a season point-total leaderboard, reusing
the exact `streakWeeksMatchups` array `HomePage.tsx` already fetches for
the standings streaks — no new API calls. `three/PlayerCard.tsx` follows
`Portrait.tsx`'s texture-loading/error-boundary shape exactly, but with a
real player headshot (`api/cdn.ts`'s `playerHeadshotUrl`) on an
ignite/current-alternating backing instead of a gold frame.
`three/PlayerCardArc.tsx` arranges cards with the shared `arcLayout.ts`
math and drives the group's rotation from two independent sources summed
together rather than fighting each other: a GSAP scrub tween (one full
turn across the section's own scroll track — "3D elements that animate
based on scroll position") and a native-pointer-event drag override that
eases back to zero on release. `prefers-reduced-motion` disables the
scroll-driven spin but leaves drag intact, on the reasoning that a
deliberate user gesture isn't the ambient motion that preference guards
against.

`components/SeasonLeadersSection.tsx` branches on `effectsTier`: the
`'full'` tier mounts the 3D arc (lazy-loaded, same
`ChunkErrorBoundary`+`Suspense fallback={null}`+sticky-track pattern as
every other canvas) with a visually-hidden real list alongside it for
accessibility — the same split `EfficiencyChart` already uses for its
bars plus a real `<table>`. The `'reduced'` tier skips the 3D canvas
entirely and shows `components/PlayerCardStrip.tsx`'s horizontal
scroll-snap strip as the only, fully visible content — a genuinely
different, cheaper layout per SPEC.md §7.2, not the same scene rendered
slower. Worth noting for whoever checks this on a real phone next: since
`EffectsTierProvider` gates on a 640px viewport-width `matchMedia` (not
device capability), **every phone in this league sees the reduced 2D
strip by default**, not the 3D arc — the 3D path is a desktop/tablet
enhancement, which is exactly backwards from "reduced tier is a
fallback for weak hardware" if a capable phone happens to render at
&lt;640px width. That's the same tier-gating tradeoff `EffectsTierProvider`
already made deliberately (documented in its own file as tried against
device-capability sniffing and abandoned) — not a new problem this phase
introduced, but worth flagging since this is the first phase where the
2D-vs-3D split is this visible a difference rather than a perf nicety.

Verified: `tsc -b`, `oxlint` (one new warning, same category as
`Portrait.tsx`'s existing one — mutating a hook-returned texture's
properties, an established pattern in this codebase), `prettier --write`,
and a production `vite build` all pass. Checked live in the dev server:
at 390px width (reduced tier) the horizontal card strip renders real
player headshots, names, and point totals correctly, matching the
surrounding Awards section's styling; at 1280px width (full tier) the 3D
arc renders four visible cards with real Sleeper headshots on
alternating ignite/current backings, and scrolling the section visibly
rotates the arc (confirmed by screenshot comparison before/after a
600px scroll). Console showed zero errors on both passes.

**Phase D — Homepage rebuild plus new content sections. Status: complete,
verified locally.** New `src/content/banter/` (`types.ts`, `lines.ts`,
`index.ts`) mirrors `content/lore/`'s pattern exactly — hand-authored,
versioned, keyed by Sleeper `user_id`, ships empty. `banterForMatchup`/
`banterForWeek` are the only two accessors, same "one place components
read from" rule lore's `index.ts` already documents.
`components/SmackTalkFeed.tsx` renders that week's lines (or nothing,
same empty-by-default convention as `RecapAwards`/`RecapRankings`) between
Awards and the efficiency chart. `components/GameOfTheWeekHero.tsx` is a
dedicated 2D+GSAP ink section (not a second WebGL scene — protects the
mobile frame budget, the "new 3D" allowance went to Phase C's player
cards) promoting the week's authored game-of-the-week flag, with a
gradient-tinted `--animate-blob` shape (index.css, added in Phase A)
behind the copy using the two teams' own `teamColorFor` accents. Mounted
right before the matchup journey. `WeeklyJourney.tsx`'s now-redundant
inline "· Game of the week" text badge was dropped since the game gets
its own promoted section instead.

Retint pass across the journey's 3D scene and DOM panels: `JourneyCanvas.tsx`'s
hardcoded background/fog color moved from the old `--color-charcoal`
value (`#2B2926`) to the new one (`#0B0B0E`) — this file sets a literal
three.js color, not a CSS var, so it needed its own edit to stay in sync
with index.css's Phase A remap. `JourneyScene.tsx`'s two inline accent
constants (`IGNITED_GOLD`, `ACCENT_WARM_BASE`) moved to ignite and a
warm dark graphite respectively. `WeeklyJourney.tsx`'s inline DOM text
colors (five distinct hardcoded hexes for headline/label/score/body
roles) were mapped to the nearest new token by role (paper for headline
white, ignite for the accent kicker, ignite-soft for score emphasis,
mute-on-ink for dimmer labels and body copy).

**Scope note, decided rather than assumed:** the plan's own Phase D
description suggested JourneyScene.tsx's turf/stands geometry could get
"a new motif (e.g. glowing scoreboard-slab plinths)." That file carries
an unusual amount of hard-won, live-verified tuning (falloff radii,
per-instance jitter seeds, fog-interaction fixes, triangle-count
budgeting — all documented in its own extensive comments). A full
geometry rebuild without the same live-verification rigor risked
reintroducing exactly the bugs those comments describe fixing, with no
way to re-verify visually to the same standard in one autonomous pass.
Retinting the existing structure (colors only, geometry/physics/tiering
untouched) was the judgment call made instead — it achieves the actual
goal (the stadium no longer reads as the old gold/marble system) without
that risk. The geometry itself is still open for a future pass if wanted.

`three/materials.ts`'s `GOLD_MATERIAL_PROPS`/`BRASS_MATERIAL_PROPS`
moved to ignite/current — a single shared edit that also retinted every
other consumer (`Portrait.tsx`'s frame, `TrophyRoomScene.tsx`, the
journey's stadium shell walls) in one place, plus
`MARBLE_MATERIAL_PROPS`/`IVORY_MATERIAL_PROPS` moved to the new paper/
paper-raised hex values, updating `WeeklySummaryScene`'s floor and blank-
portrait fallback (shared via `SceneFloor.tsx`/`Portrait.tsx`) ahead of
Phase E's own pass on that scene. `WeeklySummaryCanvas.tsx`/
`TrophyRoomCanvas.tsx`'s own hardcoded background/fog hex
(`#f7f5f2`, an ad hoc near-white not tied to any token) were aligned to
the exact new paper hex for consistency. `EfficiencyChart.tsx`'s two
chart-fill CSS custom properties moved to ignite/unchanged-charcoal-soft;
its comment's specific contrast measurements were softened to note
they're unverified for the new color rather than left stating stale
numbers as current fact.

`RecapAwards.tsx`, `RecapRankings.tsx`, `RecapStorylines.tsx`,
`ActivityFeed.tsx`, `TeamAvatar.tsx`, `PlayerHeadshot.tsx`, and
`SectionKicker.tsx` needed **zero edits** — confirmed by reading each
file, they only ever reference the shared tokens/classes Phase A already
remapped (`text-charcoal`, `gallery-card`, `gold-divider`,
`border-gold-bright`, `.gold-frame`), never a hand-picked hex. This is
the payoff of Phase A's "keep token names, change values" strategy: most
of the "restyle-only" surface area in the original plan turned out to
already be done by construction, not because it was skipped.

`HomePage.tsx`'s final section order:
Hero → Storylines → Game of the Week → Journey → Season Leaders → Awards
→ Smack Talk → Efficiency chart → Power rankings → Marquee → Results →
Week Highlights → Standings wall → Standings table → Activity feed —
matching the redesign plan's table exactly.

Verified: `tsc -b`, `oxlint` (same pre-existing warnings, zero new),
`prettier --write`, and a production `vite build` all pass. Checked live
in the dev server at true 390×844: `gotw-heading` and
`smack-talk-heading` both correctly absent (this week's authored content
has no `gameOfTheWeek` flag and `banter` ships empty, exactly the
supported empty state), `season-leaders-heading` and `efficiency-heading`
both present, the journey's retinted station panel screenshots correctly
(ignite kicker, ignite-soft score emphasis, mute-on-ink labels, paper
headline, all against the ink scrim), and the standings wall's
ignite-framed portraits render against the new paper canvas. Console
showed only the same pre-existing benign favicon/THREE warnings on every
check. `GameOfTheWeekHero`'s actual rendered appearance with a real
flagged game was not visually verified this pass, since doing so would
have meant writing fake content into the real authored recap file —
its render-nothing path was verified instead; the render-something path
is a real gap to check once a week with an authored `gameOfTheWeek` flag
exists, or with deliberately temporary local content that gets reverted.

**Phase E — Team/History restyle. Status: complete, verified locally.**
Reading `TeamPage.tsx`, `HistoryPage.tsx`, and `TrophyRoomScene.tsx`
confirmed all three needed **zero code edits** — the same payoff Phase D
found for the Recap*/ActivityFeed components. They only ever reference
tokens/classes (`gold-divider`, `gallery-card`, `text-gold-metal`,
`border-gold-bright`) and shared material presets
(`MARBLE_MATERIAL_PROPS`, `GOLD_MATERIAL_PROPS`, etc.) that Phases A and
D already remapped, so both pages and the trophy room scene picked up
the full ink/paper/ignite system automatically. Verified live rather
than assumed: League History's trophy toppers, portrait-wall frames, and
large record numerals all render in ignite against the new paper canvas,
and a team page's avatar frame, season tabs, and week-row cards all
match, with no console errors.

**Scope note, same reasoning as Phase D's JourneyScene decision:**
`TrophyRoomScene.tsx` (plinths, trophy toppers, portrait wall, podium)
was retinted via the shared `materials.ts` edit rather than rebuilt with
new geometry. Its motifs (trophies, records, a podium) are generic
"league record room" content that reads fine recolored, not something
inherently tied to the old marble/gold system the way, say, a literal
photographed-marble texture was — so a geometry rebuild here would have
been a bigger swing for less actual payoff than the journey's stadium
got from the same treatment. Also **not deleted**, contrary to the
original plan text's assumption: `three/materials.ts` is still a live
dependency of `JourneyScene.tsx`, `Portrait.tsx`, `SceneFloor.tsx`, and
`TrophyRoomScene.tsx` — the plan's "delete once nothing references it"
line assumed a full geometry rebuild of both 3D content scenes that,
per both this phase's and Phase D's scope notes, didn't happen.

**Real bug found and fixed during this phase's verification, not just a
restyle:** `audio/EnableSoundPrompt.tsx` was hard-coded ink-only in Phase
B on the documented assumption that it "only ever renders inside
HeroSection.tsx" — wrong, `HistoryPage.tsx` renders it too, on paper.
That silently dropped its text below WCAG AA contrast on History
specifically (confirmed by screenshot: legible-looking but the wrong,
too-light token) until caught here. Fixed by giving it the same `tone`
prop pattern `ScrollCue`/`SectionKicker` already use (`'paper'` default,
restoring History's original correct behavior; `HeroSection.tsx` now
passes `tone="ink"` explicitly). Worth flagging as a class of bug for
Phase F's sweep: any component styled for "the one place it renders"
during this redesign is worth re-checking for a second, forgotten call
site before trusting that assumption.

Team pages still have no dedicated 3D scene of their own — unchanged
from before this redesign, an open question this phase didn't need to
resolve (PLAN.md Phase 7 already flagged this as open, not a gap this
redesign introduced). `TeamAvatar.tsx`'s square "gallery frame" motif
(flagged in the original plan as worth reconsidering for a flat
teamColorFor-keyed ring) was left as-is — it already renders correctly
in ignite via the Phase A `.gold-frame` class redefinition, and swapping
the motif itself is a design change beyond what this restyle phase asked
for, not a blocker.

Verified: `tsc -b`, `oxlint`, `prettier --write`, and a production
`vite build` all pass. Checked live in the dev server at true 390×844:
History's header, trophy room scene, championships list, and records
numerals all screenshot correctly (before and after the
`EnableSoundPrompt` fix, confirming the fix actually changed the
rendered contrast rather than being a no-op); a team page
(`/team/859328673705230336`) renders its avatar frame, season tabs, and
week-by-week card correctly. Zero console errors on every check in this
phase (the cleanest phase yet — no favicon 404 even showed up on some
passes, apparently already cached).

**Phase F — Cross-cutting a11y/perf/real-device plus final docs pass.
Status: the accessibility sweep and docs pass are done; the real-device
and Vercel-deploy checks are not (see below — this is the one gap the
whole redesign still owes).**

Ran an actual WCAG contrast calculation (relative luminance/contrast
ratio, not eyeballed) against every ink/paper × ignite/current/mute
pairing the redesign introduced. Two real findings, both fixed:

- **`.text-gold-metal` (large display numerals — Home's "High score,"
  History's "Best single week"/"Longest win streak") measured 2.80:1
  against paper — fails even the relaxed 3:1 large-text floor.** Fixed
  by pointing the class at `--color-gold` ("ignite-deep," `#C2451F`,
  4.55:1 against paper) instead of `--color-gold-bright` ("ignite,"
  `#FF5A36`) — the one place in the app an "ignite" token is literal
  readable text rather than a border/divider/icon, so it's the one place
  that needed the darker variant. Confirmed by screenshot before/after:
  the numerals visibly darken to a legible burnt-ember tone.
- **`--color-brass`/"current" (`#2EE6D6`) measured 1.41:1 against paper**
  — currently a non-issue since grep confirms it's only ever consumed by
  3D materials (`three/materials.ts`, `three/liquidMaterials.ts`), never
  as 2D text/borders, but documented with an explicit warning in
  `index.css` so a future edit doesn't reach for `text-brass`/`border-brass`
  on a paper surface without knowing it fails badly.

Every other pairing actually in use measured well clear of AA: charcoal
on paper 17.7:1, charcoal-soft on paper 6.9:1, paper on ink 17.7:1,
mute-on-ink on ink 7.1:1, gold-light on ink 16.0:1, ignite-bright on ink
(the journey's kicker text) 6.3:1. `Marquee.tsx`'s decorative ignite
display text at 70% opacity was left as-is — an already-documented,
pre-existing exception (large decorative text with a redundant sr-only
readable duplicate), not something this redesign changed the nature of.

`prefers-reduced-motion` verified live (Playwright's `emulateMedia`, not
just read from the code): the hero's blob stops distorting and rotating,
the GSAP scroll-linked fade on the hero copy doesn't fire at all
(content stays fully visible and readable even scrolled past where it
would otherwise have faded), and the player-card arc's scroll-driven
spin is disabled while drag still works — matching each component's own
documented intent. Keyboard navigation spot-checked: tab order through
the header and into the new hero (logo → sound toggle → menu → hero's
own sound prompt) is sequential and correct, and the one surprising stop
(focus landing on `PlayerCardStrip`'s scroll-snap `<ul>`) is the browser's
standard implicit-focus behavior for scrollable regions, not a bug — it's
what makes that horizontal strip keyboard-scrollable.

Docs consistency pass: grepped for lingering `Cormorant` references
(none outside historical/changelog prose, which is intentionally kept as
a record per this project's own convention) and fixed one genuinely
stale line in SPEC.md §3 that still described the gate's _old_ literal
aesthetic ("marble slab, gold inlay lock/latch motif") after Phase A
changed what the gate actually looks like.

**What's NOT done, and is the one real gap this whole redesign still
owes:** nothing in Phases A–F has been deployed to the production Vercel
URL, and nothing has been checked on an actual phone. Every verification
in this redesign was the dev server plus Playwright at emulated
viewport sizes — exactly the "Chrome DevTools' device emulator does not
reflect real GPU/thermal performance" gap CLAUDE.md itself warns against
treating as sufficient. In particular, still unverified on real hardware:
the ≥30fps mobile floor for the new hero/player-card 3D scenes, the
scroll-velocity ambience's actual audible feel on real touch-scroll
momentum (iOS Safari's rubber-banding specifically, per SPEC §7.2), and
whether `EffectsTierProvider`'s 640px viewport-width tier gate (not a
capability check) lands most phones on the reduced 2D player-card strip
as intended or misses a capable-but-narrow device. This needs a push to
the deploy branch and a real phone in hand — not something achievable
from this environment.

## Phase G — Hero footballs, journey redesign, confetti, trading-card

preview, zoom fix

Five features requested together, executed as one pass. Status:
complete, verified locally (dev server + Playwright at 390px and
1440px); real-device verification is the same outstanding gap Phase F
already flagged, unchanged by this phase.

**Hero footballs.** `three/HeroScene.tsx`'s liquid blobs (PLAN.md Phase
13B) are replaced with three footballs — a scaled sphere (a prolate-
spheroid stand-in; three.js has no football primitive) with five lace
boxes, rotating clockwise on a GSAP scrub tied to the hero's own scroll
track rather than a time-based idle spin, per the brief's "rotate ...
based on scroll progress." Ignite/current appear only as lace color and
a per-ball point light, not the ball's own material, per the brief's
"keep ignite/current as accent lighting." `three/liquidMaterials.ts` is
deleted (no longer referenced).

Two real bugs surfaced and fixed while verifying this, both by
screenshot, not assumed:

- The ball's first body color (a near-ink dark grey, chosen so ignite/
  current would read as the only color) was **nearly invisible** against
  the ink background — a neutral-dark object heavily fogged blends
  toward the fog's own near-black color, unlike the old blobs' saturated
  ignite/current material which stayed visually distinct from fog even
  when faded. Fixed with a lighter pewter-grey body plus a nearer camera
  distance and a pushed-out fog `near` value, all confirmed by
  before/after screenshots.
- The initial ball layout crowded the hero copy at 390px width. Pushed
  further to the frame's corners and scaled down — desktop (three
  clearly separated, well-lit balls flanking the headline) reads better
  than mobile (one ball tucked into a corner) but both are legible and
  don't obscure the text.

**Journey redesign.** `three/JourneyScene.tsx`'s turf floor and tiered
stadium stands (`FullStands`/`SimpleStands`/`AccentLighting`, the bulk of
the file) are deleted entirely, along with `three/turfTexture.ts` and
`three/crowdTexture.ts` (now fully unreferenced) and
`TURF_MATERIAL_PROPS`/`STAND_MATERIAL_PROPS` from `materials.ts`. This
reverses a scope call from the previous redesign pass (PLAN.md Phase
13D), which declined to rebuild this same geometry given how much live-
verified tuning it carried — this phase's brief explicitly asks for the
rebuild anyway, so it's a deliberate replacement made with that history
in view, not a casual one. `Station`'s portrait face-off and winner-
ignite glow (the actual matchup visualization, not stadium dressing) are
unchanged.

Replacement: `three/playDiagramTexture.ts` generates transparent-
background canvas textures of abstract X's-and-O's formations (three
schematic variants, offense/defense markers, arrowed routes) — the same
procedural-canvas approach the deleted textures used, just drawing
something else. `PlayDiagrams` places two per station (ignite for the
winner's side, current for the loser's), positioned to the sides clear
of the central portraits. Parallax is mostly free: each plane sits at
its own fixed Z and the journey's existing camera dolly already passes
them at different apparent rates by depth; on top of that, the full
effects tier fades a plane in/out by camera proximity (the same
distance-falloff shape `Station`'s own ignite plane already used).

**Journey confetti.** `components/ConfettiLayer.tsx` — plain DOM
particles animated directly with GSAP (no React state per particle),
mounted once by `WeeklyJourney.tsx` and fired from the same
`onStationDwellStart` callback that already drives the sound duck/roar.
`JourneyCameraRig`'s `onStationDwellStart` callback signature gained a
`velocity` parameter (px/sec, read from the same ScrollTrigger already
driving the camera) so confetti intensity scales with how fast the
reader is scrolling, without a second independent velocity sampler.
Bias (left/right lean) reads a comparison of the two rosters' ids rather
than the winner's on-screen position — this scene always renders the
winner on the left, so a literal "which side did the winner render on"
bias would be identical every single time; a stable per-matchup id
comparison gives the real per-game left/right variation the brief's own
example describes. Scoped to the journey only — nothing else on the site
mounts `ConfettiLayer`.

A real bug surfaced here, not caught until a live reload deep in the
page: `JourneyCameraRig`'s new velocity read (`tween.scrollTrigger?.getVelocity()`)
referenced the enclosing `const tween` from inside that same tween's own
`onUpdate` callback, which GSAP/ScrollTrigger can invoke _synchronously
during initialization_ under some mount conditions — throwing "Cannot
access 'tween' before initialization" and taking the whole journey
canvas down (caught by `ChunkErrorBoundary`, so the page degraded rather
than crashed, but the canvas was gone). Fixed by reading velocity from
the ScrollTrigger's own nested `onUpdate(self)` callback into a separate
`let lastVelocity` variable instead, which receives the instance as a
parameter rather than closing over a not-yet-assigned `const`.

**Trading-card matchup preview.** `components/NextWeekPreview.tsx`,
mounted directly above the Standings section. "Next week" resolves to
whichever not-yet-scored week should be previewed (the current NFL week
itself if it hasn't started scoring, otherwise the following week),
reusing the exact `useMatchups`/`pairMatchups` pattern every other week
view already uses — no new data-fetching shape. Cards alternate ink/paper
per card (not per side); each face shows the team's avatar, name,
starting lineup with real Sleeper headshots, and a bottom stats bar
(W-L record, season points-for — "PFF" in the brief, resolved to
league-scored points-for per the brief's own "Claude should use
league-standard PPR points" instruction, since this app has no
projected-points data source at all).

The flip is a real CSS 3D transform (`rotateY` on a `preserve-3d`
element with two `backface-visibility: hidden` faces), not r3f — chosen
for the same reason `WeeklyJourney` keeps its score/headline text in DOM
rather than 3D: a card's content is names, numbers and photos, which
belong in DOM for selectability/screen-reader access regardless of which
motion technique drives the container. Scrubbed to exactly 300px of
scroll (the brief's own figure) via GSAP, confirmed correct at 0%
(front, flat), 25% (a genuine perspective-tilted 3D card, not just an
opacity cross-fade), 50% (`rotateY(90deg)` exactly, confirmed via
computed `matrix3d` — a real flipping card edge-on and hard to see for
that one instant is physically correct, not a bug), and 75% (Team B's
side, right-reading, not mirrored, confirming the `backface-visibility`
trick composes correctly with the earlier flip tween). Disintegration
triggers as a discrete one-shot (`toggleActions: 'play none none
reverse'`, not scrubbed) once flip-plus-hold scroll distance is passed;
particles scale up while spreading radially and fading — the flat-
screen stand-in for "toward the viewer," since no 2D DOM/CSS technique
can produce true stereoscopic depth — mixing ignite and current per
the brief. `prefers-reduced-motion` skips all of it: both team cards
render as plain stacked panels, no rotation, no particles, confirmed by
screenshot.

One transient visual artifact noted, not fully chased down: a single
frame captured via a fast synthetic scroll jump (Playwright's
instant `mousewheel`, not a real touch/wheel gesture) showed Team A's
mirrored text briefly during the disintegration fade, while every
settled state before and after that frame (front, 25%, 75%, fully
faded) checked correct via computed style, not just eyeballed. Given it
self-corrects immediately and real gesture-driven scrolling doesn't
jump discontinuously the way a synthetic instant scroll does, this is
flagged as a real-device thing to watch rather than something fixed
blind here.

**Pinch-to-zoom fix.** `index.html`'s viewport meta gained
`maximum-scale=1, user-scalable=no`. `index.css` locks `html`/`body` to
the viewport width and restricts `touch-action` to vertical panning.

This surfaced the single most severe bug of this phase: the first
version used `overflow-x: hidden` on `html`/`body` as the brief
specified. CSS links `overflow-x`/`overflow-y` — setting one to a
non-`visible` value while leaving the other at its default `visible`
silently promotes the second to `auto`, turning `html`/`body` into an
actual scroll container. That **broke `position: sticky` for every
scroll-driven 3D canvas on the entire site** (hero, journey, standings
wall, trophy room, player cards, this phase's own trading cards) —
confirmed by a sticky element's `getBoundingClientRect().top` moving
1:1 with `scrollY` instead of holding at 0, the exact symptom that first
looked like a trading-card-specific bug before the real, page-wide cause
was traced. Fixed with `overflow-x: clip` instead, which prevents the
same horizontal overflow without establishing a scroll container or
triggering the linked-overflow promotion — confirmed by re-checking
`overflow-y` computed to `visible` again and every affected sticky
section holding at `top: 0` under scroll, not just the one that first
surfaced it.

**Verified:** `tsc -b`, `oxlint` (same eight pre-existing warnings this
whole redesign has carried since Phase A, zero new), `prettier --write`,
and a production `vite build` all pass. Checked live at 390×844 and
1440×900: hero footballs visible and rotating on scroll at both widths,
journey play diagrams visible at station edges without crowding the
scorecards, confetti bursts firing with correct ignite/current coloring
on station transitions, trading-card front/mid-flip/back/disintegration
all confirmed via computed style (not just screenshots) at both the
happy path and the reduced-motion path, zero horizontal overflow at
1440px, and every pre-existing sticky 3D section re-confirmed working
after the overflow fix. Console showed zero errors on every check after
the two bugs above were fixed.

**Not done:** real-device verification (frame rate, touch-gesture flip
feel, actual pinch-to-zoom behavior on real iOS/Android) — the same gap
every phase since the redesign began has carried, still not achievable
from this environment.

## Phase H — Football kick journey: complete redesign

The journey's third full rewrite (Phase G replaced the marble/gold
stadium with play diagrams; this phase replaces play diagrams with a
single continuous sky-cam football kick). Deleted entirely: the old
per-station glide-and-dwell camera system, `Portrait`-based 3D avatar
frames in the journey specifically (the shared `Portrait.tsx` component
itself stays — `WeeklySummaryScene.tsx` still uses it), and Phase G's
play-diagram texture system (`playDiagramTexture.ts` deleted). What's
new: `three/Football.tsx` (a shared, "dumb" football mesh — no
position/rotation props, callers mutate a wrapping `<group>` ref
directly — used by both the hero and the journey so the two don't
maintain separate copies), a completely rewritten `three/journeyLayout.ts`
(quadratic-Bezier ball arc, lerped camera pose, equal per-matchup scroll
segments — replacing every dwell/closeness/GOTW-weighting export except
`closenessOf`, kept because `WeeklyJourney.tsx`'s audio duck/roar shaping
still reads it), and a rewritten `JourneyCameraRig.tsx` that drives both
the ball's flight and the camera's pose from one shared scroll-scrubbed
progress value into a single ref, so "camera stays centered on the ball"
is true by construction rather than two independently-computed
approximations of it.

**Hero:** `HeroScene.tsx` dropped from three footballs (Phase G) to one,
centered behind "Scoreboard," with a new scroll-scrubbed vertical drop
paired with the existing rotation — both driven off the same hero scroll
track so they can't drift out of sync with each other regardless of
scroll speed. The "drops into the journey" effect is a same-canvas
illusion (the ball falls out of the hero's own frame right as its sticky
section releases into the journey below) — the two are separate WebGL
canvases with no way to literally hand off geometry between them.

**Two real bugs found via a debug console readout, not fixed on
assumption:**

- **The football was roughly double the size assumed.** `Football.tsx`'s
  body is a unit sphere scaled `[1.55, 0.88, 0.88]` — a ~3.1-unit-long
  object (diameter, not the ~1.5 "radius-as-if-it-were-height" this
  phase's own camera-distance math was first written against). At the
  journey's much larger scale (a 20-unit field, goalposts ~3.6 units
  apart) that made the ball swell to fill most of the frame barely a
  tenth of the way through the flight — confirmed by a temporary
  `console.log` of the actual live camera-to-ball distance and fov
  reading `dist: 7.88, fov: 39.7`, working out to the ball occupying
  roughly half the frame height, not the eyeballed screenshot alone.
  Fixed with a `scale={0.35}` wrapper around the shared `Football` in
  `JourneyScene.tsx` specifically (the hero's own football, at its own
  much closer camera distance, was already correctly sized and untouched).
- **The end camera pose was geometrically wrong, not just mistimed.** The
  first version placed `END_CAM` at `z: -1` — a point the ball itself
  flies _past_ en route to the uprights (`UPRIGHT_POSITION.z: -15`), so
  easing the camera toward it moved the camera _into_ the ball's own
  flight path rather than pulling back from the whole arc. Tightening the
  camera's own easing curve (a `Math.sqrt(flightT)` front-load, still
  kept, since it's independently a reasonable "opens up faster than the
  ball's own physically-motivated arc" choice) didn't fix this, because
  the destination itself was wrong, not merely reached too slowly — moving
  `END_CAM` to sit high above the field's own midpoint (`{x:0, y:12, z:0}`)
  is what actually reads as "pulled back," confirmed by re-running the
  same debug readout at the same scroll position afterward and seeing a
  proportionate ball again.

**Confetti:** the existing per-matchup `ConfettiLayer.burst()` (Phase G)
stays, fired from the same `onMatchupChange` callback (renamed from
`onStationDwellStart`) with the same velocity-scaled intensity and
roster-id-comparison bias. New: `ConfettiLayer.finaleBurst()`, fired once
from `JourneyCameraRig`'s new `onFinale` callback the instant the ball's
flight reaches the uprights — spawns from six origin points spread across
the top of the screen rather than one center point (confirmed live: this
is what actually reads as "fills the screen" instead of one bigger single
firework), alongside a `playPassThrough()` flourish (the ball keeps
flying past the posts and shrinks away over 0.3s) and a deep duck into a
full-gain roar, all landing on the same instant.

**Scorecard/DOM:** `WeeklyJourney.tsx`'s panel content is largely
unchanged (team names, scores, top-starter headshots, authored
headline/chips/body) — the brief's own "scorecard stays centered, large,
hero element, same as before." What changed: panel heights are now a
flat `100svh` each (equal per-matchup segments, matching "divide total
scroll by matchup count") rather than closeness-weighted fractions, and
the `gotwIndex`/`applyGotwDwell` machinery is gone — the game of the week
gets no special camera treatment anymore (`GameOfTheWeekHero.tsx`'s own
promotion is its only spotlight now, not a supplement to one the journey
was already doing).

**Verified:** `tsc -b`, `oxlint` (same eight pre-existing warnings this
project has carried since the redesign began, zero new), `prettier
--write`, and a production `vite build` all pass (the journey's own lazy
chunk shrank from ~5.5KB to ~3.7KB with the stadium/texture code gone).
Checked live in the dev server at 390×844 and 1440×900: the hero's single
ball renders centered and clear of surrounding UI, the drop-on-scroll
fades the ball out in step with the text; the journey's matchup 1 (ball
grounded, camera static), mid-flight (ball proportionate, yard lines
converging with real depth), and finale (ball rising into a shrinking
pass-through, confetti spreading across the full viewport including
content below the journey) all confirmed correct after the two bugs
above were fixed; `prefers-reduced-motion` parks the ball at kickoff and
the camera at its start pose, confirmed by scrolling deep into the track
and finding zero position change and zero console errors; zero horizontal
overflow at 1440px. Every check showed zero console errors once the two
bugs were fixed.

**Not done:** real-device verification (actual frame rate for the
continuous ball-plus-camera update, whether the kick reads as "a real NFL
broadcast" on a phone screen specifically, touch-scroll feel for the
flight) — the same gap every phase since the redesign began has carried,
still not achievable from this environment. Also worth a real-device
look once available: the goalposts themselves were not confirmed
clearly visible in every frame of the flight in this pass's screenshots
(the ball and yard lines were the most consistently visible elements) —
functionally harmless (the celebration reads fine without them being
prominent), but worth a closer look on a real screen rather than
assuming the framing is optimal.

## Phase H.1 — Realism + visual hotfix

Four targeted fixes reported after a real-device pass on Phase H's kick
journey, none touching the camera/scroll math itself.

1. **Ball buried in the ground.** Phase H's `KICK_POSITION.y = 0.18` was
   tuned assuming the ball rests lying on its side, but its rotation was
   never set that way — at kickoff the ball actually sits at rotation
   zero, i.e. standing on its long axis with no tilt applied, so its
   bottom tip was poking well below the field plane. Fixed by adding a
   local tilt to the ball's own wrapper group in `JourneyScene.tsx`
   (`rotation={[0.15, 0, Math.PI / 2]}` — the 90° Z turn stands
   Football.tsx's long axis upright, matching "on a tee"; the small X
   tilt is the backward lean a real tee'd-up ball sits at) and raising
   `KICK_POSITION.y` to `0.54` (the ball's effective standing half-height:
   1.55 long semi-axis × 0.35 scene scale). The camera rig's own per-frame
   `rotation.z` spin during flight is untouched — it composes with this
   rest tilt rather than replacing it, so the ball still visibly tumbles
   in the air.
2. **Field read as CGI grey/silver, not turf.** `FIELD_COLOR` was
   `#111116`, a near-black that the scene's HDRI studio lighting was
   brightening into flat grey. Replaced with `#17371d`, a saturated dark
   green picked to survive that same brightening and still read as grass
   rather than washing out. Ignite/current yard-line and lace colors
   untouched.
3. **Finale confetti read as blocked by the scorecard.** `ConfettiLayer`'s
   container was mounted in place with `z-40 fixed`, which should already
   out-rank the scorecard's unset z-index — rather than hunt for exactly
   which ancestor was quietly turning it into a containing block (GSAP's
   `Reveal` wrapper sets inline transforms on nearby DOM, which is exactly
   the kind of ancestor that can confine a `position: fixed` child to its
   own box), the container is now portaled straight to `document.body`
   with an explicit maximal inline `zIndex`, removing the dependency on
   this component's mount point entirely. The finale burst's spawn origins
   were also widened from a narrow top-of-screen strip to a taller band
   (10%–55% of viewport height) so some particles now originate around the
   scorecard's own height, not just above it.
4. **Finale burst too small.** `finaleBurst()`'s `originCount`/`perOrigin`
   went from 6×22 (132 particles) to 9×40 (360, ~2.7x), particle size from
   6–15px to 10–25px, and radial spread from `vw × 0.08–0.24` to
   `vw × 0.2–0.6`; fall distance can now go either up or down from each
   origin so the burst reads as filling the screen rather than only
   raining downward.

5. **Removed the 3D "standings wall" section.** The fifth item in the
   original report — "a leftover white box with avatar icons" — turned out
   to be `three/WeeklySummaryScene.tsx` + `WeeklySummaryCanvas.tsx`: a live
   standings wall showing all 12 teams' avatars as textured portrait panels
   along a left-to-right arc, rendered inside a canvas with a flat
   `#f5f3ee` (paper) background, mounted directly above `NextWeekPreview`.
   This wasn't dead code — it was the intentional "live standings wall"
   from the earlier marble/gold-era pivot (PLAN.md's own notes describe it
   as replacing the old static trophy gallery) — but the user confirmed
   after two rounds of narrowing down its location that they want it gone
   regardless, most likely because it duplicates the Standings table
   immediately below it and reads as an out-of-place plain white panel
   against the ink/paper redesign. Both files deleted outright (nothing
   else imports them — `arcLayout.ts`, `SceneFloor.tsx`, and `Portrait.tsx`
   are shared with `TrophyRoomScene.tsx` on League History and stay).
   `HomePage.tsx` had its `WeeklySummaryCanvas` lazy import, the
   `standingEntries` memo, the `StandingEntry` type import, and the sticky
   scroll-track JSX block all removed; `lazy`/`Suspense`/
   `ChunkErrorBoundary` dropped from its own imports once nothing in the
   file used them anymore. The production build's chunk list confirms the
   `WeeklySummaryCanvas` chunk is gone entirely, not just unreferenced.

**Verified:** `tsc -b`, `oxlint` (same eight pre-existing warnings, zero
new, confirming the deletion left nothing dangling), `prettier --write`
(no files needed reformatting), and a production `vite build` all pass,
both right after fixes 1-4 and again after the section 5 deletion.

**Not done:** real-device check of all five fixes (this environment still
has no way to load the live Vercel URL or a real phone) — same
carried-forward gap as every phase since the redesign began.

## Phase H.2 — Trading card disintegration overhaul

Three fixes to `NextWeekPreview.tsx`'s flip-card matchup preview
(`MatchupCard`), reported after a real-device pass on the trading cards.

1. **Uniform black cards.** `MatchupCard` alternated `isInk`/tone by
   index (Phase G), giving every other card a light paper background.
   Both `isInk` and `tone` are now hardcoded to ink — `CardFace`/
   `CardPanel` still take a `tone` prop and the paper branch is left in
   place (it's the only call site, and stripping it would be a bigger
   change than this fix asked for), so the diff is the two lines that
   decide tone, not a rewrite of either component.
2. **Card exploded still face-down from the flip.** The 3D flip
   (`rotateY` scrubbed 0→180 over the first 300px of scroll) reaches 180
   well before the disintegration trigger fires later in the track, and
   nothing else ever touched `rotateY` after that — so by the time the
   card explodes, it's still showing its back face at 180°, which read as
   the card flipping upside-down mid-explosion rather than disintegrating
   in place. Fixed with an explicit `.set(cardRef.current, { rotateY: 0
})` as the first step of the disintegration timeline, forcing the card
   upright at the exact instant the explosion starts. This is a
   deliberate override, not a race with the flip's own tween — the flip's
   scroll range has long since ended by the time this trigger fires, so
   there's nothing actively fighting it. Reversing back out of the
   disintegration (`toggleActions`'s `reverse`) naturally un-does the
   zero-duration set along with everything timed after it, so scrolling
   back up still shows the flipped card rather than one stuck upright.
3. **Confetti replaced with an ignite-only pixel burst.** The old
   `burstParticles()` (mixed ignite/current, purely radial, no gravity)
   read as a generic celebration effect rather than the card itself
   breaking apart. Replaced with `pixelBurst()`: ~260 small ignite-only
   (`#ff5a36`) square pixels, each a single GSAP percentage-keyframe tween
   (0%→20% a quick radial "toward the viewer" pop — reusing this
   project's established scale-growth stand-in for depth, same trick
   ConfettiLayer's finaleBurst uses — 20%→100% gravity carrying the pixel
   further down and fading to zero opacity), 2-3s total per pixel. One
   keyframed tween per particle rather than a nested timeline, matching
   this codebase's existing burst-effect style (`ConfettiLayer.tsx`)
   rather than introducing a new pattern.

**Verified:** `tsc -b`, `oxlint` (same eight pre-existing warnings, zero
new), `prettier --write` (no files needed reformatting), and a production
`vite build` all pass.

**Not done:** real-device check on the live Vercel URL (uniform black
cards, upright disintegration, and how the pixel burst actually reads —
"satisfying card destruction" is a real-device/visual judgment call this
environment can't make) — same carried-forward gap as every phase since
the redesign began.

## Phase H.3 — Football realism, fullscreen journey, pronounced goal moment

Four changes to the kick journey's realism and impact.

1. **Football material.** `Football.tsx`'s `BODY_COLOR` was `#5c5a62` — a
   grey that read as a generic plastic prop. Changed to `#7a4526`, a warm
   pigskin brown; laces are unaffected (still whatever `accentColor` the
   caller passes, ignite at both call sites).
2. **Procedural grass texture.** New `three/grassTexture.ts` — a small
   (128×128, the same order of magnitude as every other texture-size
   lesson this project has already learned about WebGL memory) canvas
   filled with mottled blade-like flecks in four dark-green tones, tiled
   across the field via `RepeatWrapping` rather than drawn at high
   resolution (repetition at this texel density isn't perceptible on a
   pattern this irregular, unlike something with sharp repeating features
   like yard numbers). Replaces Phase H.1's flat `FIELD_COLOR` fill, which
   under the scene's HDRI lighting read as smooth CGI plastic regardless
   of which green it was set to.
3. **Full-bleed journey.** `HomePage.tsx` wraps every Act in a `max-w-4xl`
   reading column, which the journey's own `<section>` had been sitting
   inside since Phase H — leaving visible paper-colored margins on either
   side of the sticky canvas as you scrolled through it, undercutting the
   "fills the whole screen" immersion the kick is going for. Fixed with
   the standard full-bleed-breakout trick (`w-screen` plus a
   `calc(50% - 50vw)` negative margin) on both the journey's own
   `<section>` and the boundary-transition gradient right after it —
   scoped to `WeeklyJourney.tsx` alone rather than restructuring
   `HomePage.tsx`'s column. Safe specifically because `overflow-x: clip`
   is already set on `html`/`body` (the pinch-zoom fix, PLAN.md Phase G),
   so any rounding between `100vw` and the real viewport width is clipped
   rather than becoming real horizontal scroll. The matchup scorecards
   underneath needed no change — they already carry their own
   `max-w-2xl`/`mx-auto`, independent of the section's own width.
4. **Climax zoom on the final kick.** The ball passing through the
   uprights is the same moment `flightT` reaches 1 for the week's one
   continuous flight, but the existing end-of-flight camera pose
   (`END_CAM`, journeyLayout.ts) is deliberately wide/elevated — Phase H's
   own "pulled back" establishing shot, tuned to stop the ball from
   swelling to fill the frame too early. Simply moving `END_CAM` closer
   would have re-broken that (`cameraT`'s sqrt easing already reaches most
   of the way to `END_CAM` by the flight's midpoint), so this is a
   separate, isolated push-in layered on top: three new pure functions in
   `journeyLayout.ts` (`finaleZoomFactor`, `finaleZoomDistanceFactor`,
   `finaleZoomFovFactor`) ramp linearly from 0 at `flightT = 0.88` to 1 at
   `flightT = 1`, and `JourneyCameraRig.tsx`'s `place()` uses that ramp to
   pull the already-computed camera position 30% closer to the ball and
   narrow the FOV to 88% of normal — both effects compounding so the
   uprights read as unmistakably larger right at the pass-through, without
   touching anything before `flightT = 0.88`.

**Verified:** `tsc -b`, `oxlint` (same eight pre-existing warnings, zero
new), `prettier --write`, and a production `vite build` all pass (the
journey's own lazy chunk grew from ~3.7KB to ~4.5KB with the grass
texture module added, still small).

**Not done:** real-device check on the live Vercel URL — whether the
brown football/grass texture actually read as "realistic, not CGI" versus
"looks fine in a screenshot," whether the full-bleed fix holds under
iOS Safari's own viewport quirks (the project's pinch-zoom fix already
had one browser-specific surprise in this exact area), and whether the
climax zoom's magnitude feels right rather than jarring, are all
real-device/visual judgment calls this environment can't make — same
carried-forward gap as every phase since the redesign began.

## Phase H.4 — Pre-Sleeper league history (2020-2023)

The league predates its Sleeper league (which starts at the 2024 season
in the existing season chain); 2020-2023's champions/runners-up have no
API to pull from. New `src/content/leagueHistory/preSleeperArchive.ts`
hand-authors those four seasons as plain `{ season, championName,
runnerUpName }` rows — no `index.ts` read-surface module the way
`content/lore`/`content/banter` have, since there's no per-`user_id`
matching or merge logic here to centralize (unlike lore/banter, which are
keyed by Sleeper identity); `HistoryPage.tsx` reads the file directly.

Deliberately keyed by plain name strings, not `user_id` — CLAUDE.md's own
rule is to use Sleeper `user_id` as the durable identity key, but these
seasons predate anyone in this league having a Sleeper account, and
guessing which current `user_id` a name like "Nidhish" maps to would risk
silently attributing someone else's championship to the wrong person.
These four rows render as plain text with no avatar; only the Sleeper-era
rows (2024+) resolve a `user_id` to a real team avatar/name.

New `championshipsBySeason()` in `api/leagueRecords.ts` — each season's
championship bracket match (`p: 1`), both `w` (winner) and `l` (loser)
resolved to their roster's `owner_id`. This is the per-year complement to
the existing `championsByUser()`, which only ever aggregated a title
_count_ per manager and was left completely untouched (still Sleeper-only,
still feeding the existing "Championships" tally section as before).

`HistoryPage.tsx` merges `preSleeperArchive` (2020-2023) with
`championshipsBySeason(seasonData)` (2024+, the same season-chain data
every other record on this page already reads) into one
`ChampionshipHistoryRow[]` — a discriminated union (`kind: 'archive'` vs.
`kind: 'sleeper'`) rather than optional fields on one shape, so the render
code can never reach for a `user_id` that an archive row doesn't have, or
a plain name a Sleeper row doesn't have. Sorted oldest-first by
`Number(season)`. Rendered as a new "Championship History" section,
placed directly after the existing aggregate "Championships" tally —
additive, not a replacement of it.

**Verified:** `tsc -b`, `oxlint` (same eight pre-existing warnings, zero
new), `prettier --write`, and a production `vite build` all pass.

**Not done:** real-device/visual check of the new section's layout next
to the existing Championships tally (this environment has no way to load
the live Vercel URL or a real phone) — same carried-forward gap as every
phase since the redesign began. Also worth a look once the current
2026 season concludes: this list will show a `season` for it as soon as
its bracket resolves, same as every other season-chain-driven record on
this page — nothing specific to this feature, just noting it's live data.

## Phase H.5 — League History podium redesign (player names + 3D trophy line)

The user's own request named this "Phase H.4" — renumbered to H.5 here
since that number was already used for the pre-Sleeper-archive addition
directly above; the commit message still uses the user's exact wording.
A complete redesign of League History's championship display: player
names everywhere on this page instead of team names, the separate
aggregate-count and year-by-year sections combined into one tab, and the
marble/gold `TrophyRoomScene` replaced with a scroll-driven 3D trophy
line.

**Player names, not team names, on this page only.** New
`PLAYER_NAME_BY_TEAM_NAME` in `api/leagueRecords.ts` — a hand-authored
lookup from each of the 12 current Sleeper team names to the manager's
real first name, falling back to the team name itself for anything not
in the table (an unmapped/future team still renders instead of
disappearing). `playerNameForUser()` composes this with the existing
`teamNameForUser()`. Every name display on `HistoryPage.tsx` — Best
single week, Longest win streak, the Head-to-Head manager picker and
list, Rivalries, and the new Championships tab below — now calls this
instead of `teamNameForUser()` directly. Scoped deliberately to this one
page: Home and Team pages keep team names, which is the correct identity
to show there.

**One combined Championships tab.** New `PlayerChampionship`/
`playerChampionships()` in `api/leagueRecords.ts` replaces the deleted
`championsByUser()` (aggregate count) and the H.4-only direct use of
`championshipsBySeason()` (year-by-year) with a single merged, sorted
list. The pre-Sleeper archive (2020-2023, plain names) and Sleeper-era
winners (2024+, resolved through the player-name table) merge under one
identity by first name — 2020's archive entry is authored as "Rohan
Haware" (the one year with a surname) while every Sleeper-era name is
bare-first-name-only, so `name.split(' ')[0]` is the one normalization
that lands both on the same key rather than showing as two people.
Sorted by title count (desc), then career Sleeper-era wins (desc), then
career Sleeper-era points for (desc) — tiebreak stats computed from real
roster data and resolved to a player name via the same reverse lookup,
so even a pre-Sleeper-only champion (all four of 2020-2023's are also
current Sleeper managers) gets a real, live tiebreak basis rather than a
fabricated one.

**3D trophy line, replacing `TrophyRoomScene` entirely on this page.**
New `three/Trophy.tsx` (a "dumb" pedestal+cup+base mesh, no position of
its own — same convention as `Football.tsx`; reuses `GOLD_MATERIAL_PROPS`/
`BRASS_MATERIAL_PROPS` directly, which are already ignite/current under
the hood per `materials.ts`'s own comment, so this needed no new color
definitions), `three/trophyLineLayout.ts` (pure layout/camera math, same
separation-of-concerns reason `journeyLayout.ts` is its own file),
`three/TrophyLineScene.tsx` (one slot per distinct champion, front-to-back
along -Z in the exact order `playerChampionships()` sorted them — a
multi-title slot gets that many `<Trophy>`s side by side rather than
stacked, so it reads as "one player, several trophies"), and
`three/TrophyLineCameraRig.tsx` + `three/TrophyLineCanvas.tsx` (a
scroll-scrubbed side-view dolly along Z, same single-shared-progress
idiom as every other camera rig here — `ScrollCameraRig`, `JourneyCameraRig`
— rather than two independently-computed reads of scroll position).
`TrophyLineCanvas` sets an explicit ink (`#0b0b0e`) canvas background
rather than relying on transparency, since History's own page background
is the light paper canvas everywhere else on this route.

`HistoryPage.tsx` hosts it full-bleed with the same `w-screen` +
`calc(50% - 50vw)` breakout the journey's own fullscreen fix uses
(PLAN.md Phase H.3) — this page wraps everything in a `max-w-3xl` reading
column, the same problem the journey had on Home. The scroll track's
height scales with the real (Sleeper-data-dependent) champion count
(`TROPHY_SLOT_SVH` per slot plus a flat buffer) rather than a fixed
number, so "no cutoff, every player visible" holds regardless of how many
people have won a title by the time this runs. A DOM caption
(`onActiveChange` from the camera rig) shows the currently-centered
player's name and title count as plain, accessible-when-visible text —
this project's established "every word is DOM, not 3D text geometry"
rule (WeeklyJourney.tsx's own doc comment) applied here too, rather than
adding a font-geometry dependency for a handful of labels.

**Incidental cleanup.** Deleting `TrophyRoomScene.tsx`/
`TrophyRoomCanvas.tsx` surfaced that `Portrait.tsx` and `SceneFloor.tsx`
had already gone completely unused — orphaned when the Home page's 3D
standings wall (`WeeklySummaryScene.tsx`) was deleted earlier and never
followed up on. Both deleted now, along with the now-fully-unused
`IVORY_MATERIAL_PROPS` from `materials.ts`. `arcLayout.ts` stays —
`PlayerCardArc.tsx` (Home's rotating player cards) still uses it.

**Verified:** `tsc -b`, `oxlint` (seven warnings, down from the prior
eight — `Portrait.tsx`'s own immutability warning is gone with the file,
not suppressed; nothing new), `prettier --write`, and a production
`vite build` all pass. The build's chunk list confirms `TrophyRoomCanvas`
is gone and a new `TrophyLineCanvas` chunk (~2.7KB) replaces it.

**Not done:** real-device check on the live Vercel URL — whether the
side-view dolly actually reads as "liquid"/premium on a real touch
scroll, whether the trophy line's per-slot dwell time (`TROPHY_SLOT_SVH`)
feels right rather than too fast/slow, and how the combined Championships
tab's real data (title counts, tiebreak order) actually resolves once
the 2024-2026 Sleeper brackets are checked against it live — are all
real-device/data-verification calls this environment can't make. Same
carried-forward real-device gap as every phase since the redesign began.

## Phase H.5 hotfix — trophy visibility, and a real data bug behind "Tejas shows 1"

Three requested fixes, but only one was actually a rendering issue —
the other two (Tejas showing 1 trophy instead of 2, and not sorting to
the front) turned out to be the same real data bug, found by fetching
the live league's actual Sleeper API responses rather than assuming the
hand-typed mapping table from Phase H.5 was correct.

**The bug.** `PLAYER_NAME_BY_TEAM_NAME` (`api/leagueRecords.ts`) does an
exact-string lookup from Sleeper team name to player name, falling back
to the raw team name on no match. Fetched the live league's current
`/users` response directly (`https://api.sleeper.app/v1/league/<id>/users`)
to check the table against real data, and 7 of its 12 entries didn't
exactly match: four were case differences ("justins team" vs "Justins
Team", "hopeless again" vs "Hopeless again", "I Love to Chase..." vs "I
love to chase...", "ConkeyonmyCooktillIGoff" vs "...tilliGoff"), one was
a typo in the real team name ("Waddling to the **Mooon**", not "Moon"),
and Tejas's real team name carries two ring emoji: `"2x Champion 💍💍"`,
not the plain `"2x Champion"` the table had. Confirmed by walking the
real season chain (2026's `previous_league_id` → 2025 → 2024) and
resolving both years' championship-bracket winners: 2024's champion is
"Rags" (→ Raghav, a title not previously known to the app), and 2025's
is exactly that emoji-carrying team name — Tejas's real second title.

Because the lookup failed silently (an exact-match miss falls back to
the team name, not an error), Tejas's 2025 win was merging under the key
`"2x"` (`"2x Champion 💍💍".split(' ')[0]`) instead of "Tejas" — a
completely different `yearsByPlayer` entry from his 2023 pre-Sleeper
title, so he showed as two separate 1x entries instead of one 2x, and
neither had enough weight to sort to the front. This also means the
Championships tab was rendering a nonsense "2x - 1x Champion" row before
this fix, not just under-counting Tejas — a second, silent symptom the
brief didn't ask about but this same table fix also resolves.

**The fix.** Corrected all 12 entries to the exact strings from the live
`/users` response. Also made the lookup itself case-insensitive
(`playerNameForTeamName` now compares `.trim().toLowerCase()` on both
sides via a pre-normalized `Map`) as a defensive measure against the
most common kind of future rename drift — it wouldn't have caught the
typo or the emoji difference, but does protect against the 4 case-only
mismatches recurring. No change was needed to the trophy-count rendering
logic itself (`TrophySlot` in `TrophyLineScene.tsx` already rendered
`Math.max(1, entry.count)` trophies per slot) or the sort
(`playerChampionships`'s existing count/wins/PFF sort) — both were
already correct, and correctly reflect Tejas at the front with 2 trophies
now that the underlying data merges properly.

**Trophy visibility** (the one genuinely visual fix). `Trophy.tsx`: added
a flat, unlit glow disc at the base (`meshBasicMaterial`,
`toneMapped={false}`, the same "reads regardless of scene lighting"
idiom this project's other small accent details already use — Football's
laces, JourneyScene's yard lines), colored via a new `accentColor` prop
(alternating ignite/current per slot, same as the point light).
`TrophyLineScene.tsx`: trophies scaled 1.8x (`TROPHY_SCALE`, with the
multi-trophy gap scaled alongside it so a 2-title slot's pair doesn't
start overlapping), and the per-slot point light repositioned from an
offset in +Z — which doesn't face a _side-view_ camera at all — to +X
(`SIDE_OFFSET`'s own direction, the side the camera actually approaches
from), with intensity raised 2.6→4.5 and distance 3.8→5.5.

**Verified:** `tsc -b`, `oxlint` (same seven pre-existing warnings, zero
new), `prettier --write`, and a production `vite build` all pass.

**Not done:** real-device check on the live Vercel URL — whether the
trophies now read as clearly visible/premium rather than just "less dark
than before," and whether the new light position/intensity looks right
rather than blown out, are real-device/visual judgment calls this
environment can't make. Worth also spot-checking the Championships tab
directly against this same live-fetch approach once real users can look
at it, in case any of the _other_ 11 team names have since been renamed
again since this fix was written.

## Phase H.5 hotfix #2 — one podium per player, hero-sized self-illuminated cups

Two fixes, both purely to `Trophy.tsx`/`TrophyLineScene.tsx`/
`trophyLineLayout.ts` — no data-layer changes this time (the previous
hotfix's real bug fix already made Tejas's count/sort correct; this pass
is entirely about how a multi-title slot is _built_ and how visible the
cups are).

**One podium, multiple cups.** The previous design's `Trophy` component
bundled its own pedestal, cup, and base into one self-contained unit, so
a 2-title slot rendered two of those side by side — two full podiums,
not one podium with two trophies on it. Split `Trophy.tsx` into two
components: `Podium` (the marble base + glow disc, exactly one per slot
regardless of title count) and `TrophyCup` (foot + tapered stem + bowl,
one per actual championship). `TrophyLineScene.tsx`'s `TrophySlot` now
renders a single `<Podium>` and loops `<TrophyCup>` `Math.max(1,
entry.count)` times, offset side by side on top of it via a new
`CUP_BASE_Y` export (the podium's own top-surface Y, so the cups' Y
position can't drift out of sync with `PODIUM_HEIGHT` the way a
hand-copied number could).

**Hero-sized, self-illuminated cups.** Every part of `TrophyCup` (foot,
stem, bowl) switched from `meshStandardMaterial` (a lit material whose
visible brightness depends on scene/point lighting actually reaching it)
to `meshBasicMaterial` with `toneMapped={false}` — fully unlit, so the
cup renders at its exact, saturated ignite/current color regardless of
lighting. This project avoids bloom/post-processing on mobile (SPEC.md
§7.2), so an unlit material is the actual mechanism available for
"glows regardless of lighting," not just a light repositioned again.
Bowl radius went from the first hotfix's 0.14×1.8≈0.25 to 0.5 (roughly
2x that, erring toward "clearly the hero element" over hitting an exact
multiplier that risked looking oversized against `SLOT_SPACING`), the
podium's glow disc radius from 0.24 to 0.75, and `SIDE_OFFSET`/
`EYE_HEIGHT` in `trophyLineLayout.ts` adjusted (3.8→4.4, 1.3→1.05) so the
camera doesn't feel cramped against the now-noticeably-bigger assembly
and centers closer to its actual vertical midpoint.

**Verified:** `tsc -b`, `oxlint` (same seven pre-existing warnings, zero
new), `prettier --write`, and a production `vite build` all pass.

**Not done:** real-device check on the live Vercel URL — whether the
cups now genuinely read as "hero element, immediately visible, premium"
rather than just bigger, and whether the retuned camera offset/height
frames the new assembly well, are real-device/visual judgment calls this
environment can't make. Same carried-forward gap as every phase since
the redesign began.

## Phase H.5 hotfix #3 — trophy geometry redesign + a real overlap bug

Two fixes: a genuine geometry redesign (base plate, tapered stem, flared
bowl with rim and handles, replacing the previous pass's plain
foot/stem/dome), and a real bug behind "both trophies overlap" that
turned out to have two independent causes, not one.

**The overlap bug.** Two things were each wrong on their own, and
together fully explain why a 2-title slot's cups were indistinguishable:

1. The previous pass offset multiple cups along **X**. The trophy line's
   camera (`TrophyLineCameraRig.tsx`) sits at a fixed X and looks down
   -X — X is its _depth_ axis, not a left-right screen axis, so an X
   offset between two cups foreshortens toward near-zero separation on
   screen instead of actually placing them side by side. Z is the axis
   that reads as "sideways" to this camera (it's also the axis the whole
   line itself runs along), so cups now offset along Z instead. The
   brief's own option (B) — offset one forward/back for depth separation
   — would have hit the exact same problem, since "forward/back" _is_ X
   here; documented in `TrophyCup`'s own comment so this doesn't get
   re-introduced by a future pass reaching for the intuitive-sounding
   fix.
2. Even correctly offset, the gap (0.75) was smaller than the bowl's own
   radius (0.5 from hotfix #2) — two 0.5-radius bowls need centers more
   than 1.0 apart to avoid overlapping at all, so they'd have collided
   regardless of axis. `CUP_GAP` is now derived from the cup's own
   `CUP_WIDEST_RADIUS` export (`Math.max(1.1, CUP_WIDEST_RADIUS * 2.4)`)
   rather than a hand-picked number that can silently drift out of sync
   with the geometry again.

**The geometry redesign.** `TrophyCup` (`Trophy.tsx`) is now base plate
→ tapered stem → flared bowl (a cone opening wider at the top, capped at
its narrow bottom, open at its wide mouth) → a torus rim → two partial-
torus handles on the sides. Two-tone: the bowl/rim/handles carry one
accent (`bowlColor`), the stem/base the other (`baseColor`) — every cup
now genuinely uses both ignite and current rather than one per slot —
and `TrophyLineScene.tsx` swaps which is dominant between a podium's two
cups (Tejas) so they read as visually distinct trophies, not one cup
duplicated. Every part stays unlit `meshBasicMaterial`/
`toneMapped={false}` from the previous hotfix (self-illuminated
regardless of scene lighting — this project's actual "glows" mechanism
given it avoids bloom/post-processing on mobile, SPEC.md §7.2). The
podium (`Podium`) widened again (0.85/0.95, up from 0.55/0.62) to
actually cover the ground beneath two now-properly-separated cups.

**Handle orientation is a best-effort.** The two handles are partial tori
rotated ±90° around Y so their hole faces the camera's own viewing axis
(X) rather than sitting edge-on — reasoned through from first-principles
three.js torus/rotation math, not confirmed by looking at a render, since
this environment has no way to open a browser and see the actual scene.
Documented plainly in `Handle`'s own comment rather than asserted as
correct.

**Verified:** `tsc -b`, `oxlint` (same seven pre-existing warnings, zero
new), `prettier --write`, and a production `vite build` all pass.

**Not done:** real-device check on the live Vercel URL — specifically
whether the handles read as cleanly attached to the bowl or slightly
off/floating (flagged above as unverified geometry math), whether the
two cups now read as clearly separate trophies rather than merely
non-overlapping, and whether the redesigned silhouette is "immediately
recognizable as a championship trophy" are all real-device/visual
judgment calls this environment can't make. Same carried-forward gap as
every phase since the redesign began.

## Phase H.5 hotfix #4 — solid trophy colors, and a real dwell-time bug behind cut-off champions

Two fixes: a straightforward color simplification, and a scroll-pacing
issue that turned out to have a real, previously-unimplemented bug behind
it rather than just needing a bigger number.

**Solid colors.** `TrophyCup` (`Trophy.tsx`) took a single `color` prop
in place of the previous hotfix's two-tone `bowlColor`/`baseColor` split,
applied to every part (base, stem, bowl, rim, both handles) — one solid
color per cup rather than "half-colored." `TrophyLineScene.tsx` now
alternates ignite/current across the _global_ running count of cups
(`cupIndexOffset`, computed as a plain array via `.reduce()` rather than
a mutable counter incremented inside the render `.map()` — oxlint's
immutability rule correctly flagged the mutable version), not per slot,
so a 2-cup podium's pair are two distinctly, solidly colored trophies and
the alternation continues into the next slot rather than resetting. The
podium's own glow/point light still key off the slot's own index for
rhythm along the line — that's ambient spill, not the cups' own color.

**The dwell-time bug.** `cameraZAtProgress`'s own doc comment (written in
the original Phase H.5 pass) claimed "a little lead-in/lead-out room so
the front and back trophies aren't jammed right at the edge of the
frame" — but the function itself was a bare lerp across the full 0..1
progress range with no such margin ever actually implemented. In
practice this meant the camera reached the _last_ slot at the exact
instant the scrollable range ran out, with zero time left to look at it
before the track released — a strong candidate for the real cause behind
"scrolled past before all champions were visible," independent of how
much total scroll distance the track had. Fixed with a real
`easedProgress()` (an 8% margin at each end, `LEAD_FRACTION`) that both
`cameraZAtProgress` and `activeIndexAtProgress` now share, so the camera
holds at the front/back slot for a real dwell window rather than arriving
right as the section ends, and the two functions can't drift out of sync
with each other.

A second, smaller bug in the same function: `activeIndexAtProgress`
picked the active slot via `Math.round(progress * (count - 1))`, which
centers bins on each slot's exact position — giving the _first_ and
_last_ slots only half the dwell window of every middle slot. Switched to
the same equal-bin scheme `journeyLayout.ts`'s `matchupIndexAtProgress`
already uses (`Math.floor(eased * count)`), so every slot, including the
front and back, gets a genuinely equal share.

**Also raised the per-slot scroll distance** from 70svh/60svh buffer to
100svh/90svh (`HistoryPage.tsx`), matching `WeeklyJourney`'s own
per-matchup dwell convention (100svh, "every matchup is exactly one
screen tall") — a real, if smaller, contributor on its own, since the
camera-math bug alone wouldn't necessarily have made 70svh feel
comfortable at a normal scroll speed.

**Verified:** `tsc -b`, `oxlint` (same seven pre-existing warnings after
fixing one genuinely new one this pass introduced and caught before
committing — a mutable loop counter reassigned during render, replaced
with a pure `.reduce()` over the entries array), `prettier --write`, and
a production `vite build` all pass.

**Not done:** real-device check on the live Vercel URL — whether the new
8% lead-in/lead-out margin feels right (too much dead scroll at the ends
vs. too little), whether solid-colored cups read more clearly as
distinct trophies than the previous two-tone version, and whether every
champion is now genuinely reachable without feeling rushed, are all
real-device judgment calls this environment can't make. Same
carried-forward gap as every phase since the redesign began.

## Phase H.5 hotfix #5 — more scroll room, caption contrast, real metal, faster motion

Four fixes, all fairly independent of each other this pass (no single
underlying bug tying them together the way earlier hotfixes had).

**More scroll room.** The previous hotfix's 8% lead-in/lead-out margin
and 100svh-per-slot dwell weren't enough on their own. Raised
`trophyLineLayout.ts`'s `LEAD_FRACTION` 8%→14% (still inside the brief's
own suggested 12-15%) and `HistoryPage.tsx`'s `TROPHY_SLOT_SVH`/
`TROPHY_TRACK_BUFFER_SVH` 100/90→120/110svh.

**Caption contrast.** The count line ("2x Champion") sat above the name
in a thin, light `text-mute-on-ink` style — low enough in frame to often
land on the scene's light marble podium behind it, where light, thin text
nearly disappeared. Reordered (name above, count below, matching the
brief's "move count below name, move name up") and put the count in a
solid `bg-marble` pill with bold, dark (`text-charcoal`) text — a chip
that stays legible regardless of whether the ink background or the
lighter podium ends up behind it at that point in the scroll, rather than
one text color that only ever worked against one of the two.

**Real metal, not neon.** New `three/medalMaterials.ts` (kept separate
from `Trophy.tsx` — a file mixing component and non-component exports
breaks Fast Refresh, the same reason `journeyLayout.ts`/
`trophyLineLayout.ts` are their own files; oxlint's
`react/only-export-components` rule caught this when a first pass put
`medalMaterialAt` directly in `Trophy.tsx`). Three `meshStandardMaterial`
presets — gold, silver, bronze — replace hotfix #4's solid unlit
ignite/current colors on every part of `TrophyCup` (base, stem, bowl,
rim, both handles). Metalness kept moderate (0.5-0.6) rather than pushed
toward 0.9+, for the exact reason `materials.ts`'s own
`GOLD_MATERIAL_PROPS` comment already documents: at very high metalness
a material's visible color comes almost entirely from the _reflected_
environment map, and this scene's single HDRI can leave instances facing
away from its bright side reading as flat black. A nonzero `emissive` on
each preset plus each cup's own point light (kept, recolored to the
medal's own tone) is what keeps "still glows" true despite switching off
the fully unlit `meshBasicMaterial` the last two hotfixes used — a lit
material needs _some_ real light reaching it to be visible at all.
`medalMaterialAt(globalCupIndex)` assigns gold/silver/bronze by rank
across the same running cup count `TrophyLineScene.tsx` already tracked
for color alternation, cycling past index 2 rather than erroring if more
than three cups exist in the whole line. The podium's own ignite/current
glow disc and rhythm light are unchanged — a separate decorative choice
from the cups' own now-metallic material.

**Faster, less sluggish motion.** `TrophyLineCameraRig.tsx`'s
ScrollTrigger `scrub` dropped from 1.2 (this project's usual value,
matching `ScrollCameraRig`/`JourneyCameraRig`) to 0.45 — a bigger scrub
number is more lag between the actual scroll position and where the
camera currently sits, and on a line this long that lag was enough that
the camera never really caught up to a normal scroll speed. Scoped to
just this one rig, not the others, since the brief was specifically
about the trophy line feeling sluggish.

**Verified:** `tsc -b`, `oxlint` (same seven pre-existing warnings after
fixing one genuinely new one this pass introduced and caught before
committing — `medalMaterialAt` exported alongside components in
`Trophy.tsx`, resolved by giving it its own file), `prettier --write`,
and a production `vite build` all pass.

**Not done:** real-device check on the live Vercel URL — whether 14%
lead-in/lead-out plus 120svh per slot is enough this time (this project
has now iterated on this exact number three times without a way to see
the actual result), whether the metal reads as real gold/silver/bronze
versus still looking synthetic under this scene's single HDRI, whether
the caption pill looks intentional rather than like a sticker, and
whether 0.45 scrub actually reads as "premium and fast" rather than
either still sluggish or now too twitchy, are all real-device judgment
calls this environment can't make. Same carried-forward gap as every
phase since the redesign began — and increasingly the one actually
blocking forward progress on this feature specifically, given how many
of its hotfixes have been guesses at "what a real screen would show."

### Quick fix — player name pill

The trophy line's name caption was plain `text-marble` with no
background — legible against ink, but the same "blends into the light
marble podium" problem the count line below it was already fixed for one
hotfix ago. Same pill treatment, inverted tone: `bg-charcoal` (dark,
opaque) behind bold `text-marble` (white) for the name, versus the
count's `bg-marble` behind bold `text-charcoal`. Both pills now stay
legible regardless of whether ink or podium ends up behind them at a
given scroll position.

**Verified:** `tsc -b`, `oxlint` (same seven pre-existing warnings, zero
new), `prettier --write`, and a production `vite build` all pass.

### Journey fixes — finale dwell margin, turf field extension

Two fixes to the football kick journey (Home), reported after the trophy
line's own scroll-dwell bug turned out to have a twin here.

**Finale dwell.** Same root cause as the trophy line's hotfix #4: the
ball's flight reached the uprights (`flightProgress` hit 1) at the exact
instant the journey track's own scrollable range ran out, since
`flightProgress`'s old formula mapped flightT=1 to rawProgress=1 with no
margin — leaving zero scroll room to actually watch the finale (confetti
burst, the pass-through flourish) before the section released into
`SeasonLeadersSection` below. Fixed with the same shape of fix: new
`MATCHUP_SVH` (100, extracted from a hand-typed `'100svh'` literal that
used to live only in `WeeklyJourney.tsx`) and `FINALE_DWELL_SVH` (60)
exported from `journeyLayout.ts`, plus a `contentFraction(matchupCount)`
helper that both `flightProgress` and `matchupIndexAtProgress` now
compress their [0,1] logic into (instead of the raw [0,1] range) so the
flight and the per-matchup audio/confetti triggers stay aligned with the
real DOM article boundaries regardless of the dwell buffer appended after
them. `WeeklyJourney.tsx` appends one `aria-hidden` buffer div
(`FINALE_DWELL_SVH` tall, no scorecard) after the last matchup's
`<article>`, and both it and every article's own height now read from
`MATCHUP_SVH` rather than a hand-typed string, so DOM height and the
progress math can't drift apart the way `Trophy.tsx`'s hand-copied
numbers used to before those were fixed to export shared constants.

The separate "boundary transition" gradient div (the ink-to-transparent
fade into `SeasonLeadersSection`) needed no change — it's a sibling after
the whole `<section>`, unaffected by how tall the track inside that
section is.

**Turf field extension.** `JourneyScene.tsx`'s `Field()` used a flat +30
symmetric pad beyond the kickoff tee and uprights. Switched to asymmetric
padding — `FIELD_NEAR_PAD = 10`, `FIELD_FAR_PAD = 45` — weighted toward
the far side (past the uprights), since that's the edge the elevated
finale sky-cam (`END_CAM`, y=12 above the field's own midpoint) actually
looks across/down at; a symmetric pad left the turf visibly ending well
within that shot's own frame rather than reading as an expansive field.
The grass texture's tiling (`texture.repeat.set(20, depth / 2)`) already
derives from `depth`, so it scales automatically with the new size.

**Verified:** `tsc -b`, `oxlint` (same seven pre-existing warnings, zero
new), `prettier --write`, and a production `vite build` all pass.

**Not done:** real-device check on the live Vercel URL — whether 60svh of
finale dwell is enough to watch the confetti/pass-through complete
without feeling rushed (this project has now had to raise a scroll-dwell
number more than once per feature without a way to see the actual
result), and whether the extended turf actually reads as more expansive
in the elevated finale shot or simply fades into fog before the extra
length becomes visible (the fog's own far distance, `JourneyCanvas.tsx`,
was deliberately left untouched — this fix only touched geometry, per the
brief). Same carried-forward real-device gap as every phase since the
redesign began.

## Phase H.6 — Hero text + dynamic AI recap section

Two unrelated changes: a one-line hero text swap, and a new section that
generates a trash-talk recap of the previous week's results via Claude.

**Hero text.** `HeroSection.tsx`'s `<h1>` changed from "Scoreboard" to
"WELCOME TO THE TROPHYROOM MFER!" — the clamp bounds came down
(`clamp(2.75rem,9vw,4.5rem)` → `clamp(2.25rem,7vw,3.75rem)`) and gained a
`max-w-3xl`, since a full sentence at the old single-word sizing would
either overflow awkwardly on mobile or read as oversized poster type on
desktop. Background footballs, scroll-driven drop, and everything else in
that scene are untouched.

**Architecture change from the brief, flagged before writing any code.**
The brief specified calling `api.anthropic.com` directly from client-side
`fetch`, "from the artifact." This project is not a claude.ai Artifact —
it's a static SPA deployed on Vercel with no backend (CLAUDE.md's own
stack section), and a real deployed website has no privileged bridge to
an LLM API the way an Artifact's sandboxed runtime does. Calling
Anthropic directly from the browser would mean shipping the API key
inside the JS bundle every visitor downloads, readable from the network
tab or the bundle itself — a real way to get the key stolen and the
account billed by a stranger, not a theoretical concern. Asked the user
directly (`AskUserQuestion`) rather than either silently building the
insecure version or silently swapping in a different design without
saying so; they chose the secure fix.

**The fix: a Vercel serverless function.** New `api/weekly-recap.ts` (repo
root, Vercel's own convention for auto-detected serverless functions,
outside `src/` entirely) is the only place `ANTHROPIC_API_KEY` is ever
read — from `process.env`, set as a Vercel project environment variable,
never committed. It accepts a POST body (an already-computed, already
player-named summary of a week — see below), builds a compact plain-text
prompt from it, calls Anthropic's Messages API server-side, and returns
the generated text. New `tsconfig.api.json` (included from the root
`tsconfig.json` alongside `tsconfig.app.json`/`tsconfig.node.json`) so
`tsc -b` actually typechecks this file — it lives outside `src`, which
only `tsconfig.app.json` covers, and outside `vite.config.ts`, which is
all `tsconfig.node.json` covers. New `@vercel/node` devDependency for the
`VercelRequest`/`VercelResponse` types (Vercel supplies the actual
runtime; the package is local types only). `vercel.json`'s SPA rewrite
(`/((?!assets/|audio/).*)  → /index.html`) had to gain an `api/` exclusion
too — without it, every request to `/api/weekly-recap` would have been
silently rewritten to serve `index.html` instead of ever reaching the
function.

**Setup step only the user can do:** create an Anthropic API key and add
it to this Vercel project's environment variables as `ANTHROPIC_API_KEY`
(Vercel dashboard → Project → Settings → Environment Variables), then
redeploy. This wasn't done as part of this phase — it requires access to
accounts this session doesn't have. Until it's set, the function returns
a clean 500 with `"ANTHROPIC_API_KEY is not configured on the server"`
rather than crashing opaquely, and the section on the page falls back to
its "Recap unavailable this week" state.

**Client side.** New `src/api/weeklyRecapAi.ts` — the single typed client
for this project's own `/api/weekly-recap` route, mirroring CLAUDE.md's
"one typed client module" rule for the Sleeper API (nothing outside this
file constructs the request). New `src/components/WeeklyRecapSection.tsx`
computes the week's summary from data this project already fetches — the
same `weekRecap()`/`weekAwards()` `useWeekRecap.ts` already uses for the
journey/awards — resolved to real player names via `playerNameForUser()`
(League History's Phase H.5 mapping, reused here rather than duplicated)
for managers and `playerDisplayName()` for the actual NFL players in
"top starter"/"player of the week." Mounted in `HomePage.tsx` right after
the hero, before Act 1's authored storylines — it renders automatically
from live numbers every week whether or not anyone has hand-written a
recap, distinct from `RecapStorylines`/`RecapAwards` which only render
when authored content exists for that week.

**Caching, the idiomatic way.** Rather than a separate localStorage
scheme, the Claude call is a plain `useQuery` with
`staleTime: STALE_TIME.immutable` — the same "a completed week never
changes, cache it forever" convention every other query in this project
already follows (`api/staleTime.ts`), which means a week's recap is
generated once, ever, and the existing global IndexedDB persister
(`api/queryClient.ts`) already carries it across page reloads/sessions
the same way it does every other query. No new caching mechanism needed.

**States handled:** `week < 2` → "Check back after Week 1" (no fetch
attempted at all); prerequisite Sleeper data or the Claude call still in
flight → "Loading recap…"; no scores yet for the target week, or the
Claude call errors → "Recap unavailable this week." The brief's fourth
state ("after season ends, show a final championship recap") wasn't
implemented — there's no existing signal in this codebase for "the
season has concluded" to detect it from, and guessing at one felt riskier
than leaving it as a known gap.

**Animation.** The section manages its own scroll-scrubbed GSAP timeline
(fade+lift on enter, fade+lift on exit) rather than using `Reveal` —
`Reveal`'s own doc comment is explicit that it's one-shot by design
(replaying an entrance on scroll-back "would turn a weekly scoreboard
into a fairground"), which is the right choice for reference content but
not for this section, which the brief specifically wants to also animate
away on exit. The AI-generated paragraphs inside it still use `Reveal`
for their own staggered per-paragraph entrance (split on blank lines from
the plain-prose response), plus a small "Auto-generated from this week's
box scores" footer note as the last staggered element.

**Verified:** `tsc -b` (now covering `api/` via the new tsconfig
reference), `oxlint` (same seven pre-existing warnings, zero new),
`prettier --write`, and a production `vite build` all pass.

**Not done — and this is the big one:** the actual Claude call has never
run. There's no Anthropic API key configured yet (that's the user's own
setup step above), and this environment has no way to deploy to Vercel,
set an environment variable, or make a real network call to
api.anthropic.com to see what actually comes back. Everything about
whether the generated recap reads as genuinely funny/sharp trash talk
rather than generic AI copy, whether the prompt produces consistent
quality week to week, whether 900 max_tokens is enough or too much, and
whether the model correctly picks up on the real stats rather than
hallucinating, is completely unverified — this is fundamentally different
from every other "not done: real-device check" note elsewhere in this
document, which were about a rendering/animation detail on an already-
working feature. This entire feature's actual output quality is unknown
until the API key is configured and someone loads the page.

## Phase H.6 Alternative — template-based weekly recap, zero API

Replaced the Claude-API version of the recap section above with a fully
client-side, template-based generator — no network call beyond the
Sleeper data this project already fetches, no serverless function, no
API key, no per-week latency or cost.

**Removed entirely:** `api/weekly-recap.ts` (and the now-empty `api/`
directory), `src/api/weeklyRecapAi.ts`, `tsconfig.api.json` and its
reference in the root `tsconfig.json`, the `@vercel/node` devDependency,
and `vercel.json`'s `api/` rewrite exclusion (reverted to its original
form — nothing needs a server route anymore). This project is back to
being a genuinely backend-free static SPA, matching CLAUDE.md's own
description of it again rather than being an exception to it.

**New `src/content/weeklyRecaps/recapTemplates.ts`** — pure hand-authored
template strings (headline/opening/bench-blowup/efficiency/power-ranking/
closing), several variations per slot, `{{placeholder}}` tokens. Follows
the same "data file has no logic" split `content/lore`/`content/banter`
already establish. Can be edited any time without touching any other
file — more variety, retuned tone, whatever — since it's plain data with
no build step of its own.

**New `src/content/weeklyRecaps/index.ts`** — the one read/merge surface
for that data (`buildWeeklyRecap()`), same convention as
`content/lore/index.ts`. Picks a variant per template slot
_deterministically_ from `(season, week, slot)` via a small string hash,
not `Math.random()` — reloading the same week's page always shows the
same phrasing rather than re-rolling every visit, while different weeks
land on different variants without needing to track which ones have
already been used.

**New `src/api/computeWeeklyRecapStats.ts`** — pure derivation from the
same `weekRecap()`-computed `TeamWeek[]` the journey/awards already use
into the flat stats object the templates consume (high/low scorer, top
three, bottom three, biggest bench blowup, efficiency leader, power
ranking split into top/bottom halves). One honest simplification,
documented in the type itself: "biggest bench blowup" compares a benched
player's score against that team's own best _starter_, not a literal
same-slot swap — Sleeper's data doesn't carry which slot a bench player
would have filled, so a true apples-to-apples comparison isn't something
this can honestly compute without guessing at a lineup that never
happened. Returns `null` for "nobody had a bench player worth roasting"
rather than a benchBlowup object filled with zeros, so `buildWeeklyRecap`
can skip that paragraph outright instead of rendering nonsense.

**`WeeklyRecapSection.tsx` rewritten** to call these two instead of the
deleted `generateWeeklyTrashTalk`/`useQuery` pair — the recap text is now
a plain `useMemo`, not a query: there is nothing to fetch beyond the
Sleeper data already being fetched, and recomputing a cheap pure function
from already-cached data doesn't need its own caching layer the way an
actual network call did. The brief asked for "cache the computed stats in
IndexedDB (same as other queries)" — deliberately not done as a separate
mechanism, since the _inputs_ (Sleeper matchups/rosters/players) are
already IndexedDB-persisted via the existing global query persister
(`api/queryClient.ts`) with `STALE_TIME.immutable` for a completed week,
and deriving from already-cached data is fast enough that adding a
second cache around the derivation itself would be pure overhead. Same
scroll-scrubbed enter/exit animation and per-paragraph `Reveal` stagger
as before — those never depended on where the text came from.

**Verified for real, not just typechecked:** ran the actual merge logic
(`npx tsx` against a temporary scratch script, deleted after) with
representative fake stats — confirmed the same `(season, week)` produces
byte-identical output across repeated calls, a different week produces a
different headline/opening variant, and setting `benchBlowup: null`
correctly drops that paragraph instead of rendering broken placeholder
text. This is the one piece of Phase H.6 that could actually be verified
end-to-end from within this environment, unlike the Claude-API version's
completely untested network call.

**Verified:** `tsc -b`, `oxlint` (same seven pre-existing warnings, zero
new), `prettier --write`, and a production `vite build` all pass.
`npm audit` is back to zero vulnerabilities now that `@vercel/node`
(which had pulled in the flagged transitive deps) is gone.

**Not done:** real-device check of the actual rendered section — whether
the roast tone lands as genuinely funny/sharp rather than flat, whether
six template variations per slot feel repetitive by mid-season, and
whether the "power ranking" phrasing reads naturally with a real week's
worth of names rather than the placeholder set used here, are all
real-device/content judgment calls this environment can't make. This one
is at least a known-working feature rather than an untested network
call, unlike the version it replaced.

### Hotfix — two more team-name mappings, one factual correction

Two requested additions to `PLAYER_NAME_BY_TEAM_NAME`, verified against
live Sleeper data the same way the Phase H.5 hotfix's original 7-of-12
mismatches were caught, rather than trusted as typed.

**"Dammit russ" → Rishab:** confirmed. The real string has a trailing
space ("Dammit russ ", 2025 season) — harmless, since this table's lookup
already `.trim()`s both sides before comparing. Owner is `RishabhIyer7`,
not present in the current (2026) 12-team roster.

**"Team Lost Cause" → Justin:** did not check out, and wasn't added as
asked. Walked all three Sleeper seasons directly — the closest real team
name is "Lost Cause" (no "Team" prefix, 2024 season only), owned by a
completely different Sleeper account (`display_name: "Arsham"`) than
Justin's (`justinmjoyce`, whose 2024/2025/2026 team names were "sorry
team"/"tight white ends"/"justins team" — never anything with "Lost
Cause"). Asked the user to confirm before mapping two different people's
history together; they confirmed Arsham is a separate, real, distinct
manager and asked for him to be integrated in his own right instead —
mapped as `'Lost Cause': 'Arsham'`.

**No new data-fetching was needed for Arsham.** The follow-up request
described fetching his roster/matchups via a fresh `/v1/user/{id}/leagues`
call, as if he were external data — he isn't. He's already inside the
2024 season this app's own season chain walks every load;
`mergeUsersAcrossSeasons` and `buildGameResults` (`api/leagueRecords.ts`)
already include every manager from every season, current roster or not.
Adding the one mapping entry is the entire fix: his real name now
resolves everywhere `playerNameForUser` already runs, most visibly in
Head-to-Head's manager dropdown (`allUsers`-derived, already cross-season)
— selecting "Arsham" there now shows his real 2024 record. He correctly
does not appear in the Championships tab or trophy line (never won a
title) or in the current-season Standings table on Home (not a current
roster). A literal "combined standings table, current 12 then historical
managers at the bottom" section, as separately described, doesn't exist
anywhere in this codebase yet and wasn't built here — it's a distinct,
larger feature from "make his name and history resolve correctly," which
is what was actually blocking, and building new speculative
infrastructure for a section that may not be wanted once the simpler fix
is understood didn't seem like the right call to make unprompted.

**Verified:** `tsc -b`, `oxlint` (same seven pre-existing warnings, zero
new), `prettier --write`, and a production `vite build` all pass.

## Paper crumple animation + Weekly Recaps page

A large, six-phase build: a new 3D scroll-transition effect on Home, and
a dedicated `/weekly-recaps` page going far deeper than the homepage
teaser (every matchup, a fuller award set, the full power-ranking table,
an efficiency chart, and a previous-weeks browser).

**Flagged before writing any content.** Several phases referenced "the
PDF" (matchup breakdowns, award descriptions, per-team power-ranking
commentary) — no PDF or document content was ever attached to this
conversation at any point. Rather than fabricate specific quotes,
opinions, or "roast" commentary about real league members with no factual
basis (the same discipline CLAUDE.md's own lore/banter content already
enforces — hand-authored is fine, invented-and-presented-as-real is not),
every number and line of copy on the new page is generated from real
Sleeper data through the same template mechanism already built and
already approved for the homepage teaser (Phase H.6 Alternative) — not a
transcription of a document this session never received.

**Phase 1 — `three/PaperCrumpleAnimation.tsx` + `PaperCrumpleCanvas.tsx`.**
Not a true cloth simulation — a lightweight procedural vertex
displacement (a handful of summed sine terms at per-vertex random phases/
frequencies, scaled by a `crumple` progress value, plus a quadratic
"pull inward toward center" term that grows with the same progress) on a
modestly-subdivided plane (26×36 segments), mutated in place every frame
via direct `BufferGeometry` position-array writes. A true mass-spring/
verlet cloth solver was deliberately not built — this project has learned
the same "keep per-frame cost and poly count low for mobile" lesson
directly, more than once, already (SPEC.md §7.2; the WebGL-context-loss
incidents documented earlier in this file), and a solver's constraint-
relaxation iterations are exactly the kind of per-frame cost that lesson
is about. `progressRef` (a plain ref written directly by
`PaperCrumpleCanvas.tsx`'s ScrollTrigger, read every frame via
`useFrame`) drives both the wrinkle amplitude (0→70% of progress) and,
past that point, an arc-launch (position, spin, scale-down, opacity fade)
sharing one `launchFactor()` so all four read from the same number rather
than four separately-eased approximations — the same "one shared progress
value, not independently-computed copies of it" discipline this project's
other camera rigs already follow. Shadow is a flat semi-transparent
circle, not a real shadow map (this project doesn't use shadow maps
anywhere, per the same mobile-budget note). Tried making the geometry a
`useRef` instead of `useMemo` specifically to avoid an oxlint
immutability warning on mutating it every frame — that traded one pair of
warnings for two (a separate "no ref access during render" rule caught
the lazy-init pattern), so it stayed as `useMemo`; the resulting warning
is the exact same accepted, understood class as `JourneyCameraRig.tsx`'s
own `camera.position.set(...)` warning, not a new category of problem.

**Phase 2/6 — `api/computeFullWeekRecap.ts` + new templates**, in place of
"PDF content integration": derives matchup headlines (new
`MATCHUP_HEADLINES` templates + `buildMatchupHeadline()`, picked per
`(season, week, matchupIndex)` so a multi-game week doesn't repeat one
headline shape), an 11-category award list (High/Low Score, Biggest
Blowout, Closest Game, Most/Least Efficient, Most Left on Bench, Player of
the Week, Perfect Lineup, Highest/Lowest Combined Score — every one a
real, honestly-computable stat from `weekRecap()`/`weekAwards()`, not
invented categories), a full power-ranking table with a rank-percentile-
derived letter grade (S/A/B/C/D — a real, deterministic function of
standing, not a subjective per-team judgment) and grade-tier commentary,
and an efficiency chart sorted by real efficiency. "Record" per team in
the power-ranking table is the roster's current cumulative season W-L,
not a reconstructed point-in-time record as of that specific week
(Sleeper doesn't expose historical per-week standings snapshots) — a
real, documented simplification, and only actually diverges from "as of
that week" when viewing an older week after more games have been played.

**Phase 2/3 — `pages/WeeklyRecapsPage.tsx`.** Full-bleed at the page level
(breaks out of `Layout.tsx`'s own `px-6`, the same trick every other
full-bleed section in this project already uses), with a `max-w-5xl`
inner reading column. Matchup cards collapse/expand via local
`useState` per card (the brief's own "lazy-load... don't render all at
once" — deferred *disclosure*, not deferred *fetching*: all the data is
already loaded, only the expanded detail's DOM is conditionally
rendered). A week-selector `<select>` at the bottom serves as the
"previous recaps" browser, populated from every concluded week
(1..latestAvailableWeek) — no separate `allRecaps.ts` static data file
with hand-typed summaries per week was created, since every week's data
is already computed live and correctly from Sleeper the same way the
current week is; a static file duplicating that would drift out of sync
with real results the first time anyone re-checked an old week.

**Phase 4 — Home integration.** New `components/PaperCrumpleSection.tsx`
hosts the canvas plus a `bg-gold-bright` CTA button linking to
`/weekly-recaps` (React Router `<Link>`, not a raw `<a>`). Mounted
between `WeeklyJourney` and `WeeklyRecapSection` — which meant moving
`WeeklyRecapSection` from its previous position (right after Hero) to
after the journey, matching the brief's explicit "after Journey, before
current Recap" ordering.

**Phase 5 — routing.** `App.tsx` gained `/weekly-recaps` and the optional
`/weekly-recaps/week/:weekNumber` direct-link route, both rendering
`WeeklyRecapsPage`; the page reads `:weekNumber` via `useParams` to seed
its initial week selection (falling back to the latest concluded week
when absent or invalid) rather than declaring the route without actually
wiring it to anything.

**Verified:** `tsc -b`, `oxlint` (seven pre-existing plus two newly
accepted — see Phase 1 above; zero warnings of a genuinely new kind),
`prettier --write`, and a production `vite build` all pass.

**Not done:** real-device check on the live Vercel URL — whether the
crumple/launch actually holds 60fps on a real phone (the poly count and
per-frame cost were reasoned about, not measured), whether the arc
trajectory and timing read as "premium," whether the collapsed/expanded
matchup cards feel responsive to tap, and whether the new page's density
holds up on a 390px screen, are all real-device judgment calls this
environment can't make. Same carried-forward gap as every phase since the
redesign began.
