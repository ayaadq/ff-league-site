import { Instance, Instances, RoundedBoxGeometry } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import { useEffect, useMemo, useRef } from 'react'
import { Color, type Mesh, type MeshBasicMaterial, type PointLight } from 'three'
import { teamColorFor } from '../content/teamColors'
import { useEffectsTier } from '../motion/effectsTierContext'
import { useReducedMotion } from '../motion/reducedMotionContext'
import { createCrowdTexture } from './crowdTexture'
import {
  BASE_STANDOFF,
  cameraPullback,
  STATION_GAP,
  stationZ,
  type JourneyStation,
} from './journeyLayout'
import { GOLD_MATERIAL_PROPS, STAND_MATERIAL_PROPS, TURF_MATERIAL_PROPS } from './materials'
import { Portrait } from './Portrait'
import { createFieldTurfTexture, createTurfTexture } from './turfTexture'

// Redesign pass (PLAN.md Phase 13D): retinted from the old gold
// (`#a6845c`) to the new "ignite" accent. Name kept as `IGNITED_GOLD`
// rather than renamed -- it's exactly the same role (the winner's plane
// literally ignites), just a different hex now.
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

/** Team-color accent lighting -- see AccentLighting below. ACCENT_MIX is
 * how much of a manager's assigned hue (content/teamColors.ts) survives
 * once blended toward ACCENT_WARM_BASE.
 *
 * Raised from an original 0.35 after live feedback that the six
 * stadiums read as nearly identical -- a light this diluted, shining on
 * neutral marble, structurally can't carry team identity on its own
 * (light modulates a surface's existing color, it doesn't override it).
 * The real fix is the floor patch below: the *surface* is now the
 * primary color carrier, and this light is
 * explicitly a secondary/ambient contributor on top of that -- still
 * generalizing CLAUDE.md's "gold/brass is decorative only, never a
 * flood" rule, just no longer trying to make one diluted light do both
 * jobs at once.
 *
 * ACCENT_RADIUS/MAX_INTENSITY use the same distance-falloff shape as
 * IGNITE_RADIUS/MIN_INTENSITY above, but are separate constants and
 * deliberately have no intensity floor -- unlike the winner's plane
 * (which should never read as fully dark), the ambient light is meant
 * to fully fade between stations, not ember at a minimum.
 *
 * Redesign pass (PLAN.md Phase 13D): moved off the old warm-tan-gold
 * neutral (`#a6845c`) to a warm dark graphite, so the "unifying neutral"
 * twelve different team hues blend toward reads as part of this scene's
 * darker ink-era night stadium rather than carrying the old gold system's
 * warmth forward by coincidence. */
const ACCENT_WARM_BASE = '#3a3630'
const ACCENT_MIX = 0.55
const ACCENT_RADIUS = 12
const ACCENT_MAX_INTENSITY = 0.55
const ACCENT_HEIGHT = 4

/** Stadium step 1: a turf patch under each station -- the primary way a
 * stadium reads as *this* team's, surface carrying color rather than
 * light being the carrier (see ACCENT_MIX's comment above for why light
 * alone couldn't do this job). Still no new geometry category: one more
 * plane per station, same construction as the existing gold seam just
 * below it in the Station return -- what changed is the material on it
 * (turfTexture.ts's procedural canvas texture: a yard line, hash marks,
 * a team-color yard number), not the plane itself.
 *
 * Originally a flat team-color fill (FLOOR_TINT_MIX blended toward
 * ACCENT_WARM_BASE); replaced with the turf texture on later feedback
 * that a plain color rectangle didn't read as "a football field," just
 * as tinted ground. The turf stays green/neutral -- the team color now
 * lives on the yard number specifically (createTurfTexture's own
 * comment), the same way a real end zone carries team color while the
 * rest of the field stays grass, rather than tinting the whole surface.
 *
 * Sized well under STATION_GAP (15) on purpose: leaves a clear gap at
 * both ends of a station's footprint before the next station's own
 * patch begins, so the two never visually overlap. Originally sized to
 * also clear the tunnel archways that used to run through that gap --
 * removed entirely (marble columns didn't fit "running through stadium
 * turf," see the connecting floor's own comment below), but the
 * spacing itself still reads correctly without them, so it stayed
 * as-is rather than re-tuned for its own sake. */
const FLOOR_TINT_WIDTH = 16
const FLOOR_TINT_DEPTH = 11

/** Stadium step 2: tiered seating stands.
 *
 * Two straight wings flanking the field (not a closed ring) -- the
 * deliberate reading of "rounded-rectangle/oval, not circular" for this
 * pass: real straight-sided stands, distinctly not a curved track-
 * stadium bowl.
 *
 * WING_INNER_X=6 no longer has anything to clear -- it was originally
 * sized to sit just outside the tunnel archway pillars, which are gone
 * (removed for "reads as stadium turf, not a marble hallway," not
 * because of this). Kept at 6 rather than pulled in now that nothing
 * forces that value: a real change, not a leftover, would want its own
 * live visibility check the way every other framing number in this
 * file already got, not a value changed in passing while removing
 * something else.
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
/** Not the same dilution the floor patch's own team color once used
 * (a flat 0.85-diluted fill, since replaced by turfTexture.ts) -- a
 * live screenshot check (elevated diagnostic camera, panel hidden)
 * caught the stands' accent blocks reading as indistinguishable from
 * the neutral ones at that level of dilution. Root cause: JourneyCanvas's
 * scene fog (`#2B2926`, 14-58) applies to unlit meshBasicMaterial too by
 * default, and the stands sit far enough out (laterally, not just in Z)
 * that fog is already pulling both the accent and the neutral shade
 * toward the same dark tone before the eye ever gets a look at the
 * underlying hue -- the floor patch never had this problem because it
 * sits close to camera at ground level. Full team saturation, zero
 * dilution, gives the accent color the most headroom to still read as
 * distinct once fog has had its effect. SEAT_NEUTRAL was raised for the
 * same reason, away from a near-black that was already close to the fog
 * color itself even before fog -- a neutral seat block needs to read as
 * "structure," not disappear into the backdrop. */
const SEAT_ACCENT_MIX = 1
const SEAT_NEUTRAL = '#55504a'

/** Corner radius for the seat-block unit geometry (RoundedBoxGeometry
 * below is built at 1x1x1 and scaled per-instance, same as the plain
 * boxGeometry it replaces) -- 0.08 in unit space lands around 0.15-0.18
 * world units once scaled by a block's real ~2x2x1.6-2.0 dimensions,
 * enough to read as a soft edge without rounding into a pill shape.
 * Anisotropic per-instance scale stretches the fillet slightly off-
 * circular (a known simplification of rounding a shared unit geometry
 * rather than baking a separate rounded shape per block size) -- not
 * perceptible at this scene's camera distances given how close the
 * block's own depth/width/height already sit to each other. */
const SEAT_BLOCK_RADIUS = 0.08
/** Cheapest viable drei RoundedBoxGeometry settings -- smoothness
 * (curveSegments) and bevelSegments both floor at 1; going lower isn't
 * possible, going higher costs real triangles for a detail this small
 * gains nothing from (see the live triangle-count check in the stands
 * geometry's own comment below). */
const STAND_ROUNDING = { smoothness: 1, bevelSegments: 1 } as const

/** Per-block height/depth jitter, so a row of seat blocks reads as
 * individually-built bleacher units rather than one mechanically
 * repeated slab -- "row to row" variation, not a redesign of the tier
 * structure itself (TIER_BANDS already varies height/position band to
 * band; this adds the finer-grained variation *within* a band's own
 * row of WING_SEGMENTS blocks). Deterministic (seededRandom, same
 * pattern as crowdTexture.ts), not Math.random() -- reproducible across
 * reloads rather than the stands visibly reshuffling on every mount. */
function seededRandom(seed: number): () => number {
  let state = seed
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0
    return state / 4294967296
  }
}
/** +/-12% on height, +/-8% on depth -- height varies more since that's
 * the axis that actually reads as "these rows weren't poured from the
 * same mold" from the camera's mostly-lateral viewing angle; depth's
 * own variation is kept tighter since it also shifts each block's outer
 * face (see the x-position comment in seatBlocks below), and a bigger
 * swing there risked neighboring blocks visibly overlapping or gapping. */
const SEAT_HEIGHT_JITTER = 0.24
const SEAT_DEPTH_JITTER = 0.16

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
/** A thin trim strip -- 0.05 is already a third of FASCIA_DEPTH's own
 * 0.3, as far as this can go without the rounded profile eating the
 * strip's flat face entirely. drei's RoundedBoxGeometry rounds the
 * width x height cross-section and extrudes it straight along depth
 * (the third args entry), which is exactly the shape a rounded trim
 * strip needs -- FASCIA_DEPTH/FASCIA_HEIGHT get the rounded profile,
 * WING_HALF_DEPTH * 2 (the strip's actual length) stays a straight
 * extrusion. */
const FASCIA_RADIUS = 0.05
/** The bowl's outer shell -- one gold wall per wing, capping the
 * outside/top of the upper deck. Reuses GOLD_MATERIAL_PROPS as-is
 * (the archway lintels' own material, already proven to read correctly
 * under this scene's lighting -- unlike a flat team-color surface,
 * gold at moderate metalness was never the thing that washed out, so
 * there's no reason to reach for an unlit material here the way the
 * team-color surfaces below do). */
const SHELL_WIDTH = 0.4
const SHELL_HEIGHT = 2.0

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
  // Static texture, generated once per station rather than per-frame --
  // a team's assigned hue doesn't change while scrolling, unlike the
  // ignite plane above (which tracks live camera distance) or the
  // accent light (which tracks which station is nearest). Renders on
  // both quality tiers: this is plain static geometry, not a per-frame
  // effect, so there's nothing here for "reduced" to skip. Disposed on
  // unmount/re-generation -- a CanvasTexture holds onto real GPU memory
  // that useMemo alone has no way to release.
  const turfTexture = useMemo(
    () => createTurfTexture(teamColorFor(station.winnerUserId)),
    [station.winnerUserId],
  )
  useEffect(() => () => turfTexture.dispose(), [turfTexture])

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

      {/* The turf patch -- see turfTexture.ts's own comment for what's
          drawn on it and why the team color lives on the yard number
          rather than a wash across the whole surface. Sits above the
          marble floor (y=0) but below the gold seam (y=0.012) so the
          seam still reads as a distinct accent line layered on top,
          not fighting the turf for the same pixels.

          meshStandardMaterial (TURF_MATERIAL_PROPS, materials.ts) now,
          not the unlit material this plane originally shipped with -- a
          live screenshot check once found a lit material here reading as
          a pale wash (see TURF_MATERIAL_PROPS's own comment for the
          mechanism), but that turned out to be a roughness/env-intensity
          tuning problem, not a reason to avoid lighting the plane at
          all: high roughness plus a deliberately low envMapIntensity
          keeps the diffuse albedo dominant over the reflected
          environment, which is what makes this safe to light without
          repeating the original wash. Lighting this plane is what makes
          the stadium floor respond to the same HDRI the marble gallery
          already does, instead of reading as a flat sticker next to it. */}
      <mesh position={[0, 0.01, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[FLOOR_TINT_WIDTH, FLOOR_TINT_DEPTH]} />
        <meshStandardMaterial map={turfTexture} {...TURF_MATERIAL_PROPS} />
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

/** Full quality tier's tiered stands -- three Instances groups total
 * (seat-blocks, fascia lips, shell walls), regardless of station count:
 * one shared geometry per group, instanced per station/band/wing/
 * segment rather than unique meshes.
 *
 * All three groups are lit now (meshStandardMaterial: seat-blocks/fascia
 * use STAND_MATERIAL_PROPS, shell walls reuse GOLD_MATERIAL_PROPS as
 * before). Seat-blocks and fascia lips previously stayed unlit
 * specifically to protect the team-color accent's saturation -- the same
 * "lit material desaturates under this scene's HDRI/fill lights" problem
 * TURF_MATERIAL_PROPS's own comment describes for the floor patch -- but
 * that turned out to be a roughness/envMapIntensity tuning problem, not
 * a reason to avoid lighting altogether. STAND_MATERIAL_PROPS's high
 * roughness and modest envMapIntensity keep the accent color's albedo
 * dominant the same way turf's fix does, so the stands now shade under
 * the scene's HDRI like everything else in the gallery instead of
 * reading as a flat cutout next to it. (Since <Instances> shares one
 * material across every instance in a group, this applies to the
 * neutral seat blocks too, not just the accent ones -- there's no way to
 * light only some instances in a group.)
 *
 * Seat-blocks additionally carry crowdTexture.ts's tileable crowd
 * pattern -- one texture, generated once, shared by every instance
 * regardless of team; team-vs-neutral coloring keeps coming from the
 * same per-instance <Instance color> already in use, which multiplies
 * against whatever the texture draws. Tried reusing the same texture as
 * a roughnessMap too (free per-pixel shine variation, no extra asset) --
 * live-caught as a real regression, not a subtle improvement: the
 * texture's SHADOW dots have a *higher* green channel ratio than their
 * surrounding BASE tone relative to roughness's own scale, which made
 * the shadow dots read as glossier than their surroundings instead of
 * duller, picking up hard dark environment reflections and reading as
 * harsh black blobs rather than a soft fleck. Dropped -- map (color)
 * only. Fascia lips and shell walls stay flat-colored (no crowd
 * texture) -- they're trim, not seating, and the plan's own ask was
 * specifically for the seat-tier blocks.
 *
 * Seat-blocks and fascia use drei's RoundedBoxGeometry (SEAT_BLOCK_RADIUS/
 * FASCIA_RADIUS, STAND_ROUNDING) instead of boxGeometry -- softer edges
 * to match the marble gallery's own rounded corner-radius language
 * (materials.ts's gallery-card/gold-frame treatments), not a hard-edged
 * slab. Shell walls stay boxGeometry -- unlike seat-blocks/fascia, they
 * were never part of this rounding pass. Checked, not assumed: a plain
 * box is 12 triangles; drei's RoundedBoxGeometry (an ExtrudeGeometry
 * bevel sweep under the hood) costs real triangles even at its cheapest
 * settings, and STAND_ROUNDING's smoothness=1/bevelSegments=1 floor was
 * picked specifically because it's the cheapest option that still reads
 * as rounded rather than chamfered (bevelSegments=0 was visibly flatter
 * live). At smoothness=1/bevelSegments=1 that's 140 triangles/instance --
 * for this file's own instance counts (144 seat-blocks + 36 fascia lips
 * at 6 stations), full tier's stands total goes from 2,160 triangles
 * (plain boxes) to 25,200 (rounded), and reduced tier's 12-band total
 * goes from 144 to 1,680. Both stay well inside SPEC.md §7.2's budget in
 * absolute terms -- the section has no hard triangle ceiling, only "keep
 * draw calls low" (draw calls are unchanged either way, one per
 * Instances group regardless of the shared geometry's own triangle
 * count) and a >=30fps mid-range-mobile floor, and reduced tier's total
 * stays in the low thousands regardless, nowhere near where triangle
 * count alone would threaten that floor on any device from the last
 * several years. */
function FullStands({ stations }: { stations: JourneyStation[] }) {
  const stationCount = stations.length
  const seatColors = stations.map((station) =>
    new Color(teamColorFor(station.winnerUserId)).lerp(
      new Color(ACCENT_WARM_BASE),
      1 - SEAT_ACCENT_MIX,
    ),
  )

  // Every memo below keys off stationCount (a primitive), not `stations`
  // itself, so layout is only ever recomputed when the number of
  // stations changes, never when team identity does (seatColors, read
  // separately at render time, handles that instead).
  const seatBlocks = useMemo(() => {
    const items: {
      position: [number, number, number]
      scale: [number, number, number]
      accent: boolean
      stationIndex: number
    }[] = []
    // One PRNG per stands build, walked in the same fixed iteration
    // order as the loop below -- not reseeded per block (a per-block
    // seed derived from the loop indices would work too, but this reads
    // simpler and is just as deterministic/reproducible given the loop
    // order never changes for a given stationCount).
    const jitter = seededRandom(20260917)
    for (let stationIndex = 0; stationIndex < stationCount; stationIndex++) {
      const z0 = stationZ(stationIndex)
      TIER_BANDS.forEach((band) => {
        for (const wingSign of [1, -1] as const) {
          for (let j = 0; j < WING_SEGMENTS; j++) {
            const t = (j + 0.5) / WING_SEGMENTS
            const z = z0 - WING_HALF_DEPTH + 2 * WING_HALF_DEPTH * t
            // Height varies around the band's own height, depth around
            // SEAT_BLOCK_DEPTH -- see SEAT_HEIGHT_JITTER/SEAT_DEPTH_JITTER's
            // own comment for why the two get different ranges.
            const height = band.height * (1 + (jitter() - 0.5) * SEAT_HEIGHT_JITTER)
            const depth = SEAT_BLOCK_DEPTH * (1 + (jitter() - 0.5) * SEAT_DEPTH_JITTER)
            // x keeps each block's *inner* face flush with the tier's own
            // inner boundary (band.xOffset) regardless of its jittered
            // depth, so neighboring bands never lose their gap -- only
            // the outer face (away from the field) moves with the
            // jitter, same as height only ever grows a block upward from
            // the row's shared floor (band.yBase), never down through it.
            const x = wingSign * (WING_INNER_X + band.xOffset + depth / 2)
            items.push({
              position: [x, band.yBase + height / 2, z],
              scale: [depth, height, SEAT_BLOCK_WIDTH],
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

  // Generated once (empty deps -- colorless, so nothing about a
  // specific station or team ever invalidates it) and reused for every
  // seat-block instance regardless of station count.
  //
  // repeat(1, 1), not tiled several times across each block -- a live
  // screenshot comparison at realistic viewing distance (not the macro
  // diagnostic camera used to first check the pattern rendered at all)
  // found the dots reading as flat solid color, same underlying cause
  // as crowdTexture.ts's own dot-size fix: more repeats means a smaller
  // apparent world size per tile, which was already the problem at the
  // texture's old dot scale and stayed the problem at the new one until
  // this also came down. One tile per block face is the least dilution
  // the fix could ask for.
  const crowdTexture = useMemo(() => {
    const texture = createCrowdTexture()
    texture.repeat.set(1, 1)
    return texture
  }, [])
  useEffect(() => () => crowdTexture.dispose(), [crowdTexture])

  return (
    <>
      <Instances limit={seatBlocks.length}>
        <RoundedBoxGeometry args={[1, 1, 1]} radius={SEAT_BLOCK_RADIUS} {...STAND_ROUNDING} />
        <meshStandardMaterial map={crowdTexture} {...STAND_MATERIAL_PROPS} />
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
        <RoundedBoxGeometry
          args={[FASCIA_DEPTH, FASCIA_HEIGHT, WING_HALF_DEPTH * 2]}
          radius={FASCIA_RADIUS}
          {...STAND_ROUNDING}
        />
        <meshStandardMaterial {...STAND_MATERIAL_PROPS} />
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
/** Real dimensions, not a unit geometry -- same radius scale as
 * SEAT_BLOCK_RADIUS's own *world-space* target (~0.15-0.18) rather than
 * its unit-space 0.08, since this band's geometry bakes in its actual
 * size directly (no per-instance scale to translate through). */
const SIMPLE_BAND_RADIUS = 0.16

/** Reduced quality tier's stands -- one Instances group, one flat band
 * per wing per station (12 instances total regardless of station
 * count), no tiers, no fascia/shell trim, no accent patterning. Still
 * team-colored (uniformly, the whole band) rather than dropped
 * entirely -- "reduced" cuts the geometry that costs triangles/draw
 * calls, not the color identity that was this whole stadium pass's
 * actual point.
 *
 * Lit (STAND_MATERIAL_PROPS), matching the full tier's stands -- this
 * tier already renders far fewer instances (12 total, vs. the full
 * tier's per-station-and-band count), so a lit material's fragment cost
 * isn't the budget concern reduced tier exists to manage; keeping the
 * same material keeps the two tiers visually continuous with each other
 * rather than one shading under the HDRI and the other not. */
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
      <RoundedBoxGeometry
        args={[SIMPLE_BAND_DEPTH, SIMPLE_BAND_HEIGHT, WING_HALF_DEPTH * 2]}
        radius={SIMPLE_BAND_RADIUS}
        {...STAND_ROUNDING}
      />
      <meshStandardMaterial {...STAND_MATERIAL_PROPS} />
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

/** How many world units one tile of the connecting floor's turf texture
 * covers -- matched to FLOOR_TINT_WIDTH so the connecting floor's
 * mowing-stripe scale roughly agrees with each station's own featured
 * patch, not a coincidence of two independently-picked numbers. */
const FIELD_TILE_WORLD_SIZE = FLOOR_TINT_WIDTH

/** The weekly journey's world: turf underfoot the whole way through,
 * not just at each station, fading into a dark warm fog rather than
 * the bright open marble the other two scenes use.
 *
 * Originally a marble floor (MARBLE_MATERIAL_PROPS, materials.ts) with
 * columned archways marking the gaps between stations -- replaced on
 * later direction wanting the connecting run to read as stadium turf
 * end to end, not a marble hallway linking football pockets. The
 * archways (TunnelArches) are gone entirely, not just retuned again;
 * nothing else in the file depended on them (checked before removing,
 * not assumed) -- the GOTW camera-tightening path, the camera rig's own
 * clearance math, and the stands' own positioning are all independent
 * of archway geometry. The one real trade named at the time: this gives
 * up the archway's role as visual continuity with the rest of the
 * site's marble/gold identity. Each station's own gold seam (Station's
 * return, below) still carries a thread of that, but it's a real
 * trade, not a free one.
 *
 * Lit (meshStandardMaterial, TURF_MATERIAL_PROPS), matching the station
 * patches' own material now -- both were originally unlit for the same
 * "reads as its actual green, not a lit material's desaturated take on
 * it" reason, and both moved to the same tuned lit material for the same
 * fix (TURF_MATERIAL_PROPS's own comment). createFieldTurfTexture's tile
 * repeats via RepeatWrapping rather than needing a texture sized to the
 * whole floor -- one small canvas, scaled by `.repeat` to the floor's
 * own real dimensions.
 *
 * A real stadium bowl (Stands, stadium step 2) rings each station now,
 * but the scoreboard, the headline and the roast stay DOM text layered
 * over the top rather than any of this geometry -- they stay crisp,
 * selectable and readable by a screen reader that way, which nothing
 * built from boxGeometry could offer. */
export function JourneyScene({ stations }: { stations: JourneyStation[] }) {
  const depth = Math.max(stations.length, 1) * STATION_GAP + 40

  const fieldTexture = useMemo(() => {
    const texture = createFieldTurfTexture()
    texture.repeat.set(70 / FIELD_TILE_WORLD_SIZE, depth / FIELD_TILE_WORLD_SIZE)
    return texture
  }, [depth])
  useEffect(() => () => fieldTexture.dispose(), [fieldTexture])

  return (
    <group>
      {/* Floor. Runs well past the last station so the fog, not an edge,
          is what ends the world. */}
      <mesh position={[0, 0, -depth / 2 + 20]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[70, depth]} />
        <meshStandardMaterial map={fieldTexture} {...TURF_MATERIAL_PROPS} />
      </mesh>

      <AccentLighting stations={stations} />
      <Stands stations={stations} />

      {stations.map((station, i) => (
        <Station key={station.id} station={station} index={i} />
      ))}
    </group>
  )
}
