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
  loserAvatarId: string | null
}

/** Spacing along the camera's path. Wide enough that only one station is
 * ever the subject, close enough that the next is already visible in the
 * fog — which is what makes it read as a journey rather than a
 * slideshow. */
export const STATION_GAP = 15

export const stationZ = (index: number) => -index * STATION_GAP

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
