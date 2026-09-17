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

**Phases E–F (team/history restyle; cross-cutting a11y/perf/real-device
plus final docs pass): not started.**
