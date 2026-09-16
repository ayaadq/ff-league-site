import { useQuery } from '@tanstack/react-query'
import { useMemo } from 'react'
import { recapFor, type WeekRecapContent } from '../content/recaps'
import { useAllPlayers, useCurrentSeason, useMatchups, useNflState, useRosters } from './hooks'
import { getLeague } from './sleeperClient'
import { STALE_TIME } from './staleTime'
import {
  weekAwards,
  weekRecap,
  type MatchupRecap,
  type TeamWeek,
  type WeekAwards,
} from './weeklyRecap'

/** The league object, for `roster_positions` — solving a best legal
 * lineup needs to know what the legal slots are. Nothing else in the app
 * needed the raw league until now; the season chain resolver fetches it
 * too, but returns only a reduced entry. */
export const useLeague = (leagueId: string) =>
  useQuery({
    queryKey: ['league', leagueId],
    queryFn: () => getLeague(leagueId),
    staleTime: STALE_TIME.live,
  })

/** Which week's results to show: the current one once it has scores on
 * the board, otherwise the one before.
 *
 * HomePage derives the same thing inline for its 2D scoreboard. The two
 * must agree — a journey narrating week 3 above a results table showing
 * week 2 would be worse than either alone — so when Home adopts this
 * hook, that inline copy should go. */
export function useResultsWeek(leagueId: string) {
  const nflState = useNflState()
  const week = nflState.data?.week ?? 1
  const previousWeek = Math.max(1, week - 1)
  const current = useMatchups(leagueId, week)
  const previous = useMatchups(leagueId, previousWeek)
  const hasCurrentScores = current.data?.some((m) => m.points > 0) ?? false
  return {
    week: hasCurrentScores ? week : previousWeek,
    matchups: hasCurrentScores ? current : previous,
  }
}

export interface WeekRecapData {
  season: string | undefined
  week: number
  /** Every team's week, including the derived possible/efficiency/bench
   * figures. Empty until the data it needs has loaded. */
  teams: TeamWeek[]
  /** The week's games, highest winning score first. */
  games: MatchupRecap[]
  awards: WeekAwards | null
  /** The authored half, when a recap has been written for this week.
   * Undefined is the normal case, not an error. */
  content: WeekRecapContent | undefined
  isLoading: boolean
}

/** Everything the weekly journey renders, in one call: the computed
 * figures from Sleeper and the authored commentary for the same week.
 *
 * Deliberately returns empty arrays rather than throwing or suspending
 * while data loads, so a consumer can render its structure immediately
 * and fill in — which is what the 3D sequence needs, since mounting the
 * canvas late would shift the scroll track under the camera rig. */
export function useWeekRecap(): WeekRecapData {
  const { leagueId, season } = useCurrentSeason()
  const league = useLeague(leagueId)
  const rosters = useRosters(leagueId)
  const players = useAllPlayers()
  const { week, matchups } = useResultsWeek(leagueId)

  const ownerByRosterId = useMemo(
    () => new Map((rosters.data ?? []).map((r) => [r.roster_id, r.owner_id ?? null])),
    [rosters.data],
  )

  const computed = useMemo(() => {
    const rosterPositions = league.data?.roster_positions
    if (!rosterPositions || !matchups.data || !players.data) {
      return { teams: [] as TeamWeek[], games: [] as MatchupRecap[] }
    }
    return weekRecap(matchups.data, ownerByRosterId, rosterPositions, players.data)
  }, [league.data, matchups.data, players.data, ownerByRosterId])

  const awards = useMemo(
    () => (computed.teams.length > 0 ? weekAwards(computed) : null),
    [computed],
  )

  return {
    season,
    week,
    teams: computed.teams,
    games: computed.games,
    awards,
    content: recapFor(season, week),
    isLoading: league.isLoading || rosters.isLoading || players.isLoading || matchups.isLoading,
  }
}
