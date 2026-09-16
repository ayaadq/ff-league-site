import { useSound } from './soundContext'

/** The landing affordance: an explicit invitation rather than autoplay.
 * Disappears for good once sound is on — at that point the header toggle
 * is the control, and leaving a second one on the page would just be
 * clutter over the hero. */
export function EnableSoundPrompt() {
  const { enabled, toggle } = useSound()
  if (enabled) return null

  return (
    <button
      type="button"
      onClick={toggle}
      className="group text-charcoal-soft hover:text-charcoal flex min-h-11 items-center gap-3 text-[0.7rem] tracking-[0.25em] uppercase transition-colors duration-500"
    >
      <span
        aria-hidden="true"
        className="border-gold-metal/60 group-hover:border-gold-metal relative flex h-6 w-6 items-center justify-center rounded-full border transition-colors duration-500"
      >
        <span className="bg-gold-metal h-1.5 w-1.5 rounded-full" />
        {/* A slow pulse outward — the one thing on the hero asking to be
            clicked, so it earns a little motion. Pure CSS so it costs
            nothing, and it stops under prefers-reduced-motion via the
            keyframe guard in index.css. */}
        <span className="border-gold-metal/40 animate-sound-ping absolute inset-0 rounded-full border" />
      </span>
      Click to enable sound
    </button>
  )
}
