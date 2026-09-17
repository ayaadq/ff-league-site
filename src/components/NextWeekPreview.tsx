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
import { pairMatchups } from '../api/matchups'
import { playerDisplayName } from '../api/players'
import { teamAvatarIdForRoster, teamNameForRoster, totalPoints } from '../api/standings'
import type { SleeperMatchup, SleeperPlayersMap, SleeperRoster, SleeperUser } from '../api/types'
import { setupGsap } from '../motion/gsapSetup'
import { useReducedMotion } from '../motion/reducedMotionContext'
import { PlayerHeadshot } from './PlayerHeadshot'
import { SectionKicker } from './SectionKicker'
import { TeamAvatar } from './TeamAvatar'

/** Scroll distance (px) to complete the flip — the brief's own number. */
const FLIP_SCROLL_PX = 300
/** Scroll distance to hold on the flipped (Team B) side before
 * disintegration can trigger, long enough to actually read a roster. */
const HOLD_SCROLL_PX = 450
/** Extra scroll room after the disintegration trigger before the track
 * releases — the burst itself plays on wall-clock time either way (it's
 * a triggered one-shot, not scrubbed), this just keeps the card visibly
 * pinned long enough for a normal scroll speed to see it play out. */
const RELEASE_BUFFER_PX = 300
const STUCK_SCROLL_PX = FLIP_SCROLL_PX + HOLD_SCROLL_PX + RELEASE_BUFFER_PX

const PARTICLE_COLORS = ['#ff5a36', '#2ee6d6']

interface CardSide {
  roster: SleeperRoster
  matchup: SleeperMatchup
  name: string
  avatarId: string | null
}

function sideFor(
  matchup: SleeperMatchup,
  rosters: SleeperRoster[],
  users: SleeperUser[],
): CardSide | null {
  const roster = rosters.find((r) => r.roster_id === matchup.roster_id)
  if (!roster) return null
  return {
    roster,
    matchup,
    name: teamNameForRoster(roster, users),
    avatarId: teamAvatarIdForRoster(roster, users),
  }
}

/** One face of the card — team identity, starting lineup, and a
 * bottom stats block styled like a real trading card's back-of-card
 * numbers. `tone` picks text/border colors for whichever theme this
 * card was assigned (alternating ink/paper per card, not per side —
 * both faces of one card share a theme). */
function CardFace({
  side,
  players,
  tone,
}: {
  side: CardSide
  players: SleeperPlayersMap | undefined
  tone: 'ink' | 'paper'
}) {
  const starters = side.matchup.starters.filter((id) => id !== '0')
  const muted = tone === 'ink' ? 'text-mute-on-ink' : 'text-charcoal-soft'
  const strong = tone === 'ink' ? 'text-marble' : 'text-charcoal'
  const border = tone === 'ink' ? 'border-white/10' : 'border-charcoal/10'

  return (
    <div className="flex h-full flex-col p-5 sm:p-6">
      <div className="flex items-center gap-3">
        <TeamAvatar avatarId={side.avatarId} name={side.name} size="lg" />
        <h3 className={`font-display truncate text-xl leading-tight sm:text-2xl ${strong}`}>
          {side.name}
        </h3>
      </div>

      <ul className="mt-5 min-h-0 flex-1 space-y-2 overflow-hidden">
        {starters.slice(0, 9).map((playerId) => {
          const name = playerDisplayName(players?.[playerId], playerId)
          return (
            <li key={playerId} className="flex items-center gap-2 text-sm">
              <PlayerHeadshot playerId={playerId} name={name} />
              <span className={`min-w-0 truncate ${strong}`}>{name}</span>
            </li>
          )
        })}
      </ul>

      <div className={`mt-4 flex items-center justify-between border-t pt-3 text-sm ${border}`}>
        <span className={strong}>
          {side.roster.settings.wins}-{side.roster.settings.losses}
          {side.roster.settings.ties > 0 ? `-${side.roster.settings.ties}` : ''}
        </span>
        <span className={muted}>{totalPoints(side.roster.settings).toFixed(1)} PF</span>
      </div>
    </div>
  )
}

/** Disintegration particles (PLAN.md Phase G) — a flat-screen stand-in
 * for "explodes toward the viewer": particles scale up sharply (bigger
 * reads as closer) while spreading radially outward and fading, rather
 * than true stereoscopic depth, which nothing in a 2D DOM/CSS context
 * can actually produce. Mixed ignite/current per particle, per the
 * brief. Plain DOM nodes animated directly with GSAP, same reasoning as
 * ConfettiLayer — a one-shot burst has no reason to go through React
 * state. */
function burstParticles(container: HTMLDivElement | null) {
  if (!container) return
  const rect = container.getBoundingClientRect()
  const cx = rect.width / 2
  const cy = rect.height / 2
  const count = 36

  for (let i = 0; i < count; i++) {
    const el = document.createElement('div')
    const size = 6 + Math.random() * 10
    el.style.position = 'absolute'
    el.style.left = `${cx}px`
    el.style.top = `${cy}px`
    el.style.width = `${size}px`
    el.style.height = `${size}px`
    el.style.marginLeft = `${-size / 2}px`
    el.style.marginTop = `${-size / 2}px`
    el.style.borderRadius = '2px'
    el.style.background = PARTICLE_COLORS[i % PARTICLE_COLORS.length]
    el.style.willChange = 'transform, opacity'
    container.appendChild(el)

    const angle = Math.random() * Math.PI * 2
    const distance = 140 + Math.random() * 260
    const scale = 2.2 + Math.random() * 2.4

    gsap.fromTo(
      el,
      { x: 0, y: 0, scale: 0.4, opacity: 1 },
      {
        x: Math.cos(angle) * distance,
        y: Math.sin(angle) * distance,
        scale,
        opacity: 0,
        duration: 0.7 + Math.random() * 0.35,
        ease: 'power2.out',
        onComplete: () => el.remove(),
      },
    )
  }
}

function CardPanel({ isInk, children }: { isInk: boolean; children: React.ReactNode }) {
  return (
    <div
      className={`h-full w-full overflow-hidden rounded-2xl border shadow-2xl ${
        isInk ? 'ink-surface border-white/10' : 'paper-surface border-charcoal/10'
      }`}
    >
      {children}
    </div>
  )
}

function MatchupCard({
  index,
  pair,
  rosters,
  users,
  players,
}: {
  index: number
  pair: [SleeperMatchup, SleeperMatchup]
  rosters: SleeperRoster[]
  users: SleeperUser[]
  players: SleeperPlayersMap | undefined
}) {
  const trackId = `nextweek-track-${index}`
  const cardRef = useRef<HTMLDivElement>(null)
  const particlesRef = useRef<HTMLDivElement>(null)
  const reducedMotion = useReducedMotion()
  const isInk = index % 2 === 0
  const tone: 'ink' | 'paper' = isInk ? 'ink' : 'paper'

  const sideA = useMemo(() => sideFor(pair[0], rosters, users), [pair, rosters, users])
  const sideB = useMemo(() => sideFor(pair[1], rosters, users), [pair, rosters, users])

  useEffect(() => {
    if (reducedMotion || !cardRef.current) return
    setupGsap()
    const track = document.getElementById(trackId)
    if (!track) return

    const ctx = gsap.context(() => {
      gsap.set(cardRef.current, { rotateY: 0, opacity: 1, scale: 1 })

      // The flip -- a physical 3D rotation scrubbed to exactly 300px of
      // scroll (the brief's own figure), not the whole track.
      gsap.to(cardRef.current, {
        rotateY: 180,
        ease: 'none',
        scrollTrigger: {
          trigger: track,
          start: 'top top',
          end: `+=${FLIP_SCROLL_PX}`,
          scrub: 0.4,
        },
      })

      // Disintegration -- a discrete triggered event once the reader has
      // both finished the flip and held on Team B's side for a beat, not
      // a scrub: an explosion should happen once, not scrub back and
      // forth if someone reverses scroll direction near the trigger
      // point (toggleActions' "reverse" restores the card instead, which
      // reads as correct if a reader backs up before actually leaving).
      gsap
        .timeline({
          scrollTrigger: {
            trigger: track,
            start: `${FLIP_SCROLL_PX + HOLD_SCROLL_PX}px top`,
            toggleActions: 'play none none reverse',
          },
        })
        .to(cardRef.current, { opacity: 0, scale: 0.82, duration: 0.5, ease: 'power2.in' })
        .call(() => burstParticles(particlesRef.current), undefined, '<')
    }, cardRef)

    return () => ctx.revert()
  }, [reducedMotion, trackId])

  if (!sideA || !sideB) return null

  return (
    <div
      id={trackId}
      className="relative"
      style={{ height: `calc(100svh + ${STUCK_SCROLL_PX}px)` }}
    >
      <div
        className="sticky top-0 flex h-svh w-full items-center justify-center overflow-hidden px-6"
        style={reducedMotion ? undefined : { perspective: '1400px' }}
      >
        {reducedMotion ? (
          <div className="flex w-full max-w-sm flex-col gap-6">
            <div className="h-[46svh] max-h-[420px]">
              <CardPanel isInk={isInk}>
                <CardFace side={sideA} players={players} tone={tone} />
              </CardPanel>
            </div>
            <div className="h-[46svh] max-h-[420px]">
              <CardPanel isInk={isInk}>
                <CardFace side={sideB} players={players} tone={tone} />
              </CardPanel>
            </div>
          </div>
        ) : (
          <>
            <div
              ref={cardRef}
              className="relative h-[70svh] max-h-[560px] w-[88vw] max-w-sm will-change-transform"
              style={{ transformStyle: 'preserve-3d' }}
            >
              <div className="absolute inset-0" style={{ backfaceVisibility: 'hidden' }}>
                <CardPanel isInk={isInk}>
                  <CardFace side={sideA} players={players} tone={tone} />
                </CardPanel>
              </div>
              <div
                className="absolute inset-0"
                style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}
              >
                <CardPanel isInk={isInk}>
                  <CardFace side={sideB} players={players} tone={tone} />
                </CardPanel>
              </div>
            </div>
            <div
              ref={particlesRef}
              aria-hidden="true"
              className="pointer-events-none absolute inset-0"
            />
          </>
        )}
      </div>
    </div>
  )
}

/** Next week's matchups as flipping trading cards (PLAN.md Phase G),
 * positioned directly above the Standings section. Pulls the next
 * not-yet-scored week from the same `useMatchups` hook every other week
 * view already uses — no new data-fetching pattern, just a different
 * week number. "Next week" is defined relative to whichever week
 * currently has live/complete scores: if the current NFL week hasn't
 * started scoring yet, that week itself is the one being previewed;
 * once it has, the preview moves to the following week.
 *
 * Renders nothing while loading (consistent with the rest of Home);
 * shows "Season concluded" if the resolved preview week has no
 * matchups at all (the regular season plus playoffs have ended, or the
 * league hasn't drafted next season's schedule yet). */
export function NextWeekPreview() {
  const { leagueId } = useCurrentSeason()
  const nflState = useNflState()
  const rosters = useRosters(leagueId)
  const users = useUsers(leagueId)
  const players = useAllPlayers()

  const week = nflState.data?.week ?? 1
  const currentWeekMatchups = useMatchups(leagueId, week)
  const hasCurrentScores = currentWeekMatchups.data?.some((m) => m.points > 0) ?? false
  const previewWeek = hasCurrentScores ? week + 1 : week
  const previewMatchups = useMatchups(leagueId, previewWeek)

  const pairs = useMemo(() => pairMatchups(previewMatchups.data ?? []), [previewMatchups.data])

  const isLoading =
    nflState.isLoading ||
    rosters.isLoading ||
    users.isLoading ||
    currentWeekMatchups.isLoading ||
    previewMatchups.isLoading

  if (isLoading) return null

  if (pairs.length === 0) {
    return (
      <section
        className="ink-surface -mx-6 mt-16 py-20 text-center md:mt-24"
        aria-label="Next week"
      >
        <SectionKicker tone="ink">Next Week</SectionKicker>
        <p className="font-display text-marble mt-2 text-3xl">Season concluded</p>
      </section>
    )
  }

  return (
    <section aria-label={`Week ${previewWeek} matchup previews`} className="mt-16 md:mt-24">
      <div className="text-center">
        <SectionKicker>Week {previewWeek}</SectionKicker>
        <h2 className="font-display text-charcoal mt-1 text-3xl">Next Week</h2>
      </div>
      {pairs.map((pair, i) => (
        <MatchupCard
          key={pair[0].roster_id}
          index={i}
          pair={pair}
          rosters={rosters.data ?? []}
          users={users.data ?? []}
          players={players.data}
        />
      ))}
    </section>
  )
}
