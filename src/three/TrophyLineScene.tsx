import { Trophy } from './Trophy'
import { SIDE_OFFSET, slotZ } from './trophyLineLayout'

const IGNITE = '#ff5a36'
const CURRENT = '#2ee6d6'
// Scaled up from Trophy.tsx's authored size (PLAN.md Phase H.5 hotfix) --
// at 1x the trophies read as too small/dark against the ink background,
// especially on a phone screen. The gap between multiple trophies in one
// slot scales with it so a 2-title slot's pair doesn't start overlapping.
const TROPHY_SCALE = 1.8
const TROPHY_GAP = 0.34 * TROPHY_SCALE

export interface TrophyLineEntry {
  playerName: string
  count: number
}

/** One champion's slot — one `<Trophy>` per title, spaced side by side
 * and centered on the slot's own X so a 2-title slot (Tejas) reads as
 * "one player, two trophies" rather than looking like two separate
 * people. A small accent point light per slot alternates ignite/current
 * along the line for some rhythm rather than every slot lighting
 * identically.
 *
 * The light sits toward +X, the same side the camera actually approaches
 * from (`SIDE_OFFSET` in trophyLineLayout.ts) -- Phase H.5's original
 * placement offset it in +Z instead, which doesn't face a side-view
 * camera at all and left the trophies relying on ambient/HDRI light
 * alone (PLAN.md Phase H.5 hotfix). */
function TrophySlot({ entry, index }: { entry: TrophyLineEntry; index: number }) {
  const z = slotZ(index)
  const trophyCount = Math.max(1, entry.count)
  const accent = index % 2 === 0 ? IGNITE : CURRENT

  return (
    <group position={[0, 0, z]}>
      {Array.from({ length: trophyCount }, (_, i) => {
        const x = (i - (trophyCount - 1) / 2) * TROPHY_GAP
        return (
          <group key={i} position={[x, 0, 0]} scale={TROPHY_SCALE}>
            <Trophy accentColor={accent} />
          </group>
        )
      })}
      <pointLight
        color={accent}
        intensity={4.5}
        distance={5.5}
        decay={2}
        position={[SIDE_OFFSET * 0.4, 1.7, 0]}
      />
    </group>
  )
}

/** The trophy line (PLAN.md Phase H.5) — one slot per distinct champion,
 * front-to-back along -Z in the exact order `playerChampionships()`
 * already sorted them in (index 0 = most championships, then career
 * wins, then career points for). Replaces `TrophyRoomScene` entirely on
 * this page: no floor, no plinths, no portrait wall, no podium — none of
 * that marble/gold "gallery" set survives here, just the line itself
 * against the canvas's own ink background (`TrophyLineCanvas.tsx`), not
 * the old scene's flat paper-white one. */
export function TrophyLineScene({ entries }: { entries: TrophyLineEntry[] }) {
  return (
    <group>
      {entries.map((entry, i) => (
        <TrophySlot key={entry.playerName} entry={entry} index={i} />
      ))}
    </group>
  )
}
