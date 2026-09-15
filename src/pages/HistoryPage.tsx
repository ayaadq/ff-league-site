import { useMemo, useState } from 'react'
import {
  bestSingleWeek,
  buildGameResults,
  championsByUser,
  headToHeadFor,
  longestWinStreak,
  type SeasonData,
} from '../api/leagueRecords'
import {
  useSeasonChain,
  useSeasonsBrackets,
  useSeasonsRosters,
  useSeasonsUsers,
  useWeeksMatchups,
  type WeekRef,
} from '../api/hooks'
import { mergeUsersAcrossSeasons, teamAvatarIdForUser, teamNameForUser } from '../api/standings'
import { SLEEPER_LEAGUE_ID } from '../config'
import type { SeasonChainEntry } from '../api/seasonChain'
import { SectionKicker } from '../components/SectionKicker'
import { TeamAvatar } from '../components/TeamAvatar'

const NO_SEASONS: SeasonChainEntry[] = []

export function HistoryPage() {
  const seasonChain = useSeasonChain(SLEEPER_LEAGUE_ID)
  const seasons = seasonChain.data ?? NO_SEASONS

  const rosterQueries = useSeasonsRosters(seasons)
  const bracketQueries = useSeasonsBrackets(seasons)
  const userQueries = useSeasonsUsers(seasons)

  const allUsers = useMemo(
    () => mergeUsersAcrossSeasons(userQueries.map((q) => q.data ?? [])),
    [userQueries],
  )

  const weekRefs = useMemo<WeekRef[]>(
    () =>
      seasons.flatMap((season) =>
        Array.from({ length: season.lastScoredLeg }, (_, i) => ({
          leagueId: season.leagueId,
          week: i + 1,
          immutable: season.status === 'complete',
        })),
      ),
    [seasons],
  )
  const weekQueries = useWeeksMatchups(weekRefs)

  const isLoading =
    seasonChain.isLoading ||
    rosterQueries.some((q) => q.isLoading) ||
    bracketQueries.some((q) => q.isLoading) ||
    userQueries.some((q) => q.isLoading) ||
    weekQueries.some((q) => q.isLoading)

  const seasonData = useMemo<SeasonData[]>(() => {
    const result: SeasonData[] = []
    let offset = 0
    for (const [index, season] of seasons.entries()) {
      const matchupsByWeek = weekQueries
        .slice(offset, offset + season.lastScoredLeg)
        .map((q) => q.data ?? [])
      offset += season.lastScoredLeg
      result.push({
        season: season.season,
        leagueId: season.leagueId,
        rosters: rosterQueries[index]?.data ?? [],
        bracket: bracketQueries[index]?.data ?? [],
        matchupsByWeek,
      })
    }
    return result
  }, [seasons, rosterQueries, bracketQueries, weekQueries])

  const games = useMemo(
    () => (isLoading ? [] : buildGameResults(seasonData)),
    [isLoading, seasonData],
  )
  const champions = useMemo(() => championsByUser(seasonData), [seasonData])
  const bestWeek = useMemo(() => bestSingleWeek(games), [games])
  const streak = useMemo(() => longestWinStreak(games), [games])

  const managers = useMemo(
    () =>
      allUsers
        .map((u) => ({ userId: u.user_id, name: u.metadata?.team_name ?? u.display_name }))
        .sort((a, b) => a.name.localeCompare(b.name)),
    [allUsers],
  )
  const [selectedManagerId, setSelectedManagerId] = useState<string | null>(null)
  const selectedManager = managers.find((m) => m.userId === selectedManagerId) ?? managers[0]

  const headToHead = useMemo(
    () => (selectedManager ? headToHeadFor(games, selectedManager.userId) : []),
    [games, selectedManager],
  )

  const championRows = useMemo(
    () =>
      [...champions.entries()]
        .map(([userId, count]) => ({ userId, count }))
        .sort((a, b) => b.count - a.count),
    [champions],
  )

  return (
    <section className="mx-auto max-w-3xl">
      <header className="text-center">
        <SectionKicker>Cross-Season</SectionKicker>
        <h1 className="font-display text-charcoal mt-2 text-4xl">League History</h1>
        <div className="bg-gold mx-auto mt-5 h-px w-16" aria-hidden="true" />
      </header>

      {isLoading && <p className="text-charcoal-soft mt-14 text-center">Loading the archives…</p>}

      {!isLoading && (
        <>
          {championRows.length > 0 && (
            <section className="mt-14" aria-labelledby="champions-heading">
              <h2 id="champions-heading" className="font-display text-charcoal text-3xl">
                Championships
              </h2>
              <ul className="divide-charcoal/10 border-charcoal/10 mt-6 divide-y border-t">
                {championRows.map(({ userId, count }) => (
                  <li key={userId} className="flex items-center gap-3 py-3 text-sm">
                    <TeamAvatar
                      avatarId={teamAvatarIdForUser(userId, allUsers)}
                      name={teamNameForUser(userId, allUsers)}
                    />
                    <span className="text-charcoal flex-1 truncate">
                      {teamNameForUser(userId, allUsers)}
                    </span>
                    <span className="text-charcoal lining-nums tabular-nums">
                      {count} {count === 1 ? 'title' : 'titles'}
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          <section className="mt-12 grid grid-cols-1 gap-8 sm:grid-cols-2" aria-label="Records">
            {bestWeek && (
              <div>
                <SectionKicker>Best single week</SectionKicker>
                <p className="text-charcoal font-sans text-4xl leading-tight font-semibold lining-nums tabular-nums">
                  {bestWeek.points.toFixed(1)}
                </p>
                <p className="text-charcoal-soft mt-1 text-sm">
                  {teamNameForUser(bestWeek.userId, allUsers)} — {bestWeek.season} Week{' '}
                  {bestWeek.week}
                </p>
              </div>
            )}

            {streak && (
              <div>
                <SectionKicker>Longest win streak</SectionKicker>
                <p className="text-charcoal font-sans text-4xl leading-tight font-semibold lining-nums tabular-nums">
                  {streak.length}
                </p>
                <p className="text-charcoal-soft mt-1 text-sm">
                  {teamNameForUser(streak.userId, allUsers)} — through {streak.endSeason} Week{' '}
                  {streak.endWeek}
                </p>
              </div>
            )}
          </section>

          {managers.length > 0 && (
            <section className="mt-14" aria-labelledby="h2h-heading">
              <h2 id="h2h-heading" className="font-display text-charcoal text-3xl">
                Head-to-Head
              </h2>

              <label className="mt-4 block text-sm">
                <span className="text-charcoal-soft">Manager</span>
                <select
                  value={selectedManager?.userId ?? ''}
                  onChange={(e) => setSelectedManagerId(e.target.value)}
                  className="border-charcoal/20 text-charcoal mt-1 block w-full max-w-xs min-w-0 rounded-none border bg-transparent px-2 py-2"
                >
                  {managers.map((m) => (
                    <option key={m.userId} value={m.userId}>
                      {m.name}
                    </option>
                  ))}
                </select>
              </label>

              {headToHead.length === 0 ? (
                <p className="text-charcoal-soft mt-6 text-sm">No games played yet.</p>
              ) : (
                <ul className="divide-charcoal/10 border-charcoal/10 mt-6 divide-y border-t">
                  {headToHead.map((record) => (
                    <li
                      key={record.opponentUserId}
                      className="flex items-center gap-3 py-3 text-sm"
                    >
                      <TeamAvatar
                        avatarId={teamAvatarIdForUser(record.opponentUserId, allUsers)}
                        name={teamNameForUser(record.opponentUserId, allUsers)}
                      />
                      <span className="text-charcoal flex-1 truncate">
                        {teamNameForUser(record.opponentUserId, allUsers)}
                      </span>
                      <span className="text-charcoal lining-nums tabular-nums">
                        {record.wins}-{record.losses}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          )}
        </>
      )}
    </section>
  )
}
