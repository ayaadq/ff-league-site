import type { SeasonLeader } from '../api/seasonLeaders'
import { PlayerHeadshot } from './PlayerHeadshot'

/** The accessible/reduced-tier form of the season-leaders section
 * (PLAN.md Phase 13C). Under the `'full'` effects tier this same markup
 * renders visually hidden (`srOnly`) alongside the 3D card arc -- the
 * same "decorative visual + a real accessible list" split
 * EfficiencyChart already uses for its bars plus a real `<table>`. Under
 * `'reduced'` it's the only thing that renders: a horizontal scroll-snap
 * strip of real DOM cards, a genuinely simpler layout rather than the 3D
 * scene running slower (SPEC.md §7.2). */
export function PlayerCardStrip({
  leaders,
  srOnly = false,
}: {
  leaders: SeasonLeader[]
  srOnly?: boolean
}) {
  return (
    <ul className={srOnly ? 'sr-only' : 'flex snap-x snap-mandatory gap-4 overflow-x-auto pb-2'}>
      {leaders.map((leader, i) => (
        <li
          key={leader.playerId}
          className={
            srOnly
              ? undefined
              : 'gallery-card flex w-36 shrink-0 snap-start flex-col items-center gap-3 p-4 text-center'
          }
        >
          {!srOnly && <PlayerHeadshot playerId={leader.playerId} name={leader.name} />}
          <div className="min-w-0">
            <p className={srOnly ? undefined : 'text-charcoal truncate text-sm font-semibold'}>
              {i + 1}. {leader.name}
            </p>
            <p
              className={srOnly ? undefined : 'text-charcoal-soft text-xs lining-nums tabular-nums'}
            >
              {leader.totalPoints.toFixed(1)} pts
            </p>
          </div>
        </li>
      ))}
    </ul>
  )
}
