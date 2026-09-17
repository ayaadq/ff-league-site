import { gsap } from 'gsap'
import { forwardRef, useImperativeHandle, useRef } from 'react'
import { setupGsap } from '../motion/gsapSetup'
import { useReducedMotion } from '../motion/reducedMotionContext'

const COLORS = ['#ff5a36', '#2ee6d6']

export interface ConfettiHandle {
  /** `bias` in [-1, 1]: negative leans the burst left, positive right.
   * `intensity` in [0, 1]: scales particle count and fall distance. */
  burst: (options: { bias: number; intensity: number }) => void
}

/** Confetti scoped to the matchup journey only (PLAN.md Phase G) — one
 * instance mounted by WeeklyJourney.tsx, fired from the same
 * `onStationDwellStart` callback that already drives the sound duck/roar,
 * never mounted anywhere else on the site (not the recap, not standings,
 * not the leaderboard).
 *
 * Particles are plain DOM divs created and animated directly with GSAP
 * rather than React state — a fast flick through all six stations can
 * fire six bursts in well under a second, and routing that through
 * per-particle state/re-renders would be the wrong tool for something
 * this transient. Each particle removes itself from the DOM in its own
 * tween's `onComplete`, so nothing needs cleanup bookkeeping beyond that. */
export const ConfettiLayer = forwardRef<ConfettiHandle>(function ConfettiLayer(_props, ref) {
  const containerRef = useRef<HTMLDivElement>(null)
  const reducedMotion = useReducedMotion()

  useImperativeHandle(ref, () => ({
    burst({ bias, intensity }) {
      if (reducedMotion) return
      const container = containerRef.current
      if (!container) return
      setupGsap()

      const clampedIntensity = Math.min(Math.max(intensity, 0), 1)
      const count = Math.round(12 + clampedIntensity * 28)
      const vw = window.innerWidth
      const vh = window.innerHeight
      const biasX = bias * vw * 0.26

      for (let i = 0; i < count; i++) {
        const el = document.createElement('div')
        const size = 5 + Math.random() * 6
        el.style.position = 'absolute'
        el.style.width = `${size}px`
        el.style.height = `${size * 0.4}px`
        el.style.borderRadius = '1px'
        el.style.background = COLORS[i % COLORS.length]
        el.style.left = '50%'
        el.style.top = '40%'
        el.style.willChange = 'transform, opacity'
        container.appendChild(el)

        const spreadX = biasX + (Math.random() - 0.5) * vw * 0.45
        const fallY = vh * (0.3 + Math.random() * 0.3) * (0.55 + clampedIntensity * 0.7)
        const rotate = (Math.random() - 0.5) * 720
        const duration = 1.0 + Math.random() * 0.6

        gsap.fromTo(
          el,
          { x: 0, y: 0, opacity: 1, rotate: 0 },
          {
            x: spreadX,
            y: fallY,
            rotate,
            opacity: 0,
            duration,
            ease: 'power1.out',
            onComplete: () => el.remove(),
          },
        )
      }
    },
  }))

  return (
    <div
      ref={containerRef}
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-40 overflow-hidden"
    />
  )
})
