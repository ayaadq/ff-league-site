import type { SleeperMatchup } from './types'

/** Groups a week's matchup rows into head-to-head pairs, dropping any
 * roster with no game that week (bye, or a playoff week after that
 * roster was eliminated — Sleeper still returns a zeroed row for it). */
export function pairMatchups(matchups: SleeperMatchup[]): [SleeperMatchup, SleeperMatchup][] {
  const groups = new Map<number, SleeperMatchup[]>()
  for (const matchup of matchups) {
    if (matchup.matchup_id == null) continue
    const group = groups.get(matchup.matchup_id) ?? []
    group.push(matchup)
    groups.set(matchup.matchup_id, group)
  }
  return [...groups.values()].filter(
    (group): group is [SleeperMatchup, SleeperMatchup] => group.length === 2,
  )
}
