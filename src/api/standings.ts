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
