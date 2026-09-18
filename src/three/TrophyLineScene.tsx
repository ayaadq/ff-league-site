import { medalMaterialAt } from './medalMaterials'
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
 * left/right the way a Z offset does).
 *
 * Each cup gets a realistic metal (`medalMaterialAt`, gold/silver/bronze,
 * PLAN.md Phase H.5 hotfix #5 — replacing the previous hotfix's solid
 * ignite/current colors, which read as neon rather than championship
 * hardware) by rank across the *global* running cup count
 * (`cupIndexOffset`, passed in from `TrophyLineScene` below), not this
 * slot's own index — a 2-cup slot's pair get two distinct medal tones,
 * and the ranking carries on seamlessly into the next slot's cup(s)
 * rather than resetting per slot.
 *
 * The podium's own glow/point light still key off this slot's own index
 * (not the running cup count) for ignite/current rhythm along the line —
 * that's ambient spill onto the marble podium, a separate decorative
 * choice from the cups' own now-metallic color. */
function TrophySlot({
  entry,
  index,
  cupIndexOffset,
}: {
  entry: TrophyLineEntry
  index: number
  cupIndexOffset: number
}) {
  const z = slotZ(index)
  const cupCount = Math.max(1, entry.count)
  const podiumAccent = index % 2 === 0 ? IGNITE : CURRENT

  return (
    <group position={[0, 0, z]}>
      <Podium accentColor={podiumAccent} />
      {Array.from({ length: cupCount }, (_, i) => {
        const cupZ = (i - (cupCount - 1) / 2) * CUP_GAP
        return (
          <group key={i} position={[0, CUP_BASE_Y, cupZ]}>
            <TrophyCup material={medalMaterialAt(cupIndexOffset + i)} />
          </group>
        )
      })}
      <pointLight
        color={podiumAccent}
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
  // Each slot's starting position in the global cup sequence -- computed
  // as a fresh array rather than a mutable running counter inside the
  // render/map below, which oxlint's immutability rule (correctly) flags
  // as unsafe to reassign after render.
  const cupIndexOffsets = entries.reduce<number[]>((offsets, _entry, i) => {
    offsets.push(i === 0 ? 0 : offsets[i - 1] + Math.max(1, entries[i - 1].count))
    return offsets
  }, [])

  return (
    <group>
      {entries.map((entry, i) => (
        <TrophySlot
          key={entry.playerName}
          entry={entry}
          index={i}
          cupIndexOffset={cupIndexOffsets[i]}
        />
      ))}
    </group>
  )
}
