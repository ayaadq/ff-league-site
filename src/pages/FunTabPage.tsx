import { AnimeFootballScene } from '../components/AnimeFootballScene'

/** Standalone gesture playground -- separate from the homepage's own
 * sky-cam Journey section (WeeklyJourney.tsx/JourneyScene.tsx), which
 * this doesn't touch or share any code with.
 *
 * Full-bleed (same `mx-[calc(50%-50vw)] w-screen` trick used elsewhere
 * in this project) plus a negative margin to cancel Layout.tsx's own
 * `py-10` on `{children}` -- this page wants to fill the space below the
 * header edge-to-edge, not sit in the usual reading-column padding. The
 * header/menu stay visible above it (not bypassed via a route outside
 * Layout) so there's always a way back to the rest of the site. */
export function FunTabPage() {
  return (
    <div className="relative mx-[calc(50%-50vw)] -my-10 h-[80svh] w-screen bg-black">
      <AnimeFootballScene />
    </div>
  )
}
