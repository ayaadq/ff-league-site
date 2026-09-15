import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { useEffect, useRef } from 'react'
import { setupGsap } from './gsapSetup'
import { useReducedMotion } from './reducedMotionContext'

/** A stepped count-up — SPEC.md §5.5's other named stepped/stop-motion
 * beat alongside the trophy entrance (three/TrophyRoomScene.tsx). Ticks up
 * from 0 to `value` in whole visible steps (not a smooth tween) once
 * the element scrolls into view, then stays put — a deliberate,
 * occasional accent per SPEC.md §5.5, not applied to every number on
 * the page.
 *
 * `prefers-reduced-motion`: skipped entirely, renders `value` directly.
 */
export function StatCountUp({
  value,
  decimals = 1,
  className,
}: {
  value: number
  decimals?: number
  className?: string
}) {
  const ref = useRef<HTMLSpanElement>(null)
  const prefersReducedMotion = useReducedMotion()

  useEffect(() => {
    const el = ref.current
    if (!el || prefersReducedMotion) return

    setupGsap()
    gsap.registerPlugin(ScrollTrigger)

    const proxy = { n: 0 }
    const steps = 14
    const tween = gsap.to(proxy, {
      n: value,
      duration: 0.9,
      ease: `steps(${steps})`,
      scrollTrigger: {
        trigger: el,
        start: 'top 85%',
        once: true,
      },
      onUpdate: () => {
        el.textContent = proxy.n.toFixed(decimals)
      },
    })

    return () => {
      tween.scrollTrigger?.kill()
      tween.kill()
    }
  }, [value, decimals, prefersReducedMotion])

  return (
    <span ref={ref} className={className}>
      {value.toFixed(decimals)}
    </span>
  )
}
