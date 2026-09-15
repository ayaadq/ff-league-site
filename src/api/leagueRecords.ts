import { pairMatchups } from './matchups'
import type { SleeperBracketMatch, SleeperMatchup, SleeperRoster } from './types'

export interface SeasonData {
  season: string
  leagueId: string
  rosters: SleeperRoster[]
  bracket: SleeperBracketMatch[]
  /** Index 0 is week 1. */
  matchupsByWeek: SleeperMatchup[][]
}

export interface GameResult {
  season: string
  week: number
  userId: string
  opponentUserId: string
  points: number
  opponentPoints: number
  won: boolean
}

/** Flattens every season's matchups into one user-keyed, chronologically
 * sortable list — the shared input for every cross-season record below.
 * Keyed by the durable `owner_id` (Sleeper user_id), not `roster_id`,
 * per CLAUDE.md's identity rule. */
export function buildGameResults(seasons: SeasonData[]): GameResult[] {
  const results: GameResult[] = []

  for (const season of seasons) {
    const ownerByRosterId = new Map(
      season.rosters.filter((r) => r.owner_id).map((r) => [r.roster_id, r.owner_id as string]),
    )

    season.matchupsByWeek.forEach((weekMatchups, index) => {
      const week = index + 1
      for (const [a, b] of pairMatchups(weekMatchups)) {
        const ownerA = ownerByRosterId.get(a.roster_id)
        const ownerB = ownerByRosterId.get(b.roster_id)
        if (!ownerA || !ownerB) continue

        results.push({
          season: season.season,
          week,
          userId: ownerA,
          opponentUserId: ownerB,
          points: a.points,
          opponentPoints: b.points,
          won: a.points > b.points,
        })
        results.push({
          season: season.season,
          week,
          userId: ownerB,
          opponentUserId: ownerA,
          points: b.points,
          opponentPoints: a.points,
          won: b.points > a.points,
        })
      }
    })
  }

  return results
}

export function bestSingleWeek(games: GameResult[]): GameResult | null {
  if (games.length === 0) return null
  return games.reduce((best, game) => (game.points > best.points ? game : best))
}

function bySeasonThenWeek(a: GameResult, b: GameResult): number {
  return a.season === b.season ? a.week - b.week : Number(a.season) - Number(b.season)
}

export interface WinStreak {
  userId: string
  length: number
  endSeason: string
  endWeek: number
}

/** Longest run of consecutive wins for any single manager, in
 * chronological order across the whole season chain. */
export function longestWinStreak(games: GameResult[]): WinStreak | null {
  const gamesByUser = new Map<string, GameResult[]>()
  for (const game of games) {
    const list = gamesByUser.get(game.userId) ?? []
    list.push(game)
    gamesByUser.set(game.userId, list)
  }

  let best: WinStreak | null = null
  for (const [userId, userGames] of gamesByUser) {
    userGames.sort(bySeasonThenWeek)
    let current = 0
    for (const game of userGames) {
      current = game.won ? current + 1 : 0
      if (current > 0 && (!best || current > best.length)) {
        best = { userId, length: current, endSeason: game.season, endWeek: game.week }
      }
    }
  }
  return best
}

/** Counts each season's championship-game winner (bracket match `p: 1`)
 * toward that roster's owner. */
export function championsByUser(seasons: SeasonData[]): Map<string, number> {
  const counts = new Map<string, number>()
  for (const season of seasons) {
    const championshipMatch = season.bracket.find((match) => match.p === 1)
    if (championshipMatch?.w == null) continue
    const champion = season.rosters.find((r) => r.roster_id === championshipMatch.w)
    if (!champion?.owner_id) continue
    counts.set(champion.owner_id, (counts.get(champion.owner_id) ?? 0) + 1)
  }
  return counts
}

export interface HeadToHeadRecord {
  opponentUserId: string
  wins: number
  losses: number
}

export function headToHeadFor(games: GameResult[], userId: string): HeadToHeadRecord[] {
  const byOpponent = new Map<string, { wins: number; losses: number }>()
  for (const game of games) {
    if (game.userId !== userId) continue
    const record = byOpponent.get(game.opponentUserId) ?? { wins: 0, losses: 0 }
    if (game.won) record.wins += 1
    else record.losses += 1
    byOpponent.set(game.opponentUserId, record)
  }
  return [...byOpponent.entries()]
    .map(([opponentUserId, record]) => ({ opponentUserId, ...record }))
    .sort((a, b) => b.wins + b.losses - (a.wins + a.losses))
}
