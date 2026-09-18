import { MARBLE_MATERIAL_PROPS } from './materials'

const PODIUM_HEIGHT = 0.55
const PODIUM_GLOW_RADIUS = 0.75

const CUP_FOOT_HEIGHT = 0.1
const CUP_FOOT_RADIUS = 0.2
const CUP_STEM_HEIGHT = 0.3
const CUP_BOWL_RADIUS = 0.5

/** One podium per player (PLAN.md Phase H.5 hotfix #2) — split out of
 * what used to be a single self-contained `Trophy` component that bundled
 * its own pedestal, which meant a 2-title slot rendered two entire
 * podiums side by side instead of one podium holding two cups. This is
 * the one base every slot gets exactly once, regardless of that player's
 * title count; `TrophyCup` (below) is what repeats.
 *
 * The glow disc is a flat, unlit `meshBasicMaterial`, `toneMapped={false}`
 * — this project's established "reads regardless of scene lighting"
 * idiom for a small accent detail (Football.tsx's laces, JourneyScene's
 * yard lines), sized up significantly from the first hotfix pass per the
 * brief's own "increase glow intensity/radius significantly." */
export function Podium({ accentColor }: { accentColor: string }) {
  return (
    <group>
      <mesh position={[0, 0.01, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[PODIUM_GLOW_RADIUS, 28]} />
        <meshBasicMaterial color={accentColor} transparent opacity={0.6} toneMapped={false} />
      </mesh>
      <mesh position={[0, PODIUM_HEIGHT / 2, 0]}>
        <cylinderGeometry args={[0.55, 0.62, PODIUM_HEIGHT, 28]} />
        <meshPhysicalMaterial {...MARBLE_MATERIAL_PROPS} />
      </mesh>
    </group>
  )
}

/** One trophy cup — foot, tapered stem, bowl — the repeating element a
 * podium holds one or more of, one per actual championship. Every part
 * is `meshBasicMaterial` with `toneMapped={false}`: fully self-
 * illuminated rather than lit standard/physical materials, so the cup
 * itself is always at full, saturated ignite/current brightness
 * regardless of whether scene/point lighting happens to reach it — the
 * brief's own "self-illuminated material so it glows regardless of
 * lighting," and a more reliable fix than only repositioning lights
 * (this project avoids bloom/post-processing on mobile, SPEC.md §7.2, so
 * this is the actual mechanism available for "glows").
 *
 * Dumb, no position of its own — callers (`TrophyLineScene.tsx`) place
 * this on top of a `<Podium>` and offset multiple cups side by side. */
export function TrophyCup({ accentColor }: { accentColor: string }) {
  return (
    <group>
      <mesh position={[0, CUP_FOOT_HEIGHT / 2, 0]}>
        <cylinderGeometry args={[CUP_FOOT_RADIUS, CUP_FOOT_RADIUS * 1.15, CUP_FOOT_HEIGHT, 24]} />
        <meshBasicMaterial color={accentColor} toneMapped={false} />
      </mesh>
      <mesh position={[0, CUP_FOOT_HEIGHT + CUP_STEM_HEIGHT / 2, 0]}>
        <cylinderGeometry args={[0.07, CUP_FOOT_RADIUS * 0.7, CUP_STEM_HEIGHT, 16]} />
        <meshBasicMaterial color={accentColor} toneMapped={false} />
      </mesh>
      <mesh
        position={[0, CUP_FOOT_HEIGHT + CUP_STEM_HEIGHT + CUP_BOWL_RADIUS * 0.7, 0]}
        rotation={[Math.PI, 0, 0]}
      >
        <sphereGeometry args={[CUP_BOWL_RADIUS, 28, 22, 0, Math.PI * 2, 0, Math.PI * 0.65]} />
        <meshBasicMaterial color={accentColor} toneMapped={false} />
      </mesh>
      <pointLight
        color={accentColor}
        intensity={4}
        distance={3.2}
        decay={2}
        position={[0, CUP_FOOT_HEIGHT + CUP_STEM_HEIGHT + CUP_BOWL_RADIUS, 0.3]}
      />
    </group>
  )
}

/** Total height from the podium's own base up to the top of a cup sitting
 * on it — `TrophyLineScene.tsx` uses this to place each `<TrophyCup>`
 * group at the podium's actual top surface rather than a hand-copied
 * number that could drift out of sync with `PODIUM_HEIGHT`. */
export const CUP_BASE_Y = PODIUM_HEIGHT
