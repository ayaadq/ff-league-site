import type { MatchupRecap } from '../api/weeklyRecap'
import { teamColorFor } from '../content/teamColors'
import { matchupNoteFor, type WeekRecapContent } from '../content/recaps'
import { Reveal } from '../motion/Reveal'
import { StatCountUp } from '../motion/StatCountUp'
import { SectionKicker } from './SectionKicker'

/** Game of the week, promoted to its own moment (PLAN.md Phase 13D)
 * rather than staying text-only inside the matchup journey's stations —
 * a dedicated 2D+GSAP section, not a second WebGL scene: JourneyCameraRig
 * already weights camera dwell time toward this game
 * (journeyLayout.ts's applyGotwDwell), so the missing piece was visual
 * promotion, not more 3D. Protects the mobile frame budget — the
 * redesign's "new 3D" allowance went to the rotating player cards
 * instead (SeasonLeadersSection.tsx).
 *
 * The blob behind the copy is the concrete "liquid motion graphics"
 * technique from the redesign (index.css's `--animate-blob` keyframe),
 * gradient-tinted from the two teams' own accent colors
 * (content/teamColors.ts) so the shape is specific to this matchup, not
 * a generic decoration. Renders nothing if this week's content hasn't
 * flagged a game of the week — this is authored editorial judgment
 * (content/recaps' `gameOfTheWeek` flag), not something derived from
 * margin/closeness. */
export function GameOfTheWeekHero({
  week,
  games,
  content,
  nameFor,
}: {
  week: number
  games: MatchupRecap[]
  content: WeekRecapContent | undefined
  nameFor: (userId: string | null) => string
}) {
  const gotw = games.find(
    (game) => matchupNoteFor(content, game.winner.userId, game.loser.userId)?.gameOfTheWeek,
  )
  if (!gotw) return null

  const note = matchupNoteFor(content, gotw.winner.userId, gotw.loser.userId)
  const colorA = teamColorFor(gotw.winner.userId)
  const colorB = teamColorFor(gotw.loser.userId)

  return (
    <section
      className="ink-surface relative -mx-6 mt-16 overflow-hidden px-6 py-20 text-center md:mt-24 md:py-28"
      aria-labelledby="gotw-heading"
    >
      <div
        aria-hidden="true"
        className="animate-blob pointer-events-none absolute top-1/2 left-1/2 h-72 w-72 -translate-x-1/2 -translate-y-1/2 opacity-40 blur-3xl sm:h-96 sm:w-96"
        style={{ background: `linear-gradient(135deg, ${colorA}, ${colorB})` }}
      />

      <Reveal>
        <div className="relative">
          <SectionKicker tone="ink">Game of the Week · Week {week}</SectionKicker>
          <h2
            id="gotw-heading"
            className="font-display text-marble mt-2 text-4xl leading-[1.05] sm:text-5xl"
          >
            {nameFor(gotw.winner.userId)}
            <span className="text-mute-on-ink"> vs </span>
            {nameFor(gotw.loser.userId)}
          </h2>

          {note?.headline && (
            <p className="text-gold-light mt-4 text-lg sm:text-xl">{note.headline}</p>
          )}

          <div className="mt-8 flex items-center justify-center gap-8 sm:gap-14">
            <div className="min-w-0">
              <p className="font-display text-marble text-4xl leading-none lining-nums tabular-nums sm:text-5xl">
                <StatCountUp value={gotw.winner.actual} decimals={2} />
              </p>
              <p className="text-mute-on-ink mt-2 truncate text-sm">
                {nameFor(gotw.winner.userId)}
              </p>
            </div>
            <span className="text-mute-on-ink shrink-0 text-xs tracking-[0.3em] uppercase">
              Final
            </span>
            <div className="min-w-0">
              <p className="font-display text-mute-on-ink text-4xl leading-none lining-nums tabular-nums sm:text-5xl">
                <StatCountUp value={gotw.loser.actual} decimals={2} />
              </p>
              <p className="text-mute-on-ink mt-2 truncate text-sm">{nameFor(gotw.loser.userId)}</p>
            </div>
          </div>
        </div>
      </Reveal>
    </section>
  )
}
