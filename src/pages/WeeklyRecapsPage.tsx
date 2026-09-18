import { useMemo, useState } from 'react'
import { useParams } from 'react-router'
import {
  useAllPlayers,
  useCurrentSeason,
  useMatchups,
  useNflState,
  useRosters,
  useUsers,
} from '../api/hooks'
import { computeFullWeekRecap, type Grade } from '../api/computeFullWeekRecap'
import { playerNameForUser } from '../api/leagueRecords'
import { playerDisplayName } from '../api/players'
import { useLeague } from '../api/useWeekRecap'
import { weekAwards, weekRecap } from '../api/weeklyRecap'
import { SectionKicker } from '../components/SectionKicker'

const GRADE_CLASSES: Record<Grade, string> = {
  S: 'text-gold-bright',
  A: 'text-mute-on-ink',
  B: 'text-[#cd7f32]',
  C: 'text-mute-on-ink/70',
  D: 'text-red-400',
}

function MatchupCard({
  matchup,
}: {
  matchup: {
    winner: string
    winnerScore: number
    loser: string
    loserScore: number
    headline: string
  }
}) {
  const [expanded, setExpanded] = useState(false)
  return (
    <button
      type="button"
      onClick={() => setExpanded((e) => !e)}
      className="ink-surface w-full rounded-2xl border border-white/10 p-5 text-left transition-colors hover:border-white/20 sm:p-6"
    >
      <div className="flex items-center justify-between gap-4">
        <span className="text-marble truncate text-lg font-semibold sm:text-xl">
          {matchup.winner} <span className="text-mute-on-ink">def.</span> {matchup.loser}
        </span>
        <span className="text-marble shrink-0 text-lg font-semibold lining-nums tabular-nums sm:text-xl">
          {matchup.winnerScore.toFixed(2)}–{matchup.loserScore.toFixed(2)}
        </span>
      </div>
      <p className="text-mute-on-ink mt-2 text-sm">{matchup.headline}</p>
      {expanded && (
        <p className="text-mute-on-ink mt-4 border-t border-white/10 pt-4 text-sm leading-relaxed">
          {matchup.winner} controlled this one from the start, finishing at{' '}
          {matchup.winnerScore.toFixed(2)} against {matchup.loser}'s {matchup.loserScore.toFixed(2)}
          . Tap to collapse.
        </p>
      )}
    </button>
  )
}

/** The full weekly recap (PLAN.md "Weekly Recaps Page") — a dedicated
 * page linked from a CTA button on Home (`HomePage.tsx`), going deeper than
 * `WeeklyRecapSection.tsx`'s homepage teaser: every matchup individually,
 * a fuller award set, the whole power-ranking table, and an efficiency
 * chart. Every number here is real, computed from the same
 * `weekRecap()`/`weekAwards()` this project's other recap surfaces
 * already use (`computeFullWeekRecap.ts`) — no PDF content was ever
 * provided to transcribe here, so nothing on this page is fabricated
 * quotes or invented commentary.
 *
 * Full-bleed at the page level (breaks out of `Layout.tsx`'s own `px-6`),
 * with an inner `max-w-5xl` reading column for the actual content —
 * wide enough for the power-ranking/efficiency tables to breathe on
 * desktop without the prose sections stretching edge to edge. */
export function WeeklyRecapsPage() {
  const { leagueId, season } = useCurrentSeason()
  const nflState = useNflState()
  const league = useLeague(leagueId)
  const rosters = useRosters(leagueId)
  const users = useUsers(leagueId)
  const players = useAllPlayers()

  const currentWeek = nflState.data?.week ?? 1
  const latestAvailableWeek = Math.max(1, currentWeek - 1)
  // A direct-link URL (/weekly-recaps/week/:weekNumber) seeds the initial
  // selection; otherwise defaults to the latest concluded week. Only read
  // once on mount, same as any other "initial state from the URL"
  // pattern -- switching weeks afterward is the dropdown's own state, not
  // a navigation.
  const { weekNumber } = useParams<{ weekNumber?: string }>()
  const [selectedWeek, setSelectedWeek] = useState(() => {
    const parsed = weekNumber ? Number(weekNumber) : NaN
    return Number.isFinite(parsed) && parsed >= 1 ? parsed : latestAvailableWeek
  })

  const matchups = useMatchups(leagueId, selectedWeek)

  const prereqLoading =
    nflState.isLoading ||
    league.isLoading ||
    rosters.isLoading ||
    users.isLoading ||
    players.isLoading ||
    matchups.isLoading

  const recap = useMemo(() => {
    const rosterPositions = league.data?.roster_positions
    if (!rosterPositions || !matchups.data || !players.data || !rosters.data) return null

    const ownerByRosterId = new Map(rosters.data.map((r) => [r.roster_id, r.owner_id ?? null]))
    const { teams, games } = weekRecap(
      matchups.data,
      ownerByRosterId,
      rosterPositions,
      players.data,
    )
    if (teams.length === 0) return null
    const awards = weekAwards({ teams, games })

    const allUsers = users.data ?? []
    const nameForUser = (userId: string | null) =>
      userId ? playerNameForUser(userId, allUsers) : 'Unknown'
    const nameForPlayer = (playerId: string) =>
      playerDisplayName(players.data?.[playerId], playerId)

    return computeFullWeekRecap({
      week: selectedWeek,
      season: season ?? '',
      teams,
      games,
      awards,
      rosters: rosters.data,
      nameForUser,
      nameForPlayer,
    })
  }, [selectedWeek, season, league.data, matchups.data, players.data, rosters.data, users.data])

  const availableWeeks = Array.from(
    { length: latestAvailableWeek },
    (_, i) => latestAvailableWeek - i,
  )

  return (
    <div className="mx-[calc(50%-50vw)] w-screen">
      <div className="ink-surface px-6 py-16 sm:px-10 sm:py-20">
        <div className="mx-auto max-w-5xl">
          <header className="text-center">
            <SectionKicker tone="ink">
              {season ? `${season} Regular Season` : 'Season'}
            </SectionKicker>
            <h1 className="font-display text-marble mt-2 text-4xl sm:text-5xl">
              Week {selectedWeek} Recap
            </h1>
          </header>

          {prereqLoading && (
            <p className="text-mute-on-ink mt-14 animate-pulse text-center text-lg">
              Loading recap…
            </p>
          )}

          {!prereqLoading && !recap && (
            <p className="text-mute-on-ink mt-14 text-center text-lg">
              Recap unavailable for Week {selectedWeek}.
            </p>
          )}

          {recap && (
            <>
              {/* What Happened */}
              <section className="mx-auto mt-14 max-w-2xl" aria-labelledby="what-happened-heading">
                <h2
                  id="what-happened-heading"
                  className="font-display text-marble text-2xl sm:text-3xl"
                >
                  What The Hell Just Happened
                </h2>
                <div className="mt-5 space-y-4 text-left">
                  {recap.opener.split(/\n{2,}/).map((paragraph, i) => (
                    <p key={i} className="text-marble text-base leading-relaxed sm:text-lg">
                      {paragraph}
                    </p>
                  ))}
                </div>
              </section>

              {/* Matchups */}
              <section className="mt-16" aria-labelledby="matchups-heading">
                <h2 id="matchups-heading" className="font-display text-marble text-2xl sm:text-3xl">
                  Matchups
                </h2>
                <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
                  {recap.matchups.map((matchup, i) => (
                    <MatchupCard key={i} matchup={matchup} />
                  ))}
                </div>
              </section>

              {/* Awards */}
              <section className="mt-16" aria-labelledby="awards-heading">
                <h2 id="awards-heading" className="font-display text-marble text-2xl sm:text-3xl">
                  Awards
                </h2>
                <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {recap.awards.map((award) => (
                    <div key={award.name} className="rounded-xl border border-white/10 p-4">
                      <p className="text-mute-on-ink text-[0.65rem] tracking-[0.2em] uppercase">
                        {award.name}
                      </p>
                      <p className="text-gold-bright mt-1 text-lg font-semibold">{award.winner}</p>
                      <p className="text-mute-on-ink mt-1 text-sm">{award.description}</p>
                    </div>
                  ))}
                </div>
              </section>

              {/* Efficiency chart */}
              <section className="mt-16" aria-labelledby="efficiency-heading">
                <h2
                  id="efficiency-heading"
                  className="font-display text-marble text-2xl sm:text-3xl"
                >
                  Efficiency
                </h2>
                <div className="mt-6 overflow-x-auto">
                  <table className="w-full min-w-[480px] text-left text-sm">
                    <thead>
                      <tr className="text-mute-on-ink border-b border-white/10 text-xs tracking-wide uppercase">
                        <th className="py-2 font-normal">Team</th>
                        <th className="py-2 text-right font-normal">Scored</th>
                        <th className="py-2 text-right font-normal">Perfect</th>
                        <th className="py-2 text-right font-normal">Efficiency</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/10">
                      {recap.efficiencyChart.map((row) => (
                        <tr key={row.team}>
                          <td className="text-marble py-3">{row.team}</td>
                          <td className="text-marble py-3 text-right lining-nums tabular-nums">
                            {row.scored.toFixed(2)}
                          </td>
                          <td className="text-mute-on-ink py-3 text-right lining-nums tabular-nums">
                            {row.perfect.toFixed(2)}
                          </td>
                          <td className="text-marble py-3 text-right lining-nums tabular-nums">
                            {row.efficiency.toFixed(1)}%
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>

              {/* Power rankings */}
              <section className="mt-16" aria-labelledby="rankings-heading">
                <h2 id="rankings-heading" className="font-display text-marble text-2xl sm:text-3xl">
                  Power Rankings
                </h2>
                <ul className="mt-6 divide-y divide-white/10">
                  {recap.powerRankings.map((row) => (
                    <li key={row.rank} className="flex items-start gap-4 py-4">
                      <span className="text-mute-on-ink w-6 shrink-0 text-sm lining-nums tabular-nums">
                        {row.rank}
                      </span>
                      <span
                        className={`w-6 shrink-0 text-sm font-bold ${GRADE_CLASSES[row.grade]}`}
                      >
                        {row.grade}
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-3">
                          <span className="text-marble truncate font-semibold">{row.team}</span>
                          <span className="text-mute-on-ink shrink-0 text-sm lining-nums tabular-nums">
                            {row.record} · {row.points.toFixed(2)} pts
                          </span>
                        </div>
                        <p className="text-mute-on-ink mt-1 text-sm">{row.commentary}</p>
                      </div>
                    </li>
                  ))}
                </ul>
              </section>
            </>
          )}

          {/* Previous recaps */}
          {availableWeeks.length > 1 && (
            <section className="mt-16 text-center" aria-labelledby="previous-recaps-heading">
              <h2 id="previous-recaps-heading" className="font-display text-marble text-xl">
                Previous Recaps
              </h2>
              <label className="mx-auto mt-4 block max-w-xs text-sm">
                <span className="sr-only">Select a week</span>
                <select
                  value={selectedWeek}
                  onChange={(e) => setSelectedWeek(Number(e.target.value))}
                  className="text-marble ink-surface mt-1 block w-full rounded-none border border-white/20 bg-transparent px-2 py-2 text-center"
                >
                  {availableWeeks.map((w) => (
                    <option key={w} value={w} className="text-charcoal">
                      Week {w}
                    </option>
                  ))}
                </select>
              </label>
            </section>
          )}
        </div>
      </div>
    </div>
  )
}
