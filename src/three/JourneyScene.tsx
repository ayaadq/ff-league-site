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
 * once blended toward ACCENT_WARM_BASE.
 *
 * Raised from an original 0.35 after live feedback that the six
 * stadiums read as nearly identical -- a light this diluted, shining on
 * neutral marble, structurally can't carry team identity on its own
 * (light modulates a surface's existing color, it doesn't override it).
 * The real fix is FLOOR_TINT_MIX below: the *surface* is now the
 * primary color carrier, at far less dilution, and this light is
 * explicitly a secondary/ambient contributor on top of that -- still
 * generalizing CLAUDE.md's "gold/brass is decorative only, never a
 * flood" rule, just no longer trying to make one diluted light do both
 * jobs at once.
 *
 * ACCENT_RADIUS/MAX_INTENSITY use the same distance-falloff shape as
 * IGNITE_RADIUS/MIN_INTENSITY above, but are separate constants and
 * deliberately have no intensity floor -- unlike the winner's plane
 * (which should never read as fully dark), the ambient light is meant
 * to fully fade between stations, not ember at a minimum. */
const ACCENT_WARM_BASE = '#a6845c'
const ACCENT_MIX = 0.55
const ACCENT_RADIUS = 12
const ACCENT_MAX_INTENSITY = 0.55
const ACCENT_HEIGHT = 4

/** Stadium step 1: a saturated team-color floor patch under each
 * station -- the primary way a stadium now reads as *this* team's,
 * surface color rather than light being the carrier (see ACCENT_MIX's
 * comment above for why light alone couldn't do this job). Still no
 * new geometry category: one more plane per station, same construction
 * as the existing gold seam just below it in the Station return.
 *
 * FLOOR_TINT_MIX stays far less diluted than the light's own
 * ACCENT_MIX -- 0.85 keeps the team's assigned hue clearly dominant,
 * with only a whisper of ACCENT_WARM_BASE blended in so a cooler
 * fallback color (blues, violets in content/teamColors.ts's fallback
 * palette) doesn't read as a jarring, uncomposited hex against the warm
 * marble everywhere else on the site.
 *
 * Sized well under STATION_GAP (15) on purpose: leaves clearance at
 * both ends of a station's footprint for the tunnel archways, which
 * still span the *whole* inter-station gap today -- narrowing that
 * span to match is tracked as a later tuning pass (stadium step 3),
 * not done here, since this step is scoped to color only, no other
 * geometry changes. */
const FLOOR_TINT_WIDTH = 16
const FLOOR_TINT_DEPTH = 11
const FLOOR_TINT_MIX = 0.85

/** Stadium step 2: tiered seating stands.
 *
 * Two straight wings flanking the field (not a closed ring) -- the
 * deliberate reading of "rounded-rectangle/oval, not circular" for this
 * pass: real straight-sided stands, distinctly not a curved track-
 * stadium bowl, and it leaves both ends of a station's footprint clear
 * for the tunnel archways exactly the way FLOOR_TINT_DEPTH already does
 * (see its own comment). WING_INNER_X starts outside the archway
 * pillars (ARCH_HALF_WIDTH=4.5 plus PILLAR_SIZE) with real clearance,
 * so stand geometry can never collide with the tunnel's.
 *
 * Three stacked TIER_BANDS -- lower bowl, mezzanine, upper deck -- each
 * stepped back in X *and* up in Y from the one below, with a real gap
 * in both axes (not just a Y offset) so the step-back actually reads
 * from the camera's angle rather than the bands visually merging into
 * one taller slab. */
const WING_INNER_X = 6
const WING_HALF_DEPTH = 5
const WING_SEGMENTS = 4
const SEAT_BLOCK_DEPTH = 2.2
const SEAT_BLOCK_WIDTH = 2.0
/** Which of the WING_SEGMENTS blocks per wing carries the team-color
 * accent -- index 1 of 4, biased toward the station's own center
 * (segment centers run from the wing's far edge toward the middle, so
 * a low index sits nearer the portraits, where the camera is actually
 * looking) rather than the far end, which spends more of its time
 * fading into fog. One accent block per wing per band = 2 of 8 total
 * per band, 25% -- inside the 20-30% target, in a deliberate
 * "accent column near the action" pattern rather than a random
 * per-instance scatter. */
const ACCENT_SEGMENT_INDEX = 1
/** Not FLOOR_TINT_MIX -- a live screenshot check (elevated diagnostic
 * camera, panel hidden) caught the accent blocks reading as
 * indistinguishable from the neutral ones at FLOOR_TINT_MIX's 0.85
 * dilution. Root cause: JourneyCanvas's scene fog (`#2B2926`, 14-58)
 * applies to unlit meshBasicMaterial too by default, and the stands
 * sit far enough out (laterally, not just in Z) that fog is already
 * pulling both the accent and the neutral shade toward the same dark
 * tone before the eye ever gets a look at the underlying hue -- the
 * floor patch never had this problem because it sits close to camera
 * at ground level. Full team saturation, zero dilution, gives the
 * accent color the most headroom to still read as distinct once fog
 * has had its effect. SEAT_NEUTRAL was raised for the same reason,
 * away from a near-black that was already close to the fog color
 * itself even before fog -- a neutral seat block needs to read as
 * "structure," not disappear into the backdrop. */
const SEAT_ACCENT_MIX = 1
const SEAT_NEUTRAL = '#55504a'

interface TierBand {
  yBase: number
  xOffset: number
  height: number
}
/** xOffset increases by more than SEAT_BLOCK_DEPTH each step (2.5 vs
 * 2.2) so each band's X range clears the one below it with a real gap,
 * not just an abutting edge -- paired with the yBase gaps below (each
 * band's top sits 0.5 short of the next band's bottom), the step-back
 * is visible on both axes the camera can actually perceive it on. */
const TIER_BANDS: TierBand[] = [
  { yBase: 0.3, xOffset: 0, height: 2.0 },
  { yBase: 2.8, xOffset: 2.5, height: 1.8 },
  { yBase: 5.1, xOffset: 5.0, height: 1.6 },
]

const FASCIA_HEIGHT = 0.35
const FASCIA_DEPTH = 0.3
/** The bowl's outer shell -- one gold wall per wing, capping the
 * outside/top of the upper deck. Reuses GOLD_MATERIAL_PROPS as-is
 * (the archway lintels' own material, already proven to read correctly
 * under this scene's lighting -- unlike FLOOR_TINT_MIX's surface color,
 * gold at moderate metalness was never the thing that washed out, so
 * there's no reason to reach for an unlit material here the way the
 * team-color surfaces below do). */
const SHELL_WIDTH = 0.4
const SHELL_HEIGHT = 2.0

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

/** Compressed into a shorter middle segment of each gap rather than
 * spread across the whole thing -- mis-filed as cosmetic polish back in
 * stadium step 1, corrected here once step 2's stands (WING_HALF_DEPTH
 * below) proved it wasn't cosmetic: at the old even 0..1 spacing, three
 * archway pillars all sitting at the same X, stacked along the camera's
 * near-axial view down the Z corridor, collapsed by perspective into
 * something close to a solid wall -- occluding almost the entire bowl
 * on both sides, confirmed live, not assumed. 0.35..0.65 leaves the
 * outer ~35% of each gap on both ends clear, just past where
 * WING_HALF_DEPTH (0.333 of STATION_GAP) already ends, so pillars never
 * enter a station's own footprint and never block the sightline to it
 * either -- a real "tunnel" hub in the middle of each gap, open stadium
 * on both ends, rather than pillars smeared across the whole span. */
const ARCH_ZONE_START = 0.35
const ARCH_ZONE_END = 0.65

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
  // Static color, computed once per station rather than per-frame -- a
  // team's assigned hue doesn't change while scrolling, unlike the
  // ignite plane above (which tracks live camera distance) or the
  // accent light (which tracks which station is nearest). Renders on
  // both quality tiers: this is plain static geometry, not a per-frame
  // effect, so there's nothing here for "reduced" to skip.
  const floorTintColor = useMemo(
    () =>
      new Color(teamColorFor(station.winnerUserId)).lerp(
        new Color(ACCENT_WARM_BASE),
        1 - FLOOR_TINT_MIX,
      ),
    [station.winnerUserId],
  )

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

      {/* The team-color floor patch -- see FLOOR_TINT_MIX's own comment.
          Sits above the marble floor (y=0) but below the gold seam
          (y=0.012) so the seam still reads as a distinct accent line
          layered on top of the tint, not fighting it for the same
          pixels.

          Unlit (meshBasicMaterial, toneMapped false), matching the
          ignite plane/gold seam above rather than a PBR material -- not
          the original choice here. A live screenshot check caught a lit
          meshStandardMaterial reading as barely-there: even a pure
          #ff0000 test swap (bypassing FLOOR_TINT_MIX entirely) rendered
          as a pale wash under this scene's soft studio HDRI + fill
          lights, the same lighting a diffuse surface has no way to
          opt out of. Unlit sidesteps that -- the whole point of this
          patch is to be the primary, unmistakable color carrier the
          plan called for, not a subtly-shaded piece of ground. */}
      <mesh position={[0, 0.01, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[FLOOR_TINT_WIDTH, FLOOR_TINT_DEPTH]} />
        <meshBasicMaterial color={floorTintColor} toneMapped={false} />
      </mesh>

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
        const localT = a / (ARCHES_PER_GAP + 1)
        const t = ARCH_ZONE_START + (ARCH_ZONE_END - ARCH_ZONE_START) * localT
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

/** Full quality tier's tiered stands -- three Instances groups total
 * (seat-blocks, fascia lips, shell walls), regardless of station count,
 * same discipline as TunnelArches: one shared geometry per group,
 * instanced per station/band/wing/segment rather than unique meshes.
 *
 * Seat-blocks and fascia lips share one unlit meshBasicMaterial: the
 * team-color accent blocks need to read as saturated (FLOOR_TINT_MIX's
 * own lesson -- a lit material desaturates under this scene's HDRI/fill
 * lights regardless of input hue), and since <Instances> shares one
 * material across every instance in a group, the neutral seat blocks
 * have to be unlit too rather than splitting into a second material
 * group for a self-shading look. A flat dark unlit block reads fine as
 * "seating structure" without needing PBR shading to sell it -- unlike
 * the team-color surfaces, there was nothing this material choice
 * needed to fight to be visible. */
function FullStands({ stations }: { stations: JourneyStation[] }) {
  const stationCount = stations.length
  const seatColors = stations.map((station) =>
    new Color(teamColorFor(station.winnerUserId)).lerp(
      new Color(ACCENT_WARM_BASE),
      1 - SEAT_ACCENT_MIX,
    ),
  )

  // Every memo below keys off stationCount (a primitive), not `stations`
  // itself -- matching TunnelArches' own archZs -- so layout is only
  // ever recomputed when the number of stations changes, never when
  // team identity does (seatColors, read separately at render time,
  // handles that instead).
  const seatBlocks = useMemo(() => {
    const items: {
      position: [number, number, number]
      scale: [number, number, number]
      accent: boolean
      stationIndex: number
    }[] = []
    for (let stationIndex = 0; stationIndex < stationCount; stationIndex++) {
      const z0 = stationZ(stationIndex)
      TIER_BANDS.forEach((band) => {
        for (const wingSign of [1, -1] as const) {
          for (let j = 0; j < WING_SEGMENTS; j++) {
            const t = (j + 0.5) / WING_SEGMENTS
            const z = z0 - WING_HALF_DEPTH + 2 * WING_HALF_DEPTH * t
            const x = wingSign * (WING_INNER_X + band.xOffset + SEAT_BLOCK_DEPTH / 2)
            items.push({
              position: [x, band.yBase + band.height / 2, z],
              scale: [SEAT_BLOCK_DEPTH, band.height, SEAT_BLOCK_WIDTH],
              accent: j === ACCENT_SEGMENT_INDEX,
              stationIndex,
            })
          }
        }
      })
    }
    return items
  }, [stationCount])

  const fasciaLips = useMemo(() => {
    const items: { position: [number, number, number]; stationIndex: number }[] = []
    for (let stationIndex = 0; stationIndex < stationCount; stationIndex++) {
      const z0 = stationZ(stationIndex)
      TIER_BANDS.forEach((band) => {
        for (const wingSign of [1, -1] as const) {
          items.push({
            position: [wingSign * (WING_INNER_X + band.xOffset), band.yBase, z0],
            stationIndex,
          })
        }
      })
    }
    return items
  }, [stationCount])

  const shellWalls = useMemo(() => {
    const topBand = TIER_BANDS[TIER_BANDS.length - 1]
    const items: { position: [number, number, number] }[] = []
    for (let stationIndex = 0; stationIndex < stationCount; stationIndex++) {
      const z0 = stationZ(stationIndex)
      const x = WING_INNER_X + topBand.xOffset + SEAT_BLOCK_DEPTH + SHELL_WIDTH / 2 + 0.1
      for (const wingSign of [1, -1] as const) {
        items.push({
          position: [wingSign * x, topBand.yBase + topBand.height + SHELL_HEIGHT / 2, z0],
        })
      }
    }
    return items
  }, [stationCount])

  return (
    <>
      <Instances limit={seatBlocks.length}>
        <boxGeometry args={[1, 1, 1]} />
        <meshBasicMaterial toneMapped={false} />
        {seatBlocks.map((block, i) => (
          <Instance
            key={i}
            position={block.position}
            scale={block.scale}
            color={block.accent ? seatColors[block.stationIndex] : SEAT_NEUTRAL}
          />
        ))}
      </Instances>
      <Instances limit={fasciaLips.length}>
        <boxGeometry args={[FASCIA_DEPTH, FASCIA_HEIGHT, WING_HALF_DEPTH * 2]} />
        <meshBasicMaterial toneMapped={false} />
        {fasciaLips.map((lip, i) => (
          <Instance key={i} position={lip.position} color={seatColors[lip.stationIndex]} />
        ))}
      </Instances>
      <Instances limit={shellWalls.length}>
        <boxGeometry args={[SHELL_WIDTH, SHELL_HEIGHT, WING_HALF_DEPTH * 2]} />
        <meshStandardMaterial {...GOLD_MATERIAL_PROPS} />
        {shellWalls.map((wall, i) => (
          <Instance key={i} position={wall.position} />
        ))}
      </Instances>
    </>
  )
}

const SIMPLE_BAND_HEIGHT = 2.4
const SIMPLE_BAND_DEPTH = 2.5

/** Reduced quality tier's stands -- one Instances group, one flat band
 * per wing per station (12 instances total regardless of station
 * count), no tiers, no fascia/shell trim, no accent patterning. Still
 * team-colored (uniformly, the whole band) rather than dropped
 * entirely -- "reduced" cuts the geometry that costs triangles/draw
 * calls, not the color identity that was this whole stadium pass's
 * actual point. */
function SimpleStands({ stations }: { stations: JourneyStation[] }) {
  const stationCount = stations.length
  const seatColors = stations.map((station) =>
    new Color(teamColorFor(station.winnerUserId)).lerp(
      new Color(ACCENT_WARM_BASE),
      1 - SEAT_ACCENT_MIX,
    ),
  )

  const bands = useMemo(() => {
    const items: { position: [number, number, number]; stationIndex: number }[] = []
    for (let stationIndex = 0; stationIndex < stationCount; stationIndex++) {
      const z0 = stationZ(stationIndex)
      for (const wingSign of [1, -1] as const) {
        items.push({
          position: [wingSign * (WING_INNER_X + SIMPLE_BAND_DEPTH / 2), SIMPLE_BAND_HEIGHT / 2, z0],
          stationIndex,
        })
      }
    }
    return items
  }, [stationCount])

  return (
    <Instances limit={bands.length}>
      <boxGeometry args={[SIMPLE_BAND_DEPTH, SIMPLE_BAND_HEIGHT, WING_HALF_DEPTH * 2]} />
      <meshBasicMaterial toneMapped={false} />
      {bands.map((band, i) => (
        <Instance key={i} position={band.position} color={seatColors[band.stationIndex]} />
      ))}
    </Instances>
  )
}

/** Picks the tier's stands variant once, rather than tier-conditionals
 * sprinkled through one component's JSX (the stadium plan's own
 * architecture call) -- FullStands and SimpleStands build genuinely
 * different geometry, not the same geometry with animation toggled,
 * the first place in this file where the quality tier decides what
 * gets built at all rather than just what gets updated per frame.
 * Reduced tier only -- not gated on prefers-reduced-motion, since this
 * is static geometry with no per-frame work either variant does; that
 * axis is orthogonal to which stands variant renders. */
function Stands({ stations }: { stations: JourneyStation[] }) {
  const effectsTier = useEffectsTier()
  return effectsTier === 'full' ? (
    <FullStands stations={stations} />
  ) : (
    <SimpleStands stations={stations} />
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
 * A real stadium bowl (Stands, stadium step 2) rings each station now,
 * but the scoreboard, the headline and the roast stay DOM text layered
 * over the top rather than any of this geometry -- they stay crisp,
 * selectable and readable by a screen reader that way, which nothing
 * built from boxGeometry could offer. */
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
      <Stands stations={stations} />

      {stations.map((station, i) => (
        <Station key={station.id} station={station} index={i} />
      ))}
    </group>
  )
}
