/** Where the weekly journey's matchup stations sit, and how far apart.
 *
 * Separate from the scene component for the same reason arcLayout.ts is:
 * layout maths is shared by the scene and the camera rig, and a file that
 * exports both components and constants breaks Fast Refresh. */

/** One matchup, reduced to what the 3D scene needs. Names, scores and
 * commentary live in the DOM layer above the canvas. */
export interface JourneyStation {
  id: string
  winnerAvatarId: string | null
  /** Sleeper user_id of the winner, distinct from winnerAvatarId (a CDN
   * asset id) -- needed to look up the manager's accent color
   * (content/teamColors.ts), which is keyed by user_id like every other
   * durable identity in this project. */
  winnerUserId: string | null
  loserAvatarId: string | null
}

/** Spacing along the camera's path. Wide enough that only one station is
 * ever the subject, close enough that the next is already visible in the
 * fog — which is what makes it read as a journey rather than a
 * slideshow. */
export const STATION_GAP = 15

export const stationZ = (index: number) => -index * STATION_GAP

/** How far behind a station's own Z the camera sits, at the reference
 * aspect JourneyCameraRig frames for (FRAMED_FOR_ASPECT below) --
 * cameraPullback scales this up on narrower-than-that canvases. Shared
 * here, not defined once in JourneyCameraRig.tsx and duplicated in
 * JourneyScene.tsx, because a camera-to-station "distance" only means
 * what either file expects it to mean once both agree the camera never
 * actually reaches a station's own Z -- it always stops this far short. */
export const BASE_STANDOFF = 9

/** The aspect the framing was tuned at, and the cap on how far a
 * narrower canvas may pull the camera back -- see JourneyCameraRig.tsx
 * for the full rationale (fov is vertical, so a taller-than-that canvas
 * needs to dolly back to keep both portraits in frame). Shared for the
 * same reason as BASE_STANDOFF: caught live, not assumed, that the
 * journey's canvas is capped by HomePage's own `max-w-4xl` content
 * column, so its aspect is often narrower than 1.14 even on a wide
 * desktop viewport -- "pullback is basically always 1 on desktop" was
 * the wrong assumption an earlier version of this file's own comment
 * made, and BASE_STANDOFF alone measurably undershot the true standoff
 * as a result. One pullback formula, not a second copy that could
 * silently stop matching the first. */
const FRAMED_FOR_ASPECT = 1.14
const MAX_PULLBACK = 2.2

export function cameraPullback(aspect: number): number {
  return Math.min(Math.max(FRAMED_FOR_ASPECT / aspect, 1), MAX_PULLBACK)
}

/** Per-station scrub timing, as a share of the *whole* journey's
 * progress (0..1) -- not seconds, not pixels. `dwell` is how much of
 * that budget the camera holds still at this station's Z; `travel` is
 * how much is spent moving on to the next station (ignored on the last
 * station, which has nowhere left to travel to).
 *
 * This is the foundation for variable per-station pacing (game
 * closeness, a longer game-of-week replay beat, etc.) -- none of that
 * is wired up yet. This step only introduces the mechanism and proves
 * it reproduces today's plain glide exactly when every station asks
 * for zero dwell. */
export interface StationTiming {
  dwell: number
  travel: number
}

/** Zero dwell everywhere, uniform travel between every pair of
 * stations -- the default, and (see zAtProgress) mathematically
 * identical to the single top-level lerp this replaces, not an
 * approximation of it. */
export function uniformTiming(stationCount: number): StationTiming[] {
  return Array.from({ length: stationCount }, (_, i) => ({
    dwell: 0,
    travel: i < stationCount - 1 ? 1 : 0,
  }))
}

/** Where each station's dwell and travel windows fall in overall 0..1
 * progress, as cumulative fractions of the total dwell+travel budget
 * across every station. */
export interface StationBounds {
  dwellStart: number
  dwellEnd: number
  travelEnd: number
}

export function stationBounds(timings: StationTiming[]): StationBounds[] {
  const total = timings.reduce((sum, t) => sum + t.dwell + t.travel, 0) || 1
  let cursor = 0
  return timings.map((t) => {
    const dwellStart = cursor / total
    cursor += t.dwell
    const dwellEnd = cursor / total
    cursor += t.travel
    const travelEnd = cursor / total
    return { dwellStart, dwellEnd, travelEnd }
  })
}

/** The camera's Z position for a given overall scrub progress: holds at
 * `stationZ(i)` through station i's dwell window, interpolates linearly
 * toward `stationZ(i + 1)` through its travel window. With
 * `uniformTiming` (every dwell is 0), every window collapses to a
 * single arrival instant and this reduces exactly to
 * `firstZ + (lastZ - firstZ) * progress` -- the same formula
 * JourneyCameraRig used before this existed, algebraically, not just
 * visually close to it. */
export function zAtProgress(progress: number, bounds: StationBounds[]): number {
  const n = bounds.length
  if (n === 0) return 0
  const clamped = Math.min(Math.max(progress, 0), 1)

  for (let i = 0; i < n; i++) {
    const b = bounds[i]
    if (clamped <= b.dwellEnd || i === n - 1) {
      return stationZ(i)
    }
    if (clamped <= b.travelEnd) {
      const span = b.travelEnd - b.dwellEnd
      const localT = span > 0 ? (clamped - b.dwellEnd) / span : 1
      return stationZ(i) + (stationZ(i + 1) - stationZ(i)) * localT
    }
  }
  return stationZ(n - 1)
}

/** Each station's share of the journey's total DOM height, as a
 * fraction of 1 -- station i's own dwell plus the travel immediately
 * following it, i.e. exactly the progress range
 * `[dwellStart_i, dwellStart_(i+1))` (or `[dwellStart_last, 1]` for the
 * last station, which has no travel to inherit).
 *
 * This is *derived from* stationBounds, not a second formula computed
 * alongside it: `dwellStart_(i+1)` is, by construction, the same number
 * as `bounds[i].travelEnd` (stationBounds accumulates dwell then travel
 * per station, so one station's travel-end is literally the next
 * station's dwell-start). Sizing WeeklyJourney's panels off these
 * fractions is what guarantees a panel's on-screen window and the
 * camera's dwell window are the same interval by construction --
 * whenever a panel is showing, the camera has not yet reached full
 * dwell at the *next* station, because that only begins exactly where
 * the next panel begins. Keeping two independently-tuned formulas in
 * sync by hand is exactly how they'd eventually drift again. */
export function stationHeightFractions(timings: StationTiming[]): number[] {
  const bounds = stationBounds(timings)
  return bounds.map((b, i) => {
    const windowEnd = i < bounds.length - 1 ? bounds[i + 1].dwellStart : 1
    return windowEnd - b.dwellStart
  })
}

/** Dwell share at the two ends of the closeness range -- a blowout
 * still gets a real beat (never below MIN_DWELL, a flash), the
 * closest game of the week doesn't consume the whole scrub (capped at
 * MAX_DWELL). Tuned by feel once this is live; not derived from
 * anything physical. */
const MIN_DWELL = 0.3
const MAX_DWELL = 1.4

/** How close each game was, relative to the *other five* this week --
 * not an absolute margin threshold, matching how weekAwards' own
 * "closest game"/"biggest margin" are already relative-to-the-week
 * stats, not fixed cutoffs. 0 is this week's biggest margin, 1 is its
 * closest game (a tie is the closest possible outcome regardless of
 * its own zero margin).
 *
 * Exported on its own, not just inlined into closenessTiming below, so
 * a second consumer (WeeklyJourney's audio ducking -- bigger roar for a
 * blowout, hush-then-eruption for a close one) reads the identical
 * number rather than re-deriving its own margin normalization that
 * could quietly drift from this one. */
export function closenessOf(games: Array<{ margin: number; tied: boolean }>): number[] {
  const values = games.map((g) => (g.tied ? 0 : g.margin))
  const minMargin = Math.min(...values)
  const maxMargin = Math.max(...values)
  const spread = maxMargin - minMargin

  return games.map((_, i) => {
    // spread === 0 means every game this week was equally close (or
    // there's only one game) -- nothing to weight against, so every
    // game gets the same middle-of-the-road closeness.
    const normalized = spread > 0 ? (values[i] - minMargin) / spread : 0.5
    return 1 - normalized
  })
}

/** Per-station dwell weighted by closenessOf -- the closest game of the
 * week gets the longest beat (capped at MAX_DWELL), a blowout still
 * gets a real one (never below MIN_DWELL, a flash). Travel shares stay
 * uniform (`uniformTiming`'s 1 between every pair) -- only how long the
 * camera lingers at a station changes, not how long it takes to get
 * there. */
export function closenessTiming(games: Array<{ margin: number; tied: boolean }>): StationTiming[] {
  const n = games.length
  if (n === 0) return []

  const closeness = closenessOf(games)
  return games.map((_, i) => ({
    dwell: MIN_DWELL + (MAX_DWELL - MIN_DWELL) * closeness[i],
    travel: i < n - 1 ? 1 : 0,
  }))
}

/** Deliberately past closenessTiming's own MAX_DWELL -- the "game of the
 * week" is an editorial flag (content/recaps), not a margin/closeness
 * outcome, so its beat is meant to read as longer than even the
 * closest game of the week gets on closeness alone. */
const GOTW_DWELL = 2.2

/** Overrides one station's dwell to GOTW_DWELL, leaving every other
 * station's timing (and that station's own travel share) untouched --
 * still the same StationTiming[] every other piecewise function here
 * already consumes, not a second camera-control mechanism layered on
 * top. `gotwIndex` is null on a week with no game flagged, in which
 * case this is a no-op and `timings` is returned as given. */
export function applyGotwDwell(
  timings: StationTiming[],
  gotwIndex: number | null,
): StationTiming[] {
  if (gotwIndex === null || !timings[gotwIndex]) return timings
  return timings.map((t, i) => (i === gotwIndex ? { ...t, dwell: GOTW_DWELL } : t))
}

/** The <Canvas> camera's own fov prop (JourneyCanvas.tsx) -- shared here
 * rather than a second 45 hardcoded in both files, the same reasoning
 * as BASE_STANDOFF/FRAMED_FOR_ASPECT above. */
export const BASE_FOV = 45
const GOTW_MIN_FOV = 34

/** The camera's field of view at a given progress -- BASE_FOV
 * everywhere except the one "game of the week" station, where it eases
 * down to GOTW_MIN_FOV across the travel approaching it and its own
 * dwell, then back up across the travel leaving it. Linear, not eased
 * with a curve -- matching this file's own "the scrub supplies the
 * weight, not the ease" convention (JourneyCameraRig's scrollTrigger
 * comment).
 *
 * A tighter frame via FOV rather than a closer physical standoff is
 * deliberate: JourneyScene's ignite plane and accent light both recover
 * the camera's look target by inverting camera.position.z against a
 * FIXED standoff (BASE_STANDOFF * cameraPullback), decoupled from
 * JourneyCameraRig by design (Station's own comment, glow/ignite). A
 * standoff that varied per-station would break that inversion exactly
 * during the one station meant to look its best, unless JourneyScene
 * also knew the same per-progress scale -- reopening the standoff/
 * pullback duplication this project has already paid to fix twice. FOV
 * plays no part in either effect's distance math, so easing it here
 * can't touch them at all. */
export function fovAtProgress(
  progress: number,
  bounds: StationBounds[],
  gotwIndex: number | null,
): number {
  if (gotwIndex === null || !bounds[gotwIndex]) return BASE_FOV
  const b = bounds[gotwIndex]
  const clamped = Math.min(Math.max(progress, 0), 1)
  const enterStart = gotwIndex > 0 ? bounds[gotwIndex - 1].dwellEnd : b.dwellStart
  const exitEnd = b.travelEnd

  if (clamped < enterStart || clamped > exitEnd) return BASE_FOV
  if (clamped < b.dwellStart) {
    const span = b.dwellStart - enterStart
    const t = span > 0 ? (clamped - enterStart) / span : 1
    return BASE_FOV - (BASE_FOV - GOTW_MIN_FOV) * t
  }
  if (clamped <= b.dwellEnd) return GOTW_MIN_FOV
  const span = exitEnd - b.dwellEnd
  const t = span > 0 ? (clamped - b.dwellEnd) / span : 1
  return GOTW_MIN_FOV + (BASE_FOV - GOTW_MIN_FOV) * t
}

/** Which station's dwell window a given overall progress falls inside,
 * or -1 during a travel window (between two stations, or before the
 * first/after the last). Shares `bounds` with zAtProgress rather than
 * re-deriving its own progress-to-station mapping -- used by
 * JourneyCameraRig to fire a callback exactly once per station, at the
 * same eased/scrubbed progress the camera itself is already reading,
 * not off raw scroll position (which runs ahead of the scrubbed camera
 * by the scrub's own smoothing lag). */
export function dwellIndexAtProgress(progress: number, bounds: StationBounds[]): number {
  const clamped = Math.min(Math.max(progress, 0), 1)
  for (let i = 0; i < bounds.length; i++) {
    if (clamped >= bounds[i].dwellStart && clamped <= bounds[i].dwellEnd) return i
  }
  return -1
}
