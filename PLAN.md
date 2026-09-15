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

## Phase 7 — Team page integration + animated view transitions

- Bring the Phase 3 team page layouts into the shared gallery scene:
  entering a team = a camera/scene move to that team's "hall", not a
  route swap with a fade.
- Season selector and week-by-week roster/results views, with player
  headshots, inside this animated frame.
- Transition between team tabs is a first-class animation, not
  incidental — this is explicitly called out in SPEC §5.5 as a core
  interaction, budget real time for it.
- Deploy.
- Real-device check: team-to-team transitions and roster/headshot
  loading on an actual phone, against the SPEC §7.2 frame budget.

## Phase 8 — League History, records, and lore surfacing

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
