import type { ReactNode } from 'react'

const TONE_CLASSES = {
  paper: 'text-charcoal-soft',
  ink: 'text-mute-on-ink',
} as const

/** `tone` defaults to 'paper' (unchanged everywhere this already renders)
 * — the redesign's ink hero (HeroSection.tsx) is the one caller that
 * passes 'ink' so the label stays legible on the dark canvas. */
export function SectionKicker({
  children,
  tone = 'paper',
}: {
  children: ReactNode
  tone?: keyof typeof TONE_CLASSES
}) {
  return <p className={`text-xs tracking-widest uppercase ${TONE_CLASSES[tone]}`}>{children}</p>
}
