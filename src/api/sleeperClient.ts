import { SLEEPER_API_BASE } from '../config'
import type {
  SleeperLeague,
  SleeperMatchup,
  SleeperNflState,
  SleeperPlayersMap,
  SleeperRoster,
  SleeperUser,
} from './types'

async function sleeperFetch<T>(path: string): Promise<T> {
  const res = await fetch(`${SLEEPER_API_BASE}${path}`)
  if (!res.ok) {
    throw new Error(`Sleeper API request failed: ${path} (${res.status} ${res.statusText})`)
  }
  return res.json() as Promise<T>
}

export const getLeague = (leagueId: string) => sleeperFetch<SleeperLeague>(`/league/${leagueId}`)

export const getRosters = (leagueId: string) =>
  sleeperFetch<SleeperRoster[]>(`/league/${leagueId}/rosters`)

export const getUsers = (leagueId: string) =>
  sleeperFetch<SleeperUser[]>(`/league/${leagueId}/users`)

export const getMatchups = (leagueId: string, week: number) =>
  sleeperFetch<SleeperMatchup[]>(`/league/${leagueId}/matchups/${week}`)

export const getWinnersBracket = (leagueId: string) =>
  sleeperFetch<unknown[]>(`/league/${leagueId}/winners_bracket`)

export const getLosersBracket = (leagueId: string) =>
  sleeperFetch<unknown[]>(`/league/${leagueId}/losers_bracket`)

export const getTransactions = (leagueId: string, week: number) =>
  sleeperFetch<unknown[]>(`/league/${leagueId}/transactions/${week}`)

export const getNflState = () => sleeperFetch<SleeperNflState>('/state/nfl')

/** ~5MB. Sleeper's own guidance: fetch at most once per day. Never call
 * this in a loop or on every render — see CLAUDE.md. */
export const getAllPlayers = () => sleeperFetch<SleeperPlayersMap>('/players/nfl')
