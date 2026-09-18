/** Pure layout/camera math for the trophy line (PLAN.md Phase H.5) —
 * kept separate from the scene/camera-rig components for the same reason
 * journeyLayout.ts is: shared math, and a file exporting both components
 * and constants breaks Fast Refresh.
 *
 * The line runs along -Z, one slot per distinct champion, in the same
 * sorted order `playerChampionships()` returns (index 0 = most
 * championships / best tiebreak = front, nearest the camera's own
 * starting position). The camera sits at a fixed side offset and slides
 * along Z as the user scrolls, always looking directly across at
 * whichever slot it's currently level with — a side-view dolly, not an
 * arc or a lookAt-the-whole-line-at-once shot. */

export const SLOT_SPACING = 3.4
export const SIDE_OFFSET = 3.8
export const EYE_HEIGHT = 1.3

export function slotZ(index: number): number {
  return -index * SLOT_SPACING
}

/** Camera Z at a given scroll progress (0..1) — a plain lerp from the
 * front slot to the back slot, with a little lead-in/lead-out room so
 * the front and back trophies aren't jammed right at the very edge of
 * the frame at progress 0/1. */
export function cameraZAtProgress(progress: number, count: number): number {
  if (count <= 1) return slotZ(0)
  const clamped = Math.min(Math.max(progress, 0), 1)
  const start = slotZ(0)
  const end = slotZ(count - 1)
  return start + (end - start) * clamped
}

/** Which slot the camera is currently closest to — drives the DOM name
 * caption (HistoryPage.tsx), not the camera position itself. */
export function activeIndexAtProgress(progress: number, count: number): number {
  if (count <= 0) return 0
  const clamped = Math.min(Math.max(progress, 0), 1)
  return Math.min(count - 1, Math.round(clamped * (count - 1)))
}
