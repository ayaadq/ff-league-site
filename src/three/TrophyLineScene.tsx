import { CUP_BASE_Y, CUP_WIDEST_RADIUS, Podium, TrophyCup } from './Trophy'
import { SIDE_OFFSET, slotZ } from './trophyLineLayout'

const IGNITE = '#ff5a36'
const CURRENT = '#2ee6d6'
// Comfortably more than 2x CUP_WIDEST_RADIUS (0.38) so two bowls at
// full width never overlap, plus real breathing room between them
// (PLAN.md Phase H.5 hotfix #3 -- the previous pass's 0.75 gap was
// smaller than the bowl's own 0.5 radius, so a 2-cup slot's pair
// genuinely overlapped).
const CUP_GAP = Math.max(1.1, CUP_WIDEST_RADIUS * 2.4)

export interface TrophyLineEntry {
  playerName: string
  count: number
}

/** One champion's slot — exactly one `<Podium>`, with one `<TrophyCup>`
 * per title standing side by side on top of it (PLAN.md Phase H.5
 * hotfix #2). Cups are offset along *Z*, not X (PLAN.md Phase H.5
 * hotfix #3 -- the previous pass offset them along X, which is the
 * camera's own viewing axis here: `TrophyLineCameraRig.tsx` sits at a
 * fixed X and looks down -X, so an X offset foreshortens toward zero
 * separation on screen instead of actually separating two cups
 * left/right the way a Z offset does). Each cup swaps which accent is
 * dominant (`bowlColor` vs `baseColor`) relative to its neighbor, so two
 * cups on the same podium read as visually distinct trophies, not one
 * cup duplicated.
 *
 * A small accent point light per slot alternates ignite/current along
 * the line for some rhythm rather than every slot lighting identically
 * — on top of each cup's own self-illuminated material, this is extra
 * ambient spill onto the podium below it, not what makes the cups
 * themselves visible. */
function TrophySlot({ entry, index }: { entry: TrophyLineEntry; index: number }) {
  const z = slotZ(index)
  const cupCount = Math.max(1, entry.count)
  const accent = index % 2 === 0 ? IGNITE : CURRENT
  const otherAccent = accent === IGNITE ? CURRENT : IGNITE

  return (
    <group position={[0, 0, z]}>
      <Podium accentColor={accent} />
      {Array.from({ length: cupCount }, (_, i) => {
        const cupZ = (i - (cupCount - 1) / 2) * CUP_GAP
        const swapped = i % 2 === 1
        return (
          <group key={i} position={[0, CUP_BASE_Y, cupZ]}>
            <TrophyCup
              bowlColor={swapped ? otherAccent : accent}
              baseColor={swapped ? accent : otherAccent}
            />
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
