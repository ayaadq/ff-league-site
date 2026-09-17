import { lazy, Suspense } from 'react'
import type { MatchupRecap } from '../api/weeklyRecap'
import { useSound } from '../audio/soundContext'
import { matchupNoteFor, type WeekRecapContent } from '../content/recaps'
import { Reveal } from '../motion/Reveal'
import { StatCountUp } from '../motion/StatCountUp'
import {
  applyGotwDwell,
  closenessOf,
  closenessTiming,
  stationHeightFractions,
  type JourneyStation,
} from '../three/journeyLayout'
import { ChunkErrorBoundary } from './ChunkErrorBoundary'
import { PlayerHeadshot } from './PlayerHeadshot'

const JourneyCanvas = lazy(() =>
  import('../three/JourneyCanvas').then((m) => ({ default: m.JourneyCanvas })),
)

const TRACK_ID = 'weekly-journey-track'

/** Outcome-swell shaping -- how closenessOf's 0 (blowout) .. 1 (closest
 * game/tie) becomes a sound. A blowout gets a bigger roar and barely
 * any hush first (closeness 0 -> depth near 1, no real dip); the
 * closest game of the week gets the deepest, longest hush before its
 * roar lands, so the roar reads as an eruption breaking out of the
 * tension rather than just a louder version of the blowout's swell.
 * ROAR_MAX_GAIN stays at 1 or below deliberately -- the roar buffer is
 * already mixed hot (SoundProvider's own ROAR_LEVEL), so "bigger" comes
 * from the hush's contrast, not from pushing the one-shot past unity
 * and risking clipping. */
const ROAR_MIN_GAIN = 0.4
const ROAR_MAX_GAIN = 1
const DUCK_MAX_DEPTH_DROP = 0.65
const DUCK_MIN_DURATION = 0.6
const DUCK_MAX_DURATION = 2.2

/** The week's six games, walked one at a time.
 *
 * The canvas is sticky and the panels scroll over it, both driven by the
 * same scroll position — so the camera arriving at a station and the
 * panel for that game coming into view are the same event, with nothing
 * to keep in sync by hand.
 *
 * Every word is DOM. Rendering type in three.js would mean shipping font
 * geometry, and it would be unselectable, invisible to a screen reader,
 * and soft at distance. Keeping it here also means the reduced-motion
 * path costs nothing: the camera simply doesn't travel, and all six
 * games are still read top to bottom exactly as written. */
export function WeeklyJourney({
  week,
  games,
  content,
  nameFor,
  avatarFor,
  playerNameFor,
}: {
  week: number
  games: MatchupRecap[]
  content: WeekRecapContent | undefined
  nameFor: (userId: string | null) => string
  avatarFor: (userId: string | null) => string | null
  /** Resolves a Sleeper player_id to a display name for the standout-
   * player headshot cards below. Same shape as nameFor/avatarFor --
   * a resolver passed in rather than a raw players map, so this
   * component stays presentational (HomePage.tsx owns the one
   * useAllPlayers() call the whole page shares). */
  playerNameFor: (playerId: string) => string
}) {
  const { play, duck } = useSound()

  if (games.length === 0) return null

  // Bigger roar for a blowout, hush-then-eruption for a close one --
  // the same closeness number closenessTiming below already weights
  // dwell by, not a second margin normalization that could drift from
  // it (closenessOf's own comment).
  const closeness = closenessOf(games.map((g) => ({ margin: g.margin, tied: g.tied })))

  // Fires once per station, exactly when JourneyCameraRig's own scrubbed
  // progress enters that station's dwell window -- see its prop comment
  // for why the camera rig is the one calling this rather than a second,
  // independent scroll listener here. duck()/play() are both no-ops
  // before sound is enabled and running (SoundProvider's own guards), so
  // this costs nothing for a visitor who never touches the sound toggle.
  const handleStationDwellStart = (index: number) => {
    const c = closeness[index]
    if (c === undefined) return
    const gain = ROAR_MIN_GAIN + (ROAR_MAX_GAIN - ROAR_MIN_GAIN) * (1 - c)
    const depth = 1 - DUCK_MAX_DEPTH_DROP * c
    const duration = DUCK_MIN_DURATION + (DUCK_MAX_DURATION - DUCK_MIN_DURATION) * c
    duck(depth, duration)
    // Timed to land the roar at the bottom of the dip, not at its start --
    // an eruption breaking out of the hush, not a sound racing the fade
    // down. Wall-clock rather than audio-clock scheduling: duck()/play()
    // are the only surface SoundApi exposes to a caller outside
    // SoundProvider, and a few ms of setTimeout jitter is inaudible on an
    // envelope this loose (the crowd doesn't clap on a beat).
    window.setTimeout(() => play('roar', { gain }), (duration / 2) * 1000)
  }

  const stations: JourneyStation[] = games.map((game, i) => ({
    id: `${game.matchupId ?? i}`,
    winnerAvatarId: avatarFor(game.winner.userId),
    winnerUserId: game.winner.userId,
    loserAvatarId: avatarFor(game.loser.userId),
  }))

  // The one game the recap content flags gameOfTheWeek (content/recaps
  // -- editorial, not derived from margin/closeness), if this week has
  // one. Reuses the same matchupNoteFor lookup the panels below already
  // do per game rather than a second way of finding "the" note.
  const gotwGameIndex = games.findIndex(
    (game) => matchupNoteFor(content, game.winner.userId, game.loser.userId)?.gameOfTheWeek,
  )
  const gotwIndex = gotwGameIndex === -1 ? null : gotwGameIndex

  // Closer games hold the camera longer, relative to the other five
  // this week (journeyLayout.ts's closenessTiming) -- not memoized,
  // matching `stations` above: both are cheap derived arrays recomputed
  // each render, not state that needs to survive one. The GOTW station,
  // if there is one, then gets a dedicated longer dwell on top
  // (applyGotwDwell) -- editorial pacing overriding the closeness-based
  // default for that one beat, not a second timing system.
  const timings = applyGotwDwell(
    closenessTiming(games.map((g) => ({ margin: g.margin, tied: g.tied }))),
    gotwIndex,
  )

  // Panel heights come from the SAME timings driving the camera
  // (stationHeightFractions reads stationBounds, not a parallel
  // formula) -- this is what keeps a panel's on-screen window and the
  // camera's dwell window the same interval by construction, rather
  // than two numbers someone has to remember to keep in sync. Total
  // height is kept at "one screen per station" in aggregate (unchanged
  // from before pacing existed), just redistributed among the six
  // instead of split evenly.
  //
  // Known tail risk, not solved here: MIN_DWELL (journeyLayout.ts) sets
  // a floor on a station's *share*, not on its rendered height in
  // pixels. A blowout landing in the last slot (no trailing travel to
  // inherit height from) gets the smallest panel on the page -- fine
  // for this week's real data, worth watching once other weeks are
  // authored.
  const heightFractions = stationHeightFractions(timings)
  const totalSvh = games.length * 100

  return (
    <section id={TRACK_ID} className="relative mt-16 md:mt-24" aria-label={`Week ${week} matchups`}>
      <div className="pointer-events-none sticky top-0 h-svh w-full overflow-hidden bg-[#2B2926]">
        <ChunkErrorBoundary>
          <Suspense fallback={null}>
            <JourneyCanvas
              stations={stations}
              trackId={TRACK_ID}
              timings={timings}
              onStationDwellStart={handleStationDwellStart}
              gotwIndex={gotwIndex}
            />
          </Suspense>
        </ChunkErrorBoundary>
      </div>

      {/* Pulled back up over the sticky canvas so the panels read as
          captions on the scene rather than as a list beneath it. */}
      <div className="relative -mt-[100svh]">
        {games.map((game, i) => {
          const note = matchupNoteFor(content, game.winner.userId, game.loser.userId)
          return (
            <article
              key={game.matchupId ?? i}
              className="flex flex-col justify-center px-6 sm:px-10"
              style={{ height: `${heightFractions[i] * totalSvh}svh` }}
            >
              {/* A scrim, not a card: the reskinned floor (MARBLE_MATERIAL_PROPS,
                  JourneyScene.tsx) is bright where the earlier all-dark scene
                  wasn't, and this text was tuned for a uniformly dark backdrop --
                  the loser-side tones especially (#8d877c) washed out badly
                  against the lit marble lower in a tall panel, confirmed live
                  before adding this, not assumed.
                  A first attempt at 55% opacity made it *worse* in one spot,
                  also confirmed live rather than assumed away: blended over
                  the bright floor, that gray landed almost exactly on
                  #8d877c's own tone, erasing the contrast rather than
                  restoring it. A translucent wash isn't reliable when what's
                  behind it varies by station and by scroll position within a
                  station -- 90% is close enough to opaque that the result is
                  consistently dark regardless, at the cost of the 3D scene
                  barely showing through the card anymore.

                  max-w-2xl, narrowed from max-w-3xl once DWELL_FOV
                  (journeyLayout.ts) widened the camera enough to actually
                  put the stadium stands inside the frustum during dwell --
                  the panel was free to cover most of the canvas width
                  before that, since nothing back there was visible either
                  way; now the extra ~96px of freed side margin is what
                  actually lets the wider shot read on screen, not just
                  exist in the 3D scene. Verified live that the panel's own
                  content (longest line: the title, two-column stat grid)
                  still reads fine at the new width before keeping it. */}
              <div className="mx-auto w-full max-w-2xl rounded-2xl bg-[#2B2926]/90 px-5 py-7 sm:px-8 sm:py-9">
                {/* Broadcast-style title card, entering as this station
                    arrives. Plain team names, not a personalized "YOU
                    vs." -- the site has no per-visitor identity to draw
                    on (single shared password, SPEC.md §8 puts accounts
                    out of scope), so team names are the honest version
                    of this. A larger y-offset than Reveal's default
                    (28px) is what gives it the bigger "flies in" feel
                    the brief asked for -- still the same trigger and
                    tween every other beat in this file already uses. */}
                <Reveal y={56}>
                  <p className="font-display text-2xl tracking-wide text-[#f2efe9] uppercase sm:text-3xl">
                    Week {week} — {nameFor(game.winner.userId)} vs. {nameFor(game.loser.userId)}
                  </p>
                </Reveal>

                <p className="mt-2 text-[0.65rem] tracking-[0.3em] text-[#a6845c] uppercase">
                  Week {week} · Final
                  {game.tied ? ' · Tied' : ` · Margin ${game.margin.toFixed(2)}`}
                  {note?.gameOfTheWeek ? ' · Game of the week' : ''}
                </p>

                <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
                  {[game.winner, game.loser].map((side, sideIndex) => (
                    <div key={sideIndex} className={sideIndex === 0 ? '' : 'opacity-70'}>
                      <p className="truncate text-sm text-[#cfc9be]">{nameFor(side.userId)}</p>
                      <p
                        className={`font-display text-5xl leading-none lining-nums tabular-nums sm:text-6xl ${
                          sideIndex === 0 ? 'text-[#d9c7a8]' : 'text-[#8d877c]'
                        }`}
                      >
                        <StatCountUp value={side.actual} decimals={2} />
                      </p>
                      <p className="mt-1 text-xs text-[#8d877c] lining-nums tabular-nums">
                        {sideIndex === 0 ? 'Winner' : 'Loser'} · {side.possible.toFixed(1)} possible
                        · {Math.round(side.efficiency * 100)}%
                      </p>

                      {/* The week's standout player, per side -- the
                          highest-scoring player each team actually
                          started (TeamWeek.topStarter, already computed
                          in api/weeklyRecap.ts). Real headshots, first
                          use of PlayerHeadshot inside the journey. */}
                      {side.topStarter && (
                        <Reveal className="mt-4">
                          <div className="flex items-center gap-2">
                            <PlayerHeadshot
                              playerId={side.topStarter.playerId}
                              name={playerNameFor(side.topStarter.playerId)}
                            />
                            <div className="min-w-0">
                              <p className="truncate text-[0.65rem] tracking-[0.2em] text-[#8d877c] uppercase">
                                Top starter
                              </p>
                              <p className="truncate text-sm text-[#d9c7a8]">
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
                  <h3 className="font-display mt-7 text-2xl text-[#f2efe9] sm:text-3xl">
                    {note.headline}
                  </h3>
                )}

                {note?.chips && note.chips.length > 0 && (
                  <ul className="mt-5 flex flex-wrap gap-x-6 gap-y-3">
                    {note.chips.map((chip, chipIndex) => (
                      <li key={chipIndex}>
                        <span className="block text-[0.6rem] tracking-[0.2em] text-[#8d877c] uppercase">
                          {chip.label}
                        </span>
                        <span className="text-base text-[#d9c7a8] lining-nums tabular-nums">
                          {chip.value}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}

                {note?.body?.map((paragraph, paragraphIndex) => (
                  <p
                    key={paragraphIndex}
                    className="mt-4 max-w-prose text-sm leading-relaxed text-[#cfc9be]"
                  >
                    {paragraph}
                  </p>
                ))}
              </div>
            </article>
          )
        })}
      </div>
    </section>
  )
}
