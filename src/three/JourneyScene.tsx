import { Instance, Instances } from '@react-three/drei'
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
import { GOLD_MATERIAL_PROPS } from './materials'
import { Portrait } from './Portrait'
import { createFieldTurfTexture, createTurfTexture } from './turfTexture'

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
 * to fully fade between stations, not ember at a minimum. */
const ACCENT_WARM_BASE = '#a6845c'
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

          Unlit (meshBasicMaterial, toneMapped false), matching the
          ignite plane/gold seam above rather than a PBR material -- not
          the original choice here (this plane originally carried a flat
          fill color, not a texture). A live screenshot check caught a
          lit meshStandardMaterial reading as barely-there: even a pure
          #ff0000 test swap rendered as a pale wash under this scene's
          soft studio HDRI + fill lights, the same lighting a diffuse
          surface has no way to opt out of. Unlit sidesteps that -- the
          yard number specifically needs to read as an unmistakable
          color carrier, not a subtly-shaded piece of ground, and the
          turf-green base is unlit for the same reason the fill it
          replaced was: one material for the whole plane, not two. */}
      <mesh position={[0, 0.01, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[FLOOR_TINT_WIDTH, FLOOR_TINT_DEPTH]} />
        <meshBasicMaterial map={turfTexture} toneMapped={false} />
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
 * Seat-blocks and fascia lips share one unlit meshBasicMaterial: the
 * team-color accent blocks need to read as saturated (the floor patch's
 * own lesson -- a lit material desaturates under this scene's HDRI/fill
 * lights regardless of input hue), and since <Instances> shares one
 * material across every instance in a group, the neutral seat blocks
 * have to be unlit too rather than splitting into a second material
 * group for a self-shading look.
 *
 * Seat-blocks additionally carry crowdTexture.ts's tileable crowd
 * pattern -- one texture, generated once, shared by every instance
 * regardless of team; team-vs-neutral coloring keeps coming from the
 * same per-instance <Instance color> already in use, which multiplies
 * against whatever the texture draws. Fascia lips and shell walls stay
 * flat (no crowd texture) -- they're trim, not seating, and the plan's
 * own ask was specifically for the seat-tier blocks. */
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
        <boxGeometry args={[1, 1, 1]} />
        <meshBasicMaterial map={crowdTexture} toneMapped={false} />
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
 * Unlit (meshBasicMaterial, matching the station patches' own material
 * choice) for the same reason as always in this file: this floor needs
 * to read as its actual green, not a lit material's desaturated take on
 * it. createFieldTurfTexture's tile repeats via RepeatWrapping rather
 * than needing a texture sized to the whole floor -- one small canvas,
 * scaled by `.repeat` to the floor's own real dimensions.
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
        <meshBasicMaterial map={fieldTexture} toneMapped={false} />
      </mesh>

      <AccentLighting stations={stations} />
      <Stands stations={stations} />

      {stations.map((station, i) => (
        <Station key={station.id} station={station} index={i} />
      ))}
    </group>
  )
}
