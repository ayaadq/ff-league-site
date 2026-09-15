import { CustomEase } from 'gsap/CustomEase'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

let registered = false

/** Registers GSAP plugins and the shared ease/duration tokens exactly
 * once. Call this before any GSAP animation runs (each consumer calls
 * it defensively; the guard makes repeat calls free).
 *
 * The two eases mirror the CSS custom properties in src/index.css
 * (`--ease-weighted` / `--ease-weighted-in-out`) so a "weighted" motion
 * feels identical whether it's driven by CSS or GSAP — SPEC.md §5.5
 * calls for "slow and weighted" as one consistent texture, not two
 * slightly different curves that happen to both be called that. */
export function setupGsap() {
  if (registered) return
  registered = true

  gsap.registerPlugin(CustomEase, ScrollTrigger)

  CustomEase.create('weighted', '0.22, 1, 0.36, 1')
  CustomEase.create('weightedInOut', '0.65, 0, 0.35, 1')
}

/** Duration tokens — SPEC.md §5.5: "0.8s-1.6s for major transitions."
 * Named by role, not by value, so a call site reads `MOTION.major`
 * rather than a bare `1.2`. */
export const MOTION = {
  minor: 0.6,
  major: 1.2,
  ambient: 1.6,
} as const

export const EASE = {
  weighted: 'weighted',
  weightedInOut: 'weightedInOut',
} as const
