import { getLeague } from './sleeperClient'

export interface SeasonChainEntry {
  season: string
  leagueId: string
}

/** Walks a league's `previous_league_id` links back to the first season.
 * Returns entries newest season first. See SPEC.md §2/§6.1. */
export async function resolveSeasonChain(startLeagueId: string): Promise<SeasonChainEntry[]> {
  const chain: SeasonChainEntry[] = []
  let currentId: string | null = startLeagueId

  while (currentId) {
    const league = await getLeague(currentId)
    chain.push({ season: league.season, leagueId: league.league_id })
    currentId = league.previous_league_id
  }

  return chain
}
