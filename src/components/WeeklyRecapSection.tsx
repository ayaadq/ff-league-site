import { useQuery } from '@tanstack/react-query'
import { gsap } from 'gsap'
import { useEffect, useMemo, useRef } from 'react'
import {
  useAllPlayers,
  useCurrentSeason,
  useMatchups,
  useNflState,
  useRosters,
  useUsers,
} from '../api/hooks'
import { playerNameForUser } from '../api/leagueRecords'
import { playerDisplayName } from '../api/players'
import { STALE_TIME } from '../api/staleTime'
import { useLeague } from '../api/useWeekRecap'
import { generateWeeklyTrashTalk, type WeeklyRecapSummary } from '../api/weeklyRecapAi'
import { weekAwards, weekRecap } from '../api/weeklyRecap'
import { setupGsap } from '../motion/gsapSetup'
import { useReducedMotion } from '../motion/reducedMotionContext'
import { Reveal } from '../motion/Reveal'
import { SectionKicker } from './SectionKicker'

/** The previous week's results, told as trash talk by Claude (PLAN.md
 * Phase H.6) — Home's own recap of "what just happened," distinct from
 * the authored `RecapStorylines`/`RecapAwards` content (those render only
 * when someone has hand-written a recap for that week; this renders
 * automatically from live Sleeper numbers every week, win or lose).
 *
 * The AI call itself never happens here or anywhere in client code — this
 * component computes a compact, already-player-named summary from data
 * this project already fetches (the same `weekRecap`/`weekAwards`
 * `useWeekRecap.ts` uses) and posts *that* to this project's own
 * `/api/weekly-recap` route (`api/weeklyRecapAi.ts`), which is the only
 * thing that ever talks to Anthropic and the only place the API key
 * exists (server-side, `api/weekly-recap.ts`). */
export function WeeklyRecapSection() {
  const { leagueId, season } = useCurrentSeason()
  const nflState = useNflState()
  const league = useLeague(leagueId)
  const rosters = useRosters(leagueId)
  const users = useUsers(leagueId)
  const players = useAllPlayers()

  const week = nflState.data?.week ?? 1
  const previousWeek = week - 1
  const matchups = useMatchups(leagueId, Math.max(1, previousWeek))

  const prereqLoading =
    nflState.isLoading ||
    league.isLoading ||
    rosters.isLoading ||
    users.isLoading ||
    players.isLoading ||
    matchups.isLoading

  const hasScores = matchups.data?.some((m) => m.points > 0) ?? false

  const summary = useMemo<WeeklyRecapSummary | null>(() => {
    if (previousWeek < 1 || !hasScores) return null
    const rosterPositions = league.data?.roster_positions
    if (!rosterPositions || !matchups.data || !players.data || !rosters.data) return null

    const ownerByRosterId = new Map(rosters.data.map((r) => [r.roster_id, r.owner_id ?? null]))
    const { teams, games } = weekRecap(
      matchups.data,
      ownerByRosterId,
      rosterPositions,
      players.data,
    )
    if (games.length === 0) return null
    const awards = weekAwards({ teams, games })

    const allUsers = users.data ?? []
    const nameForUser = (userId: string | null) =>
      userId ? playerNameForUser(userId, allUsers) : 'Unknown'
    const nameForPlayer = (playerId: string) =>
      playerDisplayName(players.data?.[playerId], playerId)

    return {
      season: season ?? '',
      week: previousWeek,
      games: games.map((g) => ({
        winner: nameForUser(g.winner.userId),
        winnerScore: g.winner.actual,
        loser: nameForUser(g.loser.userId),
        loserScore: g.loser.actual,
        margin: g.margin,
        tied: g.tied,
        winnerTopStarter: g.winner.topStarter
          ? {
              name: nameForPlayer(g.winner.topStarter.playerId),
              points: g.winner.topStarter.points,
            }
          : undefined,
        loserTopStarter: g.loser.topStarter
          ? { name: nameForPlayer(g.loser.topStarter.playerId), points: g.loser.topStarter.points }
          : undefined,
      })),
      highScore: awards.highScore
        ? { name: nameForUser(awards.highScore.userId), points: awards.highScore.actual }
        : undefined,
      lowScore: awards.lowScore
        ? { name: nameForUser(awards.lowScore.userId), points: awards.lowScore.actual }
        : undefined,
      biggestBlowout: awards.biggestBlowout
        ? {
            winner: nameForUser(awards.biggestBlowout.winner.userId),
            loser: nameForUser(awards.biggestBlowout.loser.userId),
            margin: awards.biggestBlowout.margin,
          }
        : undefined,
      closestGame: awards.closestGame
        ? {
            winner: nameForUser(awards.closestGame.winner.userId),
            loser: nameForUser(awards.closestGame.loser.userId),
            margin: awards.closestGame.margin,
          }
        : undefined,
      worstEfficiency: awards.worstEfficiency
        ? {
            name: nameForUser(awards.worstEfficiency.userId),
            efficiency: awards.worstEfficiency.efficiency,
          }
        : undefined,
      mostLeftOnBench: awards.mostLeftOnBench
        ? {
            name: nameForUser(awards.mostLeftOnBench.userId),
            points: awards.mostLeftOnBench.leftOnBench,
          }
        : undefined,
      playerOfWeek: awards.playerOfWeek
        ? {
            team: nameForUser(awards.playerOfWeek.team.userId),
            player: nameForPlayer(awards.playerOfWeek.slot.playerId),
            points: awards.playerOfWeek.slot.points,
          }
        : undefined,
    }
  }, [
    previousWeek,
    hasScores,
    league.data,
    matchups.data,
    players.data,
    rosters.data,
    users.data,
    season,
  ])

  // staleTime: immutable -- a finished week's recap never changes, so this
  // never regenerates (and never re-bills the Anthropic call) once it has
  // landed once, matching the "completed weeks are cached forever"
  // convention every other query in this project already follows
  // (STALE_TIME.immutable, api/staleTime.ts). The existing global
  // IndexedDB persister (api/queryClient.ts) carries this across page
  // reloads/sessions the same way it does every other query -- no separate
  // localStorage cache needed.
  const recapQuery = useQuery({
    queryKey: ['weekly-recap-ai', leagueId, season, previousWeek],
    queryFn: () => generateWeeklyTrashTalk(summary as WeeklyRecapSummary),
    enabled: summary !== null,
    staleTime: STALE_TIME.immutable,
    retry: 1,
  })

  const sectionRef = useRef<HTMLDivElement>(null)
  const reducedMotion = useReducedMotion()

  useEffect(() => {
    if (reducedMotion || !sectionRef.current) return
    setupGsap()
    const el = sectionRef.current

    // Liquid enter + exit (PLAN.md Phase H.6) -- a scrub-tied timeline
    // rather than Reveal's one-shot fade-in: this section should also
    // fade/lift away as the reader scrolls past it, which Reveal
    // deliberately doesn't do (its own doc comment: replaying an entrance
    // on the way back past a static scoreboard "would turn it into a
    // fairground"). This section is different -- a distinct scroll
    // "moment" between the hero and the journey, not persistent reference
    // content someone scrolls back to reread.
    const ctx = gsap.context(() => {
      gsap.set(el, { opacity: 0, y: 48 })
      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: el,
          start: 'top 85%',
          end: 'bottom 20%',
          scrub: 0.6,
        },
      })
      tl.to(el, { opacity: 1, y: 0, ease: 'power2.out', duration: 0.35 })
        .to(el, { opacity: 1, y: 0, duration: 0.3 })
        .to(el, { opacity: 0, y: -48, ease: 'power2.in', duration: 0.35 })
    }, sectionRef)

    return () => ctx.revert()
  }, [reducedMotion])

  // Full-bleed breakout (same `w-screen` + calc-based negative margin
  // trick WeeklyJourney.tsx and the trophy line use, PLAN.md Phase H.3) --
  // this section sits inside HomePage.tsx's `max-w-4xl` reading column
  // like WeeklyJourney does, not at the page root the way HeroSection is,
  // so the narrower ancestor-padding-only `-mx-6` HeroSection uses isn't
  // enough here.
  const fullBleedClass = 'mx-[calc(50%-50vw)] w-screen'

  if (previousWeek < 1) {
    return (
      <section
        ref={sectionRef}
        className={`ink-surface ${fullBleedClass} mt-16 px-6 py-16 text-center md:mt-24`}
        aria-label="Weekly recap"
      >
        <SectionKicker tone="ink">Recap</SectionKicker>
        <p className="font-display text-marble mt-2 text-2xl">Check back after Week 1</p>
      </section>
    )
  }

  const paragraphs = recapQuery.data?.split(/\n{2,}/).filter(Boolean) ?? []

  return (
    <section
      ref={sectionRef}
      className={`ink-surface ${fullBleedClass} mt-16 px-6 py-16 sm:py-20 md:mt-24`}
      aria-label="Weekly recap"
    >
      <div className="mx-auto max-w-2xl text-center">
        <SectionKicker tone="ink">Week {previousWeek} Recap</SectionKicker>
        <h2 className="font-display text-marble mt-2 text-3xl sm:text-4xl">The Damage Report</h2>

        <div className="mt-8 space-y-5 text-left">
          {(prereqLoading || recapQuery.isPending) && !recapQuery.isError && (
            <p className="text-mute-on-ink animate-pulse text-center text-lg">Loading recap…</p>
          )}

          {!prereqLoading && !hasScores && (
            <p className="text-mute-on-ink text-center text-lg">Recap unavailable this week.</p>
          )}

          {recapQuery.isError && (
            <p className="text-mute-on-ink text-center text-lg">Recap unavailable this week.</p>
          )}

          {paragraphs.map((paragraph, i) => (
            <Reveal key={i} delay={i * 0.12}>
              <p className="text-marble text-lg leading-relaxed sm:text-xl">{paragraph}</p>
            </Reveal>
          ))}
        </div>

        {paragraphs.length > 0 && (
          <Reveal delay={paragraphs.length * 0.12}>
            <p className="text-mute-on-ink mt-8 text-[0.65rem] tracking-[0.3em] uppercase">
              Auto-generated from this week's box scores
            </p>
          </Reveal>
        )}
      </div>
    </section>
  )
}
