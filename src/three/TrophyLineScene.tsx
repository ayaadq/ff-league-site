import { CUP_BASE_Y, Podium, TrophyCup } from './Trophy'
import { SIDE_OFFSET, slotZ } from './trophyLineLayout'

const IGNITE = '#ff5a36'
const CURRENT = '#2ee6d6'
// Spacing between multiple cups on the same podium — wide enough that a
// 2-cup slot's pair doesn't overlap at TrophyCup's own footprint
// (Trophy.tsx's CUP_FOOT_RADIUS * 1.15 ≈ 0.23 each side).
const CUP_GAP = 0.75

export interface TrophyLineEntry {
  playerName: string
  count: number
}

/** One champion's slot — exactly one `<Podium>`, with one `<TrophyCup>`
 * per title standing side by side on top of it (PLAN.md Phase H.5
 * hotfix #2, replacing the previous pass's design: a 2-title slot used
 * to render two entire self-contained trophies, each with its own
 * pedestal, which looked like two separate podiums rather than one
 * player's two titles). A small accent point light per slot alternates
 * ignite/current along the line for some rhythm rather than every slot
 * lighting identically — on top of each cup's own self-illuminated
 * material, this is extra ambient spill onto the podium below it, not
 * what makes the cups themselves visible. */
function TrophySlot({ entry, index }: { entry: TrophyLineEntry; index: number }) {
  const z = slotZ(index)
  const cupCount = Math.max(1, entry.count)
  const accent = index % 2 === 0 ? IGNITE : CURRENT

  return (
    <group position={[0, 0, z]}>
      <Podium accentColor={accent} />
      {Array.from({ length: cupCount }, (_, i) => {
        const x = (i - (cupCount - 1) / 2) * CUP_GAP
        return (
          <group key={i} position={[x, CUP_BASE_Y, 0]}>
            <TrophyCup accentColor={accent} />
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
