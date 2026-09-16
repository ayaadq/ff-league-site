import { useEffect, useState } from 'react'

/** The hero's "keep going" hint. Fades out for good once the visitor has
 * scrolled a little — its whole job is to answer "is there more?" on
 * first load, and a permanent arrow nagging at someone who has already
 * started reading is just noise. */
export function ScrollCue({ label = 'Scroll' }: { label?: string }) {
  const [hidden, setHidden] = useState(false)

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
      <span className="text-charcoal-soft text-[0.7rem] tracking-[0.25em] uppercase">{label}</span>
      <span aria-hidden="true" className="bg-charcoal-soft/40 h-10 w-px overflow-hidden">
        <span className="bg-gold-bright animate-scroll-cue block h-full w-full" />
      </span>
    </div>
  )
}
