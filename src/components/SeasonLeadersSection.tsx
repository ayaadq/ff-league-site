import { lazy, Suspense } from 'react'
import type { SeasonLeader } from '../api/seasonLeaders'
import { useEffectsTier } from '../motion/effectsTierContext'
import { PLAYER_CARDS_TRACK_ID } from '../three/PlayerCardArc'
import { ChunkErrorBoundary } from './ChunkErrorBoundary'
import { PlayerCardStrip } from './PlayerCardStrip'
import { SectionKicker } from './SectionKicker'

const PlayerCardCanvas = lazy(() =>
  import('../three/PlayerCardCanvas').then((m) => ({ default: m.PlayerCardCanvas })),
)

/** Season leaders (PLAN.md Phase 13C) -- rotating 3D player cards under
 * the `'full'` effects tier, a plain horizontal-scroll strip under
 * `'reduced'`. Not wrapped in `<Reveal>`, same reason as WeeklyJourney and
 * the standings wall: a transform on an ancestor of the sticky canvas
 * track below would break the stickiness. */
export function SeasonLeadersSection({ leaders }: { leaders: SeasonLeader[] }) {
  const effectsTier = useEffectsTier()
  if (leaders.length === 0) return null

  return (
    <section className="mt-14 md:mt-20" aria-labelledby="season-leaders-heading">
      <SectionKicker>Season</SectionKicker>
      <h2 id="season-leaders-heading" className="font-display text-charcoal mt-1 text-3xl">
        Season Leaders
      </h2>

      {effectsTier === 'full' ? (
        <>
          <div
            aria-hidden="true"
            id={PLAYER_CARDS_TRACK_ID}
            className="mt-6 h-[190vh] sm:h-[220vh]"
          >
            <div className="sticky top-0 h-[52vh] min-h-[340px] w-full sm:h-[60vh]">
              <ChunkErrorBoundary>
                <Suspense fallback={null}>
                  <PlayerCardCanvas leaders={leaders} />
                </Suspense>
              </ChunkErrorBoundary>
            </div>
          </div>
          <PlayerCardStrip leaders={leaders} srOnly />
        </>
      ) : (
        <div className="mt-6">
          <PlayerCardStrip leaders={leaders} />
        </div>
      )}
    </section>
  )
}
