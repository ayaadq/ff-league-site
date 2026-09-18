import type { WeeklyRecapStats } from '../../api/computeWeeklyRecapStats'
import {
  BENCH_BLOWUPS,
  CLOSINGS,
  EFFICIENCY_NOTES,
  HEADLINES,
  MATCHUP_HEADLINES,
  OPENINGS,
  POWER_RANKINGS,
} from './recapTemplates'

/** Small, stable string hash — deterministic template-variant selection,
 * not cryptography. Picking by `(season, week, slot)` rather than
 * `Math.random()` means reloading the same week's page always shows the
 * same phrasing, and different weeks are very likely (not guaranteed) to
 * land on different variants without needing to track "which ones have
 * already been used" anywhere. */
function seededIndex(seed: string, length: number): number {
  let hash = 0
  for (let i = 0; i < seed.length; i++) {
    hash = (hash * 31 + seed.charCodeAt(i)) | 0
  }
  return Math.abs(hash) % length
}

function pick(list: readonly string[], season: string, week: number, slot: string): string {
  return list[seededIndex(`${season}-${week}-${slot}`, list.length)]
}

function fill(template: string, values: Record<string, string | number>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_match, key: string) =>
    key in values ? String(values[key]) : '',
  )
}

const listify = (names: string[]) => names.join(', ')

/** Builds the week's recap text (PLAN.md Phase H.6 Alternative) — the
 * only read surface for `recapTemplates.ts`, same convention
 * `content/lore/index.ts`/`content/banter/index.ts` already use (data
 * files stay pure, the merge/matching logic lives in this one module).
 *
 * Returns paragraphs joined by a blank line, matching
 * `WeeklyRecapSection.tsx`'s existing paragraph-split rendering — that
 * per-paragraph staggered reveal was written for the earlier Claude-API
 * version of this section and doesn't care where the text came from. */
export function buildWeeklyRecap(stats: WeeklyRecapStats, season: string): string {
  const { week } = stats
  const values: Record<string, string | number> = {
    week,
    highScorer: stats.highScorer,
    highScore: stats.highScore.toFixed(2),
    lowScorer: stats.lowScorer,
    lowScore: stats.lowScore.toFixed(2),
    margin: stats.margin.toFixed(2),
    topThreeScorers: listify(stats.topThreeScorers),
    bottomThreePerformers: listify(stats.bottomThreePerformers),
    efficiencyLeader: stats.efficiencyLeader,
    efficiencyScore: stats.efficiencyScore,
    topRanking: listify(stats.powerRanking),
    bottomRanking: listify(stats.bottomRanking),
  }

  const paragraphs: string[] = []
  paragraphs.push(fill(pick(HEADLINES, season, week, 'headline'), values))
  paragraphs.push(fill(pick(OPENINGS, season, week, 'opening'), values))

  // Skipped entirely when nobody had a bench player worth roasting
  // (computeWeeklyRecapStats.ts's own null case), rather than filling the
  // template with placeholder-shaped nonsense.
  if (stats.benchBlowup) {
    paragraphs.push(
      fill(pick(BENCH_BLOWUPS, season, week, 'benchBlowup'), {
        ...values,
        benchBlowupPlayer: stats.benchBlowup.player,
        benchBlowupScore: stats.benchBlowup.score.toFixed(1),
        benchBlowupTeam: stats.benchBlowup.team,
        benchBlowupAlternative: stats.benchBlowup.alternative.toFixed(1),
      }),
    )
  }

  paragraphs.push(fill(pick(EFFICIENCY_NOTES, season, week, 'efficiency'), values))
  paragraphs.push(fill(pick(POWER_RANKINGS, season, week, 'powerRanking'), values))
  paragraphs.push(fill(pick(CLOSINGS, season, week, 'closing'), values))

  return paragraphs.join('\n\n')
}

/** One roast line for a single matchup card (`WeeklyRecapsPage.tsx`) —
 * picked per (season, week, matchupIndex) rather than per week, so a
 * multi-game week doesn't repeat the same headline shape for every card. */
export function buildMatchupHeadline(
  game: { winner: string; winnerScore: number; loser: string; loserScore: number; margin: number },
  season: string,
  week: number,
  matchupIndex: number,
): string {
  return fill(pick(MATCHUP_HEADLINES, season, week, `matchup-${matchupIndex}`), {
    winner: game.winner,
    winnerScore: game.winnerScore.toFixed(2),
    loser: game.loser,
    loserScore: game.loserScore.toFixed(2),
    margin: game.margin.toFixed(2),
  })
}
