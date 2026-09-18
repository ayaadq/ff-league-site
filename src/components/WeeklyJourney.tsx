import { lazy, Suspense, useRef } from 'react'
import type { MatchupRecap } from '../api/weeklyRecap'
import { matchupNoteFor, type WeekRecapContent } from '../content/recaps'
import { Reveal } from '../motion/Reveal'
import { StatCountUp } from '../motion/StatCountUp'
import { FINALE_DWELL_SVH, MATCHUP_SVH } from '../three/journeyLayout'
import { ChunkErrorBoundary } from './ChunkErrorBoundary'
import { ConfettiLayer, type ConfettiHandle } from './ConfettiLayer'
import { PlayerHeadshot } from './PlayerHeadshot'

const JourneyCanvas = lazy(() =>
  import('../three/JourneyCanvas').then((m) => ({ default: m.JourneyCanvas })),
)

const TRACK_ID = 'weekly-journey-track'

/** Scroll speed (px/sec, from JourneyCameraRig's own ScrollTrigger) that
 * maps to a full-intensity confetti burst — a fast deliberate flick, not
 * an ordinary reading scroll. Same order of magnitude as
 * SoundProvider's own scroll-velocity-to-gain ceiling, picked for the
 * same reason: a number tuned against how fast people actually scroll,
 * not an arbitrary round figure. */
const CONFETTI_VELOCITY_FOR_MAX_INTENSITY = 2800

/** The week's games, walked one at a time as a single continuous
 * sky-cam football kick (PLAN.md Phase H) — the ball launches on the
 * second matchup and flies one parabolic arc toward the uprights,
 * reaching them exactly as the last matchup ends. Scroll is divided
 * into equal per-matchup segments (no more closeness-weighted dwell,
 * which belonged to the previous per-station camera this replaces).
 *
 * The canvas is sticky and the panels scroll over it, both driven by the
 * same scroll position — so the camera/ball's progress and the panel for
 * that game coming into view are the same event, with nothing to keep in
 * sync by hand.
 *
 * Every word is DOM. Rendering type in three.js would mean shipping font
 * geometry, and it would be unselectable, invisible to a screen reader,
 * and soft at distance. Keeping it here also means the reduced-motion
 * path costs nothing: the camera/ball simply don't move, and every game
 * is still read top to bottom exactly as written. */
export function WeeklyJourney({
  week,
  games,
  content,
  nameFor,
  playerNameFor,
}: {
  week: number
  games: MatchupRecap[]
  content: WeekRecapContent | undefined
  nameFor: (userId: string | null) => string
  /** Resolves a Sleeper player_id to a display name for the standout-
   * player headshot cards below. Same shape as nameFor --
   * a resolver passed in rather than a raw players map, so this
   * component stays presentational (HomePage.tsx owns the one
   * useAllPlayers() call the whole page shares). */
  playerNameFor: (playerId: string) => string
}) {
  const confettiRef = useRef<ConfettiHandle>(null)

  if (games.length === 0) return null

  // Fires once per matchup, exactly when JourneyCameraRig's own scrubbed
  // progress enters that matchup's equal-width segment -- see its prop
  // comment for why the camera rig is the one calling this rather than a
  // second, independent scroll listener here. The audio duck/roar swell
  // this used to trigger (shaped by how close the game was) was removed
  // entirely along with the rest of the crowd-noise system; confetti is
  // the only thing left to fire per matchup.
  const handleMatchupChange = (index: number, velocity: number) => {
    // Confetti (PLAN.md Phase G, kept as the small per-matchup beat
    // alongside Phase H's much bigger finale burst) -- biased toward a
    // stable per-matchup A/B assignment (roster id comparison), not the
    // winner's actual on-screen position: the ball/camera don't have a
    // fixed "winner's side" the way the old per-station scene did, so
    // this is just a source of genuine per-game variety now, same as it
    // was before.
    const game = games[index]
    const bias = game.winner.rosterId < game.loser.rosterId ? -1 : 1
    const intensity = Math.min(Math.abs(velocity) / CONFETTI_VELOCITY_FOR_MAX_INTENSITY, 1)
    confettiRef.current?.burst({ bias, intensity })
  }

  // Fires exactly once, when the ball's flight reaches the uprights
  // (JourneyCameraRig.tsx) -- the goal celebration. Used to also duck the
  // ambience bed into a big roar here; now it's just the screen-filling
  // confetti burst.
  const handleFinale = () => {
    confettiRef.current?.finaleBurst()
  }

  return (
    <>
      <ConfettiLayer ref={confettiRef} />

      {/* Full-bleed breakout (PLAN.md Phase H.3) -- HomePage.tsx wraps
        every Act in a `max-w-4xl` reading column, which left visible
        paper-colored margins on either side of the journey's own sticky
        canvas, breaking the "fills the whole screen" immersion the kick
        scene is going for. `w-screen` + the calc-based negative margin is
        the standard full-bleed-inside-a-centered-container trick; it's
        safe here specifically because `overflow-x: clip` is already set
        on html/body (index.css, the pinch-zoom fix) so any rounding
        between 100vw and the actual viewport width is clipped rather than
        creating real horizontal scroll. The scorecards underneath stay
        readable-width regardless -- they carry their own `max-w-2xl` /
        `mx-auto`, independent of this section's width. */}
      <section
        id={TRACK_ID}
        className="relative mx-[calc(50%-50vw)] mt-16 w-screen md:mt-24"
        aria-label={`Week ${week} matchups`}
      >
        <div className="bg-charcoal pointer-events-none sticky top-0 h-svh w-full overflow-hidden">
          <ChunkErrorBoundary>
            <Suspense fallback={null}>
              <JourneyCanvas
                trackId={TRACK_ID}
                matchupCount={games.length}
                onMatchupChange={handleMatchupChange}
                onFinale={handleFinale}
              />
            </Suspense>
          </ChunkErrorBoundary>
        </div>

        {/* Pulled back up over the sticky canvas so the panels read as
          captions on the scene rather than as a list beneath it -- the
          scorecard is the foreground element, the kick plays out behind
          and around it (PLAN.md Phase H). */}
        <div className="relative -mt-[100svh]">
          {games.map((game, i) => {
            const note = matchupNoteFor(content, game.winner.userId, game.loser.userId)
            return (
              <article
                key={game.matchupId ?? i}
                className="flex flex-col justify-center px-6 sm:px-10"
                // Equal shares now (PLAN.md Phase H) -- every matchup is
                // exactly one screen tall, matching the "divide total
                // scroll by matchup count" brief. No more per-station
                // weighting to keep in sync with a camera-dwell formula.
                // Sourced from journeyLayout.ts's own MATCHUP_SVH rather
                // than a hand-typed "100svh" so this can never drift out
                // of sync with the progress math that assumes it.
                style={{ height: `${MATCHUP_SVH}svh` }}
              >
                {/* A scrim, not a card -- this text was tuned for a
                  uniformly dark backdrop and stays legible regardless of
                  where the ball/camera currently are behind it. 90%
                  opacity rather than a lighter wash: a translucent scrim
                  isn't reliable when what's behind it varies by scroll
                  position within a matchup (the kick's own sky
                  brightening as the camera rises), confirmed live in the
                  previous journey redesigns this project has already
                  been through -- 90% is close enough to opaque that the
                  result stays consistently dark regardless. */}
                <div className="bg-charcoal/90 mx-auto w-full max-w-2xl rounded-2xl px-5 py-7 sm:px-8 sm:py-9">
                  {/* Broadcast-style title card, entering as this
                    matchup arrives. Plain team names, not a personalized
                    "YOU vs." -- the site has no per-visitor identity to
                    draw on (single shared password, SPEC.md §8 puts
                    accounts out of scope), so team names are the honest
                    version of this. */}
                  <Reveal y={56}>
                    <p className="font-display text-marble text-2xl tracking-wide uppercase sm:text-3xl">
                      Week {week} — {nameFor(game.winner.userId)} vs. {nameFor(game.loser.userId)}
                    </p>
                  </Reveal>

                  <p className="text-gold-bright mt-2 text-[0.65rem] tracking-[0.3em] uppercase">
                    Week {week} · Final
                    {game.tied ? ' · Tied' : ` · Margin ${game.margin.toFixed(2)}`}
                  </p>

                  <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
                    {[game.winner, game.loser].map((side, sideIndex) => (
                      <div key={sideIndex} className={sideIndex === 0 ? '' : 'opacity-70'}>
                        <p className="text-mute-on-ink truncate text-sm">{nameFor(side.userId)}</p>
                        <p
                          className={`font-display text-5xl leading-none lining-nums tabular-nums sm:text-6xl ${
                            sideIndex === 0 ? 'text-gold-light' : 'text-mute-on-ink'
                          }`}
                        >
                          <StatCountUp value={side.actual} decimals={2} />
                        </p>
                        <p className="text-mute-on-ink mt-1 text-xs lining-nums tabular-nums">
                          {sideIndex === 0 ? 'Winner' : 'Loser'} · {side.possible.toFixed(1)}{' '}
                          possible · {Math.round(side.efficiency * 100)}%
                        </p>

                        {/* The week's standout player, per side -- the
                          highest-scoring player each team actually
                          started (TeamWeek.topStarter, already computed
                          in api/weeklyRecap.ts). */}
                        {side.topStarter && (
                          <Reveal className="mt-4">
                            <div className="flex items-center gap-2">
                              <PlayerHeadshot
                                playerId={side.topStarter.playerId}
                                name={playerNameFor(side.topStarter.playerId)}
                              />
                              <div className="min-w-0">
                                <p className="text-mute-on-ink truncate text-[0.65rem] tracking-[0.2em] uppercase">
                                  Top starter
                                </p>
                                <p className="text-gold-light truncate text-sm">
                                  {playerNameFor(side.topStarter.playerId)}{' '}
                                  <span className="lining-nums tabular-nums">
                                    · {side.topStarter.points.toFixed(1)}
                                  </span>
                                </p>
                              </div>
                            </div>
                          </Reveal>
                        )}
                      </div>
                    ))}
                  </div>

                  {note?.headline && (
                    <h3 className="font-display text-marble mt-7 text-2xl sm:text-3xl">
                      {note.headline}
                    </h3>
                  )}

                  {note?.chips && note.chips.length > 0 && (
                    <ul className="mt-5 flex flex-wrap gap-x-6 gap-y-3">
                      {note.chips.map((chip, chipIndex) => (
                        <li key={chipIndex}>
                          <span className="text-mute-on-ink block text-[0.6rem] tracking-[0.2em] uppercase">
                            {chip.label}
                          </span>
                          <span className="text-gold-light text-base lining-nums tabular-nums">
                            {chip.value}
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}

                  {note?.body?.map((paragraph, paragraphIndex) => (
                    <p
                      key={paragraphIndex}
                      className="text-mute-on-ink mt-4 max-w-prose text-sm leading-relaxed"
                    >
                      {paragraph}
                    </p>
                  ))}
                </div>
              </article>
            )
          })}

          {/* Finale dwell buffer -- pure extra scroll room after the last
            matchup's own article, not another scorecard. Without this,
            the ball's flight reached the uprights at the exact instant
            this track's scrollable range ran out (journeyLayout.ts's
            flightProgress hit 1 only at rawProgress === 1), leaving zero
            time to actually watch the finale -- confetti burst, the
            pass-through flourish -- before the section released into
            whatever comes after it. journeyLayout.ts's own
            FINALE_DWELL_SVH/contentFraction math reserves this same
            buffer when converting scroll progress into flight progress,
            so the two can't drift out of sync. */}
          <div aria-hidden="true" style={{ height: `${FINALE_DWELL_SVH}svh` }} />
        </div>
      </section>
    </>
  )
}
