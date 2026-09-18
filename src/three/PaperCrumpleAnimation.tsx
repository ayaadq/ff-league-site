import { useFrame } from '@react-three/fiber'
import { useMemo, useRef, type RefObject } from 'react'
import {
  DoubleSide,
  Group,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  PlaneGeometry,
} from 'three'

const PAPER_COLOR = '#f5f3ee'
const PAPER_WIDTH = 1.7
const PAPER_HEIGHT = 2.3
// Kept low deliberately (PLAN.md's own repeated WebGL-memory lesson this
// project has learned the hard way more than once) -- enough subdivisions
// to read as wrinkled paper up close, not a true simulation mesh density.
const SEGMENTS_X = 26
const SEGMENTS_Y = 36

const CRUMPLE_END = 0.7
const SHADOW_RADIUS = 0.9

/** Per-vertex noise seeds, generated once and reused every frame — a
 * hand-rolled "looks organic" stand-in for real simplex/Perlin noise
 * (no noise library dependency for one effect), not a physically accurate
 * cloth solver. A handful of sine terms at different frequencies/phases,
 * summed and scaled by crumple progress, reads as convincing paper
 * wrinkling without per-vertex constraint relaxation — the actual cloth-
 * simulation math this project deliberately isn't doing, for the same
 * mobile frame-budget reason it avoids real shadow maps and heavy
 * per-frame physics everywhere else (SPEC.md §7.2). */
function wrinkleSeeds(count: number) {
  const seeds = new Float32Array(count * 3)
  for (let i = 0; i < count; i++) {
    seeds[i * 3] = Math.random() * Math.PI * 2
    seeds[i * 3 + 1] = Math.random() * Math.PI * 2
    seeds[i * 3 + 2] = 0.6 + Math.random() * 0.8
  }
  return seeds
}

/** 0 before the launch begins, ramping to 1 as flightT reaches the end of
 * the scroll range -- shared by the position arc, spin, scale-down, and
 * fade, so all four read from the exact same progress rather than four
 * separately-eased approximations of "how launched is it." */
function launchFactor(progress: number): number {
  if (progress <= CRUMPLE_END) return 0
  return (progress - CRUMPLE_END) / (1 - CRUMPLE_END)
}

/** The paper mesh + its shadow (PLAN.md "Paper Crumple Animation") — a
 * flat off-white card that wrinkles in place as `progressRef` climbs from
 * 0 to `CRUMPLE_END` (70%), then arcs up and to the right, spinning and
 * fading, as it climbs the rest of the way to 1. No text lives on this
 * mesh — the page's own DOM content overlays it, same "every word is
 * DOM" reasoning WeeklyJourney.tsx already documents for its own scene
 * (unselectable, invisible to a screen reader, and soft at distance if
 * rendered as 3D geometry instead).
 *
 * Driven by a ref, not a React prop -- `PaperCrumpleCanvas.tsx`'s
 * ScrollTrigger writes directly into `progressRef.current` on every
 * scroll tick, and this component reads it once per rendered frame via
 * `useFrame`, the same ref-mutation idiom every other scroll-driven scene
 * in this project already uses (JourneyCameraRig, ScrollCameraRig) to
 * avoid a React re-render on every scroll event. */
export function PaperCrumpleAnimation({ progressRef }: { progressRef: RefObject<number> }) {
  const groupRef = useRef<Group>(null)
  const meshRef = useRef<Mesh>(null)
  const shadowRef = useRef<Mesh>(null)

  // This geometry's own vertex positions get mutated in place every frame
  // below (the only performant way to animate ~1000 vertices --
  // replacing the whole BufferGeometry each frame would be wasteful and
  // wrong), which oxlint's immutability rule flags on principle since it
  // doesn't know three.js objects are meant to be mutated imperatively
  // this way. Same accepted, understood false positive as
  // JourneyCameraRig.tsx's own `camera.position.set(...)` warning --
  // tried the "ref instead of useMemo" workaround first, but that traded
  // one pair of warnings for two pairs (oxlint's separate "no refs during
  // render" rule flags the lazy-ref-init pattern), so useMemo stays.
  const geometry = useMemo(
    () => new PlaneGeometry(PAPER_WIDTH, PAPER_HEIGHT, SEGMENTS_X, SEGMENTS_Y),
    [],
  )
  const basePositions = useMemo(
    () => Float32Array.from(geometry.attributes.position.array),
    [geometry],
  )
  const seeds = useMemo(() => wrinkleSeeds(geometry.attributes.position.count), [geometry])

  useFrame(({ clock }) => {
    const progress = Math.min(Math.max(progressRef.current ?? 0, 0), 1)
    const crumple = Math.min(progress / CRUMPLE_END, 1)
    const launch = launchFactor(progress)
    const t = clock.getElapsedTime()

    const posAttr = geometry.attributes.position
    const arr = posAttr.array as Float32Array
    const count = posAttr.count
    // Curl strength grows with crumple -- edges pull toward the center
    // and the whole sheet dips in Z, on top of the per-vertex wrinkle
    // noise, so it reads as balling up rather than just rippling in place.
    const curl = crumple * crumple

    for (let i = 0; i < count; i++) {
      const bx = basePositions[i * 3]
      const by = basePositions[i * 3 + 1]
      const bz = basePositions[i * 3 + 2]
      const sx = seeds[i * 3]
      const sy = seeds[i * 3 + 1]
      const freq = seeds[i * 3 + 2]

      const wrinkle =
        Math.sin(bx * 5 * freq + sx + t * 0.4) * Math.cos(by * 4 * freq + sy) * 0.09 * crumple +
        Math.sin(by * 8 + sx) * 0.04 * crumple

      const normX = bx / (PAPER_WIDTH / 2)
      const normY = by / (PAPER_HEIGHT / 2)
      const radial = Math.sqrt(normX * normX + normY * normY)
      const inward = -radial * radial * 0.35 * curl

      arr[i * 3] = bx + normX * inward
      arr[i * 3 + 1] = by + normY * inward
      arr[i * 3 + 2] = bz + wrinkle + curl * 0.25
    }
    posAttr.needsUpdate = true
    geometry.computeVertexNormals()

    if (groupRef.current) {
      // Arc trajectory -- up and to the right, exiting top-right, a plain
      // quadratic lerp same shape as journeyLayout.ts's own ball arc (two
      // endpoints plus a control point pulled off to one side).
      const arcX = launch * launch * 2.6
      const arcY = launch * (2.2 - launch * 0.4)
      groupRef.current.position.set(arcX, arcY, -launch * 1.2)
      groupRef.current.rotation.z = -launch * Math.PI * 1.6
      groupRef.current.rotation.x = launch * Math.PI * 0.3
      const scale = 1 - launch * 0.35
      groupRef.current.scale.setScalar(scale)
    }

    if (meshRef.current) {
      const material = meshRef.current.material as MeshStandardMaterial
      material.opacity = 1 - launch
    }

    if (shadowRef.current) {
      const material = shadowRef.current.material as MeshBasicMaterial
      material.opacity = 0.22 * (1 - launch)
      const shrink = 1 - launch * 0.6
      shadowRef.current.scale.setScalar(shrink)
    }
  })

  return (
    <group>
      <mesh
        ref={shadowRef}
        position={[0, -PAPER_HEIGHT / 2 - 0.05, -0.02]}
        rotation={[-Math.PI / 2, 0, 0]}
      >
        <circleGeometry args={[SHADOW_RADIUS, 24]} />
        <meshBasicMaterial color="#000000" transparent opacity={0.22} depthWrite={false} />
      </mesh>

      <group ref={groupRef}>
        <mesh ref={meshRef} geometry={geometry}>
          <meshStandardMaterial
            color={PAPER_COLOR}
            roughness={0.85}
            metalness={0}
            transparent
            side={DoubleSide}
          />
        </mesh>
      </group>
    </group>
  )
}
