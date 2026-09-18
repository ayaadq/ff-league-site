import { Canvas } from '@react-three/fiber'
import { gsap } from 'gsap'
import { Suspense, useEffect, useRef } from 'react'
import { setupGsap } from '../motion/gsapSetup'
import { useReducedMotion } from '../motion/reducedMotionContext'
import { PaperCrumpleAnimation } from './PaperCrumpleAnimation'
import { SceneLighting } from './SceneLighting'

const INK = '#0b0b0e'
/** The brief's own figure -- the whole crumple-to-launch animation plays
 * out over this many pixels of scroll, not tied to a percentage of a
 * taller track the way the journey/trophy line's per-item dwell is. */
const SCROLL_PX = 400

/** Host canvas for the paper crumple transition (PLAN.md "Paper Crumple
 * Animation") -- sits between the journey and the "view full recap" CTA
 * on Home, playing once as that stretch of the page scrolls past.
 *
 * `progressRef` is written directly by the ScrollTrigger's `onUpdate`
 * and read every frame by `PaperCrumpleAnimation` via `useFrame` -- the
 * same ref-mutation idiom this project's other scroll-driven scenes use
 * (JourneyCameraRig, ScrollCameraRig) specifically to avoid a React
 * re-render on every scroll tick.
 *
 * `prefers-reduced-motion`: the paper stays at rest (progress pinned at
 * 0, fully visible, no crumple/launch) rather than skipping the whole
 * component -- same "present, just not moving" treatment every other
 * scroll rig in this project gives reduced motion. */
export function PaperCrumpleCanvas({ trackId }: { trackId: string }) {
  const progressRef = useRef(0)
  const prefersReducedMotion = useReducedMotion()

  useEffect(() => {
    if (prefersReducedMotion) {
      progressRef.current = 0
      return
    }
    setupGsap()

    const track = document.getElementById(trackId)
    if (!track) return

    const state = { progress: 0 }
    const tween = gsap.to(state, {
      progress: 1,
      ease: 'power2.out',
      scrollTrigger: {
        trigger: track,
        start: 'top bottom',
        end: `+=${SCROLL_PX}`,
        scrub: 0.5,
      },
      onUpdate: () => {
        progressRef.current = state.progress
      },
    })

    return () => {
      tween.scrollTrigger?.kill()
      tween.kill()
    }
  }, [trackId, prefersReducedMotion])

  return (
    <Canvas
      dpr={[1, 1.5]}
      gl={{ antialias: true, powerPreference: 'high-performance' }}
      camera={{ position: [0, 0, 4], fov: 42, near: 0.1, far: 20 }}
    >
      <color attach="background" args={[INK]} />
      <Suspense fallback={null}>
        <SceneLighting />
        <PaperCrumpleAnimation progressRef={progressRef} />
      </Suspense>
    </Canvas>
  )
}
