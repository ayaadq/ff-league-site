import { useThree } from '@react-three/fiber'
import { gsap } from 'gsap'
import { useEffect } from 'react'
import { useLocation } from 'react-router'
import { useReducedMotion } from '../motion/reducedMotionContext'
import { setupGsap } from '../motion/gsapSetup'

const REST_POSITION = { x: 0, y: 1.85, z: 9.4 }
const SCROLLED_POSITION = { x: 1.4, y: 2.6, z: 6.2 }
const LOOK_TARGET: [number, number, number] = [0, 1.4, -1]

/** Scroll-driven camera through the gallery scene — SPEC.md §5.5's core
 * interaction pattern, PLAN.md Phase 6. Lives inside the persistent
 * <Canvas> (see GalleryCanvas.tsx) so it can drive the real r3f camera
 * directly, but the scroll it listens to is the ordinary page scroll —
 * GSAP's ScrollTrigger works against the DOM regardless of where the
 * driving code runs.
 *
 * Scoped to Home for now: the canvas only has visible height there (see
 * Layout.tsx's GalleryCanvasHost) until team pages integrate with the
 * shared scene in Phase 7, so driving the camera on other routes would
 * have no visible effect. Recreates the scroll tween on route change
 * (a route's page height differs, and start/end are measured against
 * `document.body`'s height at creation time) rather than trying to
 * keep one ScrollTrigger valid across every route's differing content
 * height.
 *
 * `prefers-reduced-motion`: skipped entirely — the camera stays at its
 * static Phase 5 framing rather than moving on scroll, per SPEC.md
 * §5.5's reduced-motion requirement.
 */
export function ScrollCameraRig() {
  const { camera } = useThree()
  const prefersReducedMotion = useReducedMotion()
  const { pathname } = useLocation()
  const isHome = pathname === '/'

  useEffect(() => {
    setupGsap()

    if (prefersReducedMotion || !isHome) {
      camera.position.set(REST_POSITION.x, REST_POSITION.y, REST_POSITION.z)
      camera.lookAt(...LOOK_TARGET)
      return
    }

    const current = { ...REST_POSITION }
    const tween = gsap.to(current, {
      ...SCROLLED_POSITION,
      ease: 'none', // the scrub value below supplies the "weighted" lag, not this ease
      scrollTrigger: {
        trigger: document.body,
        start: 'top top',
        end: 'bottom bottom',
        scrub: 1.2,
      },
      onUpdate: () => {
        camera.position.set(current.x, current.y, current.z)
        camera.lookAt(...LOOK_TARGET)
      },
    })

    return () => {
      tween.scrollTrigger?.kill()
      tween.kill()
    }
  }, [camera, prefersReducedMotion, isHome])

  return null
}
