import { leagueEvents } from './events'
import { rivalries } from './rivalries'
import { teamLore } from './teams'
import type { LoreEvent, Rivalry, TeamLore } from './types'

export type { LoreEvent, Rivalry, TeamLore }
export { leagueEvents, rivalries, teamLore }

/** The one place components read lore from, so pages never import the
 * individual data files or reimplement matching. Every lookup is a
 * plain array scan: this is hand-authored content measured in dozens of
 * entries, not a data set worth indexing.
 *
 * Every accessor takes `string | null | undefined` and treats missing
 * input as "no lore" rather than throwing — callers are usually passing a
 * router param or a roster's `owner_id`, which Sleeper types as nullable,
 * and both can legitimately be absent mid-load. */

export function loreForUser(userId: string | null | undefined): TeamLore | undefined {
  if (!userId) return undefined
  return teamLore.find((entry) => entry.userId === userId)
}

/** Matches a rivalry regardless of which side each manager is stored on,
 * so callers don't have to know the authored order. */
export function rivalryBetween(
  userIdA: string | null | undefined,
  userIdB: string | null | undefined,
): Rivalry | undefined {
  if (!userIdA || !userIdB) return undefined
  return rivalries.find(
    (r) =>
      (r.teamAUserId === userIdA && r.teamBUserId === userIdB) ||
      (r.teamAUserId === userIdB && r.teamBUserId === userIdA),
  )
}

export function rivalriesForUser(userId: string | null | undefined): Rivalry[] {
  if (!userId) return []
  return rivalries.filter((r) => r.teamAUserId === userId || r.teamBUserId === userId)
}

/** Events attached to one manager: their own notable events, plus any
 * league-wide event or rivalry game that names them. */
export function eventsForUser(userId: string | null | undefined): LoreEvent[] {
  if (!userId) return []
  const own = loreForUser(userId)?.notableEvents ?? []
  const named = [...leagueEvents, ...rivalries.flatMap((r) => r.notableGames ?? [])].filter((e) =>
    e.relatedUserIds?.includes(userId),
  )
  return sortNewestFirst([...own, ...named])
}

/** Every authored event across all three files, for a league-wide
 * timeline. */
export function allEvents(): LoreEvent[] {
  return sortNewestFirst([
    ...leagueEvents,
    ...rivalries.flatMap((r) => r.notableGames ?? []),
    ...teamLore.flatMap((t) => t.notableEvents ?? []),
  ])
}

function sortNewestFirst(events: LoreEvent[]): LoreEvent[] {
  return [...events].sort((a, b) => b.season - a.season || (b.week ?? 0) - (a.week ?? 0))
}
