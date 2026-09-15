import { lazy, Suspense, useMemo } from 'react'
import { useCurrentSeason, useMatchups, useNflState, useRosters, useUsers } from '../api/hooks'
import { pairMatchups } from '../api/matchups'
import {
  sortStandings,
  teamAvatarIdForRoster,
  teamNameForRoster,
  totalPoints,
} from '../api/standings'
import { SectionKicker } from '../components/SectionKicker'
import { TeamAvatar } from '../components/TeamAvatar'
import { StatCountUp } from '../motion/StatCountUp'
import type { StandingEntry } from '../three/WeeklySummaryScene'

/** three + r3f + drei + gsap are by far the largest thing in the bundle
 * and none of it is needed to render this page's 2D content, so the
 * canvas is split into its own chunk and loaded after the page paints
 * (PLAN.md Phase 9 performance pass, SPEC.md §7.2's mobile budget).
 *
 * `fallback={null}` rather than a placeholder: the scroll track wrapping
 * the canvas has a fixed height, so the space is already reserved and a
 * spinner would just flash in a decorative, aria-hidden region. Nothing
 * shifts when the chunk lands, which also keeps ScrollTrigger from
 * measuring a moving target. */
const WeeklySummaryCanvas = lazy(() =>
  import('../three/WeeklySummaryCanvas').then((m) => ({ default: m.WeeklySummaryCanvas })),
)

export function HomePage() {
  const { leagueId, season } = useCurrentSeason()
  const rosters = useRosters(leagueId)
  const users = useUsers(leagueId)
  const nflState = useNflState()

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

  // Feeds the 3D standings podium below (three/WeeklySummaryScene.tsx) --
  // same rank order as the Standings table further down the page, just
  // reduced to what the 3D scene actually needs (roster id + avatar).
  const podiumStandings = useMemo<StandingEntry[]>(
    () =>
      standings.map((roster) => ({
        rosterId: roster.roster_id,
        avatarId: teamAvatarIdForRoster(roster, users.data ?? []),
      })),
    [standings, users.data],
  )

  const storylines = useMemo(() => {
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
    <section className="mx-auto max-w-4xl">
      <header className="text-center">
        <SectionKicker>{season ? `${season} Season` : 'Loading season…'}</SectionKicker>
        <h1 className="font-display text-charcoal mt-2 text-[clamp(2.75rem,9vw,4.5rem)] leading-[0.95]">
          Scoreboard
        </h1>
        <div className="gold-divider mx-auto mt-5 w-16" aria-hidden="true" />
      </header>

      {/* The live standings podium (PLAN.md pivot: this replaced the old
          static trophy gallery, which moved to League History -- see
          three/WeeklySummaryScene.tsx). Held off until standings/avatars
          are actually loaded rather than mounting with an empty roster
          list, since unlike the trophy room this scene has nothing
          generic to show while data is missing. Same sticky-track-inside-
          a-taller-wrapper pattern as History's TrophyRoomCanvas -- see
          three/ScrollCameraRig.tsx. */}
      {!isLoading && (
        <div aria-hidden="true" id="weekly-summary-scroll-track" className="h-[230vh] sm:h-[260vh]">
          <div className="sticky top-0 h-[58vh] min-h-[380px] w-full sm:h-[68vh]">
            <Suspense fallback={null}>
              <WeeklySummaryCanvas standings={podiumStandings} />
            </Suspense>
          </div>
        </div>
      )}

      {isLoading && <p className="text-charcoal-soft mt-14 text-center">Loading the room…</p>}

      {!isLoading && storylines && (
        <section className="mt-14 md:mt-20" aria-labelledby="storylines-heading">
          <SectionKicker>Week {resultsWeek}</SectionKicker>
          <h2 id="storylines-heading" className="font-display text-charcoal mt-1 text-3xl">
            Storylines
          </h2>

          <div className="gallery-card mt-6 p-6 sm:p-8">
            <div className="border-charcoal/10 flex items-center gap-4 border-b pb-6">
              <TeamAvatar
                avatarId={teamAvatarId(storylines.highScore.roster_id)}
                name={teamName(storylines.highScore.roster_id)}
                size="md"
              />
              <div className="min-w-0">
                <SectionKicker>High score</SectionKicker>
                <p className="text-gold-metal font-sans text-5xl leading-tight font-semibold lining-nums tabular-nums">
                  <StatCountUp value={storylines.highScore.points} />
                </p>
                <p className="text-charcoal-soft truncate text-sm">
                  {teamName(storylines.highScore.roster_id)}
                </p>
              </div>
            </div>

            <div className="mt-6 grid grid-cols-2 gap-6 sm:grid-cols-[3fr_2fr]">
              <div className="min-w-0">
                <SectionKicker>Biggest margin</SectionKicker>
                <p className="text-charcoal mt-1 font-sans text-2xl font-semibold lining-nums tabular-nums">
                  +<StatCountUp value={storylines.biggestMargin.margin} />
                </p>
                <p className="text-charcoal-soft truncate text-sm">
                  {teamName(storylines.biggestMargin.winner.roster_id)} def.{' '}
                  {teamName(storylines.biggestMargin.loser.roster_id)}
                </p>
              </div>
              <div className="min-w-0">
                <SectionKicker>Closest game</SectionKicker>
                <p className="text-charcoal mt-1 font-sans text-2xl font-semibold lining-nums tabular-nums">
                  <StatCountUp value={storylines.closestGame.margin} />
                </p>
                <p className="text-charcoal-soft truncate text-sm">
                  {teamName(storylines.closestGame.winner.roster_id)} def.{' '}
                  {teamName(storylines.closestGame.loser.roster_id)}
                </p>
              </div>
            </div>
          </div>
        </section>
      )}

      {!isLoading && hasResults && (
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
                  <li key={`${a.roster_id}-${b.roster_id}`} className="px-3 py-3 text-sm sm:px-4">
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
      )}

      {!isLoading && (
        <section className="mt-12 md:mt-16" aria-labelledby="standings-heading">
          <SectionKicker>{season}</SectionKicker>
          <h2 id="standings-heading" className="font-display text-charcoal mt-1 text-3xl">
            Standings
          </h2>
          <div className="relative mt-6">
            <div className="gallery-card overflow-x-auto p-4 sm:p-6">
              <table className="w-full min-w-[420px] text-left text-sm">
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
                  </tr>
                </thead>
                <tbody className="divide-charcoal/10 divide-y">
                  {standings.map((roster, index) => (
                    <tr key={roster.roster_id} className="hover:bg-marble/80 transition-colors">
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
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div
              aria-hidden="true"
              className="from-ivory pointer-events-none absolute inset-y-0 right-0 w-10 rounded-r-2xl bg-gradient-to-l to-transparent"
            />
          </div>
        </section>
      )}
    </section>
  )
}
