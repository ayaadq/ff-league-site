import { useThree } from '@react-three/fiber'
import { gsap } from 'gsap'
import { useEffect, useRef } from 'react'
import type { PerspectiveCamera } from 'three'
import { useReducedMotion } from '../motion/reducedMotionContext'
import { setupGsap } from '../motion/gsapSetup'
import {
  BASE_STANDOFF,
  cameraPullback,
  dwellIndexAtProgress,
  fovAtProgress,
  stationBounds,
  uniformTiming,
  zAtProgress,
  type StationTiming,
} from './journeyLayout'

/** Skycam height — above the action looking down, the way the cable
 * camera in a broadcast sits. */
const CAMERA_HEIGHT = 5.4
const LOOK_HEIGHT = 2.2
/** Lateral drift across the whole run. A cable camera is suspended, not
 * railed; a dead-straight line reads as mechanical. Small enough that it
 * never becomes the thing you notice. */
const SWAY = 0.7

/** Glides the camera down the line of stations as the page scrolls.
 *
 * Scrubbed against the journey's own scroll track, so the travel is tied
 * to the reader's position rather than to a clock — stop scrolling and
 * the camera stops with you, which is what makes it feel like your
 * movement rather than a video.
 *
 * Z position is piecewise (journeyLayout.ts's stationBounds/zAtProgress)
 * rather than one flat lerp from first station to last -- the
 * foundation for per-station pacing (closeness-based dwell, a longer
 * game-of-week beat) that isn't wired up yet. `timings` defaults to
 * `uniformTiming`, which zAtProgress reduces to the exact same lerp
 * this rig used before that existed -- not visually close to the old
 * behavior, algebraically identical to it.
 *
 * Under `prefers-reduced-motion` the camera parks at the first station
 * and never moves. The DOM panels above the canvas carry every score and
 * headline regardless, so nothing is lost by not travelling — which is
 * exactly why the type was kept out of the 3D. */
export function JourneyCameraRig({
  trackId,
  stationCount,
  timings,
  onStationDwellStart,
  gotwIndex = null,
}: {
  trackId: string
  stationCount: number
  /** Per-station dwell/travel shares (journeyLayout.ts). Defaults to
   * `uniformTiming(stationCount)` -- zero dwell, even travel spacing,
   * today's plain glide. No caller passes anything else yet. */
  timings?: StationTiming[]
  /** Fires once, with a station's index, the moment the scrubbed
   * progress this rig is already reading enters that station's dwell
   * window -- WeeklyJourney's audio ducking (and, PLAN.md Phase G, its
   * confetti burst) hangs its game-outcome swell off this rather than
   * its own separate scroll listener, so the sound/confetti and the
   * camera's actual arrival can't drift apart the way a second
   * independent trigger source eventually would (see
   * dwellIndexAtProgress's own comment). Kept in a ref rather than the
   * effect's dependency array below -- WeeklyJourney passes a new
   * closure every render (it captures `games`), and re-running this
   * effect on every one of those would tear down and rebuild the
   * ScrollTrigger for no camera-relevant reason, losing the "last
   * fired" bookkeeping that keeps this a once-per-arrival callback.
   *
   * `velocity` (px/sec, from this same ScrollTrigger's own
   * `getVelocity()`) rides along for the confetti burst's intensity —
   * reading it off the ScrollTrigger already driving the camera rather
   * than a second, independent velocity sampler keeps "how fast the
   * reader is moving" defined in exactly one place. */
  onStationDwellStart?: (index: number, velocity: number) => void
  /** The one "game of the week" station, if this week has one --
   * eases the camera's fov for it (journeyLayout.ts's fovAtProgress,
   * see its own comment for why fov and not a closer standoff). A
   * primitive, unlike onStationDwellStart above, so it's fine in the
   * effect's own dependency array below -- it only changes when the
   * actual GOTW game changes, not on every WeeklyJourney render. */
  gotwIndex?: number | null
}) {
  const { camera, size } = useThree()
  const prefersReducedMotion = useReducedMotion()
  const aspect = size.width / size.height
  const onStationDwellStartRef = useRef(onStationDwellStart)
  useEffect(() => {
    onStationDwellStartRef.current = onStationDwellStart
  })

  useEffect(() => {
    setupGsap()
    if (stationCount === 0) return

    const pullback = cameraPullback(aspect)
    const standoff = BASE_STANDOFF * pullback
    const bounds = stationBounds(timings ?? uniformTiming(stationCount))

    const place = (progress: number) => {
      const targetZ = zAtProgress(progress, bounds)
      camera.position.set(
        Math.sin(progress * Math.PI * Math.max(stationCount - 1, 1)) * SWAY,
        CAMERA_HEIGHT * (1 + (pullback - 1) * 0.35),
        targetZ + standoff,
      )
      camera.lookAt(0, LOOK_HEIGHT, targetZ)

      // Runs every frame regardless of gotwIndex now -- DWELL_FOV
      // widened every ordinary station's own dwell (journeyLayout.ts's
      // fovAtProgress), not just the GOTW station's tightening, so
      // there's no week where this is skippable the way it used to be
      // when 45 degrees was the universal, never-changing default.
      //
      // Mutating the hook-returned camera directly, same as
      // camera.position.set()/camera.lookAt() just above -- three.js
      // gives no other way to change a PerspectiveCamera's fov, and
      // updateProjectionMatrix() is required after doing so or the
      // change never reaches the render (same "mutate the object the
      // hook gave you, not a copy" pattern Portrait.tsx's texture setup
      // already documents). Triggers oxlint's react(immutability)
      // warning where the .set()/.lookAt() calls above don't -- the
      // linter only flags a raw property assignment, not a method call
      // on the same object -- expected, not a bug to work around.
      const perspectiveCamera = camera as PerspectiveCamera
      perspectiveCamera.fov = fovAtProgress(progress, bounds, gotwIndex)
      perspectiveCamera.updateProjectionMatrix()
    }

    // The first painted frame has to be framed correctly. ScrollTrigger
    // does not fire onUpdate until the first scroll, so without this the
    // opening shot uses whatever pose the <Canvas> camera prop set --
    // which on a phone is the cropped one.
    place(0)

    const track = document.getElementById(trackId)
    if (prefersReducedMotion || !track) return

    // -1: no station's dwell window has fired yet. Distinct from every
    // real index (including 0) so the first genuine dwell entry always
    // fires, without also firing for the synchronous place(0) call
    // above -- that call only frames the opening shot before any
    // scrolling has happened, not a real "arrival" at station 0, and
    // onStationDwellStart lives inside onUpdate below rather than
    // inside place() itself specifically so place(0) never touches it.
    let lastDwellIndex = -1
    // Set by the scrollTrigger's own `onUpdate` below (which receives the
    // ScrollTrigger instance as a plain parameter, `self`) rather than
    // read as `tween.scrollTrigger` from inside the tween's own
    // `onUpdate` -- referencing the enclosing `const tween` from within a
    // callback that GSAP/ScrollTrigger can invoke *synchronously during
    // `gsap.to()`'s own initialization* (confirmed live: happens when
    // this rig mounts with the page already scrolled partway through the
    // track, e.g. after a reload deep in the journey) throws "Cannot
    // access 'tween' before initialization" -- the assignment to `tween`
    // hasn't completed yet at that point, regardless of `const` vs `let`.
    let lastVelocity = 0
    const state = { progress: 0 }
    const tween = gsap.to(state, {
      progress: 1,
      ease: 'none', // the scrub supplies the weight, not the ease
      // 'bottom top', not 'bottom bottom' -- matching ScrollCameraRig's
      // own convention, and for the same underlying reason it matters
      // more here now: 'bottom bottom' maps progress over
      // (trackHeight - viewportHeight), while WeeklyJourney's panel
      // heights (stationHeightFractions) are plain fractions of
      // trackHeight itself. Those two denominators differ by a full
      // viewport's worth of pixels, growing with scroll depth -- with
      // 'bottom bottom' the camera would run measurably ahead of the
      // DOM by the last couple of stations, exactly the drift this
      // rework exists to remove. 'bottom top' makes progress span
      // scrollY in [trackTop, trackTop + trackHeight] exactly, the same
      // denominator the panel heights already assume.
      scrollTrigger: {
        trigger: track,
        start: 'top top',
        end: 'bottom top',
        scrub: 1.1,
        onUpdate: (self) => {
          lastVelocity = self.getVelocity()
        },
      },
      onUpdate: () => {
        place(state.progress)
        const dwellIndex = dwellIndexAtProgress(state.progress, bounds)
        if (dwellIndex !== -1 && dwellIndex !== lastDwellIndex) {
          lastDwellIndex = dwellIndex
          onStationDwellStartRef.current?.(dwellIndex, lastVelocity)
        }
      },
    })

    return () => {
      tween.scrollTrigger?.kill()
      tween.kill()
    }
  }, [camera, aspect, prefersReducedMotion, trackId, stationCount, timings, gotwIndex])

  return null
}
