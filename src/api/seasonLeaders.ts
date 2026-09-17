import { playerDisplayName } from './players'
import type { SleeperMatchup, SleeperPlayersMap } from './types'

export interface SeasonLeader {
  playerId: string
  name: string
  totalPoints: number
}

/** Season-long companion to weeklyRecap.ts's single-week `topStarter` --
 * aggregates each starter's fantasy points across every week of matchups
 * given, keyed by raw Sleeper `player_id`. Only counts a week where the
 * player was actually in a starting lineup (bench points are "points left
 * on the bench", a different stat weeklyRecap.ts already covers), so this
 * reflects what actually counted toward a manager's score, not raw NFL
 * output. No new API calls -- callers pass the same weeks-of-matchups
 * array HomePage.tsx already fetches for the standings streaks. */
export function seasonLeaders(
  weeksMatchups: SleeperMatchup[][],
  players: SleeperPlayersMap | undefined,
  limit = 8,
): SeasonLeader[] {
  const totals = new Map<string, number>()

  for (const weekMatchups of weeksMatchups) {
    for (const matchup of weekMatchups) {
      for (const playerId of matchup.starters) {
        if (!playerId || playerId === '0') continue
        const points = matchup.players_points?.[playerId] ?? 0
        totals.set(playerId, (totals.get(playerId) ?? 0) + points)
      }
    }
  }

  return Array.from(totals.entries())
    .map(([playerId, totalPoints]) => ({
      playerId,
      name: playerDisplayName(players?.[playerId], playerId),
      totalPoints,
    }))
    .sort((a, b) => b.totalPoints - a.totalPoints)
    .slice(0, limit)
}
