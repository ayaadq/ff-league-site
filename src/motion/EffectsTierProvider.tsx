import { useEffect, useState, type ReactNode } from 'react'
import { EffectsTierContext, type EffectsTier } from './effectsTierContext'

/** The same `sm` breakpoint (640px, Tailwind's default -- confirmed
 * unmodified in src/index.css) this whole codebase already uses for
 * mobile-vs-desktop layout, not a new number invented for 3D
 * specifically. Viewport width, not a device-capability guess: this
 * project's earlier attempt at reading the diagnostic overlay's
 * hardwareConcurrency/deviceMemory/GPU-string signals found nothing
 * worth gating on, and inventing a new detection scheme now would be
 * exactly the fragility that session spent effort ruling out.
 *
 * A separate, orthogonal signal from prefers-reduced-motion
 * (reducedMotionContext.ts) on purpose: a heavy effect that cares about
 * both checks both explicitly, rather than this hook folding them into
 * one boolean and hiding which one actually fired. */
const BREAKPOINT_QUERY = '(min-width: 640px)'

function getInitialTier(): EffectsTier {
  if (typeof window === 'undefined') return 'full'
  return window.matchMedia(BREAKPOINT_QUERY).matches ? 'full' : 'reduced'
}

/** Wired up ahead of any effect consuming it (same order Phase 2 wired
 * ReducedMotionProvider ahead of the animation work that came later) --
 * gating what doesn't exist yet is cheaper before more per-frame work
 * lands on an ungated baseline than after. */
export function EffectsTierProvider({ children }: { children: ReactNode }) {
  const [tier, setTier] = useState<EffectsTier>(getInitialTier)

  useEffect(() => {
    const mediaQuery = window.matchMedia(BREAKPOINT_QUERY)
    const handleChange = (event: MediaQueryListEvent) => setTier(event.matches ? 'full' : 'reduced')
    mediaQuery.addEventListener('change', handleChange)
    return () => mediaQuery.removeEventListener('change', handleChange)
  }, [])

  return <EffectsTierContext.Provider value={tier}>{children}</EffectsTierContext.Provider>
}
