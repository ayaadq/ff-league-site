import { useFrame } from '@react-three/fiber'
import { useEffect, useMemo, useRef } from 'react'
import { Color, type Mesh, type MeshBasicMaterial } from 'three'
import { useEffectsTier } from '../motion/effectsTierContext'
import { useReducedMotion } from '../motion/reducedMotionContext'
import {
  BASE_STANDOFF,
  cameraPullback,
  STATION_GAP,
  stationZ,
  type JourneyStation,
} from './journeyLayout'
import { Portrait } from './Portrait'
import { createPlayDiagramTexture, PLAY_DIAGRAM_VARIANT_COUNT } from './playDiagramTexture'

const IGNITED_GOLD = '#ff5a36'

/** Ignite falloff -- see the winner's glow plane in Station below. At
 * distance 0 (the station currently being looked at) the plane sits at
 * full brightness; by IGNITE_RADIUS units of look-target travel away
 * it's decayed to MIN_INTENSITY, a dim ember rather than fully off, so
 * a station never reads as broken/dark before the camera actually
 * arrives. Radius is close to STATION_GAP (15) so a station is
 * essentially fully lit through its own dwell and mostly faded by the
 * time the camera reaches a neighbor, not tuned to any exact dwell
 * width (which now varies by closeness, closenessTiming).
 *
 * "Distance" went through three live-caught fixes, not one, worth
 * recording so the next per-frame camera-relative effect in this file
 * doesn't repeat them: (1) raw `camera.position.z - z` never reached 0
 * at all -- JourneyCameraRig always holds the camera
 * BASE_STANDOFF * cameraPullback(aspect) units *behind* whatever it's
 * looking at, not co-located with it. (2) Subtracting a fixed
 * BASE_STANDOFF fixed the at-rest case but not the general one: on this
 * canvas specifically pullback often isn't 1 even at desktop widths
 * (capped by HomePage's own `max-w-4xl` column), so a fixed offset
 * under- or over-corrected depending on aspect. (3) Subtracting standoff
 * from the *already-taken* absolute difference is a different
 * computation than subtracting it before -- caught by a live probe
 * showing a neighboring station spuriously reading "distance 0" while
 * the camera was merely passing near its Z mid-travel toward a
 * *different* target. The correct order is to recover what the camera
 * is actually looking at first (`camera.position.z - standoff`, since
 * that equality is exactly how JourneyCameraRig's place() constructs
 * camera.position.z in the first place), then compare each station to
 * *that* -- see the useFrame body below, not a second approximation
 * copied from JourneyCameraRig. */
const IGNITE_RADIUS = 10
const MIN_INTENSITY = 0.08

/** The two portraits of one matchup, facing the camera.
 *
 * The winner is lit and the loser is not — the whole station reads at a
 * glance without a word of text, which matters because the camera passes
 * through faster than anyone reads. Lighting rather than size or position
 * carries it, so both teams stay the same scale and neither is literally
 * put beneath the other.
 *
 * The winner's plane ignites as the camera arrives rather than sitting
 * lit the whole time, on the quality tier's full path only
 * (useEffectsTier, gated the same way any future heavy per-frame effect
 * should be) and skipped under prefers-reduced-motion. Reads the live
 * camera position itself via useFrame rather than JourneyCameraRig
 * threading a shared value down -- decoupled on purpose, so a bug here
 * can't touch the camera rig's own state, and vice versa. On the
 * reduced tier or under reduced motion this renders exactly as it did
 * before this existed: a static always-on plane, not a dimmer version
 * of the animated one -- "reduced" means *no extra per-frame work*,
 * not *a cheaper animation*.
 *
 * PLAN.md Phase G: the turf patch and gold ground seam that used to sit
 * under each station are gone along with the rest of the stadium (see
 * JourneyScene's own doc comment below) -- the portraits now face the
 * camera against open fog, with the play-diagram planes (PlayDiagrams,
 * this file) carrying the ambient texture instead of a literal floor. */
function Station({ station, index }: { station: JourneyStation; index: number }) {
  const z = stationZ(index)
  const glowRef = useRef<Mesh>(null)
  const effectsTier = useEffectsTier()
  const prefersReducedMotion = useReducedMotion()
  const igniteEnabled = effectsTier === 'full' && !prefersReducedMotion
  const igniteColor = useMemo(() => new Color(IGNITED_GOLD), [])

  useFrame(({ camera, size }) => {
    if (!igniteEnabled) return
    const material = glowRef.current?.material as MeshBasicMaterial | undefined
    if (!material) return
    const standoff = BASE_STANDOFF * cameraPullback(size.width / size.height)
    const targetZ = camera.position.z - standoff
    const distance = Math.abs(targetZ - z)
    const intensity = Math.max(MIN_INTENSITY, 1 - distance / IGNITE_RADIUS)
    material.color.copy(igniteColor).multiplyScalar(intensity)
  })

  return (
    <group position={[0, 0, z]}>
      {/* Winner: a gold plane behind the portrait, emissive so it glows
          without costing a light. Six real lights, one per station, would
          blow the mobile budget in SPEC 7.2 on their own. */}
      <mesh ref={glowRef} position={[-2.7, 2.35, -0.09]}>
        <planeGeometry args={[1.22, 1.48]} />
        <meshBasicMaterial color={IGNITED_GOLD} toneMapped={false} />
      </mesh>
      <Portrait avatarId={station.winnerAvatarId} position={[-2.7, 2.35, 0]} rotationY={0.13} />

      <Portrait avatarId={station.loserAvatarId} position={[2.7, 2.35, 0]} rotationY={-0.13} />
    </group>
  )
}

/** One ambient play-diagram plane (PLAN.md Phase G) — an X's-and-O's
 * formation floating off to one side of a station, colored ignite for
 * the winner's side or current for the loser's, standing in for the
 * turf/stadium the journey used to be built from. Deliberately
 * transparent/unlit (`meshBasicMaterial`, `transparent`, `toneMapped:
 * false`) so it reads as flat neon line art rather than a lit surface —
 * texture, not geometry, the same register a whiteboard sketch would
 * read at.
 *
 * "Cycle/animate as you scroll" is mostly free: each plane sits at its
 * own fixed Z, and the journey's existing camera dolly (JourneyCameraRig)
 * already moves past them at different apparent rates by depth (real
 * parallax, no extra math). On top of that, the full effects tier fades
 * a plane in as the camera approaches and back out as it passes — the
 * same distance-falloff shape Station's ignite plane uses, so a
 * diagram "lights up" near its own station rather than sitting at a
 * constant, unchanging opacity the whole run. */
function PlayDiagram({
  position,
  rotationY,
  color,
  variant,
  centerZ,
  animate,
}: {
  position: [number, number, number]
  rotationY: number
  color: string
  variant: number
  /** The Z this diagram should read as "belonging to," for the
   * proximity fade -- usually the station it's paired with. */
  centerZ: number
  animate: boolean
}) {
  const texture = useMemo(() => createPlayDiagramTexture(color, variant), [color, variant])
  useEffect(() => () => texture.dispose(), [texture])
  const meshRef = useRef<Mesh>(null)
  const baseOpacity = 0.28

  useFrame(({ camera, size }) => {
    if (!animate) return
    const material = meshRef.current?.material as MeshBasicMaterial | undefined
    if (!material) return
    const standoff = BASE_STANDOFF * cameraPullback(size.width / size.height)
    const targetZ = camera.position.z - standoff
    const distance = Math.abs(targetZ - centerZ)
    const proximity = Math.max(0, 1 - distance / (STATION_GAP * 1.1))
    material.opacity = baseOpacity + proximity * 0.32
  })

  return (
    <mesh ref={meshRef} position={position} rotation={[0, rotationY, 0]}>
      <planeGeometry args={[3.4, 3.4]} />
      <meshBasicMaterial
        map={texture}
        transparent
        opacity={baseOpacity}
        toneMapped={false}
        depthWrite={false}
      />
    </mesh>
  )
}

/** Ambient background for the whole journey run — two diagram planes per
 * station under the full effects tier (one per side, ignite for the
 * winner, current for the loser), one under the reduced tier with the
 * per-frame proximity fade turned off entirely (a genuinely simpler
 * scene, not this one animated less, per SPEC.md §7.2). Positioned off
 * to the sides at a shallow angle facing back toward the camera's path,
 * clear of the central portraits so they never compete with the
 * scorecards for attention. */
function PlayDiagrams({ stations }: { stations: JourneyStation[] }) {
  const effectsTier = useEffectsTier()
  const prefersReducedMotion = useReducedMotion()
  const full = effectsTier === 'full'
  const animate = full && !prefersReducedMotion

  const diagrams = useMemo(() => {
    const items: {
      key: string
      position: [number, number, number]
      rotationY: number
      color: string
      variant: number
      centerZ: number
    }[] = []
    stations.forEach((_, i) => {
      const z = stationZ(i)
      items.push({
        key: `${i}-a`,
        position: [-6.4, 1.6, z - STATION_GAP * 0.32],
        rotationY: 0.5,
        color: '#ff5a36',
        variant: i % PLAY_DIAGRAM_VARIANT_COUNT,
        centerZ: z,
      })
      if (full) {
        items.push({
          key: `${i}-b`,
          position: [6.4, 1.9, z + STATION_GAP * 0.32],
          rotationY: -0.5,
          color: '#2ee6d6',
          variant: (i + 1) % PLAY_DIAGRAM_VARIANT_COUNT,
          centerZ: z,
        })
      }
    })
    return items
  }, [stations, full])

  return (
    <>
      {diagrams.map((d) => (
        <PlayDiagram
          key={d.key}
          position={d.position}
          rotationY={d.rotationY}
          color={d.color}
          variant={d.variant}
          centerZ={d.centerZ}
          animate={animate}
        />
      ))}
    </>
  )
}

/** The weekly journey's world (PLAN.md Phase G) — open dark fog with a
 * portrait face-off at each station and ambient play-diagram planes
 * drifting past at the sides, replacing the turf-and-tiered-stands
 * stadium the previous redesign pass kept. The stadium carried a lot of
 * hard-won tuning (falloff radii, per-instance jitter, fog-interaction
 * fixes) that a prior pass declined to touch for exactly that reason;
 * this phase's brief explicitly asks for the rebuild anyway, so it's a
 * deliberate replacement, not a casual one. The scoreboard, headline and
 * roast stay DOM text layered over the top regardless — they stay crisp,
 * selectable and readable by a screen reader that way, which no 3D
 * geometry could offer. */
export function JourneyScene({ stations }: { stations: JourneyStation[] }) {
  return (
    <group>
      <PlayDiagrams stations={stations} />

      {stations.map((station, i) => (
        <Station key={station.id} station={station} index={i} />
      ))}
    </group>
  )
}
