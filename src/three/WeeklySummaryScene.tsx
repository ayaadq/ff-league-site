import { gsap } from 'gsap'
import { useLayoutEffect, useMemo, useRef, type RefObject } from 'react'
import type { Group } from 'three'
import { useReducedMotion } from '../motion/reducedMotionContext'
import { setupGsap } from '../motion/gsapSetup'
import { arcSlots } from './arcLayout'
import { SceneFloor } from './SceneFloor'
import { Portrait } from './Portrait'

/** One team's rank going into the scene — deliberately minimal (just
 * enough to place and texture a portrait). Callers (HomePage.tsx) derive
 * this from live standings via api/standings.ts; this module has no
 * data-fetching of its own, matching TrophyRoomScene's presentational-
 * only pattern. Must be passed already sorted best (index 0) to worst. */
export interface StandingEntry {
  rosterId: number
  avatarId: string | null
}

/** Seconds between each portrait's entrance. Matches TrophyRoomScene's
 * trophy-topper stagger exactly, so a visitor moving between Home and
 * League History sees the same motion signature.
 *
 * Previously the top three ranks got their own literal podium blocks,
 * revealed on a much slower four-times-longer step so the 3rd→2nd→1st
 * ordering read as a medal ceremony. That treatment is gone — every rank
 * now gets the identical frame, arc slot, and reveal pacing, so there is
 * no longer a separate "podium" step to reconcile with the wall's. */
const WALL_REVEAL_STEP = 0.045

/** Same stepped "click into place" entrance TrophyRoomScene's
 * TrophyToppers uses (PLAN.md Phase 6, SPEC.md §5.5) — scales a list of
 * portrait groups in from 0 with `ease: 'steps(6)'`. Kept as its own copy
 * scoped to this file rather than sharing code with TrophyToppers: that
 * component tweens Instance cup/base pairs, this one tweens whole
 * <group> portraits. Delays are passed in per-index rather than derived
 * from a flat `i * step` here, so callers can control reveal order
 * independently of array/layout order. Respects `prefers-reduced-motion`
 * the same way TrophyToppers does: portraits are simply present at full
 * size, no tween. */
function usePortraitReveal(
  refs: RefObject<Array<Group | null>>,
  delays: number[],
  /** How many portraits are actually mounted right now. Standings arrive
   * async (HomePage fetches them), so the first pass of this hook usually
   * runs against an empty scene and must re-run once the portraits exist
   * — without this in the deps the wall would simply pop in at full size
   * the moment data landed, which is exactly the no-motion problem this
   * hook is here to fix. */
  count: number,
) {
  const prefersReducedMotion = useReducedMotion()

  // Layout effect, not useEffect: portraits mount into a canvas that is
  // already on screen and already rendering (again — async standings), so
  // zeroing their scale has to happen before r3f's next frame. A passive
  // effect can land after that frame, which shows up as a full-size
  // portrait flashing for a beat and then restarting its entrance.
  useLayoutEffect(() => {
    setupGsap()

    if (prefersReducedMotion) {
      refs.current.forEach((group) => group?.scale.setScalar(1))
      return
    }

    const tweens = refs.current.map((group, i) => {
      if (!group) return null
      group.scale.setScalar(0)
      return gsap.to(group.scale, {
        x: 1,
        y: 1,
        z: 1,
        duration: 0.5,
        ease: 'steps(6)',
        delay: delays[i] ?? 0,
      })
    })

    return () => {
      tweens.forEach((t) => t?.kill())
    }
    // delays is a small array literal built fresh via useMemo in each
    // caller (identity-stable unless the underlying data actually
    // changes) — see StandingsWall below.
  }, [prefersReducedMotion, refs, delays, count])
}

/** Every standings entry on the same wide arc TrophyRoomScene's portrait
 * wall uses — same radius/height/spread, so a full twelve-team league
 * lines up identically on both pages. Ranks 1-3 used to get their own
 * marble podium blocks, raised above this arc, as a medal-stand callout
 * distinct from the rest of the room; that's gone, so every rank now
 * gets the identical frame, position math, and reveal treatment, in rank
 * order along the arc rather than singled out. */
function StandingsWall({ standings }: { standings: StandingEntry[] }) {
  const slots = useMemo(
    () => arcSlots(standings.length, 7.6, 2.15, -3.2, Math.PI * 0.38),
    [standings.length],
  )
  const portraitRefs = useRef<Array<Group | null>>([])

  // Straight left-to-right sweep at the same per-item pacing
  // TrophyRoomScene's trophy toppers already established, so the two
  // scenes' entrances feel like the same site.
  // Built from the count alone (not `standings.map`) so the memo genuinely
  // depends on nothing but `standings.length` — new scores landing
  // reshuffle `standings`' contents constantly, and rebuilding these
  // delays on every such change would restart the entrance tween mid-week.
  const revealDelays = useMemo(
    () => Array.from({ length: standings.length }, (_, i) => i * WALL_REVEAL_STEP),
    [standings.length],
  )

  usePortraitReveal(portraitRefs, revealDelays, standings.length)

  return (
    <>
      {standings.map((entry, i) => (
        <Portrait
          key={entry.rosterId}
          avatarId={entry.avatarId}
          position={slots[i].position}
          rotationY={slots[i].rotationY}
          groupRef={(el) => {
            portraitRefs.current[i] = el
          }}
        />
      ))}
    </>
  )
}

/** Home's 3D scene (PLAN.md pivot, replacing the old static trophy
 * gallery — see TrophyRoomScene.tsx, now on League History) — a live
 * standings wall: every team on the same portrait-wall arc TrophyRoomScene
 * uses, ranked left-to-right, everyone showing their actual team photo.
 * Top 3 previously sat on their own raised podium blocks; that medal-stand
 * treatment is gone in favor of one consistent frame for every rank.
 * Re-renders whenever `standings` changes (new scores come in, ranks
 * shuffle) since it's plain props in, not internal data-fetching. */
export function WeeklySummaryScene({ standings }: { standings: StandingEntry[] }) {
  return (
    <group>
      <SceneFloor />
      <StandingsWall standings={standings} />
    </group>
  )
}
