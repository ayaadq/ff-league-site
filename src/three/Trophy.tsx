import { DoubleSide } from 'three'
import { MARBLE_MATERIAL_PROPS } from './materials'
import type { MedalMaterial } from './medalMaterials'

const PODIUM_HEIGHT = 0.55
const PODIUM_GLOW_RADIUS = 0.9

const CUP_BASE_RADIUS = 0.24
const CUP_BASE_HEIGHT = 0.09
const CUP_STEM_BOTTOM_RADIUS = 0.08
const CUP_STEM_TOP_RADIUS = 0.14
const CUP_STEM_HEIGHT = 0.3
const CUP_BOWL_BOTTOM_RADIUS = 0.14
const CUP_BOWL_TOP_RADIUS = 0.38
const CUP_BOWL_HEIGHT = 0.46
const CUP_RIM_TUBE = 0.025
const CUP_HANDLE_RADIUS = 0.17
const CUP_HANDLE_TUBE = 0.03
const CUP_HANDLE_ARC = Math.PI * 1.3
/** Where the handles attach, offset from the bowl's own centerline — the
 * two "sides" that read as left/right ears from the trophy line's
 * side-view camera (see the comment on `TrophyCup` below for why Z, not
 * X, is the axis that actually reads as "sideways" to that camera). */
const CUP_HANDLE_Z_OFFSET = (CUP_BOWL_BOTTOM_RADIUS + CUP_BOWL_TOP_RADIUS) * 0.55

/** Total height from the ground up to the top of the bowl — exported so
 * `TrophyLineScene.tsx`/layout code can reason about the cup's real
 * footprint without hand-copying these numbers. */
export const CUP_HEIGHT = CUP_BASE_HEIGHT + CUP_STEM_HEIGHT + CUP_BOWL_HEIGHT
/** The widest point of the cup (the bowl's flared rim) — the number that
 * actually matters for "how far apart do two cups need to be to not
 * overlap," not the narrower base/stem. */
export const CUP_WIDEST_RADIUS = CUP_BOWL_TOP_RADIUS

/** One podium per player (PLAN.md Phase H.5 hotfix #2) — the marble base
 * every slot gets exactly once regardless of that player's title count;
 * `TrophyCup` (below) is what repeats.
 *
 * The glow disc is a flat, unlit `meshBasicMaterial`, `toneMapped={false}`
 * — this project's established "reads regardless of scene lighting"
 * idiom for a small accent detail (Football.tsx's laces, JourneyScene's
 * yard lines). Radius widened again in the hotfix #3 pass to actually
 * cover the ground beneath two side-by-side cups now that they sit far
 * enough apart not to overlap. */
export function Podium({ accentColor }: { accentColor: string }) {
  return (
    <group>
      <mesh position={[0, 0.01, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[PODIUM_GLOW_RADIUS, 28]} />
        <meshBasicMaterial color={accentColor} transparent opacity={0.6} toneMapped={false} />
      </mesh>
      <mesh position={[0, PODIUM_HEIGHT / 2, 0]}>
        <cylinderGeometry args={[0.85, 0.95, PODIUM_HEIGHT, 28]} />
        <meshPhysicalMaterial {...MARBLE_MATERIAL_PROPS} />
      </mesh>
    </group>
  )
}

/** One handle — a partial torus (a full ring would look like a closed
 * loop threaded onto the bowl rather than an attached "ear"; the missing
 * arc is where it embeds into the bowl's side).
 *
 * Orientation: three.js's default torus lies in the local XY plane (its
 * hole faces local Z). The trophy line's camera sits off to the side and
 * looks down the world X axis (`TrophyLineCameraRig.tsx`), so anything
 * whose hole faces X reads as a full, readable loop on screen, while
 * anything whose hole faces Y or Z reads edge-on as a thin line. A 90°
 * rotation around Y swaps the hole's facing from local Z to world X,
 * which is why that's the rotation here rather than left at the default.
 * The left/right pair use opposite-signed Y rotations (not a mirrored
 * scale) so the arc's gap ends up a mirror image between the two sides
 * rather than both gaps facing the same absolute direction.
 *
 * Exact gap placement relative to the bowl is a best-effort from the
 * geometry math alone — this project has no way to render and look at a
 * three.js scene from within this environment, so whether the handles
 * read as cleanly attached versus slightly floating is a real-device
 * visual check, same as this project's other first-pass 3D geometry
 * (PLAN.md's own history of catching scale/pose issues that way). */
function Handle({ material, side }: { material: MedalMaterial; side: 'left' | 'right' }) {
  const z = side === 'left' ? -CUP_HANDLE_Z_OFFSET : CUP_HANDLE_Z_OFFSET
  const yRotation = side === 'left' ? Math.PI / 2 : -Math.PI / 2
  return (
    <mesh
      position={[0, CUP_BASE_HEIGHT + CUP_STEM_HEIGHT + CUP_BOWL_HEIGHT * 0.52, z]}
      rotation={[0, yRotation, 0]}
    >
      <torusGeometry args={[CUP_HANDLE_RADIUS, CUP_HANDLE_TUBE, 12, 28, CUP_HANDLE_ARC]} />
      <meshStandardMaterial {...material} />
    </mesh>
  )
}

/** One trophy cup — base plate, tapered stem, a wide flared bowl with a
 * rim, and two side handles — a real loving-cup silhouette. One
 * `MedalMaterial` across every part (PLAN.md Phase H.5 hotfix #5 —
 * realistic gold/silver/bronze metal, replacing the previous hotfix's
 * solid ignite/current colors, which read as neon rather than a
 * championship trophy). `TrophyLineScene.tsx` assigns gold/silver/bronze
 * by rank across the *global* sequence of cups (not per slot), cycling
 * if there are more than three, so a 2-cup podium's pair get two
 * distinct medal tones and the ranking continues into the next slot's
 * cup(s) rather than resetting.
 *
 * Dumb, no position of its own — callers (`TrophyLineScene.tsx`) place
 * this on top of a `<Podium>` and offset multiple cups apart along Z
 * (the axis that reads as "sideways" to the side-view camera — see
 * `Handle`'s own comment; offsetting along X instead, as if to stagger
 * them front-to-back, would foreshorten toward zero separation from this
 * camera's exact viewing angle rather than actually separating them on
 * screen). */
export function TrophyCup({ material }: { material: MedalMaterial }) {
  const bowlBaseY = CUP_BASE_HEIGHT + CUP_STEM_HEIGHT
  return (
    <group>
      <mesh position={[0, CUP_BASE_HEIGHT / 2, 0]}>
        <cylinderGeometry args={[CUP_BASE_RADIUS, CUP_BASE_RADIUS * 1.1, CUP_BASE_HEIGHT, 24]} />
        <meshStandardMaterial {...material} />
      </mesh>
      <mesh position={[0, CUP_BASE_HEIGHT + CUP_STEM_HEIGHT / 2, 0]}>
        <cylinderGeometry
          args={[CUP_STEM_TOP_RADIUS, CUP_STEM_BOTTOM_RADIUS, CUP_STEM_HEIGHT, 20]}
        />
        <meshStandardMaterial {...material} />
      </mesh>
      {/* Open-ended (no caps baked in) so the bowl reads as hollow --
          DoubleSide so the inside wall still renders if the camera ever
          catches a glimpse into the open mouth, rather than culling to a
          black gap. Only the narrow bottom, where it meets the stem,
          gets its own cap below; the wide top stays genuinely open. */}
      <mesh position={[0, bowlBaseY + CUP_BOWL_HEIGHT / 2, 0]}>
        <cylinderGeometry
          args={[CUP_BOWL_TOP_RADIUS, CUP_BOWL_BOTTOM_RADIUS, CUP_BOWL_HEIGHT, 28, 1, true]}
        />
        <meshStandardMaterial {...material} side={DoubleSide} />
      </mesh>
      <mesh position={[0, bowlBaseY, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[CUP_BOWL_BOTTOM_RADIUS, 28]} />
        <meshStandardMaterial {...material} />
      </mesh>
      <mesh position={[0, bowlBaseY + CUP_BOWL_HEIGHT, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[CUP_BOWL_TOP_RADIUS, CUP_RIM_TUBE, 12, 32]} />
        <meshStandardMaterial {...material} />
      </mesh>
      <Handle material={material} side="left" />
      <Handle material={material} side="right" />
      <pointLight
        color={material.color}
        intensity={3}
        distance={3.2}
        decay={2}
        position={[0, bowlBaseY + CUP_BOWL_HEIGHT, 0.3]}
      />
    </group>
  )
}

/** The podium's own top surface Y — `TrophyLineScene.tsx` places each
 * `<TrophyCup>` group here so the cup's own base plate sits flush on the
 * podium rather than a hand-copied number that could drift out of sync
 * with `PODIUM_HEIGHT`. */
export const CUP_BASE_Y = PODIUM_HEIGHT
