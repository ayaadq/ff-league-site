import type { MatchupNote, RankingNote, WeekRecapContent } from './types'

export type {
  AwardNote,
  MatchupNote,
  RankingNote,
  RecapChip,
  Storyline,
  WeekRecapContent,
} from './types'

/** Every authored recap, newest first is not required — lookups are by
 * season and week.
 *
 * To add a week: create `<season>-week-<n>.ts` beside this file exporting
 * one `WeekRecapContent`, import it here, and add it to the array. That
 * is the whole workflow; nothing else needs touching, and the numbers
 * take care of themselves.
 *
 * A worked example, using this league's real user_ids:
 *
 *     // 2026-week-1.ts
 *     import type { WeekRecapContent } from './types'
 *
 *     export const week: WeekRecapContent = {
 *       season: '2026',
 *       week: 1,
 *       kicker: 'Official · Unauthorized · Unapologetic',
 *       title: 'Week 1 Recap',
 *       subtitle: 'Six matchups. One perfect lineup. One team that scored 54.',
 *       storylines: [
 *         {
 *           lede: 'The draft report got its shit rocked.',
 *           body: 'Every single pick this thing roasted in August went nuclear on Sunday.',
 *         },
 *       ],
 *       matchups: [
 *         {
 *           userIds: ['734958413582336000', '859328673705230336'],
 *           headline: 'Three Tight Ends, Started the Wrong One, Lost by Nine',
 *           gameOfTheWeek: true,
 *           chips: [
 *             { label: 'Margin', value: '9.84' },
 *             { label: 'Goedert benched', value: '23.7' },
 *           ],
 *           body: ['The only game all week decided by less than thirty points.'],
 *         },
 *       ],
 *       awards: [
 *         {
 *           emoji: '🎤',
 *           title: 'Trash Talk Rights',
 *           userId: '608578919938973696',
 *           body: '170.1, the high score, with the quarterback the league mocked.',
 *         },
 *       ],
 *       rankings: [
 *         { userId: '608578919938973696', grade: 'S', note: 'Commissioner, high scorer, insufferable. Earned it.' },
 *       ],
 *       closing: { title: 'The S-Rank Tribunal', body: 'Effective immediately…' },
 *     }
 *
 * The manager → user_id table lives in README.md so it is in one place
 * rather than duplicated in code that would drift. */
export const recaps: WeekRecapContent[] = []

export function recapFor(
  season: string | undefined,
  week: number | undefined,
): WeekRecapContent | undefined {
  if (!season || !week) return undefined
  return recaps.find((r) => r.season === season && r.week === week)
}

/** Matches regardless of which order the two managers were written in,
 * so an author never has to know which side the site will render first. */
export function matchupNoteFor(
  recap: WeekRecapContent | undefined,
  userIdA: string | null | undefined,
  userIdB: string | null | undefined,
): MatchupNote | undefined {
  if (!recap?.matchups || !userIdA || !userIdB) return undefined
  return recap.matchups.find(
    (m) =>
      (m.userIds[0] === userIdA && m.userIds[1] === userIdB) ||
      (m.userIds[0] === userIdB && m.userIds[1] === userIdA),
  )
}

export function rankingNoteFor(
  recap: WeekRecapContent | undefined,
  userId: string | null | undefined,
): RankingNote | undefined {
  if (!recap?.rankings || !userId) return undefined
  return recap.rankings.find((r) => r.userId === userId)
}
