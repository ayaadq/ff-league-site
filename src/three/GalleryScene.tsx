import { Instance, Instances } from '@react-three/drei'
import { useMemo } from 'react'
import {
  BRASS_MATERIAL_PROPS,
  GOLD_MATERIAL_PROPS,
  IVORY_MATERIAL_PROPS,
  MARBLE_MATERIAL_PROPS,
} from './materials'

const TEAM_COUNT = 12

interface Slot {
  position: [number, number, number]
  rotationY: number
}

/** Positions `count` items along a shallow concave arc — the "gallery
 * wall wraps around the viewer" feel — centered on the +Z axis (the
 * camera looks down -Z toward the origin, see GalleryCanvas). `spread`
 * is the total arc angle in radians; `bow` controls how far the arc's
 * center bulges toward the camera relative to its edges. */
function arcSlots(count: number, radius: number, y: number, z: number, spread: number): Slot[] {
  return Array.from({ length: count }, (_, i) => {
    const t = count > 1 ? i / (count - 1) : 0.5
    const angle = (t - 0.5) * spread
    const x = Math.sin(angle) * radius
    const zPos = z + Math.cos(angle) * radius - radius
    return { position: [x, y, zPos], rotationY: -angle }
  })
}

/** Twelve marble plinths in a gentle arc, one per team — the base every
 * team's trophy/portrait sits on. Instanced since the shape repeats
 * exactly twelve times (PLAN.md Phase 5). */
function Plinths({ slots }: { slots: Slot[] }) {
  return (
    <Instances limit={TEAM_COUNT}>
      <cylinderGeometry args={[0.34, 0.4, 1.05, 24]} />
      <meshPhysicalMaterial {...MARBLE_MATERIAL_PROPS} />
      {slots.map((slot, i) => (
        <Instance key={i} position={slot.position} rotation={[0, slot.rotationY, 0]} />
      ))}
    </Instances>
  )
}

/** A small gold trophy silhouette (cup + base) topping each plinth. Two
 * instanced passes — cup and base — rather than a single fused mesh, so
 * both stay instanced. */
function TrophyToppers({ slots }: { slots: Slot[] }) {
  const cupSlots = useMemo(
    () =>
      slots.map((slot) => ({
        ...slot,
        position: [slot.position[0], slot.position[1] + 0.58, slot.position[2]] as [
          number,
          number,
          number,
        ],
      })),
    [slots],
  )
  const baseSlots = useMemo(
    () =>
      slots.map((slot) => ({
        ...slot,
        position: [slot.position[0], slot.position[1] + 0.545, slot.position[2]] as [
          number,
          number,
          number,
        ],
      })),
    [slots],
  )

  return (
    <>
      <Instances limit={TEAM_COUNT}>
        <sphereGeometry args={[0.14, 20, 16, 0, Math.PI * 2, 0, Math.PI * 0.65]} />
        <meshStandardMaterial {...GOLD_MATERIAL_PROPS} />
        {cupSlots.map((slot, i) => (
          <Instance key={i} position={slot.position} rotation={[Math.PI, slot.rotationY, 0]} />
        ))}
      </Instances>
      <Instances limit={TEAM_COUNT}>
        <cylinderGeometry args={[0.09, 0.12, 0.09, 16]} />
        <meshStandardMaterial {...BRASS_MATERIAL_PROPS} />
        {baseSlots.map((slot, i) => (
          <Instance key={i} position={slot.position} rotation={[0, slot.rotationY, 0]} />
        ))}
      </Instances>
    </>
  )
}

/** The portrait wall — twelve gold-framed panels arranged in a wider,
 * taller arc behind the plinths. Panels are untextured ivory "canvases"
 * for now (Phase 5 is geometry/materials/lighting only); real team
 * avatar photos land when team pages integrate with the scene
 * (PLAN.md Phase 7), once cross-origin texture loading from the Sleeper
 * CDN has been verified in a browser context. */
function PortraitWall({ slots }: { slots: Slot[] }) {
  const canvasSlots = useMemo(
    () =>
      slots.map((slot) => {
        const forwardOffset = 0.036
        const dx = Math.sin(slot.rotationY) * -forwardOffset
        const dz = Math.cos(slot.rotationY) * forwardOffset
        return {
          ...slot,
          position: [slot.position[0] + dx, slot.position[1], slot.position[2] + dz] as [
            number,
            number,
            number,
          ],
        }
      }),
    [slots],
  )

  return (
    <>
      <Instances limit={TEAM_COUNT}>
        <boxGeometry args={[0.92, 1.18, 0.07]} />
        <meshStandardMaterial {...GOLD_MATERIAL_PROPS} />
        {slots.map((slot, i) => (
          <Instance key={`frame-${i}`} position={slot.position} rotation={[0, slot.rotationY, 0]} />
        ))}
      </Instances>
      <Instances limit={TEAM_COUNT}>
        <planeGeometry args={[0.76, 1]} />
        <meshPhysicalMaterial {...IVORY_MATERIAL_PROPS} />
        {canvasSlots.map((slot, i) => (
          <Instance
            key={`canvas-${i}`}
            position={slot.position}
            rotation={[0, slot.rotationY, 0]}
          />
        ))}
      </Instances>
    </>
  )
}

/** A three-tier marble podium at the center of the gallery floor — the
 * "standings" motif from SPEC.md §5.4. Not instanced: it's a single
 * unique object, unlike the twelve repeated team elements above. */
function Podium() {
  const tiers: Array<{ y: number; size: [number, number, number] }> = [
    { y: 0.15, size: [2.6, 0.3, 1.3] },
    { y: 0.42, size: [1.9, 0.24, 1.05] },
    { y: 0.65, size: [1.3, 0.22, 0.8] },
  ]
  return (
    <group position={[0, 0, 1.6]}>
      {tiers.map((tier, i) => (
        <mesh key={i} position={[0, tier.y, 0]}>
          <boxGeometry args={tier.size} />
          <meshPhysicalMaterial {...MARBLE_MATERIAL_PROPS} />
        </mesh>
      ))}
    </group>
  )
}

/** The gallery floor — a simple large marble slab underfoot. */
function Floor() {
  return (
    <mesh position={[0, -0.001, -1]} rotation={[-Math.PI / 2, 0, 0]}>
      <planeGeometry args={[26, 26]} />
      <meshPhysicalMaterial {...MARBLE_MATERIAL_PROPS} roughness={0.55} />
    </mesh>
  )
}

export function GalleryScene() {
  const plinthSlots = useMemo(() => arcSlots(TEAM_COUNT, 5.4, 0.525, 0.4, Math.PI * 0.72), [])
  const wallSlots = useMemo(() => arcSlots(TEAM_COUNT, 8.4, 2.15, -3.2, Math.PI * 0.68), [])

  return (
    <group>
      <Floor />
      <Podium />
      <Plinths slots={plinthSlots} />
      <TrophyToppers slots={plinthSlots} />
      <PortraitWall slots={wallSlots} />
    </group>
  )
}
