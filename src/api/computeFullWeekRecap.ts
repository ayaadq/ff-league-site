import { buildMatchupHeadline, buildWeeklyRecap } from '../content/weeklyRecaps'
import { computeWeeklyRecapStats } from './computeWeeklyRecapStats'
import type { MatchupRecap, TeamWeek, WeekAwards } from './weeklyRecap'
import type { SleeperRoster } from './types'

export interface FullMatchupRecap {
  winner: string
  winnerScore: number
  loser: string
  loserScore: number
  margin: number
  tied: boolean
  headline: string
}

export interface FullAward {
  name: string
  winner: string
  description: string
}

export type Grade = 'S' | 'A' | 'B' | 'C' | 'D'

export interface PowerRankingRow {
  rank: number
  team: string
  record: string
  grade: Grade
  points: number
  commentary: string
}

export interface EfficiencyRow {
  team: string
  scored: number
  perfect: number
  efficiency: number
}

export interface FullWeekRecap {
  week: number
  season: string
  opener: string
  matchups: FullMatchupRecap[]
  awards: FullAward[]
  powerRankings: PowerRankingRow[]
  efficiencyChart: EfficiencyRow[]
}

const round2 = (n: number) => Math.round(n * 100) / 100

/** S for the very top of the field down to D at the bottom, distributed
 * by rank *fraction* rather than a fixed cutoff so this still makes sense
 * for a league that isn't exactly 12 teams. Purely rank-derived — a real,
 * honest number, not a fabricated per-team judgment call. */
function gradeForRank(rank: number, total: number): Grade {
  const fraction = (rank - 1) / Math.max(total - 1, 1)
  if (fraction <= 0.15) return 'S'
  if (fraction <= 0.4) return 'A'
  if (fraction <= 0.65) return 'B'
  if (fraction <= 0.85) return 'C'
  return 'D'
}

const GRADE_COMMENTARY: Record<Grade, (score: string, efficiency: number) => string> = {
  S: (score) => `A statement week — ${score} points and the top of the board.`,
  A: (score) => `Comfortably in control this week with ${score} points.`,
  B: (score, eff) => `Middle of the pack — ${score} points at ${eff}% of their ceiling.`,
  C: (score, eff) => `A shakier week, ${score} points and only ${eff}% lineup efficiency.`,
  D: (score) => `Rough one — ${score} points, near the bottom of the league this week.`,
}

/** Everything `WeeklyRecapsPage.tsx` renders for one week, derived entirely
 * from real Sleeper data (the same `weekRecap()`/`weekAwards()` numbers
 * every other recap surface in this project already uses) — no PDF or
 * hand-transcribed document content, since none was ever provided to
 * generate this from. Matchup headlines and power-ranking commentary are
 * template-filled with real numbers (`content/weeklyRecaps`), the same
 * mechanism the homepage teaser (`WeeklyRecapSection.tsx`) already uses,
 * rather than fabricated per-person roast copy this project has no
 * factual basis to write. */
export function computeFullWeekRecap({
  week,
  season,
  teams,
  games,
  awards,
  rosters,
  nameForUser,
  nameForPlayer,
}: {
  week: number
  season: string
  teams: TeamWeek[]
  games: MatchupRecap[]
  awards: WeekAwards
  rosters: SleeperRoster[]
  nameForUser: (userId: string | null) => string
  nameForPlayer: (playerId: string) => string
}): FullWeekRecap | null {
  if (teams.length === 0) return null

  const stats = computeWeeklyRecapStats({ week, teams, nameForUser, nameForPlayer })
  const opener = stats ? buildWeeklyRecap(stats, season) : ''

  const matchups: FullMatchupRecap[] = games.map((g, i) => ({
    winner: nameForUser(g.winner.userId),
    winnerScore: g.winner.actual,
    loser: nameForUser(g.loser.userId),
    loserScore: g.loser.actual,
    margin: g.margin,
    tied: g.tied,
    headline: buildMatchupHeadline(
      {
        winner: nameForUser(g.winner.userId),
        winnerScore: g.winner.actual,
        loser: nameForUser(g.loser.userId),
        loserScore: g.loser.actual,
        margin: g.margin,
      },
      season,
      week,
      i,
    ),
  }))

  const fullAwards: FullAward[] = []
  if (awards.highScore) {
    fullAwards.push({
      name: 'High Score',
      winner: nameForUser(awards.highScore.userId),
      description: `${awards.highScore.actual.toFixed(2)} points — the week's top score.`,
    })
  }
  if (awards.lowScore) {
    fullAwards.push({
      name: 'Low Score',
      winner: nameForUser(awards.lowScore.userId),
      description: `${awards.lowScore.actual.toFixed(2)} points — the week's bottom score.`,
    })
  }
  if (awards.biggestBlowout) {
    fullAwards.push({
      name: 'Biggest Blowout',
      winner: nameForUser(awards.biggestBlowout.winner.userId),
      description: `Beat ${nameForUser(awards.biggestBlowout.loser.userId)} by ${awards.biggestBlowout.margin.toFixed(2)} points.`,
    })
  }
  if (awards.closestGame) {
    fullAwards.push({
      name: 'Closest Game',
      winner: nameForUser(awards.closestGame.winner.userId),
      description: awards.closestGame.tied
        ? `Tied ${nameForUser(awards.closestGame.loser.userId)} — as close as it gets.`
        : `Edged ${nameForUser(awards.closestGame.loser.userId)} by just ${awards.closestGame.margin.toFixed(2)}.`,
    })
  }
  const mostEfficient = [...teams].sort((a, b) => b.efficiency - a.efficiency)[0]
  if (mostEfficient) {
    fullAwards.push({
      name: 'Most Efficient Lineup',
      winner: nameForUser(mostEfficient.userId),
      description: `${Math.round(mostEfficient.efficiency * 100)}% of their best possible lineup, nothing left on the table.`,
    })
  }
  if (awards.worstEfficiency) {
    fullAwards.push({
      name: 'Least Efficient Lineup',
      winner: nameForUser(awards.worstEfficiency.userId),
      description: `Only ${Math.round(awards.worstEfficiency.efficiency * 100)}% of their possible points actually scored.`,
    })
  }
  if (awards.mostLeftOnBench) {
    fullAwards.push({
      name: 'Most Points Left on Bench',
      winner: nameForUser(awards.mostLeftOnBench.userId),
      description: `${awards.mostLeftOnBench.leftOnBench.toFixed(2)} points stranded on the bench.`,
    })
  }
  if (awards.playerOfWeek) {
    fullAwards.push({
      name: 'Player of the Week',
      winner: nameForPlayer(awards.playerOfWeek.slot.playerId),
      description: `${awards.playerOfWeek.slot.points.toFixed(1)} points, started by ${nameForUser(awards.playerOfWeek.team.userId)}.`,
    })
  }
  if (awards.perfectLineups.length > 0) {
    fullAwards.push({
      name: 'Perfect Lineup',
      winner: awards.perfectLineups.map((t) => nameForUser(t.userId)).join(', '),
      description: 'Started literally the best lineup available — zero points left behind.',
    })
  }
  if (games.length > 0) {
    const byCombined = [...games].sort(
      (a, b) => b.winner.actual + b.loser.actual - (a.winner.actual + a.loser.actual),
    )
    const highest = byCombined[0]
    const lowest = byCombined[byCombined.length - 1]
    fullAwards.push({
      name: 'Highest Combined Score',
      winner: `${nameForUser(highest.winner.userId)} vs. ${nameForUser(highest.loser.userId)}`,
      description: `${(highest.winner.actual + highest.loser.actual).toFixed(2)} combined points — an absolute shootout.`,
    })
    fullAwards.push({
      name: 'Lowest Combined Score',
      winner: `${nameForUser(lowest.winner.userId)} vs. ${nameForUser(lowest.loser.userId)}`,
      description: `${(lowest.winner.actual + lowest.loser.actual).toFixed(2)} combined points — a defensive slog.`,
    })
  }

  const rosterByRosterId = new Map(rosters.map((r) => [r.roster_id, r]))
  const byScoreDesc = [...teams].sort((a, b) => b.actual - a.actual)
  const powerRankings: PowerRankingRow[] = byScoreDesc.map((t, i) => {
    const rank = i + 1
    const roster = rosterByRosterId.get(t.rosterId)
    const record = roster
      ? `${roster.settings.wins}-${roster.settings.losses}${roster.settings.ties > 0 ? `-${roster.settings.ties}` : ''}`
      : '—'
    const grade = gradeForRank(rank, byScoreDesc.length)
    return {
      rank,
      team: nameForUser(t.userId),
      record,
      grade,
      points: t.actual,
      commentary: GRADE_COMMENTARY[grade](t.actual.toFixed(2), Math.round(t.efficiency * 100)),
    }
  })

  const efficiencyChart: EfficiencyRow[] = [...teams]
    .sort((a, b) => b.efficiency - a.efficiency)
    .map((t) => ({
      team: nameForUser(t.userId),
      scored: t.actual,
      perfect: t.possible,
      efficiency: round2(t.efficiency * 100),
    }))

  return { week, season, opener, matchups, awards: fullAwards, powerRankings, efficiencyChart }
}
