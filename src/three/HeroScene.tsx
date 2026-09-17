import { MeshDistortMaterial, Sphere } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import { useRef } from 'react'
import type { Group } from 'three'
import { useEffectsTier } from '../motion/effectsTierContext'
import { useReducedMotion } from '../motion/reducedMotionContext'
import { CURRENT_LIQUID_PROPS, IGNITE_LIQUID_PROPS } from './liquidMaterials'

interface Blob {
  position: [number, number, number]
  scale: number
  props: typeof IGNITE_LIQUID_PROPS | typeof CURRENT_LIQUID_PROPS
  /** Idle group-rotation speed (rad/s) — independent of the material's
   * own `speed` (its internal surface-distortion animation). */
  spinSpeed: number
}

/** Three blobs read as a composition (front/back, two colors, varied
 * scale); one is the cheapest scene that still reads as "the hero has a
 * liquid 3D presence" for the reduced-quality tier (SPEC.md §7.2 — a
 * genuinely simpler scene, not the same one slower). */
const FULL_BLOBS: Blob[] = [
  { position: [-1.7, 0.35, -1.4], scale: 1.3, props: IGNITE_LIQUID_PROPS, spinSpeed: 0.16 },
  { position: [1.9, -0.45, -2.3], scale: 1.7, props: CURRENT_LIQUID_PROPS, spinSpeed: -0.11 },
  { position: [0.15, 1.15, -3.1], scale: 1.05, props: IGNITE_LIQUID_PROPS, spinSpeed: 0.09 },
]
const REDUCED_BLOBS: Blob[] = [FULL_BLOBS[1]]

function LiquidBlob({ blob, animate }: { blob: Blob; animate: boolean }) {
  const ref = useRef<Group>(null)

  useFrame((_, delta) => {
    if (!animate || !ref.current) return
    ref.current.rotation.y += delta * blob.spinSpeed
    ref.current.rotation.x += delta * blob.spinSpeed * 0.4
  })

  return (
    <group ref={ref} position={blob.position} scale={blob.scale}>
      <Sphere args={[1, 48, 48]}>
        <MeshDistortMaterial {...blob.props} speed={animate ? blob.props.speed : 0} />
      </Sphere>
    </group>
  )
}

/** The hero's 3D presence (PLAN.md Phase 13B) — a small cluster of liquid
 * blobs behind the hero copy, replacing the old static trophy-gallery
 * opener. Idle rotation plus each blob's own surface distortion are both
 * "3D elements that animate" independent of scroll; ScrollCameraRig
 * (mounted alongside this in HeroCanvas.tsx) supplies the actual
 * scroll-position-driven camera move.
 *
 * `prefers-reduced-motion` stops both the idle rotation and the
 * material's own distortion animation (a static, held blob shape rather
 * than disabling the mesh entirely) — the same "real branch, not a
 * blanket kill" pattern the rest of the site's motion follows. */
export function HeroScene() {
  const reducedMotion = useReducedMotion()
  const effectsTier = useEffectsTier()
  const blobs = effectsTier === 'reduced' ? REDUCED_BLOBS : FULL_BLOBS
  const animate = !reducedMotion

  return (
    <>
      {blobs.map((blob, i) => (
        <LiquidBlob key={i} blob={blob} animate={animate} />
      ))}
    </>
  )
}
