import { useMemo } from 'react'
import {
  useAllPlayers,
  useCurrentSeason,
  useMatchups,
  useNflState,
  useRosters,
  useUsers,
  useWeeksMatchups,
  useWeeksTransactions,
  type WeekRef,
} from '../api/hooks'
import { pairMatchups } from '../api/matchups'
import { playerDisplayName } from '../api/players'
import { seasonLeaders } from '../api/seasonLeaders'
import { banterForWeek } from '../content/banter'
import {
  currentStreaks,
  sortStandings,
  teamAvatarIdForRoster,
  teamAvatarIdForUser,
  teamNameForRoster,
  teamNameForUser,
  totalPoints,
  totalPointsAgainst,
} from '../api/standings'
import { summarizeTransactions } from '../api/transactions'
import { useWeekRecap } from '../api/useWeekRecap'
import { ActivityFeed } from '../components/ActivityFeed'
import { EfficiencyChart } from '../components/EfficiencyChart'
import { GameOfTheWeekHero } from '../components/GameOfTheWeekHero'
import { HeroSection } from '../components/HeroSection'
import { PaperCrumpleSection } from '../components/PaperCrumpleSection'
import { RecapAwards } from '../components/RecapAwards'
import { RecapRankings } from '../components/RecapRankings'
import { RecapStorylines } from '../components/RecapStorylines'
import { NextWeekPreview } from '../components/NextWeekPreview'
import { SeasonLeadersSection } from '../components/SeasonLeadersSection'
import { SmackTalkFeed } from '../components/SmackTalkFeed'
import { WeeklyJourney } from '../components/WeeklyJourney'
import { WeeklyRecapSection } from '../components/WeeklyRecapSection'
import { Marquee } from '../components/Marquee'
import { Reveal } from '../motion/Reveal'
import { SectionKicker } from '../components/SectionKicker'
import { TeamAvatar } from '../components/TeamAvatar'
import { StatCountUp } from '../motion/StatCountUp'

/** How many trailing weeks of transactions feed the activity list — a
 * recent-activity read, not a season archive (that's what a future
 * per-team page would be for). */
const ACTIVITY_WEEKS = 3
const ACTIVITY_LIMIT = 8

export function HomePage() {
  const { leagueId, season } = useCurrentSeason()
  const rosters = useRosters(leagueId)
  const users = useUsers(leagueId)
  // Same query useWeekRecap() already makes internally (queryKey
  // ['players']) -- TanStack Query dedupes by key, so this is the
  // cached result, not a second ~5MB fetch. Needed here too since
  // WeeklyJourney's standout-player headshots resolve names from raw
  // player_ids and useWeekRecap doesn't expose the players map itself.
  const players = useAllPlayers()
  const nflState = useNflState()
  // Computed from the raw API: best legal lineup, efficiency, points
  // left on the bench. See api/weeklyRecap.ts -- verified against the
  // league's own published Week 1 numbers.
  const recap = useWeekRecap()

  const week = nflState.data?.week ?? 1
  const previousWeek = Math.max(1, week - 1)
  const currentWeekMatchups = useMatchups(leagueId, week)
  const previousWeekMatchups = useMatchups(leagueId, previousWeek)

  const hasCurrentScores = currentWeekMatchups.data?.some((m) => m.points > 0) ?? false
  const resultsWeek = hasCurrentScores ? week : previousWeek
  const resultsMatchups = hasCurrentScores ? currentWeekMatchups : previousWeekMatchups

  const rosterFor = (rosterId: number) => rosters.data?.find((r) => r.roster_id === rosterId)
  const teamName = (rosterId: number) => {
    const roster = rosterFor(rosterId)
    return roster ? teamNameForRoster(roster, users.data ?? []) : `Roster ${rosterId}`
  }
  const teamAvatarId = (rosterId: number) => {
    const roster = rosterFor(rosterId)
    return roster ? teamAvatarIdForRoster(roster, users.data ?? []) : null
  }

  const pairs = useMemo(() => pairMatchups(resultsMatchups.data ?? []), [resultsMatchups.data])

  const hasResults = pairs.some((pair) => pair.some((m) => m.points > 0))

  const standings = useMemo(() => sortStandings(rosters.data ?? []), [rosters.data])

  // Current-season win/loss streaks — every week through resultsWeek,
  // weeks strictly before the live NFL week are immutable and cached
  // forever, the live week itself stays short-staleTime (same split
  // useMatchups/useWeeksMatchups already share a query key over).
  const streakWeekRefs = useMemo<WeekRef[]>(
    () =>
      Array.from({ length: resultsWeek }, (_, i) => i + 1).map((w) => ({
        leagueId,
        week: w,
        immutable: w !== week,
      })),
    [leagueId, resultsWeek, week],
  )
  const streakWeeksMatchups = useWeeksMatchups(streakWeekRefs)
  const streaks = useMemo(
    () => currentStreaks(streakWeeksMatchups.map((q) => q.data ?? [])),
    [streakWeeksMatchups],
  )

  // Season point-total leaders (PLAN.md Phase 13C) -- reuses the same
  // season-long matchups already fetched for the streaks above, no new
  // API calls.
  const leaders = useMemo(
    () =>
      seasonLeaders(
        streakWeeksMatchups.map((q) => q.data ?? []),
        players.data,
      ),
    [streakWeeksMatchups, players.data],
  )

  // Recent trades/waivers for the activity feed -- the last few weeks
  // only, not the full season archive.
  const activityWeekRefs = useMemo<WeekRef[]>(
    () =>
      Array.from({ length: Math.min(ACTIVITY_WEEKS, resultsWeek) }, (_, i) => resultsWeek - i).map(
        (w) => ({ leagueId, week: w, immutable: w !== week }),
      ),
    [leagueId, resultsWeek, week],
  )
  const activityWeeksTransactions = useWeeksTransactions(activityWeekRefs)
  const recentActivity = useMemo(
    () =>
      activityWeeksTransactions
        .flatMap((q, i) =>
          summarizeTransactions(q.data ?? [], activityWeekRefs[i].week, (playerId) =>
            playerDisplayName(players.data?.[playerId], playerId),
          ),
        )
        .sort((a, b) => b.created - a.created)
        .slice(0, ACTIVITY_LIMIT),
    [activityWeeksTransactions, activityWeekRefs, players.data],
  )

  // Computed highlights (highest score, biggest margin, closest game) --
  // distinct from the authored RecapStorylines act above: this is derived
  // live from Sleeper's numbers, not written copy, and was renamed from
  // "Storylines" to "Week Highlights" (PLAN.md Phase 12 reorder) so it no
  // longer shares a name with the authored act while the two sit far
  // apart in the new scroll order.
  const weekHighlights = useMemo(() => {
    if (!hasResults) return null
    const allEntries = pairs.flat().filter((m) => m.points > 0)
    if (allEntries.length === 0) return null

    const highScore = allEntries.reduce((best, m) => (m.points > best.points ? m : best))
    const margins = pairs.map((pair) => {
      const [a, b] = pair
      const winner = a.points >= b.points ? a : b
      const loser = a.points >= b.points ? b : a
      return { winner, loser, margin: winner.points - loser.points }
    })
    const biggestMargin = margins.reduce((best, m) => (m.margin > best.margin ? m : best))
    const closestGame = margins.reduce((best, m) => (m.margin < best.margin ? m : best))

    return { highScore, biggestMargin, closestGame }
  }, [pairs, hasResults])

  const isLoading =
    rosters.isLoading ||
    users.isLoading ||
    nflState.isLoading ||
    currentWeekMatchups.isLoading ||
    previousWeekMatchups.isLoading

  return (
    <>
      <HeroSection season={season} />

      <section className="mx-auto max-w-4xl">
        {/* Act 1 -- Storylines: the recap's authored "what the hell just
          happened" openers (PLAN.md Phase 12). */}
        {recap.content && (
          <Reveal sound>
            <RecapStorylines
              title={recap.content.storylinesTitle}
              storylines={recap.content.storylines}
            />
          </Reveal>
        )}

        <GameOfTheWeekHero
          week={recap.week}
          games={recap.games}
          content={recap.content}
          nameFor={(userId) => (userId ? teamNameForUser(userId, users.data ?? []) : 'Unknown')}
        />

        {/* Act 2 -- the sky-cam football-kick journey (PLAN.md Phase H).
          Its own sticky scroll track and camera rig (three/JourneyCanvas.tsx)
          are entirely self-contained -- no Reveal wrapper here or
          anywhere inside it, since a transform on an ancestor of a
          `position: sticky` element breaks the stickiness (see PLAN.md
          Phase 12's reorder-risk note). */}
        <WeeklyJourney
          week={recap.week}
          games={recap.games}
          content={recap.content}
          nameFor={(userId) => (userId ? teamNameForUser(userId, users.data ?? []) : 'Unknown')}
          playerNameFor={(playerId) => playerDisplayName(players.data?.[playerId], playerId)}
        />

        {/* Paper crumple transition into the full recap page -- self-
          contained, own scroll track, no Reveal wrapper for the same
          sticky/transform reason WeeklyJourney above has none. */}
        <PaperCrumpleSection />

        {/* Auto-generated trash-talk teaser of last week (PLAN.md Phase
          H.6 Alternative) -- distinct from Act 1 above: this renders every
          week from live Sleeper numbers via hand-authored templates,
          whether or not anyone has hand-authored a recap for it. Sits
          after the paper-crumple CTA now (moved from before Act 1) so the
          "view full recap" button leads straight into this shorter teaser
          before the rest of the page continues. No Reveal wrapper -- it
          manages its own scroll-scrubbed enter/exit animation. */}
        <WeeklyRecapSection />

        <SeasonLeadersSection leaders={leaders} />

        {/* Act 3 -- Awards. */}
        {recap.content?.awards && (
          <Reveal>
            <RecapAwards
              title={recap.content.awardsTitle}
              awards={recap.content.awards}
              nameFor={(userId) => teamNameForUser(userId, users.data ?? [])}
              avatarFor={(userId) => teamAvatarIdForUser(userId, users.data ?? [])}
            />
          </Reveal>
        )}

        <SmackTalkFeed
          lines={banterForWeek(recap.week)}
          nameFor={(userId) => teamNameForUser(userId, users.data ?? [])}
          avatarFor={(userId) => teamAvatarIdForUser(userId, users.data ?? [])}
        />

        {/* Act 4 -- actual-vs-perfect efficiency chart. Pure computation,
          needs no authored copy. */}
        {recap.teams.length > 0 && (
          <Reveal sound>
            <section className="mt-12 md:mt-16" aria-labelledby="efficiency-heading">
              <SectionKicker>Week {recap.week}</SectionKicker>
              <h2 id="efficiency-heading" className="font-display text-charcoal mt-1 text-3xl">
                What you scored vs what you had
              </h2>
              <EfficiencyChart teams={recap.teams} nameFor={(team) => teamName(team.rosterId)} />
            </section>
          </Reveal>
        )}

        {/* Act 5 -- power rankings + closing piece (PLAN.md Phase 12).
          Renders nothing when unauthored, same as RecapStorylines/
          RecapAwards -- Week 1's content file has no rankings/closing
          yet, and that's the normal state most weeks, not a gap to
          placeholder over (see RecapRankings.tsx and PLAN.md's own "a
          week with no authored recap must render as pure data"). */}
        {recap.content && (
          <Reveal>
            <RecapRankings
              title={recap.content.rankingsTitle}
              intro={recap.content.rankingsIntro}
              rankings={recap.content.rankings}
              closing={recap.content.closing}
              nameFor={(userId) => teamNameForUser(userId, users.data ?? [])}
              avatarFor={(userId) => teamAvatarIdForUser(userId, users.data ?? [])}
            />
          </Reveal>
        )}

        {isLoading && <p className="text-charcoal-soft mt-14 text-center">Loading the room…</p>}

        {/* Standings finale cluster -- "then standings, still reachable
          below" (PLAN.md Phase 12): the journey ends and the page settles
          back into the marble gallery's live numbers. Marquee as the
          transition beat, this week's box scores and highlights, then the
          3D wall, the season standings table, and recent trades/waivers
          as the last thing on the page (Layout.tsx has no footer, so
          this is genuinely the end). */}
        {!isLoading && <Marquee text="Twelve teams. One trophy." className="mt-16 md:mt-24" />}

        {!isLoading && hasResults && (
          <Reveal>
            <section className="mt-12 md:mt-16" aria-labelledby="results-heading">
              <SectionKicker>Week {resultsWeek}</SectionKicker>
              <h2 id="results-heading" className="font-display text-charcoal mt-1 text-3xl">
                Results
              </h2>
              <div className="gallery-card mt-6 p-2 sm:p-3">
                <ul className="divide-charcoal/10 divide-y">
                  {pairs.map(([a, b]) => {
                    const aWins = a.points >= b.points
                    return (
                      <li
                        key={`${a.roster_id}-${b.roster_id}`}
                        className="px-3 py-3 text-sm sm:px-4"
                      >
                        {/* Mobile (<sm): each team gets its own full-width line so
                        long team names don't get crushed into a three-column
                        row and truncate to a few characters. */}
                        <div className="flex flex-col gap-1.5 sm:hidden">
                          <div className="flex min-w-0 items-center justify-between gap-3">
                            <div className="flex min-w-0 items-center gap-2">
                              <TeamAvatar
                                avatarId={teamAvatarId(a.roster_id)}
                                name={teamName(a.roster_id)}
                              />
                              <span
                                className={`truncate ${aWins ? 'text-charcoal' : 'text-charcoal-soft'}`}
                              >
                                {teamName(a.roster_id)}
                              </span>
                            </div>
                            <span className="text-charcoal shrink-0 lining-nums tabular-nums">
                              {a.points.toFixed(1)}
                            </span>
                          </div>
                          <div className="flex min-w-0 items-center justify-between gap-3">
                            <div className="flex min-w-0 items-center gap-2">
                              <TeamAvatar
                                avatarId={teamAvatarId(b.roster_id)}
                                name={teamName(b.roster_id)}
                              />
                              <span
                                className={`truncate ${aWins ? 'text-charcoal-soft' : 'text-charcoal'}`}
                              >
                                {teamName(b.roster_id)}
                              </span>
                            </div>
                            <span className="text-charcoal shrink-0 lining-nums tabular-nums">
                              {b.points.toFixed(1)}
                            </span>
                          </div>
                        </div>

                        {/* sm+: compact three-column row now that there's room. */}
                        <div className="hidden items-center gap-2 sm:flex">
                          <div className="flex min-w-0 flex-1 items-center gap-2">
                            <TeamAvatar
                              avatarId={teamAvatarId(a.roster_id)}
                              name={teamName(a.roster_id)}
                            />
                            <span
                              className={`truncate ${aWins ? 'text-charcoal' : 'text-charcoal-soft'}`}
                            >
                              {teamName(a.roster_id)}
                            </span>
                          </div>
                          <span className="text-charcoal shrink-0 px-2 lining-nums tabular-nums">
                            {a.points.toFixed(1)} – {b.points.toFixed(1)}
                          </span>
                          <div className="flex min-w-0 flex-1 flex-row-reverse items-center gap-2 text-right">
                            <TeamAvatar
                              avatarId={teamAvatarId(b.roster_id)}
                              name={teamName(b.roster_id)}
                            />
                            <span
                              className={`truncate ${aWins ? 'text-charcoal-soft' : 'text-charcoal'}`}
                            >
                              {teamName(b.roster_id)}
                            </span>
                          </div>
                        </div>
                      </li>
                    )
                  })}
                </ul>
              </div>
            </section>
          </Reveal>
        )}

        {!isLoading && weekHighlights && (
          <Reveal sound>
            <section className="mt-14 md:mt-20" aria-labelledby="week-highlights-heading">
              <SectionKicker>Week {resultsWeek}</SectionKicker>
              <h2 id="week-highlights-heading" className="font-display text-charcoal mt-1 text-3xl">
                Week Highlights
              </h2>

              <div className="gallery-card mt-6 p-6 sm:p-8">
                <div className="border-charcoal/10 flex items-center gap-4 border-b pb-6">
                  <TeamAvatar
                    avatarId={teamAvatarId(weekHighlights.highScore.roster_id)}
                    name={teamName(weekHighlights.highScore.roster_id)}
                    size="md"
                  />
                  <div className="min-w-0">
                    <SectionKicker>High score</SectionKicker>
                    <p className="text-gold-metal font-sans text-5xl leading-tight font-semibold lining-nums tabular-nums">
                      <StatCountUp value={weekHighlights.highScore.points} />
                    </p>
                    <p className="text-charcoal-soft truncate text-sm">
                      {teamName(weekHighlights.highScore.roster_id)}
                    </p>
                  </div>
                </div>

                <div className="mt-6 grid grid-cols-2 gap-6 sm:grid-cols-[3fr_2fr]">
                  <div className="min-w-0">
                    <SectionKicker>Biggest margin</SectionKicker>
                    <p className="text-charcoal mt-1 font-sans text-2xl font-semibold lining-nums tabular-nums">
                      +<StatCountUp value={weekHighlights.biggestMargin.margin} />
                    </p>
                    <p className="text-charcoal-soft truncate text-sm">
                      {teamName(weekHighlights.biggestMargin.winner.roster_id)} def.{' '}
                      {teamName(weekHighlights.biggestMargin.loser.roster_id)}
                    </p>
                  </div>
                  <div className="min-w-0">
                    <SectionKicker>Closest game</SectionKicker>
                    <p className="text-charcoal mt-1 font-sans text-2xl font-semibold lining-nums tabular-nums">
                      <StatCountUp value={weekHighlights.closestGame.margin} />
                    </p>
                    <p className="text-charcoal-soft truncate text-sm">
                      {teamName(weekHighlights.closestGame.winner.roster_id)} def.{' '}
                      {teamName(weekHighlights.closestGame.loser.roster_id)}
                    </p>
                  </div>
                </div>
              </div>
            </section>
          </Reveal>
        )}

        <NextWeekPreview />

        {!isLoading && (
          <Reveal sound>
            <section className="mt-12 md:mt-16" aria-labelledby="standings-heading">
              <SectionKicker>{season}</SectionKicker>
              <h2 id="standings-heading" className="font-display text-charcoal mt-1 text-3xl">
                Standings
              </h2>
              <div className="relative mt-6">
                <div className="gallery-card overflow-x-auto p-4 sm:p-6">
                  <table className="w-full min-w-[560px] text-left text-sm">
                    <thead>
                      <tr className="border-charcoal/20 text-charcoal-soft border-b text-xs tracking-wide uppercase">
                        <th scope="col" className="py-2 font-normal">
                          #
                        </th>
                        <th scope="col" className="py-2 font-normal">
                          Team
                        </th>
                        <th scope="col" className="py-2 text-right font-normal">
                          W-L-T
                        </th>
                        <th scope="col" className="py-2 text-right font-normal">
                          PF
                        </th>
                        <th scope="col" className="py-2 text-right font-normal">
                          PA
                        </th>
                        <th scope="col" className="py-2 text-right font-normal">
                          Streak
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-charcoal/10 divide-y">
                      {standings.map((roster, index) => {
                        const streak = streaks.get(roster.roster_id)
                        return (
                          <tr
                            key={roster.roster_id}
                            className="hover:bg-marble/80 transition-colors"
                          >
                            <td className="text-charcoal-soft py-3 lining-nums tabular-nums">
                              {index + 1}
                            </td>
                            <td className="text-charcoal py-3">
                              <div className="flex items-center gap-2">
                                <TeamAvatar
                                  avatarId={teamAvatarIdForRoster(roster, users.data ?? [])}
                                  name={teamNameForRoster(roster, users.data ?? [])}
                                />
                                <span className="truncate">
                                  {teamNameForRoster(roster, users.data ?? [])}
                                </span>
                              </div>
                            </td>
                            <td className="text-charcoal py-3 text-right lining-nums tabular-nums">
                              {roster.settings.wins}-{roster.settings.losses}-{roster.settings.ties}
                            </td>
                            <td className="text-charcoal py-3 text-right lining-nums tabular-nums">
                              {totalPoints(roster.settings).toFixed(1)}
                            </td>
                            <td className="text-charcoal-soft py-3 text-right lining-nums tabular-nums">
                              {totalPointsAgainst(roster.settings).toFixed(1)}
                            </td>
                            <td
                              className={`py-3 text-right lining-nums tabular-nums ${
                                streak?.type === 'W' ? 'text-charcoal' : 'text-charcoal-soft'
                              }`}
                            >
                              {streak ? `${streak.type}${streak.length}` : '–'}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
                <div
                  aria-hidden="true"
                  className="from-ivory pointer-events-none absolute inset-y-0 right-0 w-10 rounded-r-2xl bg-gradient-to-l to-transparent"
                />
              </div>
            </section>
          </Reveal>
        )}

        {!isLoading && recentActivity.length > 0 && (
          <Reveal>
            <ActivityFeed
              transactions={recentActivity}
              nameFor={teamName}
              avatarFor={teamAvatarId}
            />
          </Reveal>
        )}
      </section>
    </>
  )
}
