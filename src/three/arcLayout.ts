/** Shared arc-positioning math for the 3D scenes (three/TrophyRoomScene.tsx,
 * three/WeeklySummaryScene.tsx) — kept in one place so both scenes'
 * "items curving toward the viewer" layout stays consistent and any
 * future tuning (camera distance, arc geometry) only has to happen once. */

export interface Slot {
  position: [number, number, number]
  rotationY: number
}

/** Positions `count` items evenly along a shallow concave arc — the
 * "wall wraps around the viewer" feel — centered on the +Z axis (the
 * camera looks down -Z toward the origin). `spread` is the total arc
 * angle in radians. */
export function arcSlots(
  count: number,
  radius: number,
  y: number,
  z: number,
  spread: number,
): Slot[] {
  return Array.from({ length: count }, (_, i) => {
    const t = count > 1 ? i / (count - 1) : 0.5
    const angle = (t - 0.5) * spread
    const x = Math.sin(angle) * radius
    const zPos = z + Math.cos(angle) * radius - radius
    return { position: [x, y, zPos], rotationY: -angle }
  })
}

/** Positions `pairCount` *pairs* along the same kind of arc, but each
 * pair sits close together with a visible gap to the next pair — used
 * where items are grouped by matchup rather than independent (SPEC.md
 * §5.5's "matchup pairings visualized", PLAN.md's Home rebuild). Returns
 * `pairCount * 2` slots, ordered [pair0.a, pair0.b, pair1.a, pair1.b, …]. */
export function pairedArcSlots(
  pairCount: number,
  radius: number,
  y: number,
  z: number,
  spread: number,
  pairGap = 0.075,
): Slot[] {
  const centers = arcSlots(pairCount, radius, y, z, spread)
  return centers.flatMap((center) => {
    const angle = -center.rotationY
    const offsets = [-pairGap, pairGap]
    return offsets.map((offset) => {
      const a = angle + offset
      const x = Math.sin(a) * radius
      const zPos = z + Math.cos(a) * radius - radius
      return { position: [x, y, zPos], rotationY: -a } satisfies Slot
    })
  })
}
