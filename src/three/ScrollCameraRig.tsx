import { useThree } from '@react-three/fiber'
import { gsap } from 'gsap'
import { useEffect } from 'react'
import { useReducedMotion } from '../motion/reducedMotionContext'
import { setupGsap } from '../motion/gsapSetup'

export interface CameraPose {
  x: number
  y: number
  z: number
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
  const { camera } = useThree()
  const prefersReducedMotion = useReducedMotion()

  useEffect(() => {
    setupGsap()

    const track = document.getElementById(trackId)

    if (prefersReducedMotion || !track) {
      camera.position.set(restPosition.x, restPosition.y, restPosition.z)
      camera.lookAt(...lookTarget)
      return
    }

    const current = { ...restPosition }
    const tween = gsap.to(current, {
      ...scrolledPosition,
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
