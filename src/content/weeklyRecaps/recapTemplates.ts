/** Hand-authored roast copy for the weekly recap (PLAN.md Phase H.6
 * Alternative) — pure template strings, no logic. `{{placeholder}}`
 * tokens get filled in by `../index.ts`'s `buildWeeklyRecap()` from real
 * numbers computed in `src/api/computeWeeklyRecapStats.ts`; nothing here
 * is ever rendered as-is.
 *
 * Several variations per slot so the recap doesn't read identically every
 * week — `../index.ts` picks one deterministically per (season, week,
 * slot) rather than truly at random, so reloading the same week's page
 * never shows different phrasing than the last visit.
 *
 * Edit this file any time to add more variety or retune the tone — it's
 * plain data, no rebuild-the-whole-feature required, and (unlike the
 * abandoned Claude-API version of this section) nothing here ever leaves
 * the browser. */

export const HEADLINES = [
  'WEEK {{week}} · FINAL · MARGIN {{margin}} · {{highScorer}} WENT OFF',
  'WEEK {{week}} · {{lowScorer}} SHIT THE BED · {{highScore}} POINT DOMINATION',
  "WEEK {{week}} · THE GAP BETWEEN FIRST AND LAST WAS {{margin}} POINTS. THAT'S NOT A TYPO.",
]

export const OPENINGS = [
  '{{highScorer}} just put the league on notice with {{highScore}} points. Meanwhile {{lowScorer}} managed {{lowScore}} — talk about leaving points on the board. {{topThreeScorers}} carried their teams while {{bottomThreePerformers}} actively tried to lose.',
  "The high score this week was {{highScore}} from {{highScorer}}. The low? {{lowScore}} from {{lowScorer}}. That's a {{margin}}-point spread between best and worst. This league is very much not balanced.",
  '{{highScorer}} put up {{highScore}} and made everyone else look like they forgot how football works — especially {{lowScorer}}, who limped in at {{lowScore}}. {{topThreeScorers}} showed up. {{bottomThreePerformers}} did not.',
]

export const BENCH_BLOWUPS = [
  "But here's the kicker: {{benchBlowupPlayer}} was chilling on {{benchBlowupTeam}}'s bench putting up {{benchBlowupScore}} while their best starter only managed {{benchBlowupAlternative}}. That's the kind of decision that keeps you up at night.",
  "Speaking of bad life choices — {{benchBlowupTeam}} left {{benchBlowupPlayer}} ({{benchBlowupScore}} pts) on the bench in favor of a starting lineup that topped out at {{benchBlowupAlternative}}. We're not saying it's a cry for help, but...",
  '{{benchBlowupTeam}} had {{benchBlowupPlayer}} available and just... did not start them. {{benchBlowupScore}} points, sitting on a folding chair, while the actual lineup managed {{benchBlowupAlternative}}. Incredible work.',
]

export const EFFICIENCY_NOTES = [
  '{{efficiencyLeader}} ran a clinic this week with {{efficiencyScore}}% lineup efficiency. Everyone else: take notes.',
  'If you want to see what a correctly set lineup looks like, ask {{efficiencyLeader}} — {{efficiencyScore}}% efficiency, nothing left on the table.',
]

export const POWER_RANKINGS = [
  'Top of the pack this week: {{topRanking}}. Bringing up the rear: {{bottomRanking}}. Straight up, no flukes.',
]

export const CLOSINGS = [
  'See you next week, and maybe check your starting lineup this time.',
  'That’s all for Week {{week}}. Try not to bench your studs again, yeah?',
  'Back to the drawing board for half this league.',
]

/** One line per matchup card on the full recap page
 * (`WeeklyRecapsPage.tsx`) — picked per (season, week, matchup index),
 * not per week, so a 6-game week doesn't repeat the same headline shape
 * six times in a row. */
export const MATCHUP_HEADLINES = [
  '{{winner}} handled {{loser}} {{winnerScore}}-{{loserScore}}. Not close.',
  '{{winner}} survives {{loser}}, {{winnerScore}}-{{loserScore}}. Margin: {{margin}}.',
  '{{loser}} never had an answer for {{winner}} this week — final {{winnerScore}}-{{loserScore}}.',
  '{{winner}} over {{loser}}, {{winnerScore}}-{{loserScore}}. Book it.',
]
