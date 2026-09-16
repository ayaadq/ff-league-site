import { lazy, Suspense } from 'react'
import type { MatchupRecap } from '../api/weeklyRecap'
import { matchupNoteFor, type WeekRecapContent } from '../content/recaps'
import { StatCountUp } from '../motion/StatCountUp'
import type { JourneyStation } from '../three/journeyLayout'
import { ChunkErrorBoundary } from './ChunkErrorBoundary'

const JourneyCanvas = lazy(() =>
  import('../three/JourneyCanvas').then((m) => ({ default: m.JourneyCanvas })),
)

const TRACK_ID = 'weekly-journey-track'

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
}: {
  week: number
  games: MatchupRecap[]
  content: WeekRecapContent | undefined
  nameFor: (userId: string | null) => string
  avatarFor: (userId: string | null) => string | null
}) {
  if (games.length === 0) return null

  const stations: JourneyStation[] = games.map((game, i) => ({
    id: `${game.matchupId ?? i}`,
    winnerAvatarId: avatarFor(game.winner.userId),
    loserAvatarId: avatarFor(game.loser.userId),
  }))

  return (
    <section id={TRACK_ID} className="relative mt-16 md:mt-24" aria-label={`Week ${week} matchups`}>
      <div className="pointer-events-none sticky top-0 h-svh w-full overflow-hidden bg-[#0b0b0c]">
        <ChunkErrorBoundary>
          <Suspense fallback={null}>
            <JourneyCanvas stations={stations} trackId={TRACK_ID} />
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
              className="flex h-svh flex-col justify-center px-6 sm:px-10"
            >
              <div className="mx-auto w-full max-w-3xl">
                <p className="text-[0.65rem] tracking-[0.3em] text-[#a6845c] uppercase">
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
