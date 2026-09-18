import { useMemo, type RefObject } from 'react'
import type { Group } from 'three'
import { Football } from './Football'
import { grassTexture } from './grassTexture'
import { KICK_POSITION, UPRIGHT_POSITION } from './journeyLayout'

const IGNITE = '#ff5a36'
const CURRENT = '#2ee6d6'
const POST_COLOR = IGNITE

/** Crossbar height and upright reach, in world units — chosen so
 * UPRIGHT_POSITION.y (journeyLayout.ts, where the ball actually ends up)
 * lands inside the gap between them: above the crossbar, below the top
 * of the uprights, the same way a real successful kick clears the bar
 * between the posts. */
const CROSSBAR_Y = 2.2
const UPRIGHT_TOP_Y = 5.4
const POST_HALF_SPREAD = 1.8
const POST_RADIUS = 0.07

/** Simple NFL-style goalposts — one base pole to the crossbar, a
 * crossbar, two uprights above it. Plain geometry, one material, no
 * texture: this scene's entire GPU cost after the Phase G context-loss
 * lesson (PLAN.md) is deliberately kept to a handful of small meshes. */
function GoalPosts() {
  const z = UPRIGHT_POSITION.z
  return (
    <group position={[0, 0, z]}>
      <mesh position={[0, CROSSBAR_Y / 2, 0]}>
        <cylinderGeometry args={[POST_RADIUS, POST_RADIUS, CROSSBAR_Y, 12]} />
        <meshStandardMaterial color={POST_COLOR} roughness={0.35} metalness={0.3} />
      </mesh>
      <mesh position={[0, CROSSBAR_Y, 0]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[POST_RADIUS, POST_RADIUS, POST_HALF_SPREAD * 2, 12]} />
        <meshStandardMaterial color={POST_COLOR} roughness={0.35} metalness={0.3} />
      </mesh>
      {[-POST_HALF_SPREAD, POST_HALF_SPREAD].map((x, i) => (
        <mesh key={i} position={[x, (CROSSBAR_Y + UPRIGHT_TOP_Y) / 2, 0]}>
          <cylinderGeometry args={[POST_RADIUS, POST_RADIUS, UPRIGHT_TOP_Y - CROSSBAR_Y, 12]} />
          <meshStandardMaterial color={POST_COLOR} roughness={0.35} metalness={0.3} />
        </mesh>
      ))}
    </group>
  )
}

/** A handful of faint yard-line stripes spaced along the kick's own
 * travel distance — plain flat geometry, deliberately not a canvas
 * texture (the previous journey redesign's play-diagram textures were
 * exactly what triggered real WebGL context loss on mobile, PLAN.md
 * Phase G's emergency-fix note; this scene doesn't reintroduce that
 * risk for a background detail this minor). */
function YardLines() {
  const lineZs = useMemo(() => {
    const start = KICK_POSITION.z
    const end = UPRIGHT_POSITION.z
    const count = 6
    return Array.from({ length: count }, (_, i) => start + ((end - start) * (i + 1)) / (count + 1))
  }, [])

  return (
    <>
      {lineZs.map((z, i) => (
        <mesh key={i} position={[0, 0.01, z]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[36, 0.08]} />
          <meshBasicMaterial
            color={i % 2 === 0 ? IGNITE : CURRENT}
            transparent
            opacity={0.22}
            toneMapped={false}
            depthWrite={false}
          />
        </mesh>
      ))}
    </>
  )
}

// Asymmetric padding beyond the two landmarks the field has to cover
// (kickoff tee, uprights) -- weighted toward the far side (past the
// uprights) since that's the edge the elevated finale sky-cam actually
// looks across/down at (END_CAM sits at y=12 above the field's midpoint,
// journeyLayout.ts); a symmetric pad left the turf visibly ending well
// within that shot's frame instead of reading as an expansive field.
const FIELD_NEAR_PAD = 10
const FIELD_FAR_PAD = 45

function Field() {
  const nearZ = KICK_POSITION.z + FIELD_NEAR_PAD
  const farZ = UPRIGHT_POSITION.z - FIELD_FAR_PAD
  const depth = nearZ - farZ
  const centerZ = (nearZ + farZ) / 2
  // Tiled at ~2 world units per repeat -- fine enough to read as blades
  // of grass rather than a handful of oversized smears, coarse enough
  // that 128px of source texture per tile still looks sharp up close
  // (PLAN.md Phase H.3, replacing Phase H.1's flat color fill).
  const texture = useMemo(() => {
    const t = grassTexture()
    t.repeat.set(20, depth / 2)
    return t
  }, [depth])
  return (
    <mesh position={[0, 0, centerZ]} rotation={[-Math.PI / 2, 0, 0]}>
      <planeGeometry args={[40, depth]} />
      <meshStandardMaterial map={texture} roughness={0.92} metalness={0} />
    </mesh>
  )
}

/** The kick journey's world (PLAN.md Phase H) — a minimal dark field, a
 * single set of goalposts, and the football, replacing both the original
 * tiered-stadium scene and Phase G's play-diagram rebuild of it in one
 * pass. No portraits, no per-matchup 3D markers, no ambient texture
 * planes — the matchup scorecards (DOM, WeeklyJourney.tsx) are the
 * foreground content now; this scene is purely the kick itself.
 *
 * The ball's `<group>` is handed a ref from the caller (JourneyCanvas.tsx)
 * rather than owning its own position/rotation state — JourneyCameraRig
 * mutates that same ref every scroll update so the ball's flight and the
 * camera's look-at target are always reading the literal same transform,
 * not two independently-computed approximations of it (the class of bug
 * this project's own camera rigs have been careful to avoid since the
 * original journey's ignite-plane distance math, PLAN.md Phase 12). */
export function JourneyScene({ ballRef }: { ballRef: RefObject<Group | null> }) {
  return (
    <group>
      <Field />
      <YardLines />
      <GoalPosts />
      <group ref={ballRef} position={[KICK_POSITION.x, KICK_POSITION.y, KICK_POSITION.z]}>
        {/* Football.tsx's ball is a unit sphere scaled [1.55, 0.88, 0.88]
            -- a ~3.1-unit-long object, sized right for the hero (where the
            camera sits a couple of units away) but wildly oversized for
            this scene's much larger field/camera distances. Confirmed
            live via a debug readout of the actual camera-to-ball distance
            and fov, not assumed: the ball was filling most of the frame
            barely a tenth of the way through the flight. 0.35 brings its
            effective size to ~1 unit, proportionate to the goalposts
            (POST_HALF_SPREAD*2 = 3.6 units apart) and the ~20-unit field
            it's flying across.

            The extra rotation stands the ball on its tip on the kicking
            tee -- Football's long axis is local X, so a 90° Z-rotation
            points it up; the small X-tilt is the slight backward lean a
            real tee'd-up ball sits at, not perfectly vertical (PLAN.md
            Phase H.1 -- Phase H left this at rotation 0, which is the
            ball lying flat on its side, poking through the ground plane
            since KICK_POSITION.y was tuned for the wrong axis). This local
            tilt only sets the *rest* pose: JourneyCameraRig's per-frame
            `ballGroup.rotation.z` spin lives on the outer group above and
            composes with it during flight, same as before. */}
        <group scale={0.35} rotation={[0.15, 0, Math.PI / 2]}>
          <Football accentColor={IGNITE} />
        </group>
      </group>
    </group>
  )
}
