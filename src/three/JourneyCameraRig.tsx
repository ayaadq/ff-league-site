import { useThree } from '@react-three/fiber'
import { gsap } from 'gsap'
import { useEffect } from 'react'
import { useReducedMotion } from '../motion/reducedMotionContext'
import { setupGsap } from '../motion/gsapSetup'
import { stationBounds, uniformTiming, zAtProgress, type StationTiming } from './journeyLayout'

/** The aspect the framing was tuned at, measured on a desktop canvas.
 * Same reference the gallery rig uses, and the same reason: `fov` is
 * vertical, so a portrait viewport sees a much narrower horizontal slice
 * and would cut the two portraits off at the edges. */
const FRAMED_FOR_ASPECT = 1.14
const MAX_PULLBACK = 2.2

/** How far behind the station the camera sits, at the reference aspect. */
const BASE_STANDOFF = 9
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
}: {
  trackId: string
  stationCount: number
  /** Per-station dwell/travel shares (journeyLayout.ts). Defaults to
   * `uniformTiming(stationCount)` -- zero dwell, even travel spacing,
   * today's plain glide. No caller passes anything else yet. */
  timings?: StationTiming[]
}) {
  const { camera, size } = useThree()
  const prefersReducedMotion = useReducedMotion()
  const aspect = size.width / size.height

  useEffect(() => {
    setupGsap()
    if (stationCount === 0) return

    const pullback = Math.min(Math.max(FRAMED_FOR_ASPECT / aspect, 1), MAX_PULLBACK)
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
    }

    // The first painted frame has to be framed correctly. ScrollTrigger
    // does not fire onUpdate until the first scroll, so without this the
    // opening shot uses whatever pose the <Canvas> camera prop set --
    // which on a phone is the cropped one.
    place(0)

    const track = document.getElementById(trackId)
    if (prefersReducedMotion || !track) return

    const state = { progress: 0 }
    const tween = gsap.to(state, {
      progress: 1,
      ease: 'none', // the scrub supplies the weight, not the ease
      scrollTrigger: { trigger: track, start: 'top top', end: 'bottom bottom', scrub: 1.1 },
      onUpdate: () => place(state.progress),
    })

    return () => {
      tween.scrollTrigger?.kill()
      tween.kill()
    }
  }, [camera, aspect, prefersReducedMotion, trackId, stationCount, timings])

  return null
}
