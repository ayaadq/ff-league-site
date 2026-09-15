import { useThree } from '@react-three/fiber'
import { gsap } from 'gsap'
import { useEffect } from 'react'
import { useReducedMotion } from '../motion/reducedMotionContext'
import { setupGsap } from '../motion/gsapSetup'

/** The aspect ratio each page's camera poses were framed against — the
 * measured canvas aspect on a desktop viewport (744x651). Poses are
 * authored by eye at that shape, so this is the reference the fit below
 * corrects away from, not an arbitrary constant. */
const FRAMED_FOR_ASPECT = 1.14

/** Cap on how far the fit may dolly back, so a freak aspect (a very short
 * landscape window, a very tall phone) can't push the scene toward the
 * far plane instead of merely framing it. */
const MAX_PULLBACK = 2.2

export interface CameraPose {
  x: number
  y: number
  z: number
}

/** three.js `fov` is vertical, so a portrait viewport sees a
 * proportionally narrower horizontal slice of the scene at the same
 * camera distance. On a phone that cropped both scenes badly — the
 * podium's outer blocks and both ends of the portrait arc sat outside
 * the frame entirely at 375px (canvas aspect 0.69 against the 1.14 the
 * poses were framed for).
 *
 * The fix dollies straight back along the view axis by the ratio between
 * the two aspects, which restores the whole composition without touching
 * any page's authored framing and without the perspective distortion
 * that widening `fov` would introduce. Scaling the offset *from the look
 * target* (rather than the raw position) is what keeps the camera aimed
 * at the same point, so the shot is the same shot, just further out.
 *
 * Never dollies closer than the authored pose: a wide viewport already
 * sees everything, so `pullback` floors at 1. */
function fitToViewport(
  pose: CameraPose,
  lookTarget: [number, number, number],
  aspect: number,
): CameraPose {
  const pullback = Math.min(Math.max(FRAMED_FOR_ASPECT / aspect, 1), MAX_PULLBACK)
  return {
    x: lookTarget[0] + (pose.x - lookTarget[0]) * pullback,
    y: lookTarget[1] + (pose.y - lookTarget[1]) * pullback,
    z: lookTarget[2] + (pose.z - lookTarget[2]) * pullback,
  }
}

/** Scroll-driven camera — SPEC.md §5.5's core interaction pattern,
 * PLAN.md Phase 6. Lives inside a persistent <Canvas> so it can drive
 * the real r3f camera directly, but the scroll it listens to is the
 * ordinary page scroll — GSAP's ScrollTrigger works against the DOM
 * regardless of where the driving code runs.
 *
 * Generalized (originally Home-only, hardcoded) once a second scene
 * needed the same rig with a different camera path — each page's
 * canvas host wraps its `<Canvas>` in its own tall `sticky top-0` track
 * div (see pages/HomePage.tsx and pages/HistoryPage.tsx) and passes
 * that div's id plus its own rest/scrolled camera poses and look
 * target. Tracking each page's own track element (rather than the
 * whole document) keeps the camera's full move in sync with exactly
 * the scroll span where that page's canvas is visible, independent of
 * how long the rest of the page's content is.
 *
 * `prefers-reduced-motion`: skipped entirely — the camera stays at
 * `restPosition` rather than moving on scroll, per SPEC.md §5.5's
 * reduced-motion requirement.
 */
export function ScrollCameraRig({
  trackId,
  restPosition,
  scrolledPosition,
  lookTarget,
}: {
  trackId: string
  restPosition: CameraPose
  scrolledPosition: CameraPose
  lookTarget: [number, number, number]
}) {
  const { camera, size } = useThree()
  const prefersReducedMotion = useReducedMotion()
  // Recomputed on resize and orientation change, since r3f updates
  // `size` with the canvas — the effect below re-runs and re-fits.
  const aspect = size.width / size.height

  useEffect(() => {
    setupGsap()

    const track = document.getElementById(trackId)
    const rest = fitToViewport(restPosition, lookTarget, aspect)
    const scrolled = fitToViewport(scrolledPosition, lookTarget, aspect)

    if (prefersReducedMotion || !track) {
      camera.position.set(rest.x, rest.y, rest.z)
      camera.lookAt(...lookTarget)
      return
    }

    // Place the camera at the fitted rest pose up front. The scrub tween
    // below only writes to camera.position from its onUpdate, which
    // ScrollTrigger doesn't fire until the first scroll — so without this
    // the first painted frame uses the raw pose from the <Canvas> camera
    // prop, unfitted. That is exactly the frame that matters on a phone,
    // where the unfitted pose is the cropped one.
    camera.position.set(rest.x, rest.y, rest.z)
    camera.lookAt(...lookTarget)

    const current = { ...rest }
    const tween = gsap.to(current, {
      ...scrolled,
      ease: 'none', // the scrub value below supplies the "weighted" lag, not this ease
      scrollTrigger: {
        trigger: track,
        start: 'top top',
        end: 'bottom top',
        scrub: 1.2,
      },
      onUpdate: () => {
        camera.position.set(current.x, current.y, current.z)
        camera.lookAt(...lookTarget)
      },
    })

    return () => {
      tween.scrollTrigger?.kill()
      tween.kill()
    }
    // Depend on the individual numbers rather than the restPosition/
    // scrolledPosition/lookTarget objects themselves: those are plain
    // object literals passed fresh from each call site's render, so an
    // object-identity dependency would recreate the ScrollTrigger on
    // every render instead of only when the camera path actually
    // changes.
  }, [
    camera,
    aspect,
    prefersReducedMotion,
    trackId,
    restPosition.x,
    restPosition.y,
    restPosition.z,
    scrolledPosition.x,
    scrolledPosition.y,
    scrolledPosition.z,
    lookTarget[0],
    lookTarget[1],
    lookTarget[2],
  ])

  return null
}
