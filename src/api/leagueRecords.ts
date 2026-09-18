import { preSleeperArchive } from '../content/leagueHistory/preSleeperArchive'
import { pairMatchups } from './matchups'
import { teamNameForUser, totalPoints } from './standings'
import type { SleeperBracketMatch, SleeperMatchup, SleeperRoster, SleeperUser } from './types'

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

export interface SeasonChampionship {
  season: string
  championUserId: string
  runnerUpUserId: string
}

/** Each season's championship game (bracket match `p: 1`), both sides
 * resolved to their owner — the building block `playerChampionships`
 * below merges with the pre-Sleeper archive into one combined,
 * player-named list (PLAN.md Phase H.5, replacing Phase H.4's separate
 * aggregate-count/year-by-year split). */
export function championshipsBySeason(seasons: SeasonData[]): SeasonChampionship[] {
  const result: SeasonChampionship[] = []
  for (const season of seasons) {
    const championshipMatch = season.bracket.find((match) => match.p === 1)
    if (championshipMatch?.w == null || championshipMatch?.l == null) continue
    const champion = season.rosters.find((r) => r.roster_id === championshipMatch.w)
    const runnerUp = season.rosters.find((r) => r.roster_id === championshipMatch.l)
    if (!champion?.owner_id || !runnerUp?.owner_id) continue
    result.push({
      season: season.season,
      championUserId: champion.owner_id,
      runnerUpUserId: runnerUp.owner_id,
    })
  }
  return result
}

/** Sleeper team name -> real player first name (PLAN.md Phase H.5) —
 * hand-authored per the league's request to show player identity instead
 * of team branding on the History page specifically, not sitewide (a
 * team name is exactly the right thing to show on Home/Team pages). Team
 * names can't be reverse-derived, so this is a plain lookup, not a
 * computation; anything not in the table falls back to its own team name
 * rather than disappearing or crashing, so an unmapped/future team still
 * renders. */
const PLAYER_NAME_BY_TEAM_NAME: Record<string, string> = {
  'My Strange Nabers': 'Zuhayr',
  '2x Champion': 'Tejas',
  Rags: 'Raghav',
  'Justins Team': 'Justin',
  'I love to chase Brown ppl': 'Rohan',
  'Njigba Please': 'Supratim',
  'Waddling to the Moon': 'Sabeeh',
  'Hopeless again': 'Joey',
  'Mark up the Lamb Price': 'Jai',
  'Hey Pukie': 'Nidhish',
  ConkeyonmyCooktilliGoff: 'Zain',
  'Chasing my next Pacheco': 'Ayaad',
}

export function playerNameForTeamName(teamName: string): string {
  return PLAYER_NAME_BY_TEAM_NAME[teamName] ?? teamName
}

export function playerNameForUser(userId: string, users: SleeperUser[]): string {
  return playerNameForTeamName(teamNameForUser(userId, users))
}

export interface PlayerChampionship {
  playerName: string
  count: number
  /** Ascending — oldest first. */
  years: string[]
  /** This player's career Sleeper-era (2024+) wins and total points for,
   * summed across every season they've played — the tiebreak basis for
   * the sort below. A pre-Sleeper-only champion who's also a current
   * Sleeper manager (every one of the four 2020-2023 champions is) still
   * gets real numbers here, since these are their own current-era
   * record, not a stat tied to the specific year(s) they won — there's
   * no matchup-level data for 2020-2023 to compute a "that year's"
   * record from anyway. Someone with no Sleeper presence at all falls
   * back to 0, which simply sorts them last among ties. */
  wins: number
  pointsFor: number
}

/** The single combined, player-named championship list (PLAN.md Phase
 * H.5) — merges the hand-authored pre-Sleeper archive (2020-2023, plain
 * names) with live Sleeper bracket results (2024+, resolved through
 * `PLAYER_NAME_BY_TEAM_NAME` above), replacing the old separate
 * aggregate-count (`championsByUser`) and year-by-year
 * (`championshipsBySeason` alone) sections entirely.
 *
 * A pre-Sleeper archive name and its Sleeper-era counterpart merge under
 * one identity by their shared first name (`name.split(' ')[0]`) — 2020's
 * archive entry is authored as "Rohan Haware" (a surname was given for
 * that one year only) while every Sleeper-era name is bare first-name-
 * only, so this is the one normalization that lets both sides land on
 * the same key rather than showing as two separate people.
 *
 * Sorted by title count (desc), then career wins (desc), then career
 * points for (desc) — the same three-key sort the 3D trophy line
 * (`TrophyLineScene.tsx`) consumes directly, so "front of the line" and
 * "top of this list" are always the same order by construction. */
export function playerChampionships(
  seasons: SeasonData[],
  users: SleeperUser[],
): PlayerChampionship[] {
  const yearsByPlayer = new Map<string, string[]>()
  const addYear = (rawName: string, season: string) => {
    const playerName = rawName.split(' ')[0]
    const years = yearsByPlayer.get(playerName) ?? []
    years.push(season)
    yearsByPlayer.set(playerName, years)
  }

  for (const entry of preSleeperArchive) {
    addYear(entry.championName, entry.season)
  }
  for (const { season, championUserId } of championshipsBySeason(seasons)) {
    addYear(playerNameForUser(championUserId, users), season)
  }

  // Career wins/PFF per user_id, summed across every season's roster —
  // resolved to a player name via the same reverse mapping, independent
  // of which year(s) that player's title(s) came from.
  const statsByUserId = new Map<string, { wins: number; pointsFor: number }>()
  for (const season of seasons) {
    for (const roster of season.rosters) {
      if (!roster.owner_id) continue
      const current = statsByUserId.get(roster.owner_id) ?? { wins: 0, pointsFor: 0 }
      current.wins += roster.settings.wins
      current.pointsFor += totalPoints(roster.settings)
      statsByUserId.set(roster.owner_id, current)
    }
  }
  const userIdByPlayerName = new Map<string, string>()
  for (const user of users) {
    const playerName = playerNameForUser(user.user_id, users)
    if (!userIdByPlayerName.has(playerName)) userIdByPlayerName.set(playerName, user.user_id)
  }

  const result: PlayerChampionship[] = [...yearsByPlayer.entries()].map(([playerName, years]) => {
    const sortedYears = [...years].sort((a, b) => Number(a) - Number(b))
    const userId = userIdByPlayerName.get(playerName)
    const stats = userId ? statsByUserId.get(userId) : undefined
    return {
      playerName,
      count: sortedYears.length,
      years: sortedYears,
      wins: stats?.wins ?? 0,
      pointsFor: stats?.pointsFor ?? 0,
    }
  })

  result.sort((a, b) => {
    if (b.count !== a.count) return b.count - a.count
    if (b.wins !== a.wins) return b.wins - a.wins
    return b.pointsFor - a.pointsFor
  })

  return result
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
