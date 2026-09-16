import { lazy, Suspense, useMemo, useState } from 'react'
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
import { allEvents, rivalries } from '../content/lore'

import { EnableSoundPrompt } from '../audio/EnableSoundPrompt'
import { Marquee } from '../components/Marquee'
import { ScrollCue } from '../components/ScrollCue'
import { ChunkErrorBoundary } from '../components/ChunkErrorBoundary'
import { Reveal } from '../motion/Reveal'
import { useSound } from '../audio/soundContext'
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
const TrophyRoomCanvas = lazy(() =>
  import('../three/TrophyRoomCanvas').then((m) => ({ default: m.TrophyRoomCanvas })),
)

const NO_SEASONS: SeasonChainEntry[] = []

export function HistoryPage() {
  const { play } = useSound()
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

  // Lore is a static import, so this never changes at runtime; memoized
  // only because allEvents() merges and sorts three arrays.
  const timeline = useMemo(() => allEvents(), [])

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
        <div className="gold-divider mx-auto mt-5 w-16" aria-hidden="true" />

        <div className="mt-8 flex flex-col items-center gap-9">
          <EnableSoundPrompt />
          <ScrollCue />
        </div>
      </header>

      {/* The trophy room scene lives here now (PLAN.md pivot: Home became
          a live weekly scoreboard, so the static marble/gold gallery moved
          to the one page that's genuinely about looking back at the
          league's record). Same sticky-track-inside-a-taller-wrapper
          pattern Home used to host it — see three/ScrollCameraRig.tsx and
          three/TrophyRoomCanvas.tsx, which owns its own scroll-track id
          and camera framing so this page doesn't need to supply either. */}
      <div aria-hidden="true" id="trophy-room-scroll-track" className="h-[230vh] sm:h-[260vh]">
        <div className="sticky top-0 h-[58vh] min-h-[380px] w-full sm:h-[68vh]">
          <ChunkErrorBoundary>
            <Suspense fallback={null}>
              <TrophyRoomCanvas />
            </Suspense>
          </ChunkErrorBoundary>
        </div>
      </div>

      {isLoading && <p className="text-charcoal-soft mt-14 text-center">Loading the archives…</p>}

      {!isLoading && (
        <>
          {championRows.length > 0 && (
            <Reveal sound>
              <section className="mt-14" aria-labelledby="champions-heading">
                <h2 id="champions-heading" className="font-display text-charcoal text-3xl">
                  Championships
                </h2>
                <div className="gallery-card mt-6 p-2 sm:p-3">
                  <ul className="divide-charcoal/10 divide-y">
                    {championRows.map(({ userId, count }) => (
                      <li
                        key={userId}
                        className="flex items-center gap-3 px-3 py-3 text-sm sm:px-4"
                      >
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
                </div>
              </section>
            </Reveal>
          )}

          <Reveal>
            <section className="mt-12 grid grid-cols-1 gap-8 sm:grid-cols-2" aria-label="Records">
              {bestWeek && (
                <div>
                  <SectionKicker>Best single week</SectionKicker>
                  <p className="text-gold-metal font-sans text-4xl leading-tight font-semibold lining-nums tabular-nums">
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
                  <p className="text-gold-metal font-sans text-4xl leading-tight font-semibold lining-nums tabular-nums">
                    {streak.length}
                  </p>
                  <p className="text-charcoal-soft mt-1 text-sm">
                    {teamNameForUser(streak.userId, allUsers)} — through {streak.endSeason} Week{' '}
                    {streak.endWeek}
                  </p>
                </div>
              )}
            </section>
          </Reveal>

          <Marquee text="Every season. Every score." className="mt-14" />

          {managers.length > 0 && (
            <Reveal sound>
              <section className="mt-14" aria-labelledby="h2h-heading">
                <h2 id="h2h-heading" className="font-display text-charcoal text-3xl">
                  Head-to-Head
                </h2>

                <label className="mt-4 block text-sm">
                  <span className="text-charcoal-soft">Manager</span>
                  <select
                    value={selectedManager?.userId ?? ''}
                    onChange={(e) => {
                      play('click')
                      setSelectedManagerId(e.target.value)
                    }}
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
                  <div className="gallery-card mt-6 p-2 sm:p-3">
                    <ul className="divide-charcoal/10 divide-y">
                      {headToHead.map((record) => (
                        <li
                          key={record.opponentUserId}
                          className="flex items-center gap-3 px-3 py-3 text-sm sm:px-4"
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
                  </div>
                )}
              </section>
            </Reveal>
          )}

          {rivalries.length > 0 && (
            <Reveal>
              <section className="mt-14" aria-labelledby="rivalries-heading">
                <h2 id="rivalries-heading" className="font-display text-charcoal text-3xl">
                  Rivalries
                </h2>
                <ul className="mt-6 space-y-6">
                  {rivalries.map((rivalry) => (
                    <li key={rivalry.id}>
                      <SectionKicker>
                        {teamNameForUser(rivalry.teamAUserId, allUsers)} vs{' '}
                        {teamNameForUser(rivalry.teamBUserId, allUsers)}
                        {rivalry.since ? ` \u00b7 since ${rivalry.since}` : ''}
                      </SectionKicker>
                      <h3 className="font-display text-charcoal mt-1 text-xl">{rivalry.name}</h3>
                      {rivalry.description && (
                        <p className="text-charcoal-soft mt-1 text-sm leading-relaxed">
                          {rivalry.description}
                        </p>
                      )}
                    </li>
                  ))}
                </ul>
              </section>
            </Reveal>
          )}

          {timeline.length > 0 && (
            <Reveal>
              <section className="mt-14" aria-labelledby="timeline-heading">
                <h2 id="timeline-heading" className="font-display text-charcoal text-3xl">
                  Notable Events
                </h2>
                <ul className="mt-6 space-y-5">
                  {timeline.map((event, index) => (
                    <li key={`${event.season}-${event.week ?? 0}-${index}`}>
                      <SectionKicker>
                        {event.season}
                        {event.week ? ` \u00b7 Week ${event.week}` : ''}
                      </SectionKicker>
                      <h3 className="text-charcoal mt-1 text-lg">{event.title}</h3>
                      {event.description && (
                        <p className="text-charcoal-soft mt-1 text-sm leading-relaxed">
                          {event.description}
                        </p>
                      )}
                    </li>
                  ))}
                </ul>
              </section>
            </Reveal>
          )}
        </>
      )}
    </section>
  )
}
