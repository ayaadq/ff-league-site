import { useEffect, useState } from 'react'

const TONE_CLASSES = {
  paper: { label: 'text-charcoal-soft', track: 'bg-charcoal-soft/40' },
  ink: { label: 'text-mute-on-ink', track: 'bg-mute-on-ink/40' },
} as const

/** The hero's "keep going" hint. Fades out for good once the visitor has
 * scrolled a little — its whole job is to answer "is there more?" on
 * first load, and a permanent arrow nagging at someone who has already
 * started reading is just noise.
 *
 * `tone` picks the muted-text color for whichever canvas it sits on —
 * League History still uses the default 'paper' tone, while the redesign's
 * ink hero (HeroSection.tsx) passes 'ink' so the label stays legible on
 * the dark canvas. */
export function ScrollCue({
  label = 'Scroll',
  tone = 'paper',
}: {
  label?: string
  tone?: keyof typeof TONE_CLASSES
}) {
  const [hidden, setHidden] = useState(false)
  const toneClasses = TONE_CLASSES[tone]

  useEffect(() => {
    const onScroll = () => {
      if (window.scrollY > 120) setHidden(true)
    }
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <div
      className={`flex flex-col items-center gap-3 transition-opacity duration-700 ${
        hidden ? 'pointer-events-none opacity-0' : 'opacity-100'
      }`}
    >
      <span className={`text-[0.7rem] tracking-[0.25em] uppercase ${toneClasses.label}`}>
        {label}
      </span>
      <span aria-hidden="true" className={`h-10 w-px overflow-hidden ${toneClasses.track}`}>
        <span className="bg-gold-bright animate-scroll-cue block h-full w-full" />
      </span>
    </div>
  )
}
