import { useQuery } from '@tanstack/react-query'
import { SLEEPER_LEAGUE_ID } from '../config'
import { getMatchups, getNflState, getRosters, getUsers } from './sleeperClient'
import { resolveSeasonChain } from './seasonChain'
import { STALE_TIME } from './staleTime'

export const useSeasonChain = (leagueId: string) =>
  useQuery({
    queryKey: ['seasonChain', leagueId],
    queryFn: () => resolveSeasonChain(leagueId),
    staleTime: STALE_TIME.immutable,
  })

/** The current season's league_id, resolved from the configured league's
 * season chain. Falls back to the configured league ID while loading. */
export const useCurrentSeason = () => {
  const seasonChain = useSeasonChain(SLEEPER_LEAGUE_ID)
  const current = seasonChain.data?.[0]
  return {
    leagueId: current?.leagueId ?? SLEEPER_LEAGUE_ID,
    season: current?.season,
    isLoading: seasonChain.isLoading,
  }
}

export const useRosters = (leagueId: string) =>
  useQuery({
    queryKey: ['rosters', leagueId],
    queryFn: () => getRosters(leagueId),
    staleTime: STALE_TIME.live,
  })

export const useUsers = (leagueId: string) =>
  useQuery({
    queryKey: ['users', leagueId],
    queryFn: () => getUsers(leagueId),
    staleTime: STALE_TIME.immutable,
  })

export const useNflState = () =>
  useQuery({
    queryKey: ['nflState'],
    queryFn: getNflState,
    staleTime: STALE_TIME.live,
  })

export const useMatchups = (leagueId: string, week: number) =>
  useQuery({
    queryKey: ['matchups', leagueId, week],
    queryFn: () => getMatchups(leagueId, week),
    staleTime: STALE_TIME.live,
    enabled: week > 0,
  })
