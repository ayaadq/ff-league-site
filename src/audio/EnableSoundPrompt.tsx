import { useSound } from './soundContext'

const TONE_CLASSES = {
  paper: 'text-charcoal-soft hover:text-charcoal',
  ink: 'text-mute-on-ink hover:text-marble',
} as const

/** The landing affordance: an explicit invitation rather than autoplay.
 * Disappears for good once sound is on — at that point the header toggle
 * is the control, and leaving a second one on the page would just be
 * clutter over the hero.
 *
 * `tone` defaults to 'paper' (History's header, its original correct
 * behavior) — HomePage's ink hero (HeroSection.tsx) passes 'ink'. A real
 * bug, not just a hardening: an earlier redesign pass hard-coded this
 * component for the ink hero on the assumption it only rendered there,
 * missing that HistoryPage.tsx renders it too, on paper — which quietly
 * dropped that instance's text below WCAG AA contrast until this fix.
 * (Separate restyle note: the pre-redesign version referenced
 * `border-gold-metal`/`bg-gold-metal`, which were never real Tailwind
 * utilities — `gold-metal` was only ever a CSS variable name inside
 * `.text-gold-metal`'s `background-clip: text` trick, not a `--color-*`
 * token, so those classes silently did nothing. Fixed to reference the
 * real ignite token.) */
export function EnableSoundPrompt({
  tone = 'paper',
}: {
  tone?: keyof typeof TONE_CLASSES
} = {}) {
  const { enabled, toggle } = useSound()
  if (enabled) return null

  return (
    <button
      type="button"
      onClick={toggle}
      className={`group flex min-h-11 items-center gap-3 text-[0.7rem] tracking-[0.25em] uppercase transition-colors duration-500 ${TONE_CLASSES[tone]}`}
    >
      <span
        aria-hidden="true"
        className="border-gold-bright/60 group-hover:border-gold-bright relative flex h-6 w-6 items-center justify-center rounded-full border transition-colors duration-500"
      >
        <span className="bg-gold-bright h-1.5 w-1.5 rounded-full" />
        {/* A slow pulse outward — the one thing on the hero asking to be
            clicked, so it earns a little motion. Pure CSS so it costs
            nothing, and it stops under prefers-reduced-motion via the
            keyframe guard in index.css. */}
        <span className="border-gold-bright/40 animate-sound-ping absolute inset-0 rounded-full border" />
      </span>
      Click to enable sound
    </button>
  )
}
