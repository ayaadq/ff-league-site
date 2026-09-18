import { lazy, Suspense, useMemo, useState } from 'react'
import {
  bestSingleWeek,
  buildGameResults,
  headToHeadFor,
  longestWinStreak,
  playerNameForUser,
  playerChampionships,
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
import { mergeUsersAcrossSeasons, teamAvatarIdForUser } from '../api/standings'
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
const TrophyLineCanvas = lazy(() =>
  import('../three/TrophyLineCanvas').then((m) => ({ default: m.TrophyLineCanvas })),
)

const NO_SEASONS: SeasonChainEntry[] = []

/** Scroll dwell per trophy slot, plus a flat lead-in/lead-out buffer —
 * the whole line's scroll track needs to scale with however many
 * distinct champions there are (real Sleeper data, not a fixed count),
 * so "no cutoff, all players visible" holds regardless of how many
 * people have won a title by the time this renders. Raised from 70/60svh
 * (PLAN.md Phase H.5 hotfix #4) — 70svh per slot felt fast enough that a
 * normal scroll speed could carry a reader through most of the line
 * before they'd registered what was happening, and now matches
 * WeeklyJourney's own per-matchup dwell (100svh, "every matchup is
 * exactly one screen tall") for a consistent pace between this project's
 * two scroll-driven "walk through N things" sections. The bigger
 * contributor to champions actually getting cut off was a real bug in
 * `trophyLineLayout.ts`'s camera math (fixed alongside this), not just
 * this number being too small on its own. */
const TROPHY_SLOT_SVH = 100
const TROPHY_TRACK_BUFFER_SVH = 90

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
  const bestWeek = useMemo(() => bestSingleWeek(games), [games])
  const streak = useMemo(() => longestWinStreak(games), [games])

  const managers = useMemo(
    () =>
      allUsers
        .map((u) => ({ userId: u.user_id, name: playerNameForUser(u.user_id, allUsers) }))
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

  // The single combined, player-named championship list (PLAN.md Phase
  // H.5) -- replaces the old separate aggregate-count and year-by-year
  // sections entirely. Already sorted (title count, then career wins,
  // then career points for) by playerChampionships() itself -- the exact
  // order both this list and the 3D trophy line below render in, by
  // construction, not two independently-sorted copies.
  const championships = useMemo(
    () => playerChampionships(seasonData, allUsers),
    [seasonData, allUsers],
  )

  const trophyLineEntries = useMemo(
    () => championships.map((c) => ({ playerName: c.playerName, count: c.count })),
    [championships],
  )
  const [activeTrophyIndex, setActiveTrophyIndex] = useState(0)
  const activeChampion = championships[activeTrophyIndex]
  const trophyTrackHeight = `${Math.max(1, trophyLineEntries.length) * TROPHY_SLOT_SVH + TROPHY_TRACK_BUFFER_SVH}svh`

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

      {isLoading && <p className="text-charcoal-soft mt-14 text-center">Loading the archives…</p>}

      {!isLoading && (
        <>
          {championships.length > 0 && (
            <Reveal sound>
              <section className="mt-14" aria-labelledby="champions-heading">
                <h2 id="champions-heading" className="font-display text-charcoal text-3xl">
                  Championships
                </h2>
                {/* One combined tab (PLAN.md Phase H.5) -- replaces the old
                  separate aggregate-count and year-by-year sections.
                  Player names throughout (not team names): pre-Sleeper
                  years have no Sleeper identity to resolve a team name
                  from in the first place, and the Sleeper-era years are
                  converted through playerNameForUser, so there's no
                  avatar to show here either -- unlike every other list on
                  this page, which resolves a single specific manager's
                  current team avatar, a multi-year row here would have to
                  pick one of potentially several different teams/seasons
                  to represent, which isn't a real single "avatar" to
                  show. */}
                <div className="gallery-card mt-6 p-2 sm:p-3">
                  <ul className="divide-charcoal/10 divide-y">
                    {championships.map((c) => (
                      <li
                        key={c.playerName}
                        className="flex items-center justify-between gap-3 px-3 py-3 text-sm sm:px-4"
                      >
                        <span className="text-charcoal flex-1 truncate">
                          {c.playerName} — {c.count}x Champion
                        </span>
                        <span className="text-charcoal-soft shrink-0 lining-nums tabular-nums">
                          {c.years.join(', ')}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              </section>
            </Reveal>
          )}

          {/* The trophy line (PLAN.md Phase H.5) -- replaces the old
            marble/gold TrophyRoomScene entirely on this page. Full-bleed
            (same `w-screen` + calc-based negative margin trick the
            journey's own fullscreen fix uses, PLAN.md Phase H.3) since
            this page wraps everything in a `max-w-3xl` reading column,
            same problem the journey had on Home. Ink background instead
            of TrophyRoomCanvas's flat paper-white -- see
            TrophyLineCanvas.tsx's own comment on why that's set on the
            canvas itself rather than relying on transparency. */}
          {trophyLineEntries.length > 0 && (
            <div
              aria-hidden="true"
              id="trophy-line-scroll-track"
              className="mx-[calc(50%-50vw)] mt-14 w-screen"
              style={{ height: trophyTrackHeight }}
            >
              <div className="bg-charcoal sticky top-0 h-svh w-full overflow-hidden">
                <ChunkErrorBoundary>
                  <Suspense fallback={null}>
                    <TrophyLineCanvas
                      trackId="trophy-line-scroll-track"
                      entries={trophyLineEntries}
                      onActiveChange={setActiveTrophyIndex}
                    />
                  </Suspense>
                </ChunkErrorBoundary>

                {activeChampion && (
                  <div className="pointer-events-none absolute inset-x-0 bottom-10 flex flex-col items-center gap-1 text-center transition-opacity duration-300 sm:bottom-14">
                    <span className="text-mute-on-ink text-[0.65rem] tracking-[0.3em] uppercase">
                      {activeChampion.count}x Champion
                    </span>
                    <span className="font-display text-marble text-3xl sm:text-4xl">
                      {activeChampion.playerName}
                    </span>
                  </div>
                )}
              </div>
            </div>
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
                    {playerNameForUser(bestWeek.userId, allUsers)} — {bestWeek.season} Week{' '}
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
                    {playerNameForUser(streak.userId, allUsers)} — through {streak.endSeason} Week{' '}
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
                            name={playerNameForUser(record.opponentUserId, allUsers)}
                          />
                          <span className="text-charcoal flex-1 truncate">
                            {playerNameForUser(record.opponentUserId, allUsers)}
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
                        {playerNameForUser(rivalry.teamAUserId, allUsers)} vs{' '}
                        {playerNameForUser(rivalry.teamBUserId, allUsers)}
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
