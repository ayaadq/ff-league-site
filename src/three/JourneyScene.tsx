import { Instance, Instances } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import { useMemo, useRef } from 'react'
import { Color, type Mesh, type MeshBasicMaterial, type PointLight } from 'three'
import { teamColorFor } from '../content/teamColors'
import { useEffectsTier } from '../motion/effectsTierContext'
import { useReducedMotion } from '../motion/reducedMotionContext'
import {
  BASE_STANDOFF,
  cameraPullback,
  STATION_GAP,
  stationZ,
  type JourneyStation,
} from './journeyLayout'
import { GOLD_MATERIAL_PROPS, MARBLE_MATERIAL_PROPS } from './materials'
import { Portrait } from './Portrait'

const IGNITED_GOLD = '#a6845c'

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

/** Team-color accent lighting -- see AccentLighting below. ACCENT_MIX is
 * how much of a manager's assigned hue (content/teamColors.ts) survives
 * once blended toward ACCENT_WARM_BASE: CLAUDE.md's "gold/brass is
 * decorative only, never a flood" rule, generalized from text color to
 * scene-scale lighting -- 0.35 reads as a tint the eye can attribute to
 * "this team," not a colored spotlight. ACCENT_WARM_BASE is the site's
 * one existing accent hue (GOLD_MATERIAL_PROPS' own tone), so an
 * unauthored/neutral-toned team color still lands somewhere warm rather
 * than washing out to grey.
 *
 * ACCENT_RADIUS/MAX_INTENSITY use the same distance-falloff shape as
 * IGNITE_RADIUS/MIN_INTENSITY above, but are separate constants and
 * deliberately have no intensity floor -- unlike the winner's plane
 * (which should never read as fully dark), the ambient light is meant
 * to fully fade between stations, not ember at a minimum. */
const ACCENT_WARM_BASE = '#a6845c'
const ACCENT_MIX = 0.35
const ACCENT_RADIUS = 12
const ACCENT_MAX_INTENSITY = 0.45
const ACCENT_HEIGHT = 4

/** Archway geometry -- see TunnelArches below. Half-width is wide
 * enough to clear the camera's lateral sway (currently 0.7, well under
 * this even if a future pass widens it) with room to spare; height is
 * tall enough that the camera's skycam height (CAMERA_HEIGHT scaled by
 * up to MAX_PULLBACK in JourneyCameraRig.tsx, ~7.7 at its highest)
 * passes under the lintel rather than through it. */
const ARCH_HALF_WIDTH = 4.5
const ARCH_HEIGHT = 9
const PILLAR_SIZE = 0.5
/** Archways per inter-station gap -- enough that a couple are always
 * visible ahead in the fog as the camera approaches, without the
 * instance count climbing (still two Instances draw calls total,
 * regardless of station or archway count). */
const ARCHES_PER_GAP = 3

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
 * not *a cheaper animation*. */
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
    // Recover what the camera is actually looking at (targetZ) first,
    // THEN compare each station to that -- subtracting standoff from
    // the already-taken |camera.z - z| is not the same computation and
    // was caught live producing false "distance 0" readings for a
    // station the camera was merely passing near mid-travel, not
    // dwelling at: camera.z sits standoff units on whichever side of
    // targetZ points away from the *current* target, and z can fall on
    // either side of that once you're checking a station other than
    // the one actually being approached. Recovering targetZ first
    // (camera.z always equals targetZ + standoff, by construction in
    // JourneyCameraRig's place()) sidesteps that entirely.
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

      {/* A gold seam across the floor marks where the station is, so the
          ground reads as a place rather than an empty plane. Stays
          static regardless of tier -- only the winner's plane ignites. */}
      <mesh position={[0, 0.012, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[13, 0.05]} />
        <meshBasicMaterial color={IGNITED_GOLD} toneMapped={false} opacity={0.55} transparent />
      </mesh>
    </group>
  )
}

/** A single, low point light tinted toward whichever station's winner
 * the camera currently favors -- the "team color lighting" beat of the
 * stadium plan.
 *
 * One light total, not one per station: SceneLighting already spends
 * three fills plus an HDRI (SPEC 7.2's mobile light-count budget), and a
 * discrete light per station would multiply that by the station count
 * for no visual gain, since only one station is ever the subject at a
 * time. Its position and color are rewritten every frame to sit at
 * whichever station is nearest the camera's actual look target --
 * recovered the same way Station's ignite effect does (see the comment
 * above IGNITE_RADIUS for why raw camera.z can't be compared to a
 * station's z directly), reduced here to a direct index rather than
 * scanning every station's distance since stations sit at a fixed,
 * known spacing (STATION_GAP) -- nearest index is just
 * `-targetZ / STATION_GAP`, rounded and clamped.
 *
 * Full quality tier only, same gate as ignite: reduced tier renders no
 * light at all rather than a cheaper version of this one, so the mobile
 * light count stays exactly what SceneLighting already budgets for --
 * "reduced" means no added per-frame work, not a dimmer light. */
function AccentLighting({ stations }: { stations: JourneyStation[] }) {
  const effectsTier = useEffectsTier()
  const prefersReducedMotion = useReducedMotion()
  const enabled = effectsTier === 'full' && !prefersReducedMotion && stations.length > 0
  const lightRef = useRef<PointLight>(null)

  // Cheap derived array, recomputed each render rather than memoized --
  // matching WeeklyJourney's own stations/timings, a handful of Color
  // allocations on a component re-render (props/resize), not a
  // per-frame cost.
  const accentColors = stations.map((station) =>
    new Color(teamColorFor(station.winnerUserId)).lerp(new Color(ACCENT_WARM_BASE), 1 - ACCENT_MIX),
  )

  useFrame(({ camera, size }) => {
    if (!enabled || !lightRef.current) return
    const standoff = BASE_STANDOFF * cameraPullback(size.width / size.height)
    const targetZ = camera.position.z - standoff
    const nearest = Math.min(Math.max(Math.round(-targetZ / STATION_GAP), 0), stations.length - 1)
    const nearestZ = stationZ(nearest)
    const distance = Math.abs(targetZ - nearestZ)
    const intensity = Math.max(0, 1 - distance / ACCENT_RADIUS) * ACCENT_MAX_INTENSITY
    lightRef.current.position.set(0, ACCENT_HEIGHT, nearestZ)
    lightRef.current.color.copy(accentColors[nearest])
    lightRef.current.intensity = intensity
  })

  if (!enabled) return null

  return <pointLight ref={lightRef} intensity={0} distance={STATION_GAP * 1.6} decay={2} />
}

/** Marble-and-gold archways between stations -- the "tunnel" transition,
 * built from the same shared PBR presets TrophyRoomScene and the
 * standings wall use (materials.ts), not new materials invented for
 * this. Framing rather than a modeled corridor: three freestanding
 * archways per gap, evenly spaced along the same inter-station travel
 * the camera already rides (JourneyCameraRig's piecewise place()) --
 * this adds no new camera-control path, only geometry for the existing
 * one to fly past and under.
 *
 * Two Instances groups total (pillars, lintels), matching
 * TrophyRoomScene's per-geometry-type instancing -- archway count
 * scales with station count without adding draw calls. */
function TunnelArches({ stationCount }: { stationCount: number }) {
  const archZs = useMemo(() => {
    const zs: number[] = []
    for (let gap = 0; gap < stationCount - 1; gap++) {
      const zStart = stationZ(gap)
      const zEnd = stationZ(gap + 1)
      for (let a = 1; a <= ARCHES_PER_GAP; a++) {
        const t = a / (ARCHES_PER_GAP + 1)
        zs.push(zStart + (zEnd - zStart) * t)
      }
    }
    return zs
  }, [stationCount])

  if (archZs.length === 0) return null

  return (
    <>
      <Instances limit={archZs.length * 2}>
        <boxGeometry args={[PILLAR_SIZE, ARCH_HEIGHT, PILLAR_SIZE]} />
        <meshPhysicalMaterial {...MARBLE_MATERIAL_PROPS} />
        {archZs.flatMap((z, i) => [
          <Instance key={`${i}-l`} position={[-ARCH_HALF_WIDTH, ARCH_HEIGHT / 2, z]} />,
          <Instance key={`${i}-r`} position={[ARCH_HALF_WIDTH, ARCH_HEIGHT / 2, z]} />,
        ])}
      </Instances>
      <Instances limit={archZs.length}>
        <boxGeometry args={[ARCH_HALF_WIDTH * 2 + PILLAR_SIZE, PILLAR_SIZE, PILLAR_SIZE]} />
        <meshStandardMaterial {...GOLD_MATERIAL_PROPS} />
        {archZs.map((z, i) => (
          <Instance key={i} position={[0, ARCH_HEIGHT, z]} />
        ))}
      </Instances>
    </>
  )
}

/** The weekly journey's world: a marble floor with the week's matchups
 * standing along it, lit one at a time, fading into a dark warm fog
 * rather than the bright open marble the other two scenes use --
 * SceneLighting plus MARBLE_MATERIAL_PROPS (JourneyCanvas.tsx) give the
 * floor the same lit-stone read as the rest of the site, while the
 * surrounding fog stays dark enough for WeeklyJourney's DOM text to
 * keep working. A lit floor fading into real darkness reads as its own
 * place, not just a dimmer copy of the gallery.
 *
 * Deliberately sparse otherwise. Everything here exists to give the
 * camera somewhere to travel and to put the two faces of each game in
 * front of you; the scoreboard, the headline and the roast are DOM text
 * layered over the top, where they stay crisp, selectable and readable
 * by a screen reader. */
export function JourneyScene({ stations }: { stations: JourneyStation[] }) {
  const depth = Math.max(stations.length, 1) * STATION_GAP + 40

  return (
    <group>
      {/* Floor. Runs well past the last station so the fog, not an edge,
          is what ends the world. */}
      <mesh position={[0, 0, -depth / 2 + 20]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[70, depth]} />
        <meshPhysicalMaterial {...MARBLE_MATERIAL_PROPS} roughness={0.55} />
      </mesh>

      <TunnelArches stationCount={stations.length} />
      <AccentLighting stations={stations} />

      {stations.map((station, i) => (
        <Station key={station.id} station={station} index={i} />
      ))}
    </group>
  )
}
