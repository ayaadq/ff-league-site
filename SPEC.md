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
- **Home ("The Gallery")** — front page. Weekly pulse of the league:
  most recent week's results, big storylines (score gaps, upsets, lore
  callouts), standings snapshot. This is the "broadcast intro" moment,
  but it is not the _only_ 3D/motion investment — see §5.5: scroll-driven
  camera movement and animated view transitions run throughout the site.
- **Team pages** (one per team, 12 total) — a "hall" for that team:
  - Season selector (current + every historical season available).
  - Week-by-week results for the selected season: opponent, score,
    W/L, roster used that week (starters + bench) with player headshots.
  - Team identity: Sleeper avatar, display name, and any hand-authored
    lore (nickname, tagline, bio).
- **League History / Records** — cross-season leaderboards (most
  championships, best single-week score, longest win streak, head-to-head
  records) plus surfaced lore: rivalries and notable past events, browsable
  by team or by season.
- No admin UI — lore content is authored by hand in the repo (see §6.3),
  not through the site itself.

## 5. Visual design system

**Direction: minimalist luxury / private gallery.** Restraint over density.
One thing at a time. If in doubt, remove an element rather than add one.

### 5.1 Palette

| Token                   | Hex                   | Use                                                                                                                                                                     |
| ----------------------- | --------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `--color-marble`        | `#F7F5F2`             | Primary background (Carrara white)                                                                                                                                      |
| `--color-ivory`         | `#EFE8DA`             | Secondary surfaces, cards, panels                                                                                                                                       |
| `--color-charcoal`      | `#2B2926`             | Primary text — the only color allowed for body copy and any text below 24px                                                                                             |
| `--color-charcoal-soft` | `#57534C`             | Secondary/muted text, still passes contrast on marble & ivory                                                                                                           |
| `--color-gold`          | `#C9A227`             | Primary metal accent — borders, dividers, icons, large display numerals, hover states                                                                                   |
| `--color-gold-bright`   | `#E4C25C`             | Gold highlight/specular moments only (3D materials, glints) — never text                                                                                                |
| `--color-brass`         | `#8C6D46`             | Secondary metal accent, used to differentiate from gold sparingly                                                                                                       |
| Team colors             | (from Sleeper/manual) | **Accent only** — a small dot, underline, or 4–8px edge. Never a background, never large-area fill. Must never be the sole differentiator (pair with team name/avatar). |

**Hard rule:** gold and brass fail accessibility contrast as text on both
marble and ivory (~2:1–3:1). They are decorative only. Anything that must
be read — body text, labels, table data, nav — uses charcoal or
charcoal-soft, both of which pass WCAG AA on marble/ivory backgrounds.

### 5.2 Typography

- **Display / headings:** a high-contrast serif — Cormorant Garamond (or
  Playfair Display as fallback choice) — self-hosted via `@fontsource`.
  Used for team names, page titles, big score numerals, section headers.
- **Data / UI / body:** a clean humanist sans with good tabular figures —
  Inter — for tables, stats, nav, body copy, form elements.
- Generous line-height and letter-spacing on display type; tight, legible
  sizing on data type. Numbers in tables/scores use `font-variant-numeric:
tabular-nums`.

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
- 3D is not confined to a single hero: the home page and team pages share
  a persistent-feeling gallery scene that the camera moves through on
  scroll and on navigation (see §5.5) — treat the r3f canvas as a scene
  the user travels through, not a one-off banner.
- Performance: because 3D/motion is used ambitiously and throughout, this
  needs real attention — reuse/instance geometry and materials across
  scenes, keep one shared canvas/renderer where possible rather than
  remounting per route, use LOD or simplified geometry for background
  objects, and always provide a static-fallback/poster degrade path on
  low-end devices or `prefers-reduced-motion`.

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
  interaction pattern, not just a hero moment: scrolling the home page
  and team pages should move a real r3f camera through the gallery scene
  (past plinths, portraits, trophies), not just fade 2D sections in/out.
- **Transitions between team views** (switching tabs, changing season)
  are animated as camera/scene moves within the 3D gallery metaphor where
  practical — e.g. moving from one team's "hall" to another — rather than
  a plain route swap.
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

- **Responsive**: usable on mobile (this is a league of people who will
  check scores on their phones), though the flagship 3D moments can
  scale back on small/low-power devices.
- **Accessibility**: WCAG AA contrast for all readable text (see palette
  rule above); reduced-motion support; keyboard-navigable nav and team
  tabs; alt text on avatars/headshots (player/team name).
- **Performance**: 3D assets (HDRI, models) should be reasonably sized;
  lazy-load the 3D hero so route changes to team pages don't re-pay that
  cost; images from Sleeper CDN and Unsplash/Pexels lazy-loaded below the
  fold.
- **Browser support**: modern evergreen browsers only (Chrome/Edge/Safari/
  Firefox, current-ish versions) — no legacy/IE concerns for a 12-person
  friend group.

## 8. Out of scope (for now)

- Live-scoring / in-progress-game play-by-play (Sleeper's matchup data
  updates but this isn't a real-time score ticker with sub-minute polling).
- Any write access to Sleeper (this is read-only against their API).
- Multi-league support — hardcoded to this one league's season chain.
- User accounts / per-user permissions beyond the single shared password.
- A CMS or admin UI for lore — it's authored as data files in the repo.
