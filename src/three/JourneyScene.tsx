import { STATION_GAP, stationZ, type JourneyStation } from './journeyLayout'
import { Portrait } from './Portrait'

const DARK_FLOOR = '#0e0e10'
const IGNITED_GOLD = '#a6845c'

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

/** The weekly journey's world: a dark field with the week's matchups
 * standing along it, lit one at a time.
 *
 * Deliberately sparse. Everything here exists to give the camera
 * somewhere to travel and to put the two faces of each game in front of
 * you; the scoreboard, the headline and the roast are DOM text layered
 * over the top, where they stay crisp, selectable and readable by a
 * screen reader. */
export function JourneyScene({ stations }: { stations: JourneyStation[] }) {
  const depth = Math.max(stations.length, 1) * STATION_GAP + 40

  return (
    <group>
      {/* Floor. Runs well past the last station so the fog, not an edge,
          is what ends the world. */}
      <mesh position={[0, 0, -depth / 2 + 20]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[70, depth]} />
        <meshStandardMaterial color={DARK_FLOOR} roughness={0.92} metalness={0.05} />
      </mesh>

      {stations.map((station, i) => (
        <Station key={station.id} station={station} index={i} />
      ))}
    </group>
  )
}
