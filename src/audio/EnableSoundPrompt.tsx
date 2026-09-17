import { useSound } from './soundContext'

/** The landing affordance: an explicit invitation rather than autoplay.
 * Disappears for good once sound is on — at that point the header toggle
 * is the control, and leaving a second one on the page would just be
 * clutter over the hero.
 *
 * Styled for the ink hero (PLAN.md Phase 13B) — this only ever renders
 * inside HeroSection.tsx, so it's hard-coded for the dark canvas rather
 * than taking a tone prop the way ScrollCue does. (Restyle note: the
 * previous version referenced `border-gold-metal`/`bg-gold-metal`, which
 * were never real Tailwind utilities — `gold-metal` was only ever a CSS
 * variable name inside `.text-gold-metal`'s `background-clip: text`
 * trick, not a `--color-*` token, so those classes silently did nothing.
 * Fixed here to reference the real ignite token.) */
export function EnableSoundPrompt() {
  const { enabled, toggle } = useSound()
  if (enabled) return null

  return (
    <button
      type="button"
      onClick={toggle}
      className="group text-mute-on-ink hover:text-marble flex min-h-11 items-center gap-3 text-[0.7rem] tracking-[0.25em] uppercase transition-colors duration-500"
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
