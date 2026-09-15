import { useQueries, useQuery } from '@tanstack/react-query'
import { SLEEPER_LEAGUE_ID } from '../config'
import {
  getAllPlayers,
  getMatchups,
  getNflState,
  getRosters,
  getUsers,
  getWinnersBracket,
} from './sleeperClient'
import { resolveSeasonChain, type SeasonChainEntry } from './seasonChain'
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

/** The ~5MB player dictionary — see CLAUDE.md: never fetch more than
 * once per 24h. `gcTime: Infinity` plus the IndexedDB persister means a
 * repeat visit within the persisted cache reuses it without refetching. */
export const useAllPlayers = () =>
  useQuery({
    queryKey: ['players'],
    queryFn: getAllPlayers,
    staleTime: STALE_TIME.playersDaily,
    gcTime: STALE_TIME.immutable,
  })

/** Rosters for every season in a chain, in parallel. Completed seasons
 * are cached forever; the current (non-`complete`) season stays live. */
export const useSeasonsRosters = (seasons: SeasonChainEntry[]) =>
  useQueries({
    queries: seasons.map((season) => ({
      queryKey: ['rosters', season.leagueId],
      queryFn: () => getRosters(season.leagueId),
      staleTime: season.status === 'complete' ? STALE_TIME.immutable : STALE_TIME.live,
    })),
  })

export const useSeasonsBrackets = (seasons: SeasonChainEntry[]) =>
  useQueries({
    queries: seasons.map((season) => ({
      queryKey: ['winnersBracket', season.leagueId],
      queryFn: () => getWinnersBracket(season.leagueId),
      staleTime: season.status === 'complete' ? STALE_TIME.immutable : STALE_TIME.live,
    })),
  })

/** Users for every season in a chain. A manager who has since left the
 * league won't appear in the current season's user list, so cross-season
 * identity lookups need every season's list, not just the current one. */
export const useSeasonsUsers = (seasons: SeasonChainEntry[]) =>
  useQueries({
    queries: seasons.map((season) => ({
      queryKey: ['users', season.leagueId],
      queryFn: () => getUsers(season.leagueId),
      staleTime: season.status === 'complete' ? STALE_TIME.immutable : STALE_TIME.live,
    })),
  })

export interface WeekRef {
  leagueId: string
  week: number
  immutable: boolean
}

/** Matchups for an arbitrary set of (league, week) pairs, e.g. every
 * scored week across every season. Shares the `useMatchups` query key
 * so results from either hook reuse the same cache entry. */
export const useWeeksMatchups = (weekRefs: WeekRef[]) =>
  useQueries({
    queries: weekRefs.map((ref) => ({
      queryKey: ['matchups', ref.leagueId, ref.week],
      queryFn: () => getMatchups(ref.leagueId, ref.week),
      staleTime: ref.immutable ? STALE_TIME.immutable : STALE_TIME.live,
    })),
  })
