# CLAUDE.md

Fantasy football league site for a private 12-team Sleeper league
(league ID `1371123154201628672`). Full product spec in `SPEC.md`, phased
build plan in `PLAN.md`. Read both before starting implementation work.

## Stack

- **Build tool:** Vite, React 19, TypeScript
- **Styling:** Tailwind CSS v4 (CSS-first `@theme` tokens in `src/index.css`
  for the palette/type/easing system defined in `SPEC.md` §5)
- **Fonts:** self-hosted via `@fontsource` (Cormorant Garamond, Inter) —
  no Google Fonts CDN request
- **Lint/format:** oxlint + Prettier (`prettier-plugin-tailwindcss` sorts
  class lists — don't hand-order them)
- **Routing:** react-router
- **Data fetching/caching:** TanStack Query, with an IndexedDB persister
  for the tiered cache strategy in `SPEC.md` §6.3
- **3D:** react-three-fiber + drei, HDRI environment lighting (Poly Haven,
  CC0 assets)
- **Motion:** GSAP + ScrollTrigger
- **Package manager:** npm
- **Deploy:** Vercel (static SPA — no backend/serverless functions
  required; the password gate is intentionally client-side, see
  `SPEC.md` §3)
- **Component generation:** the 21st MCP is available for scaffolding/
  iterating React components — prefer it for new UI components over
  hand-rolling from scratch.

## Conventions

### Mobile-first (hard requirement, not polish)

- Build every layout at ~390px first, then scale up — never design at
  desktop width and squeeze it down afterward. See `SPEC.md` §7.
- The nav is a menu/overlay (`SPEC.md` §7.1), not a horizontal
  scrolling tab bar — this was a deliberate fix, not a style preference,
  don't revert it to a tab strip for "more desktop-native" look.
- Any 3D/motion work (Phase 5+) must be built against the frame budget
  in `SPEC.md` §7.2 (≥60fps desktop, ≥30fps floor on mid-range mobile)
  from the start: capped `devicePixelRatio`, KTX2/Basis-compressed
  textures, low draw calls/lights, no heavy post-processing on mobile,
  and a real reduced-quality tier for low-end devices. Treat this the
  same way you treat `prefers-reduced-motion` — a real branch that gets
  tested, not an afterthought.
- Scroll-driven camera work must be built and tested against touch
  scroll and iOS Safari's momentum behavior, not just a desktop mouse
  wheel.
- Chrome DevTools' device emulator does not reflect real mobile GPU/
  thermal performance — `PLAN.md` calls for a real-device check on the
  live Vercel URL at the end of every phase from Phase 4 onward. Don't
  skip that check because the emulator looked fine.

### Data layer

- All Sleeper API calls go through a single typed client module — never
  call `fetch` against `api.sleeper.app` ad hoc from a component.
- All CDN image URLs (avatars, player headshots) go through the helper
  functions in the CDN module — never inline-template a
  `sleepercdn.com` URL.
- **Never call `/players/nfl` more than once per 24h window.** This is
  Sleeper's own guidance and the endpoint is ~5MB. Cache it and reuse.
- Use Sleeper `user_id` as the durable cross-season key for a
  team/owner. `roster_id` and `league_id` are per-season and must never
  be used as a long-term identity key or stored as a permanent reference.
- Data for completed weeks/seasons is immutable — cache it long-lived
  (effectively forever, versioned by season+week). Only the current, live
  week should have a short `staleTime`.

### Visual system

- Palette, type, and motion tokens are defined once (Tailwind config /
  a shared tokens module) and consumed everywhere — no ad hoc hex codes
  or magic easing numbers in components.
- Gold/brass tones are decorative only (borders, icons, large display
  numerals, 3D materials). **Never use gold/brass for text below 24px or
  for any text that must be read** — use charcoal/charcoal-soft. See
  `SPEC.md` §5.1 for the accessibility rationale.
- "Minimalist" in this project describes palette and layout density, not
  motion. Motion and 3D are meant to be ambitious and used throughout —
  see `SPEC.md` §5.5 before assuming a transition should be simple.
- Reuse the shared r3f canvas/scene rather than mounting a new canvas per
  route — see `PLAN.md` Phase 4.

### Lore content

- Lore (`src/content/lore/`) is hand-authored data, not fetched from an
  API and not editable through the site. Keyed by Sleeper `user_id`.
- The UI must render correctly with zero lore present — no placeholder
  copy like "no rivalries yet." Sections simply don't render when empty.
- Read lore through `src/content/lore/index.ts`, never by importing the
  data files directly — that module owns id matching and merging, so
  pages don't reimplement it. README.md documents the authoring workflow
  for whoever fills these in.

### General

- Match the existing phase's scope when picking up `PLAN.md` work — don't
  jump ahead to 3D/motion polish while data correctness from an earlier
  phase is still unresolved, and don't gold-plate a phase beyond what it
  asks for.
- Respect `prefers-reduced-motion` in any new animation work — check
  `PLAN.md` Phase 5 for how the reduced-motion variant is expected to
  behave (shorter/no transitions, no scroll-driven camera), not just a
  blanket animation disable.
- Accessibility (contrast, keyboard nav, alt text) is checked at the end
  of _every_ UI phase in `PLAN.md`, not deferred entirely to the final
  polish phase.

## Project structure

- `src/api/` — Sleeper API client + season-chain resolver (Phase 1)
- `src/content/lore/` — hand-authored lore data files (Phase 8)
- `src/components/` — shared UI components
- `src/pages/` — route-level views (Home, Team, League History)
- `src/three/` — r3f scene, materials, camera/scroll rigging (Phase 5+)
- `src/index.css` — Tailwind entry + design tokens (`@theme`) from SPEC §5

Folders are created as the phase that needs them lands, not pre-scaffolded
empty.

## Commands

- `npm run dev` — start the dev server
- `npm run build` — typecheck (`tsc -b`) and build for production
- `npm run typecheck` — typecheck only, no emit
- `npm run lint` — lint with oxlint
- `npm run format` — format with Prettier (`prettier-plugin-tailwindcss`
  sorts class lists automatically — don't hand-order Tailwind classes)
- `npm run preview` — preview a production build locally
