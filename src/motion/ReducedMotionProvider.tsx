import { useEffect, useState, type ReactNode } from 'react'
import { ReducedMotionContext } from './reducedMotionContext'

function getInitialPreference(): boolean {
  if (typeof window === 'undefined') return false
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

/** Wired up globally from Phase 2 per PLAN.md, ahead of any animation
 * work consuming it (Phase 6+). See SPEC.md §5.5 for the reduced-motion
 * variant this is expected to drive. */
export function ReducedMotionProvider({ children }: { children: ReactNode }) {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(getInitialPreference)

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
    const handleChange = (event: MediaQueryListEvent) => setPrefersReducedMotion(event.matches)
    mediaQuery.addEventListener('change', handleChange)
    return () => mediaQuery.removeEventListener('change', handleChange)
  }, [])

  return (
    <ReducedMotionContext.Provider value={prefersReducedMotion}>
      {children}
    </ReducedMotionContext.Provider>
  )
}
