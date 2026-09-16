import { gsap } from 'gsap'
import { useLayoutEffect, useMemo, useRef, type RefObject } from 'react'
import type { Group } from 'three'
import { useReducedMotion } from '../motion/reducedMotionContext'
import { setupGsap } from '../motion/gsapSetup'
import { arcSlots } from './arcLayout'
import { SceneFloor } from './SceneFloor'
import { GOLD_MATERIAL_PROPS, MARBLE_MATERIAL_PROPS } from './materials'
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

/** The top three ranks get their own literal podium blocks (1st tallest
 * and centered, 2nd/3rd flanking, shorter) — an actual medal-stand
 * layout rather than TrophyRoomScene's single stacked pedestal, since
 * this scene needs to show three specific teams, not just gesture at
 * "there is a podium." */
const PODIUM_LAYOUT: Array<{ x: number; height: number }> = [
  { x: 0, height: 0.85 }, // 1st
  { x: -1.55, height: 0.55 }, // 2nd
  { x: 1.55, height: 0.42 }, // 3rd
]

/** Seconds between each portrait's entrance. The wall matches
 * TrophyRoomScene's trophy-topper stagger exactly, so a visitor moving
 * between Home and League History sees the same motion signature. The
 * podium is deliberately four times slower: at the wall's pacing, three
 * items land within 90ms of each other, which reads as simultaneous and
 * throws away the 3rd→2nd→1st ordering entirely. At this step the
 * champion's portrait lands at 0.36s — the same moment a full 12-team
 * league's wall sweep finishes (8 × WALL_REVEAL_STEP), so the room
 * finishes filling and the winner arrives on the same beat. */
const WALL_REVEAL_STEP = 0.045
const PODIUM_REVEAL_STEP = 0.18

/** Same stepped "click into place" entrance TrophyRoomScene's
 * TrophyToppers uses (PLAN.md Phase 6, SPEC.md §5.5) — scales a list of
 * portrait groups in from 0 with `ease: 'steps(6)'`. Kept as its own copy
 * scoped to this file rather than sharing code with TrophyToppers: that
 * component tweens Instance cup/base pairs, this one tweens whole
 * <group> portraits, and the two scenes' reveal orders differ enough
 * (podium builds suspense out of layout order; TrophyToppers is a flat
 * left-to-right sweep) that a shared abstraction would need as much
 * branching as just having two small effects. Delays are passed in
 * per-index rather than derived from a flat `i * step` here, so callers
 * can control reveal order independently of array/layout order. Respects
 * `prefers-reduced-motion` the same way TrophyToppers does: portraits are
 * simply present at full size, no tween. */
function usePortraitReveal(
  refs: RefObject<Array<Group | null>>,
  delays: number[],
  /** How many portraits are actually mounted right now. Standings arrive
   * async (HomePage fetches them), so the first pass of this hook usually
   * runs against an empty scene and must re-run once the portraits exist
   * — without this in the deps the podium would simply pop in at full
   * size the moment data landed, which is exactly the no-motion problem
   * this hook is here to fix. */
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
    // changes) — see StandingsPodium/RemainingWall below.
  }, [prefersReducedMotion, refs, delays, count])
}

/** The three podium blocks plus whichever of the top three standings
 * entries exist (defensive for a league with fewer than three rosters,
 * or before standings have loaded). */
function StandingsPodium({ top3 }: { top3: Array<StandingEntry | undefined> }) {
  const portraitRefs = useRef<Array<Group | null>>([])

  // Reveal runs bottom-up — 3rd, then 2nd, then 1st — rather than in
  // PODIUM_LAYOUT's own order (which is 1st-first, since 1st is the
  // center block). Landing on the winner last is the whole point: it
  // reads like a medal ceremony instead of a list rendering. Marble
  // blocks aren't tweened, only the portraits — the podium itself is the
  // stage that's already there, and popping the blocks too made the
  // whole group read as one flashing object rather than three arrivals.
  const revealDelays = useMemo(() => {
    const delays: number[] = []
    // PODIUM_LAYOUT indices in the order they appear: 3rd, 2nd, 1st.
    ;[2, 1, 0].forEach((layoutIndex, step) => {
      delays[layoutIndex] = step * PODIUM_REVEAL_STEP
    })
    return delays
  }, [])

  usePortraitReveal(portraitRefs, revealDelays, top3.filter(Boolean).length)

  return (
    <group position={[0, 0, 1.6]}>
      {PODIUM_LAYOUT.map((slot, i) => {
        const entry = top3[i]
        return (
          <group key={i}>
            <mesh position={[slot.x, slot.height / 2, 0]}>
              <boxGeometry args={[1.1, slot.height, 1.1]} />
              <meshPhysicalMaterial {...MARBLE_MATERIAL_PROPS} />
            </mesh>
            {/* A thin gold cap on top of each block -- the marble pedestal
                is the same pale color as the floor behind it (materials.ts),
                so without this it barely reads as a solid object at all
                (confirmed live: it looked like the portraits were floating
                disconnected from anything). Echoes the same marble+gold
                pairing as the trophy room's plinths rather than introducing
                a new material. */}
            <mesh position={[slot.x, slot.height + 0.025, 0]}>
              <boxGeometry args={[1.14, 0.05, 1.14]} />
              <meshStandardMaterial {...GOLD_MATERIAL_PROPS} />
            </mesh>
            {entry && (
              <Portrait
                avatarId={entry.avatarId}
                position={[slot.x, slot.height + 0.62, 0.35]}
                rotationY={0}
                groupRef={(el) => {
                  portraitRefs.current[i] = el
                }}
              />
            )}
          </group>
        )
      })}
    </group>
  )
}

/** Ranks 4+ on the same wide arc TrophyRoomScene's portrait wall used —
 * fewer items than that scene's fixed twelve, so arcSlots naturally
 * spaces them a little further apart across the same total spread
 * rather than needing a different layout. */
function RemainingWall({ rest }: { rest: StandingEntry[] }) {
  const slots = useMemo(() => arcSlots(rest.length, 7.6, 2.15, -3.2, Math.PI * 0.38), [rest.length])
  const portraitRefs = useRef<Array<Group | null>>([])

  // Straight left-to-right sweep at the same per-item pacing
  // TrophyRoomScene's trophy toppers already established, so the two
  // scenes' entrances feel like the same site. Runs alongside the
  // podium's reveal rather than after it — the wall arc sits behind and
  // above the podium, so the two read as one sweep filling the room, not
  // as two separate animations queued up.
  // Built from the count alone (not `rest.map`) so the memo genuinely
  // depends on nothing but `rest.length` — new scores landing reshuffle
  // `rest`'s contents constantly, and rebuilding these delays on every
  // such change would restart the entrance tween mid-week.
  const revealDelays = useMemo(
    () => Array.from({ length: rest.length }, (_, i) => i * WALL_REVEAL_STEP),
    [rest.length],
  )

  usePortraitReveal(portraitRefs, revealDelays, rest.length)

  return (
    <>
      {rest.map((entry, i) => (
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
 * standings podium: top 3 on their own medal-stand blocks, the rest on
 * the same portrait-wall arc, everyone showing their actual team photo.
 * Re-renders whenever `standings` changes (new scores come in, ranks
 * shuffle) since it's plain props in, not internal data-fetching. */
export function WeeklySummaryScene({ standings }: { standings: StandingEntry[] }) {
  const top3 = [standings[0], standings[1], standings[2]]
  const rest = standings.slice(3)

  return (
    <group>
      <SceneFloor />
      <StandingsPodium top3={top3} />
      <RemainingWall rest={rest} />
    </group>
  )
}
