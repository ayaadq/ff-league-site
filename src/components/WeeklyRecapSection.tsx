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
import { useLeague } from '../api/useWeekRecap'
import { computeWeeklyRecapStats } from '../api/computeWeeklyRecapStats'
import { weekRecap } from '../api/weeklyRecap'
import { buildWeeklyRecap } from '../content/weeklyRecaps'
import { EASE, setupGsap } from '../motion/gsapSetup'
import { useReducedMotion } from '../motion/reducedMotionContext'
import { Reveal } from '../motion/Reveal'
import { SectionKicker } from './SectionKicker'

/** The previous week's results, told as hand-authored trash talk (PLAN.md
 * Phase H.6 Alternative) — Home's own recap of "what just happened,"
 * distinct from the authored `RecapStorylines`/`RecapAwards` content
 * (those render only when someone has hand-written a recap for that
 * week; this renders automatically from live Sleeper numbers every week,
 * win or lose).
 *
 * Zero network calls beyond the Sleeper data this project already
 * fetches — no AI API, no server, no latency. `computeWeeklyRecapStats`
 * derives a flat stats object from the same `weekRecap()` numbers the
 * journey/awards use, and `content/weeklyRecaps`'s `buildWeeklyRecap`
 * fills hand-authored templates with them, picking a variant
 * deterministically per (season, week) so the same week always reads the
 * same way rather than re-rolling on every reload.
 *
 * This replaces an earlier version of this section that called Claude
 * through a Vercel serverless function proxy (`api/weekly-recap.ts`,
 * since deleted) — that infrastructure is gone entirely now that this
 * component generates its copy client-side from templates. */
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

  // Synchronous derivation, not a query -- there is nothing to fetch here
  // beyond the Sleeper data above (already its own cached queries), and
  // recomputing a plain object from already-loaded data is cheap enough
  // that a separate caching layer would only add complexity for no real
  // benefit. Recomputes only when the underlying Sleeper data actually
  // changes, same as any other derived value.
  const recapText = useMemo(() => {
    if (previousWeek < 1 || !hasScores) return null
    const rosterPositions = league.data?.roster_positions
    if (!rosterPositions || !matchups.data || !players.data || !rosters.data) return null

    const ownerByRosterId = new Map(rosters.data.map((r) => [r.roster_id, r.owner_id ?? null]))
    const { teams } = weekRecap(matchups.data, ownerByRosterId, rosterPositions, players.data)
    if (teams.length === 0) return null

    const allUsers = users.data ?? []
    const nameForUser = (userId: string | null) =>
      userId ? playerNameForUser(userId, allUsers) : 'Unknown'
    const nameForPlayer = (playerId: string) =>
      playerDisplayName(players.data?.[playerId], playerId)

    const stats = computeWeeklyRecapStats({ week: previousWeek, teams, nameForUser, nameForPlayer })
    if (!stats) return null

    return buildWeeklyRecap(stats, season ?? '')
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
    //
    // Ease switched from raw `power2.out`/`power2.in` literals to this
    // project's own `EASE.weighted` token (animation optimization pass)
    // -- SPEC.md §5.5's own mandate is one consistent "weighted" motion
    // texture site-wide, the same curve `Reveal.tsx` and
    // `PlayerCardArc.tsx`'s drag-release already use, not each transition
    // picking its own GSAP preset. `will-change` added since this element
    // is continuously mutated for the whole scrub range, not a one-shot
    // tween -- a real hint for the browser to promote it to its own
    // compositor layer up front rather than reactively.
    el.style.willChange = 'opacity, transform'
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
      tl.to(el, { opacity: 1, y: 0, ease: EASE.weighted, duration: 0.35 })
        .to(el, { opacity: 1, y: 0, duration: 0.3 })
        .to(el, { opacity: 0, y: -48, ease: EASE.weighted, duration: 0.35 })
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

  const paragraphs = recapText?.split(/\n{2,}/).filter(Boolean) ?? []

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
          {prereqLoading && (
            <p className="text-mute-on-ink animate-pulse text-center text-lg">Loading recap…</p>
          )}

          {!prereqLoading && paragraphs.length === 0 && (
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
