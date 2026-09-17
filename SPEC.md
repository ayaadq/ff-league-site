# SPEC.md — Fantasy League Trophy Room

## 1. Vision

A private website for a 12-team fantasy football league (Sleeper league ID
`1371123154201628672`), built to feel like walking into a **trophy room or
private museum gallery**, not a stats spreadsheet. Marble, gold, restraint,
and weight. The league's data (scores, rosters, standings) is the content;
the presentation is the differentiator.

Two things it must do well:

1. **Feel expensive.** Real PBR materials, HDRI lighting, slow deliberate
   motion, huge negative space.
2. **Tell the league's story**, not just report its stats — rivalries,
   nicknames, running jokes, and history sit alongside the numbers.

## 2. League context

- Sleeper league ID: `1371123154201628672`
- 12 teams, private league (real-life friends)
- Multi-season: the site covers the **current season and full history**,
  walked back via each season's `previous_league_id` chain in the Sleeper API.
- Team rosters (which 12 people play) are assumed stable across seasons —
  Sleeper's `user_id` is the durable cross-season identity for a team/owner.
  `roster_id` and `league_id` are **not** stable across seasons and must
  never be used as a long-term key.

## 3. Access control

- Single shared password: `trophyroom`.
- **Client-side gate only** (deliberate choice, not an oversight): a full
  screen lock shown before any content renders; correct password sets a
  session flag (`sessionStorage`) and reveals the site. This keeps casual
  visitors and search engines out. It is **not** real security — the HTML/JS
  is still delivered to the browser and a determined person could read the
  source. That's an accepted tradeoff for a friends' league with no
  sensitive data.
- No accounts, no per-user auth, no backend required for this.
- The gate screen itself should carry the aesthetic (marble slab, gold
  inlay lock/latch motif) — it's the first impression, not a throwaway form.

## 4. Information architecture

- **Entry / Gate** — password screen.
- **Home ("Scoreboard")** — front page. Weekly pulse of the league:
  most recent week's results, big storylines (score gaps, upsets, lore
  callouts), a live 3D standings wall (every rank on the same
  portrait-wall arc, real team photos throughout — see §5.4; the top 3
  originally got their own raised medal-stand podium blocks, removed in
  favor of one consistent treatment for every rank, PLAN.md Phase 12).
  This is the "broadcast intro" moment, but it is not the
  _only_ 3D/motion investment — see §5.5: scroll-driven camera movement
  and animated view transitions run throughout the site. (Originally
  named "The Gallery" and built around the same static trophy-room scene
  described below for League History — moved there once it became clear
  Home needed a scene that changes with live standings, not a generic
  display; see PLAN.md Phase 7.)
- **Team pages** (one per team, 12 total) — a "hall" for that team:
  - Season selector (current + every historical season available).
  - Week-by-week results for the selected season: opponent, score,
    W/L, roster used that week (starters + bench) with player headshots.
  - Team identity: Sleeper avatar, display name, and any hand-authored
    lore (nickname, tagline, bio).
- **League History / Records** — cross-season leaderboards (most
  championships, best single-week score, longest win streak, head-to-head
  records) plus surfaced lore: rivalries and notable past events, browsable
  by team or by season. Also carries the marble/gold trophy-room 3D scene
  (§5.4) — plinths, trophies, a portrait wall — since this page is
  genuinely about the league's permanent record, unlike Home's
  live/weekly content (see PLAN.md Phase 7).
- No admin UI — lore content is authored by hand in the repo (see §6.3),
  not through the site itself.

## 5. Visual design system

**Direction, revised (full redesign, superseding the section below where
they conflict): confident, high-contrast, motion-forward — an alternating
ink/paper canvas rather than one continuous marble wash, with a single
"ignite" accent.** Decided against foodnia.co.jp, lisa.locomotive.ca/en,
and designbomb.it as reference direction (minimal chrome, oversized
grotesk type, full-bleed motion, hard section-to-section transitions).
This is a full pivot away from the "minimalist luxury / private gallery"
marble/gold direction below, not an evolution of it — that direction is
kept in this document as a historical record of what shipped first, per
this project's own convention of not rewriting completed-phase notes.
Status of the rollout (which pages/components have actually moved to the
new tokens vs. still show marble/gold) is tracked in PLAN.md's redesign
phase entries, not here — this section describes the target system.

Restraint is still a value, but it now lives in palette discipline (one
accent color, flat surfaces, no decorative photography) and content
density, not in muted/quiet motion — see §5.5, unchanged in spirit: motion
and 3D are a showpiece, not an afterthought.

### 5.1 Palette

The eight original token _names_ from the marble/gold system are kept in
`src/index.css` — every `bg-marble`/`text-gold-bright`/`border-charcoal`
utility already in use across the app keeps working — only their hex
values and roles changed. Two new tokens (`--color-ink`, `--color-ink-raised`,
`--color-mute-on-ink`) support the new alternating dark/light canvas
pattern, which didn't exist in the old single-background model.

| Token                   | Hex                                | Use                                                                                                                                                                     |
| ----------------------- | ---------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `--color-marble`        | `#F5F3EE`                          | "Paper" — primary light canvas (standings, chart, team pages)                                                                                                           |
| `--color-ivory`         | `#EAE7DF`                          | "Paper-raised" — card/panel surface on paper                                                                                                                            |
| `--color-charcoal`      | `#0B0B0E`                          | Primary text (near-black) — the only color allowed for body copy and any text below 24px. Also the "ink" canvas fill via `bg-charcoal`                                  |
| `--color-charcoal-soft` | `#57534C`                          | Secondary/muted text on paper, passes WCAG AA                                                                                                                           |
| `--color-ink`           | `#0B0B0E`                          | Primary dark canvas — full-bleed "moment" sections (hero, matchup journey, game of the week)                                                                            |
| `--color-ink-raised`    | `#17171C`                          | Card/panel surface on ink                                                                                                                                               |
| `--color-mute-on-ink`   | `#9C9AA6`                          | Secondary/muted text on ink                                                                                                                                             |
| `--color-gold`          | `#C2451F`                          | "Ignite-deep" — borders, dividers, depth accents, decorative only                                                                                                       |
| `--color-gold-bright`   | `#FF5A36`                          | "Ignite" — primary visible accent — borders, dividers, icons, large display numerals, hover states, 3D materials, decorative only                                       |
| `--color-gold-light`    | `#FFE2D6`                          | "Ignite-soft" — light tint for badges/backgrounds on paper                                                                                                              |
| `--color-brass`         | `#2EE6D6`                          | "Current" — secondary accent (teal), used sparingly (e.g. the second gradient stop where two teams' colors need contrast)                                               |
| Team colors             | (from `src/content/teamColors.ts`) | **Accent only** — a small dot, underline, or 4–8px edge. Never a background, never large-area fill. Must never be the sole differentiator (pair with team name/avatar). |

**Hard rule, unchanged in substance:** ignite and current fail accessibility
contrast as text on both paper and ink. They are decorative only. Anything
that must be read — body text, labels, table data, nav — uses charcoal or
charcoal-soft (on paper) or paper/mute-on-ink (on ink).

**Page theme lock:** a given section is either paper or ink, never a
gradient between them mid-section. Alternation happens at section
boundaries (a real color/contrast snap = the "clean transition" language
from the reference direction), not as a continuous wash.

### 5.2 Typography

- **Display / headings:** Space Grotesk (self-hosted via `@fontsource`,
  weights 500/600/700) — a confident geometric grotesk, used for team
  names, page titles, big score numerals, section headers. Replaces
  Cormorant Garamond; the serif direction didn't fit the new reference
  direction (none of the three reference sites read as editorial-serif).
- **Data / UI / body:** unchanged — Inter, for tables, stats, nav, body
  copy, form elements. Already tuned for `tabular-nums`, no coupling to
  the old marble/gold system.
- Numbers in tables/scores use `font-variant-numeric: tabular-nums`.

### 5.3 Layout & spacing

- Large negative space is a feature, not a gap to fill. Prefer one focal
  element per screen/section over dense multi-panel layouts.
- Content max-widths kept narrow-ish for reading; full-bleed only for 3D
  hero moments and gallery-style imagery.

### 5.4 3D direction

- react-three-fiber scenes use **real PBR materials**: marble with a
  subtle subsurface-ish softness (roughness map + slight translucency
  fake via thin diffuse blend), gold/brass with high metalness (~0.9+)
  and low roughness (~0.15–0.3).
- Lit with an **HDRI environment map** (studio/gallery-style, e.g. a
  neutral soft-box or museum-lighting HDRI — source from Poly Haven,
  CC0) plus one or two soft area/rect lights for key highlights. No bare
  point/directional lights doing the primary lighting job.
- Motifs: trophies on plinths, framed "portraits" (team avatars) on a
  gallery wall, marble pedestals/podiums for standings — literal trophy
  room objects, not abstract shapes.
- 3D is not confined to a single hero: multiple pages get their own
  scroll-driven scene (see §5.5), not just a one-off home page banner.
  In practice this became two purpose-built scenes rather than one scene
  shared everywhere (PLAN.md Phase 7): League History keeps the original
  static trophy-room gallery (trophies on plinths, a portrait wall, a
  marble podium), while Home has its own live scene built from real
  standings (every rank on the same portrait-wall arc style — the top 3
  originally sat on their own raised podium blocks, since removed, see
  PLAN.md Phase 12) — the two pages' content differs enough (permanent
  record vs.
  changes weekly) that one shared scene didn't serve either well.
  Whether team pages get a scene of their own is still an open question.
- Performance: because 3D/motion is used ambitiously and throughout, this
  needs real attention — reuse/instance geometry and materials within a
  scene, share a canvas/renderer across routes that show the _same_
  scene rather than remounting it, use LOD or simplified geometry for
  background objects, and always provide a static-fallback/poster degrade
  path on low-end devices or `prefers-reduced-motion`. (Two pages with
  genuinely different scenes each getting their own canvas is fine and
  is what Home/League History do now, PLAN.md Phase 7 — the thing to
  avoid is remounting/rebuilding the _same_ scene's GL context on every
  navigation.)

### 5.5 Motion

**Important distinction: "minimalist" describes the palette and layout
density (§5.1, §5.3) — it does not mean restrained motion.** Motion is a
showpiece of this site, on par with the 3D work, and should be ambitious
and used throughout, not confined to the home page hero.

- GSAP-driven, **slow and weighted** by default — long ease-out/
  ease-in-out curves (think 0.8s–1.6s for major transitions). "Slow and
  weighted" is a texture choice (things feel heavy, like moving marble),
  not a limit on scope or ambition.
- **Scroll-driven camera movement through 3D space** is a core
  interaction pattern, not just a hero moment: scrolling Home and League
  History each move a real r3f camera through that page's own scene
  (Home's live standings wall; League History's trophy-room gallery of
  plinths, portraits, trophies), not just fade 2D sections in/out.
  Whether team pages get the same treatment is still open (PLAN.md
  Phase 7).
- **Transitions between team views** (switching tabs, changing season)
  should be animated, not a plain route swap — originally scoped as
  camera/scene moves between team "halls" within one shared gallery
  metaphor; since that single shared scene no longer exists (see §5.4),
  what this looks like for team pages is an open question (PLAN.md
  Phase 7), not yet built.
- Deliberate **stop-motion / stepped-easing** moments (GSAP `steps()` or
  hand-authored keyframes) are an intentional stylistic accent for
  specific beats (e.g. a trophy "clicking" into place, a score counting
  up in discrete steps) — used purposefully, not as the default for
  every transition.
- Page/section transitions generally favor cross-fade + slow reveal
  (mask/wipe, slow scale, camera moves) over slide/bounce; elastic/bouncy
  easing is avoided except where a stepped/stop-motion beat calls for a
  hard, deliberate stop.
- Respect `prefers-reduced-motion`: provide a reduced-motion variant that
  removes parallax/scroll-driven camera moves and cuts duration, not one
  that just disables everything jarringly.

## 6. Data architecture

### 6.1 Sleeper API (public, no auth key required)

Base: `https://api.sleeper.app/v1`

| Endpoint                                                      | Purpose                                                                                                                    |
| ------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| `GET /league/{league_id}`                                     | League metadata; `previous_league_id` is the link to walk back through seasons                                             |
| `GET /league/{league_id}/rosters`                             | Per-team roster + record (wins/losses/points) for that season                                                              |
| `GET /league/{league_id}/users`                               | Team display names, avatars, team-name metadata                                                                            |
| `GET /league/{league_id}/matchups/{week}`                     | Weekly matchup results, starters, per-player points                                                                        |
| `GET /league/{league_id}/winners_bracket` / `/losers_bracket` | Playoff results                                                                                                            |
| `GET /league/{league_id}/transactions/{week}`                 | Trades/waivers (optional, for storylines)                                                                                  |
| `GET /state/nfl`                                              | Current NFL week/season — drives "what week is it" for the home page                                                       |
| `GET /players/nfl`                                            | Full player dictionary (~5MB). **Sleeper's own guidance: fetch at most once per day.** Never call this on every page load. |

Season chain: start at the current league_id, fetch league metadata,
record the season; if `previous_league_id` is non-null, repeat. Build a
`season -> league_id` map once and cache it (it only grows by one entry
per year).

### 6.2 Media CDN (Sleeper)

- Team/user avatars: `https://sleepercdn.com/avatars/{avatar_id}`
  (thumbnail variant: `https://sleepercdn.com/avatars/thumbs/{avatar_id}`)
- Player headshots: `https://sleepercdn.com/content/nfl/players/{player_id}.jpg`
  (thumbnail: `.../thumb/{player_id}.jpg`)
- Both are wrapped in small helper functions (see CLAUDE.md) rather than
  string-templated ad hoc, so the CDN pattern lives in exactly one place.
- Unsplash/Pexels imagery is used **only** for atmospheric texture (e.g.
  marble backgrounds, gallery ambience) — never for anything that could
  be sourced from Sleeper (avatars, headshots).

### 6.3 Caching strategy

No backend. All fetching happens client-side with TanStack Query, tiered
by mutability:

- **Immutable data** (completed weeks, past seasons, `/players/nfl` within
  its 24h window): long `staleTime`, persisted to IndexedDB so repeat
  visits don't re-fetch. Once a season/week is over, its data never
  changes — cache it effectively forever (versioned by season+week).
- **Live data** (current week's in-progress matchups, current standings):
  short `staleTime` (a few minutes), refetch on window focus.
- The `/players/nfl` dictionary is fetched once, cached with a 24h TTL,
  and reused across the whole app rather than re-requested per component.

### 6.4 Hand-authored lore data

Lore lives in versioned data files in the repo (not a CMS, not the
Sleeper API) so it can be edited directly and reviewed like code.
Keyed by Sleeper `user_id` (stable across seasons), not `roster_id`.

Proposed shape (`src/content/lore/`):

```ts
// teams.ts — per-owner identity/lore, keyed by Sleeper user_id
type TeamLore = {
  userId: string
  nickname?: string
  tagline?: string
  bio?: string
  notableEvents?: LoreEvent[]
}

// rivalries.ts
type Rivalry = {
  id: string
  teamAUserId: string
  teamBUserId: string
  name: string // e.g. "The Marble Bowl"
  description?: string
  since?: number // season year
  notableGames?: LoreEvent[]
}

// events.ts — general league storylines not tied to one rivalry
type LoreEvent = {
  season: number
  week?: number
  title: string
  description?: string
  relatedUserIds?: string[]
  tags?: string[]
}
```

These files start empty/stubbed; the user fills in actual content. The
app must render sensibly with zero lore present (no lore = sections
simply don't appear, no placeholder text like "no rivalries yet").

## 7. Non-functional requirements

- **Mobile-first, not mobile-tolerant.** Nearly everyone in the league
  will open this on a phone. Design and build at ~390px width first,
  then scale up to desktop — not the reverse. A layout that was designed
  for desktop and then "made responsive" is the wrong process for this
  project, not just a wrong result. This applies to every phase from
  here on, including navigation (§7.1) and the 3D/motion work (§7.2).
- **Accessibility**: WCAG AA contrast for all readable text (see palette
  rule above); reduced-motion support; keyboard-navigable nav and team
  tabs; alt text on avatars/headshots (player/team name).
- **General performance**: lazy-load the 3D hero so route changes to
  team pages don't re-pay that cost; images from Sleeper CDN and
  Unsplash/Pexels lazy-loaded below the fold. See §7.2 for the
  mobile-specific 3D/motion performance requirements, which go further
  than general web performance hygiene.
- **Browser support**: modern evergreen browsers only (Chrome/Edge/Safari/
  Firefox, current-ish versions) — no legacy/IE concerns for a 12-person
  friend group.

### 7.1 Mobile navigation

- Twelve team links plus Home and League History is fourteen nav
  targets. An always-visible horizontal tab bar is a desktop pattern
  dressed up with `overflow-x-auto` — it doesn't become a good mobile
  pattern just because it scrolls. The real pattern is a menu: a
  minimal persistent header (site mark + a text "Menu" toggle, not an
  unlabeled icon — see the accessibility rule against icon-only
  controls) that opens a full-screen overlay listing Home, League
  History, and the 12 teams as a vertical list with real touch targets
  (44×44px minimum, SPEC.md's own accessibility bar). This scales up to
  desktop fine as-is — it doesn't need a second, different desktop-only
  nav implementation.

### 7.2 Mobile 3D and motion performance — a hard requirement, not polish

Real PBR materials, an HDRI environment map, and large textures are
exactly the workload that makes a mid-range Android phone struggle.
"Desktop-tuned 3D that technically also runs on mobile" is the failure
mode to design against from Phase 4 onward, not something to fix in the
polish pass (PLAN.md Phase 9 still does a final pass, but the budget
below is a gate every 3D-touching phase must check against, not a
one-time cleanup).

- **Frame budget target:** ≥60fps (≤16.6ms/frame) on desktop and modern
  phones; a sustained ≥30fps (≤33ms/frame) floor on mid-range Android as
  the minimum acceptable degraded tier. Below that floor, drop to the
  reduced-quality tier (below) rather than let frame time creep.
- **Cap `devicePixelRatio`** passed to the renderer (e.g. clamp to 1.5–2
  max) rather than rendering at a phone's full native pixel ratio.
- **Compressed textures**: KTX2/Basis Universal for anything beyond
  small UI images, not raw PNG/JPG piped straight into materials.
- **Keep draw calls and lights low**: instance repeated geometry (the 12
  portraits, plinths), and favor the HDRI environment map plus one or
  two lights over many discrete lights.
- **Skip heavy post-processing on mobile** (bloom, SSAO, depth-of-field
  stacks) — reserve those for desktop only, gated by a device/perf check.
- **Plan a reduced-quality tier** for low-end devices: simplified
  geometry/materials and a static-image fallback, not just "the same
  scene but slower" (this is the same fallback path §5.4 already
  requires for `prefers-reduced-motion`, extended to cover low-end
  hardware as its own trigger).
- **Scroll-driven camera work must account for touch scroll and iOS
  Safari's momentum/rubber-banding behavior**, not just desktop wheel
  events — a ScrollTrigger tuned only against a mouse wheel in dev tools
  will feel wrong on an actual iPhone.

## 8. Out of scope (for now)

- Live-scoring / in-progress-game play-by-play (Sleeper's matchup data
  updates but this isn't a real-time score ticker with sub-minute polling).
- Any write access to Sleeper (this is read-only against their API).
- Multi-league support — hardcoded to this one league's season chain.
- User accounts / per-user permissions beyond the single shared password.
- A CMS or admin UI for lore — it's authored as data files in the repo.
