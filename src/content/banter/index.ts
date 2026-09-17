import { banter } from './lines'
import type { BanterLine } from './types'

export type { BanterLine }
export { banter }

/** The one place components read banter from, so pages never import
 * `lines.ts` directly or reimplement matching — same rule content/lore/
 * follows for the same reason. */

/** Lines aimed at one specific matchup, either direction, for a given
 * week. */
export function banterForMatchup(
  userIdA: string | null | undefined,
  userIdB: string | null | undefined,
  week: number,
): BanterLine[] {
  if (!userIdA || !userIdB) return []
  return banter.filter(
    (line) =>
      line.week === week &&
      ((line.userId === userIdA && line.toUserId === userIdB) ||
        (line.userId === userIdB && line.toUserId === userIdA)),
  )
}

/** Every line for a given week, matchup-targeted or general — what
 * SmackTalkFeed renders as its feed. */
export function banterForWeek(week: number): BanterLine[] {
  return banter.filter((line) => line.week === week)
}
