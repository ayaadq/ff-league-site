/** Shared football geometry (PLAN.md Phase H) — used by both the hero
 * (HeroScene.tsx) and the journey's kick (JourneyScene.tsx), so the two
 * don't maintain separate copies of the same scaled-sphere-plus-laces
 * approximation (three.js has no football/prolate-spheroid primitive).
 *
 * Deliberately "dumb": no position/rotation props. A continuously
 * animated football (spinning, flying an arc) needs its transform
 * mutated directly in `useFrame`/GSAP, not re-rendered through React
 * props every frame — callers wrap this in their own `<group ref={...}>`
 * and mutate that ref's `.position`/`.rotation` themselves, the same
 * ref-mutation idiom the rest of this project's scroll-driven 3D already
 * uses (ScrollCameraRig, PlayerCardArc). */

// Warm pigskin brown (PLAN.md Phase H.3) -- Phase H's grey (#5c5a62) read
// as a generic plastic prop rather than leather. Laces stay whatever
// accentColor the caller passes (ignite in both current call sites),
// unchanged by this.
const BODY_COLOR = '#7a4526'
const LACE_OFFSETS = [-0.5, -0.25, 0, 0.25, 0.5]

export function Football({ accentColor }: { accentColor: string }) {
  return (
    <group scale={[1.55, 0.88, 0.88]}>
      <mesh>
        <sphereGeometry args={[1, 40, 28]} />
        <meshStandardMaterial color={BODY_COLOR} roughness={0.45} metalness={0.1} />
      </mesh>
      {LACE_OFFSETS.map((t, i) => (
        <mesh key={i} position={[t, 1.02 / 0.88, 0]} scale={[1 / 1.55, 1 / 0.88, 1 / 0.88]}>
          <boxGeometry args={[0.05, 0.03, 0.16]} />
          <meshBasicMaterial color={accentColor} toneMapped={false} />
        </mesh>
      ))}
    </group>
  )
}
