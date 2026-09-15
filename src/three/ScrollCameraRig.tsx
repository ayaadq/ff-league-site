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
 * Tracks `#gallery-scroll-track` (Layout.tsx's GalleryCanvasHost) —
 * the tall wrapper whose height gives the `sticky` canvas inside it
 * room to stay pinned on screen — from when it reaches the top of the
 * viewport to when it's fully scrolled past, rather than the whole
 * document. That keeps the camera's full move in sync with exactly the
 * span of scroll where the canvas is actually visible, independent of
 * how long the rest of the page is (which will keep growing in later
 * phases).
 *
 * Scoped to Home for now: `#gallery-scroll-track` only exists there
 * until team pages integrate with the shared scene in Phase 7. Recreates
 * the scroll tween on route change/element availability rather than
 * trying to keep one ScrollTrigger valid once the element unmounts.
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

    const track = isHome ? document.getElementById('gallery-scroll-track') : null

    if (prefersReducedMotion || !track) {
      camera.position.set(REST_POSITION.x, REST_POSITION.y, REST_POSITION.z)
      camera.lookAt(...LOOK_TARGET)
      return
    }

    const current = { ...REST_POSITION }
    const tween = gsap.to(current, {
      ...SCROLLED_POSITION,
      ease: 'none', // the scrub value below supplies the "weighted" lag, not this ease
      scrollTrigger: {
        trigger: track,
        start: 'top top',
        end: 'bottom top',
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
