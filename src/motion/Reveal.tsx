import { gsap } from 'gsap'
import { useLayoutEffect, useRef, type ReactNode } from 'react'
import { useReducedMotion } from './reducedMotionContext'
import { setupGsap } from './gsapSetup'
import { useSound } from '../audio/soundContext'

/** Scroll-triggered entrance for a block of page content — SPEC.md §5.5's
 * "motion throughout", applied to the 2D content the way the 3D scenes
 * already animate.
 *
 * `once: true` throughout: this is an arrival, not a state. Replaying it
 * every time a section scrolls back past would turn a weekly scoreboard
 * into a fairground, and re-animating content someone is scrolling back
 * to re-read is actively obstructive.
 *
 * A layout effect, not an effect: `fromTo` has to write the hidden state
 * before the browser paints, or the content flashes at full opacity for a
 * frame and then jumps away to animate in.
 *
 * Under `prefers-reduced-motion` this renders as a plain wrapper — no
 * tween, no trigger, no sound, content simply present. */
export function Reveal({
  children,
  y = 28,
  delay = 0,
  /** Fires the reveal one-shot when this block arrives. Off for blocks
   * that land in clusters, so a single scroll doesn't trigger a volley —
   * the provider rate-limits too, but not firing is cleaner than firing
   * and being dropped. */
  sound = false,
  className,
}: {
  children: ReactNode
  y?: number
  delay?: number
  sound?: boolean
  className?: string
}) {
  const ref = useRef<HTMLDivElement>(null)
  const prefersReducedMotion = useReducedMotion()
  const { play } = useSound()

  useLayoutEffect(() => {
    if (prefersReducedMotion) return
    setupGsap()
    const el = ref.current
    if (!el) return

    const ctx = gsap.context(() => {
      gsap.fromTo(
        el,
        { opacity: 0, y },
        {
          opacity: 1,
          y: 0,
          duration: 0.9,
          delay,
          ease: 'weighted',
          scrollTrigger: {
            trigger: el,
            // Deliberately late: the block is already well inside the
            // viewport when it starts, so the motion reads as the page
            // settling rather than as content withheld until you scroll.
            start: 'top 88%',
            once: true,
            onEnter: () => {
              if (sound) play('whoosh')
            },
          },
        },
      )
    })
    return () => ctx.revert()
  }, [prefersReducedMotion, y, delay, sound, play])

  return (
    <div ref={ref} className={className}>
      {children}
    </div>
  )
}
