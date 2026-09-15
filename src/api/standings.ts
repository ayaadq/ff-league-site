import type { SleeperRoster, SleeperRosterSettings, SleeperUser } from './types'

export function teamNameForRoster(roster: SleeperRoster, users: SleeperUser[]): string {
  const user = roster.owner_id ? users.find((u) => u.user_id === roster.owner_id) : undefined
  return user?.metadata?.team_name ?? user?.display_name ?? `Roster ${roster.roster_id}`
}

/** Returns the Sleeper avatar id for a roster's owner, or null if the
 * user has no avatar set — callers decide the fallback treatment. */
export function teamAvatarIdForRoster(roster: SleeperRoster, users: SleeperUser[]): string | null {
  const user = roster.owner_id ? users.find((u) => u.user_id === roster.owner_id) : undefined
  return user?.avatar ?? null
}

/** Merges a season chain's user lists (newest season first) into one
 * list keyed by durable `user_id`, keeping each manager's most recent
 * name/avatar. Falls back to an older season's record for a manager
 * who has since left the league and wouldn't appear in the current
 * season's user list alone. */
export function mergeUsersAcrossSeasons(usersBySeasonNewestFirst: SleeperUser[][]): SleeperUser[] {
  const merged = new Map<string, SleeperUser>()
  for (const seasonUsers of usersBySeasonNewestFirst) {
    for (const user of seasonUsers) {
      if (!merged.has(user.user_id)) merged.set(user.user_id, user)
    }
  }
  return [...merged.values()]
}

/** Cross-season lookups key off the durable Sleeper `user_id`, then
 * resolve display name/avatar from whichever season's user list is
 * passed in (callers use the current season's, so a name/avatar stays
 * current even for records set in past seasons). */
export function teamNameForUser(userId: string, users: SleeperUser[]): string {
  const user = users.find((u) => u.user_id === userId)
  return user?.metadata?.team_name ?? user?.display_name ?? 'Unknown Manager'
}

export function teamAvatarIdForUser(userId: string, users: SleeperUser[]): string | null {
  return users.find((u) => u.user_id === userId)?.avatar ?? null
}

/** Sleeper splits season-total points across two fields — `fpts` (whole
 * number) and `fpts_decimal` (hundredths) — unlike matchup `points`,
 * which is already a single float. Confirmed against the live league's
 * roster data before relying on it here. */
export function totalPoints(settings: SleeperRosterSettings): number {
  return settings.fpts + (settings.fpts_decimal ?? 0) / 100
}

export function sortStandings(rosters: SleeperRoster[]): SleeperRoster[] {
  return [...rosters].sort((a, b) => {
    if (b.settings.wins !== a.settings.wins) return b.settings.wins - a.settings.wins
    return totalPoints(b.settings) - totalPoints(a.settings)
  })
}
