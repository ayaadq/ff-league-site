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
// Widened/lowered for the hotfix #2 trophy assembly (podium + full-size
// cup(s) is a noticeably bigger, taller object than the original combined
// Trophy.tsx) -- SIDE_OFFSET pulled back so it doesn't feel cramped at
// the new size, EYE_HEIGHT dropped to sit closer to the assembly's own
// vertical center (podium top ~0.55, cup top ~1.45) rather than above it.
export const SIDE_OFFSET = 4.4
export const EYE_HEIGHT = 1.05

export function slotZ(index: number): number {
  return -index * SLOT_SPACING
}

/** Real dwell time at the very front and back of the line (PLAN.md Phase
 * H.5 hotfix #4) — without this, the camera reaches the last slot at the
 * exact instant the scrollable range runs out (progress hits 1) with no
 * time left to actually look at it before the track releases, which is
 * very likely the real cause behind "scrolled past before all champions
 * were visible": the FRONT/back trophies were framed correctly, but the
 * scroll ran out the moment the camera arrived, not before. The doc
 * comment on the old, pre-hotfix `cameraZAtProgress` already claimed "a
 * little lead-in/lead-out room" that was never actually implemented —
 * this is that fix, for real. */
const LEAD_FRACTION = 0.08

/** Raw progress (0..1) eased into the compressed middle range that
 * actually drives camera movement — progress below `LEAD_FRACTION` or
 * above `1 - LEAD_FRACTION` clamps to the front/back slot respectively,
 * so both dwell rather than snapping instantly. Shared by
 * `cameraZAtProgress` and `activeIndexAtProgress` so the camera's actual
 * position and the DOM caption naming the "active" player can never
 * drift out of sync with each other. */
function easedProgress(progress: number): number {
  const clamped = Math.min(Math.max(progress, 0), 1)
  return Math.min(Math.max((clamped - LEAD_FRACTION) / (1 - 2 * LEAD_FRACTION), 0), 1)
}

/** Camera Z at a given scroll progress (0..1) — a lerp from the front
 * slot to the back slot across the *eased* range, so the front and back
 * trophies each get real dwell time rather than being reached right at
 * the scroll range's own edge. */
export function cameraZAtProgress(progress: number, count: number): number {
  if (count <= 1) return slotZ(0)
  const eased = easedProgress(progress)
  const start = slotZ(0)
  const end = slotZ(count - 1)
  return start + (end - start) * eased
}

/** Which slot the camera is currently closest to — drives the DOM name
 * caption (HistoryPage.tsx), not the camera position itself. Divides the
 * eased range into `count` equal-width bins (`journeyLayout.ts`'s own
 * `matchupIndexAtProgress` uses the same scheme) rather than centering
 * bins on `Math.round(eased * (count - 1))`, which gave the first and
 * last slots only *half* the dwell window of every middle slot — a real,
 * if subtle, contributor to "the last champion got cut off." */
export function activeIndexAtProgress(progress: number, count: number): number {
  if (count <= 0) return 0
  const eased = Math.min(easedProgress(progress), 1 - 1e-6)
  return Math.min(count - 1, Math.floor(eased * count))
}
