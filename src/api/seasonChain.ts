import { getLeague } from './sleeperClient'

export interface SeasonChainEntry {
  season: string
  leagueId: string
  /** Last week this league object has scored data for — works for both
   * the in-progress current season and any completed past season. */
  lastScoredLeg: number
  status: string
}

/** Walks a league's `previous_league_id` links back to the first season.
 * Returns entries newest season first. See SPEC.md §2/§6.1. */
export async function resolveSeasonChain(startLeagueId: string): Promise<SeasonChainEntry[]> {
  const chain: SeasonChainEntry[] = []
  let currentId: string | null = startLeagueId

  while (currentId) {
    const league = await getLeague(currentId)
    chain.push({
      season: league.season,
      leagueId: league.league_id,
      lastScoredLeg: league.settings.last_scored_leg,
      status: league.status,
    })
    currentId = league.previous_league_id
  }

  return chain
}
