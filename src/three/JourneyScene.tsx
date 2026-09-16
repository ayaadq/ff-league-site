import { Instance, Instances } from '@react-three/drei'
import { useMemo } from 'react'
import { STATION_GAP, stationZ, type JourneyStation } from './journeyLayout'
import { GOLD_MATERIAL_PROPS, MARBLE_MATERIAL_PROPS } from './materials'
import { Portrait } from './Portrait'

const IGNITED_GOLD = '#a6845c'

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
 * put beneath the other. */
function Station({ station, index }: { station: JourneyStation; index: number }) {
  const z = stationZ(index)
  return (
    <group position={[0, 0, z]}>
      {/* Winner: a gold plane behind the portrait, emissive so it glows
          without costing a light. Six real lights, one per station, would
          blow the mobile budget in SPEC 7.2 on their own. */}
      <mesh position={[-2.7, 2.35, -0.09]}>
        <planeGeometry args={[1.22, 1.48]} />
        <meshBasicMaterial color={IGNITED_GOLD} toneMapped={false} />
      </mesh>
      <Portrait avatarId={station.winnerAvatarId} position={[-2.7, 2.35, 0]} rotationY={0.13} />

      <Portrait avatarId={station.loserAvatarId} position={[2.7, 2.35, 0]} rotationY={-0.13} />

      {/* A gold seam across the floor marks where the station is, so the
          ground reads as a place rather than an empty plane. */}
      <mesh position={[0, 0.012, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[13, 0.05]} />
        <meshBasicMaterial color={IGNITED_GOLD} toneMapped={false} opacity={0.55} transparent />
      </mesh>
    </group>
  )
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

      {stations.map((station, i) => (
        <Station key={station.id} station={station} index={i} />
      ))}
    </group>
  )
}
