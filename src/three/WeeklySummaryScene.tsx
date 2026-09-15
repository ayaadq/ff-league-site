import { useTexture } from '@react-three/drei'
import { useThree } from '@react-three/fiber'
import { gsap } from 'gsap'
import {
  Component,
  Suspense,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  type ReactNode,
  type RefObject,
} from 'react'
import { SRGBColorSpace } from 'three'
import type { Group } from 'three'
import { avatarUrl } from '../api/cdn'
import { useReducedMotion } from '../motion/reducedMotionContext'
import { setupGsap } from '../motion/gsapSetup'
import { arcSlots } from './arcLayout'
import { SceneFloor } from './SceneFloor'
import { GOLD_MATERIAL_PROPS, IVORY_MATERIAL_PROPS, MARBLE_MATERIAL_PROPS } from './materials'

/** One team's rank going into the scene — deliberately minimal (just
 * enough to place and texture a portrait). Callers (HomePage.tsx) derive
 * this from live standings via api/standings.ts; this module has no
 * data-fetching of its own, matching TrophyRoomScene's presentational-
 * only pattern. Must be passed already sorted best (index 0) to worst. */
export interface StandingEntry {
  rosterId: number
  avatarId: string | null
}

const FRAME_WIDTH = 0.92
const FRAME_HEIGHT = 1.18
const FRAME_DEPTH = 0.07
const CANVAS_WIDTH = 0.76
const CANVAS_HEIGHT = 1

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

/** A team's real Sleeper avatar, textured onto a portrait panel. Verified
 * against a live Sleeper avatar URL in a real browser before building
 * this (a canvas-taint check with crossOrigin: 'anonymous', the same
 * failure mode three.js's TextureLoader hits) — Sleeper's avatar CDN
 * sends proper CORS headers, so this is safe to load directly rather
 * than needing a proxy. */
function AvatarPanel({ avatarId }: { avatarId: string }) {
  const texture = useTexture(avatarUrl(avatarId))
  const { gl } = useThree()

  // useTexture/TextureLoader leaves color space and anisotropy at their
  // (wrong-for-photos) defaults. Without sRGB decoding the photo reads
  // washed out; without anisotropic filtering, every portrait *except*
  // ones facing the camera dead-on (i.e. most of them -- these sit on a
  // curved arc) blurs heavily, which is what "pixelated and blurry"
  // turned out to be. Sleeper's avatars are a fixed 400x400 regardless,
  // so this is a filtering fix, not a fix for the source image itself --
  // very close/large portraits (the podium) will still look softer than
  // a native-res photo would, that's a real ceiling, not a bug.
  // Mutates the texture useTexture() returns rather than configuring it
  // at construction, since drei's useTexture doesn't expose a way to do
  // that -- safe here because useTexture caches one Texture instance per
  // URL and this always sets the same two values for that same instance,
  // so repeat runs (route changes, re-renders) are idempotent, not a
  // growing pile of side effects on a shared object.
  useEffect(() => {
    texture.colorSpace = SRGBColorSpace
    texture.anisotropy = gl.capabilities.getMaxAnisotropy()
    texture.needsUpdate = true
  }, [texture, gl])

  return (
    <mesh position={[0, 0, FRAME_DEPTH / 2 + 0.001]}>
      <planeGeometry args={[CANVAS_WIDTH, CANVAS_HEIGHT]} />
      <meshBasicMaterial map={texture} toneMapped={false} />
    </mesh>
  )
}

/** Untextured fallback — TrophyRoomScene's blank-ivory-canvas treatment —
 * shown while a photo is loading or if it fails to load, so one slow or
 * broken avatar URL never blanks out the rest of the scene. */
function BlankCanvas() {
  return (
    <mesh position={[0, 0, FRAME_DEPTH / 2 + 0.001]}>
      <planeGeometry args={[CANVAS_WIDTH, CANVAS_HEIGHT]} />
      <meshPhysicalMaterial {...IVORY_MATERIAL_PROPS} />
    </mesh>
  )
}

/** Catches a failed avatar texture load (bad/missing avatar id, network
 * error, a future CORS regression on Sleeper's CDN) and falls back to
 * BlankCanvas instead of taking down the whole scene. Avatar URLs are
 * third-party and can fail independently of the CORS check above. */
class PanelErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean }> {
  state = { hasError: false }
  static getDerivedStateFromError() {
    return { hasError: true }
  }
  render() {
    return this.state.hasError ? <BlankCanvas /> : this.props.children
  }
}

/** A gold-framed portrait, sized/positioned/rotated like TrophyRoomScene's
 * portrait wall, but showing the team's real photo (or the blank-canvas
 * fallback) instead of an always-untextured panel. */
function Portrait({
  avatarId,
  position,
  rotationY,
  groupRef,
}: {
  avatarId: string | null
  position: [number, number, number]
  rotationY: number
  /** Optional handle on the portrait's own <group>, so a parent can run
   * the entrance tween in usePortraitReveal against it. A callback ref
   * rather than forwardRef: each caller collects these into an indexed
   * array (matching TrophyToppers' `ref={(el) => { refs.current[i] = el }}`
   * pattern), which a forwarded ref object can't express as cleanly. */
  groupRef?: (el: Group | null) => void
}) {
  return (
    <group ref={groupRef} position={position} rotation={[0, rotationY, 0]}>
      <mesh>
        <boxGeometry args={[FRAME_WIDTH, FRAME_HEIGHT, FRAME_DEPTH]} />
        <meshStandardMaterial {...GOLD_MATERIAL_PROPS} />
      </mesh>
      {avatarId ? (
        <PanelErrorBoundary>
          <Suspense fallback={<BlankCanvas />}>
            <AvatarPanel avatarId={avatarId} />
          </Suspense>
        </PanelErrorBoundary>
      ) : (
        <BlankCanvas />
      )}
    </group>
  )
}

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
