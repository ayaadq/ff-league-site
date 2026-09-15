import { Instance, Instances } from '@react-three/drei'
import { gsap } from 'gsap'
import { useEffect, useMemo, useRef } from 'react'
import type { Object3D } from 'three'
import { useReducedMotion } from '../motion/reducedMotionContext'
import { setupGsap } from '../motion/gsapSetup'
import { arcSlots, type Slot } from './arcLayout'
import {
  BRASS_MATERIAL_PROPS,
  GOLD_MATERIAL_PROPS,
  IVORY_MATERIAL_PROPS,
  MARBLE_MATERIAL_PROPS,
} from './materials'

const TEAM_COUNT = 12

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
 * both stay instanced.
 *
 * Entrance is a deliberate stepped/stop-motion beat (PLAN.md Phase 6,
 * SPEC.md §5.5) — each trophy "clicks" up to full size in discrete
 * jumps rather than a smooth scale tween, staggered across the twelve
 * so they arrive left-to-right like museum lights switching on. This
 * runs once, the first time the persistent gallery canvas mounts (not
 * on every route change) — see PLAN.md Phase 5 on why the canvas is
 * mounted once at the Layout level. Skipped entirely under
 * prefers-reduced-motion: trophies are simply present at full size. */
function TrophyToppers({ slots }: { slots: Slot[] }) {
  const prefersReducedMotion = useReducedMotion()
  const cupRefs = useRef<Array<Object3D | null>>([])
  const baseRefs = useRef<Array<Object3D | null>>([])

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

  useEffect(() => {
    setupGsap()

    // Each trophy's cup+base pair pops together, twelve pairs staggered
    // across the arc. `gsap.to` can't tween a THREE.Vector3 `scale`
    // property directly as part of a batch array target, so each pair
    // gets its own small tween with a manual per-index delay instead of
    // a single call with `stagger`.
    const pairs = slots.map((_, i) => [cupRefs.current[i], baseRefs.current[i]] as const)

    if (prefersReducedMotion) {
      pairs.forEach(([cup, base]) => {
        cup?.scale.setScalar(1)
        base?.scale.setScalar(1)
      })
      return
    }

    const tweens = pairs.flatMap(([cup, base], i) =>
      [cup, base]
        .filter((t): t is Object3D => t !== null)
        .map((target) => {
          target.scale.setScalar(0)
          return gsap.to(target.scale, {
            x: 1,
            y: 1,
            z: 1,
            duration: 0.5,
            ease: 'steps(6)',
            delay: i * 0.045,
          })
        }),
    )

    return () => {
      tweens.forEach((t) => t.kill())
    }
  }, [prefersReducedMotion, slots])

  return (
    <>
      <Instances limit={TEAM_COUNT}>
        <sphereGeometry args={[0.14, 20, 16, 0, Math.PI * 2, 0, Math.PI * 0.65]} />
        <meshStandardMaterial {...GOLD_MATERIAL_PROPS} />
        {cupSlots.map((slot, i) => (
          <Instance
            key={i}
            ref={(el) => {
              cupRefs.current[i] = el as Object3D | null
            }}
            position={slot.position}
            rotation={[Math.PI, slot.rotationY, 0]}
          />
        ))}
      </Instances>
      <Instances limit={TEAM_COUNT}>
        <cylinderGeometry args={[0.09, 0.12, 0.09, 16]} />
        <meshStandardMaterial {...BRASS_MATERIAL_PROPS} />
        {baseSlots.map((slot, i) => (
          <Instance
            key={i}
            ref={(el) => {
              baseRefs.current[i] = el as Object3D | null
            }}
            position={slot.position}
            rotation={[0, slot.rotationY, 0]}
          />
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

/** The "Trophy Room" scene — the original Phase 5 marble/gold gallery
 * (plinths, trophy toppers, portrait wall, podium). Originally built as
 * the Home page hero; moved to the League History page instead (user
 * feedback: Home should be a live, data-driven weekly scoreboard, not a
 * static display — see WeeklySummaryScene.tsx — and this generic
 * trophy/gallery treatment fits League History's "look back at the
 * league's record" purpose better than a page you'd revisit every
 * week). Untextured portrait canvases are intentional here — this scene
 * has no per-week data to show; WeeklySummaryScene.tsx is where real
 * team photos actually load. */
export function TrophyRoomScene() {
  // Narrower arcs than an initial pass used (SPEC.md §5.4 "portraits on a
  // gallery wall" still applies, but the outermost items at a wide spread
  // were viewed near edge-on from the fixed camera — see PLAN.md Phase 5 —
  // reading as dark slivers instead of gold-framed portraits/marble
  // plinths. Kept tight enough that every instance stays close to
  // face-on within the camera's frame.
  const plinthSlots = useMemo(() => arcSlots(TEAM_COUNT, 4.8, 0.525, 0.4, Math.PI * 0.42), [])
  const wallSlots = useMemo(() => arcSlots(TEAM_COUNT, 7.6, 2.15, -3.2, Math.PI * 0.38), [])

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
