import { useState } from 'react'
import type { TeamWeek } from '../api/weeklyRecap'
import { useSound } from '../audio/soundContext'

/** Fill colours, set as custom properties so the journey can re-theme the
 * chart for its dark stadium section by overriding them on a wrapper
 * rather than forking the component.
 *
 * Both pairs were run through the palette validator rather than picked by
 * eye, and the eye would have got it wrong: an earlier dark candidate
 * (#a6845c against #8a8378) passed contrast but scored ΔE 5.6 for normal
 * vision — a hard fail, effectively the same colour to everyone. These
 * pairs clear the separation floors with room:
 *
 *   light surface  #a6845c / #57534c   ΔE 20.1 normal, 18.2 protan
 *   dark surface   #c2a173 / #807a70   ΔE 15.6 normal, 14.1 protan
 *
 * The validator also flags both for chroma, which is out of scope here:
 * that check guards categorical identity palettes, and these two are
 * parts of one total separated by lightness inside a deliberately
 * low-chroma system (SPEC.md §5.1). Separation is what the check exists
 * to protect, and separation passes. */
const LIGHT_FILLS = {
  '--chart-scored': '#a6845c',
  '--chart-shortfall': '#57534c',
} as React.CSSProperties

/** Actual points against best-possible points, one row per team.
 *
 * The two segments sum to a real total, which is what makes stacking
 * legitimate here rather than the usual stacked-bar mistake — this is a
 * part-to-whole split of one quantity at "what you actually managed to
 * start", not two unrelated series glued together.
 *
 * Ranked horizontal bars because there are twelve long team names; a
 * vertical axis would turn every label sideways. */
export function EfficiencyChart({
  teams,
  nameFor,
}: {
  teams: TeamWeek[]
  nameFor: (team: TeamWeek) => string
}) {
  // Desktop can reveal the detail box on hover, but a phone has no hover
  // event -- this was mouse-only until a real device turned up nothing
  // tappable here (the row-expand pattern elsewhere, TeamPage.tsx's
  // week-by-week `<details>`, uses onClick/onToggle for exactly this
  // reason). `openId` is click/tap-driven and is what actually gates the
  // box below; hover still sets it too, so desktop keeps working exactly
  // as before.
  const [openId, setOpenId] = useState<number | null>(null)
  const { play } = useSound()
  if (teams.length === 0) return null

  const ranked = [...teams].sort((a, b) => b.actual - a.actual)
  const ceiling = Math.max(...ranked.map((t) => t.possible), 1)

  return (
    <div style={LIGHT_FILLS}>
      {/* Two series, so a legend is required — identity must never rest on
          colour alone. */}
      <div className="text-charcoal-soft mt-4 flex flex-wrap items-center gap-x-6 gap-y-2 text-xs">
        <span className="flex items-center gap-2">
          <span
            aria-hidden="true"
            className="h-3 w-3 rounded-[2px]"
            style={{ background: 'var(--chart-scored)' }}
          />
          What you scored
        </span>
        <span className="flex items-center gap-2">
          <span
            aria-hidden="true"
            className="h-3 w-3 rounded-[2px]"
            style={{ background: 'var(--chart-shortfall)' }}
          />
          What you left on the bench
        </span>
      </div>

      {/* The bars are decoration over the table below: a screen reader gets
          the numbers as a real table rather than a wall of divs. */}
      <ul aria-hidden="true" className="mt-6 space-y-4">
        {ranked.map((team, i) => {
          const scoredWidth = (team.actual / ceiling) * 100
          const shortfallWidth = (team.leftOnBench / ceiling) * 100
          const active = openId === team.rosterId
          return (
            <li
              key={team.rosterId}
              onMouseEnter={() => setOpenId(team.rosterId)}
              onMouseLeave={() => setOpenId(null)}
              onClick={() => {
                play('click')
                setOpenId((current) => (current === team.rosterId ? null : team.rosterId))
              }}
              className="relative cursor-pointer"
            >
              <div className="flex items-baseline justify-between gap-3">
                <span className="text-charcoal truncate text-sm">
                  <span className="text-charcoal-soft lining-nums tabular-nums">{i + 1}.</span>{' '}
                  {nameFor(team)}
                </span>
                <span className="text-charcoal-soft shrink-0 text-xs lining-nums tabular-nums">
                  {Math.round(team.efficiency * 100)}% efficiency
                </span>
              </div>

              <div className="mt-1.5 flex items-center gap-3">
                <div className="flex h-7 flex-1 items-stretch">
                  <div
                    className="rounded-l-[4px] transition-opacity duration-300"
                    style={{
                      width: `${scoredWidth}%`,
                      background: 'var(--chart-scored)',
                      opacity: openId === null || active ? 1 : 0.55,
                    }}
                  />
                  {/* 2px of surface between the fills so the boundary reads as
                      a boundary and not as a third colour. */}
                  {shortfallWidth > 0 && (
                    <>
                      <span className="w-[2px] shrink-0" />
                      <div
                        className="rounded-r-[4px] transition-opacity duration-300"
                        style={{
                          width: `${shortfallWidth}%`,
                          background: 'var(--chart-shortfall)',
                          opacity: openId === null || active ? 1 : 0.55,
                        }}
                      />
                    </>
                  )}
                </div>
                {/* Values sit beside the bar, never on it. Ink on a mid-tone
                    fill cannot clear AA at this size -- measured 3.46:1 for
                    white and 4.2:1 for charcoal against the gold, both short
                    of the 4.5:1 normal-text floor. On the marble surface the
                    same text clears it many times over, and the fill stays
                    the validated colour instead of being darkened to rescue
                    a label. */}
                <span className="w-24 shrink-0 text-right text-xs lining-nums tabular-nums sm:w-28">
                  <span className="text-charcoal font-semibold">{team.actual.toFixed(1)}</span>
                  <span className="text-charcoal-soft"> / {team.possible.toFixed(1)}</span>
                </span>
              </div>

              {active && (
                <div className="border-charcoal/15 bg-ivory text-charcoal absolute top-full left-0 z-10 mt-1 rounded-none border px-3 py-2 text-xs shadow-sm">
                  <span className="font-semibold">{nameFor(team)}</span> — scored{' '}
                  {team.actual.toFixed(2)} of a possible {team.possible.toFixed(2)}, leaving{' '}
                  {team.leftOnBench.toFixed(2)} on the bench.
                </div>
              )}
            </li>
          )
        })}
      </ul>

      <table className="sr-only">
        <caption>Actual points scored against best possible lineup, by team</caption>
        <thead>
          <tr>
            <th scope="col">Rank</th>
            <th scope="col">Team</th>
            <th scope="col">Scored</th>
            <th scope="col">Possible</th>
            <th scope="col">Left on bench</th>
            <th scope="col">Efficiency</th>
          </tr>
        </thead>
        <tbody>
          {ranked.map((team, i) => (
            <tr key={team.rosterId}>
              <td>{i + 1}</td>
              <td>{nameFor(team)}</td>
              <td>{team.actual.toFixed(2)}</td>
              <td>{team.possible.toFixed(2)}</td>
              <td>{team.leftOnBench.toFixed(2)}</td>
              <td>{Math.round(team.efficiency * 100)}%</td>
            </tr>
          ))}
        </tbody>
      </table>

      <p className="text-charcoal-soft mt-6 text-xs">
        Perfect lineup = the best legal QB/RB/RB/WR/WR/TE/FLEX/FLEX from the full roster, Sleeper
        scoring.
      </p>
    </div>
  )
}
