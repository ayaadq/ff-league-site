import { useQuery } from '@tanstack/react-query'
import { getMatchups, getNflState, getRosters, getUsers } from './sleeperClient'
import { resolveSeasonChain } from './seasonChain'
import { STALE_TIME } from './staleTime'

export const useSeasonChain = (leagueId: string) =>
  useQuery({
    queryKey: ['seasonChain', leagueId],
    queryFn: () => resolveSeasonChain(leagueId),
    staleTime: STALE_TIME.immutable,
  })

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
