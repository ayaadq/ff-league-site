import type { TeamWeek } from './weeklyRecap'

export interface WeeklyRecapBenchBlowup {
  player: string
  score: number
  team: string
  /** That team's own best starter's score this week — the comparison
   * point the templates use ("your bench beat your starting lineup's
   * best player"), not a literal same-slot swap. Sleeper's own data
   * doesn't carry "which slot would this bench player have filled," so a
   * true apples-to-apples swap isn't something this can honestly compute
   * — comparing against their actual top starter is the closest real
   * number available without guessing at a lineup that never happened. */
  alternative: number
}

export interface WeeklyRecapStats {
  week: number
  highScorer: string
  highScore: number
  lowScorer: string
  lowScore: number
  margin: number
  topThreeScorers: string[]
  /** Worst-first (index 0 is the week's actual low scorer, not just "some
   * team in the bottom three") — matches how the templates read the list
   * out loud. */
  bottomThreePerformers: string[]
  /** Null when nobody had a bench player worth roasting (an emptyish
   * bench, or every benched player scored 0) -- `../content/weeklyRecaps`'s
   * `buildWeeklyRecap` skips that paragraph entirely rather than filling
   * a template with nonsense placeholder text. */
  benchBlowup: WeeklyRecapBenchBlowup | null
  efficiencyLeader: string
  efficiencyScore: number
  /** Best-first, top half of the league by this week's score. */
  powerRanking: string[]
  /** Best-first, remaining bottom half -- a continuation of the same
   * ranking, not "worst first." */
  bottomRanking: string[]
}

const round2 = (n: number) => Math.round(n * 100) / 100

/** Pure derivation from this week's already-computed `TeamWeek[]`
 * (`weekRecap()`, api/weeklyRecap.ts — the same numbers the journey and
 * awards sections already use) into the flat stats
 * `content/weeklyRecaps`'s templates fill in. No fetching, no Sleeper
 * calls of its own — `WeeklyRecapSection.tsx` hands this whatever it
 * already has from `useMatchups`/`useRosters`/etc. */
export function computeWeeklyRecapStats({
  week,
  teams,
  nameForUser,
  nameForPlayer,
}: {
  week: number
  teams: TeamWeek[]
  nameForUser: (userId: string | null) => string
  nameForPlayer: (playerId: string) => string
}): WeeklyRecapStats | null {
  if (teams.length === 0) return null

  const byScoreDesc = [...teams].sort((a, b) => b.actual - a.actual)
  const highTeam = byScoreDesc[0]
  const lowTeam = byScoreDesc[byScoreDesc.length - 1]

  const half = Math.ceil(byScoreDesc.length / 2)
  const powerRanking = byScoreDesc.slice(0, half).map((t) => nameForUser(t.userId))
  const bottomRanking = byScoreDesc.slice(half).map((t) => nameForUser(t.userId))

  const bottomThreePerformers = [...byScoreDesc]
    .slice(-3)
    .reverse()
    .map((t) => nameForUser(t.userId))

  const benchCandidates = teams.filter((t) => t.topBenched && t.topBenched.points > 0)
  const benchBlowupTeam = benchCandidates.length
    ? benchCandidates.reduce((best, t) =>
        t.topBenched!.points > best.topBenched!.points ? t : best,
      )
    : null

  const efficiencyLeaderTeam = teams.reduce((best, t) =>
    t.efficiency > best.efficiency ? t : best,
  )

  return {
    week,
    highScorer: nameForUser(highTeam.userId),
    highScore: highTeam.actual,
    lowScorer: nameForUser(lowTeam.userId),
    lowScore: lowTeam.actual,
    margin: round2(highTeam.actual - lowTeam.actual),
    topThreeScorers: byScoreDesc.slice(0, 3).map((t) => nameForUser(t.userId)),
    bottomThreePerformers,
    benchBlowup: benchBlowupTeam
      ? {
          player: nameForPlayer(benchBlowupTeam.topBenched!.playerId),
          score: benchBlowupTeam.topBenched!.points,
          team: nameForUser(benchBlowupTeam.userId),
          alternative: benchBlowupTeam.topStarter?.points ?? 0,
        }
      : null,
    efficiencyLeader: nameForUser(efficiencyLeaderTeam.userId),
    efficiencyScore: Math.round(efficiencyLeaderTeam.efficiency * 100),
    powerRanking,
    bottomRanking,
  }
}
