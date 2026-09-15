import type { ReactNode } from 'react'

export function SectionKicker({ children }: { children: ReactNode }) {
  return <p className="text-charcoal-soft text-xs tracking-widest uppercase">{children}</p>
}
