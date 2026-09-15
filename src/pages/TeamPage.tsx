import { useMemo, useState } from 'react'
import { useParams } from 'react-router'
import { SLEEPER_LEAGUE_ID } from '../config'
import {
  useAllPlayers,
  useSeasonChain,
  useSeasonsRosters,
  useSeasonsUsers,
  useWeeksMatchups,
  type WeekRef,
} from '../api/hooks'
import { pairMatchups } from '../api/matchups'
import { playerDisplayName } from '../api/players'
import { mergeUsersAcrossSeasons, teamAvatarIdForUser, teamNameForUser } from '../api/standings'
import type { SeasonChainEntry } from '../api/seasonChain'
import type { SleeperRoster } from '../api/types'
import { PlayerHeadshot } from '../components/PlayerHeadshot'
import { SectionKicker } from '../components/SectionKicker'
import { TeamAvatar } from '../components/TeamAvatar'

interface OwnedSeason {
  season: SeasonChainEntry
  roster: SleeperRoster
}

const NO_SEASONS: SeasonChainEntry[] = []

function RosterGrid({
  title,
  playerIds,
  players,
  playersLoading,
}: {
  title: string
  playerIds: string[]
  players: ReturnType<typeof useAllPlayers>['data']
  playersLoading: boolean
}) {
  if (playerIds.length === 0) return null

  return (
    <div className="mt-4">
      <SectionKicker>{title}</SectionKicker>
      {playersLoading ? (
        <p className="text-charcoal-soft mt-2 text-sm">Loading roster…</p>
      ) : (
        <ul className="mt-2 grid grid-cols-1 gap-x-4 gap-y-2 sm:grid-cols-2">
          {playerIds.map((playerId) => {
            const player = players?.[playerId]
            const name = playerDisplayName(player, playerId)
            return (
              <li key={playerId} className="flex items-center gap-2 text-sm">
                <PlayerHeadshot playerId={playerId} name={name} />
                <span className="min-w-0 truncate">
                  {name}
                  {player?.position && (
                    <span className="text-charcoal-soft"> · {player.position}</span>
                  )}
                </span>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}

export function TeamPage() {
  const { ownerId } = useParams<{ ownerId: string }>()
  const seasonChain = useSeasonChain(SLEEPER_LEAGUE_ID)
  const seasons = seasonChain.data ?? NO_SEASONS
  const rosterQueries = useSeasonsRosters(seasons)
  const userQueries = useSeasonsUsers(seasons)
  const players = useAllPlayers()

  const allUsers = useMemo(
    () => mergeUsersAcrossSeasons(userQueries.map((q) => q.data ?? [])),
    [userQueries],
  )

  const ownedSeasons = useMemo<OwnedSeason[]>(() => {
    if (!ownerId) return []
    return seasons.flatMap((season, index) => {
      const roster = rosterQueries[index]?.data?.find((r) => r.owner_id === ownerId)
      return roster ? [{ season, roster }] : []
    })
  }, [seasons, rosterQueries, ownerId])

  const [selectedLeagueId, setSelectedLeagueId] = useState<string | null>(null)
  const selected =
    ownedSeasons.find((s) => s.season.leagueId === selectedLeagueId) ?? ownedSeasons[0]

  const weekRefs = useMemo<WeekRef[]>(() => {
    if (!selected) return []
    return Array.from({ length: selected.season.lastScoredLeg }, (_, i) => ({
      leagueId: selected.season.leagueId,
      week: i + 1,
      immutable: selected.season.status === 'complete',
    }))
  }, [selected])

  const weekQueries = useWeeksMatchups(weekRefs)

  const selectedSeasonRosters = useMemo(() => {
    if (!selected) return []
    const index = seasons.findIndex((s) => s.leagueId === selected.season.leagueId)
    return rosterQueries[index]?.data ?? []
  }, [selected, seasons, rosterQueries])

  const weekResults = useMemo(() => {
    if (!selected) return []
    return weekRefs
      .map((ref, index) => {
        const pairs = pairMatchups(weekQueries[index]?.data ?? [])
        const pair = pairs.find((p) => p.some((m) => m.roster_id === selected.roster.roster_id))
        if (!pair) return null
        const [self, opponent] =
          pair[0].roster_id === selected.roster.roster_id ? pair : [pair[1], pair[0]]
        const opponentOwnerId = selectedSeasonRosters.find(
          (r) => r.roster_id === opponent.roster_id,
        )?.owner_id
        const opponentName = opponentOwnerId
          ? teamNameForUser(opponentOwnerId, allUsers)
          : `Roster ${opponent.roster_id}`
        return { week: ref.week, self, opponent, opponentName }
      })
      .filter((w): w is NonNullable<typeof w> => w !== null)
      .reverse()
  }, [selected, weekRefs, weekQueries, selectedSeasonRosters, allUsers])

  const isLoading =
    seasonChain.isLoading ||
    userQueries.some((q) => q.isLoading) ||
    rosterQueries.some((q) => q.isLoading)

  if (!ownerId) return null

  const name = teamNameForUser(ownerId, allUsers)
  const avatarId = teamAvatarIdForUser(ownerId, allUsers)

  return (
    <section className="mx-auto max-w-3xl">
      <header className="flex flex-col items-center text-center">
        <TeamAvatar avatarId={avatarId} name={name} size="lg" />
        <h1 className="font-display text-charcoal mt-4 text-4xl">{name}</h1>
        <div className="gold-divider mt-5 w-16" aria-hidden="true" />
      </header>

      {isLoading && <p className="text-charcoal-soft mt-14 text-center">Loading the hall…</p>}

      {!isLoading && ownedSeasons.length === 0 && (
        <p className="text-charcoal-soft mt-14 text-center">No seasons found for this manager.</p>
      )}

      {!isLoading && ownedSeasons.length > 0 && selected && (
        <>
          <nav aria-label="Season" className="mt-10 flex flex-wrap justify-center gap-x-5 gap-y-2">
            {ownedSeasons.map(({ season }) => (
              <button
                key={season.leagueId}
                type="button"
                aria-current={season.leagueId === selected.season.leagueId}
                onClick={() => setSelectedLeagueId(season.leagueId)}
                className={`min-h-11 px-1 text-sm tracking-wide transition-colors duration-300 ${
                  season.leagueId === selected.season.leagueId
                    ? 'border-gold-bright text-charcoal border-b-2'
                    : 'text-charcoal-soft hover:text-charcoal border-b-2 border-transparent'
                }`}
              >
                {season.season}
              </button>
            ))}
          </nav>

          <div className="mt-3 text-center">
            <span className="text-charcoal-soft text-sm lining-nums tabular-nums">
              {selected.roster.settings.wins}-{selected.roster.settings.losses}
              {selected.roster.settings.ties > 0 ? `-${selected.roster.settings.ties}` : ''}
            </span>
          </div>

          <div className="mt-10">
            <SectionKicker>{selected.season.season} Season</SectionKicker>
            <h2 className="font-display text-charcoal mt-1 text-3xl">Week by week</h2>

            {weekResults.length === 0 ? (
              <p className="text-charcoal-soft mt-6 text-sm">No games played yet this season.</p>
            ) : (
              <div className="gallery-card mt-6 p-2 sm:p-3">
                <ul className="divide-charcoal/10 divide-y">
                  {weekResults.map(({ week, self, opponent, opponentName }) => {
                    const won = self.points > opponent.points
                    const bench = self.players.filter(
                      (id) => id !== '0' && !self.starters.includes(id),
                    )
                    const starters = self.starters.filter((id) => id !== '0')

                    return (
                      <li key={week}>
                        <details className="group px-3 py-3 sm:px-4">
                          <summary className="block min-h-11 w-full cursor-pointer list-none text-sm marker:content-none">
                            {/* Mobile (<sm): stack the label row and the
                                score/opponent row so a long opponent name
                                doesn't get truncated to a few characters
                                sharing a line with the week/result labels
                                and score. */}
                            <div className="flex flex-col gap-1 py-1 sm:hidden">
                              <div className="flex items-center justify-between gap-3">
                                <div className="flex items-center gap-3">
                                  <span className="text-charcoal-soft">Week {week}</span>
                                  <span
                                    className={`text-xs font-semibold tracking-wide uppercase ${
                                      won ? 'text-charcoal' : 'text-charcoal-soft'
                                    }`}
                                  >
                                    {won ? 'Win' : 'Loss'}
                                  </span>
                                </div>
                                <span
                                  aria-hidden="true"
                                  className="text-charcoal-soft shrink-0 transition-transform duration-300 group-open:rotate-90"
                                >
                                  ›
                                </span>
                              </div>
                              <div className="text-charcoal flex items-baseline justify-between gap-3">
                                <span className="shrink-0 lining-nums tabular-nums">
                                  {self.points.toFixed(1)} – {opponent.points.toFixed(1)}
                                </span>
                                <span className="text-charcoal-soft min-w-0 truncate text-right">
                                  vs {opponentName}
                                </span>
                              </div>
                            </div>

                            {/* sm+: compact single-line layout, room for score+name together. */}
                            <div className="hidden w-full items-center gap-3 sm:flex">
                              <span className="text-charcoal-soft w-14 shrink-0">Week {week}</span>
                              <span
                                className={`w-14 shrink-0 text-xs font-semibold tracking-wide uppercase ${
                                  won ? 'text-charcoal' : 'text-charcoal-soft'
                                }`}
                              >
                                {won ? 'Win' : 'Loss'}
                              </span>
                              <span className="text-charcoal min-w-0 flex-1 truncate">
                                <span className="lining-nums tabular-nums">
                                  {self.points.toFixed(1)} – {opponent.points.toFixed(1)}
                                </span>{' '}
                                vs {opponentName}
                              </span>
                              <span
                                aria-hidden="true"
                                className="text-charcoal-soft shrink-0 transition-transform duration-300 group-open:rotate-90"
                              >
                                ›
                              </span>
                            </div>
                          </summary>

                          <div className="pl-14">
                            <RosterGrid
                              title="Starters"
                              playerIds={starters}
                              players={players.data}
                              playersLoading={players.isLoading}
                            />
                            <RosterGrid
                              title="Bench"
                              playerIds={bench}
                              players={players.data}
                              playersLoading={players.isLoading}
                            />
                          </div>
                        </details>
                      </li>
                    )
                  })}
                </ul>
              </div>
            )}
          </div>
        </>
      )}
    </section>
  )
}
