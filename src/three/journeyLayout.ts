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
