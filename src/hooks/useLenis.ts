import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import Lenis from 'lenis'
import { useEffect } from 'react'
import { setupGsap } from '../motion/gsapSetup'

/** Mounts Lenis for the caller's lifetime (App.tsx, once, for the whole
 * site) and wires it into GSAP's own ticker so every existing
 * ScrollTrigger-driven animation (Reveal, the journey/trophy-line camera
 * rigs, WeeklyRecapSection's scrub timeline) reads the same smoothed
 * scroll position Lenis produces, rather than two separate scroll models
 * disagreeing with each other. This is the standard Lenis+GSAP wiring
 * (lenis.raf driven by gsap.ticker, ScrollTrigger.update on Lenis's own
 * 'scroll' event, ticker lag smoothing off since Lenis already smooths).
 *
 * No manual reduced-motion gating here -- Lenis's own `respectReducedMotion`
 * option defaults to true and already forces its internal lerp to 1
 * (effectively native, un-smoothed scroll) under `prefers-reduced-motion`,
 * so this doesn't need to duplicate ReducedMotionProvider's media-query
 * read on top of that.
 *
 * No touch/mobile override either: Lenis ships `syncTouch: false` by
 * default (native touch-scroll physics, not virtualized drag-to-scroll),
 * which is the "disable the risky part on mobile" behavior already,
 * without disabling smoothing altogether. If a real-device check (this
 * environment can't run one -- see PLAN.md) surfaces jank on a specific
 * device class, `touchMultiplier`/`syncTouch` are the knobs to reach for
 * before disabling Lenis outright. */
export function useLenis() {
  useEffect(() => {
    setupGsap()
    const lenis = new Lenis()

    lenis.on('scroll', ScrollTrigger.update)

    const update = (time: number) => lenis.raf(time * 1000)
    gsap.ticker.add(update)
    gsap.ticker.lagSmoothing(0)

    return () => {
      gsap.ticker.remove(update)
      lenis.destroy()
    }
  }, [])
}
