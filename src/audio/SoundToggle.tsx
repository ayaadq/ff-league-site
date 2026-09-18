import { useSound } from './soundContext'
import { useReducedMotion } from '../motion/reducedMotionContext'

/** Persistent control in the site header. Once someone has turned sound
 * on from the hero prompt, this is how they turn it off again from
 * anywhere — a site that can start audio and not obviously stop it is
 * the thing that makes people close the tab. */
export function SoundToggle() {
  const { enabled, ready, toggle } = useSound()
  const prefersReducedMotion = useReducedMotion()
  const animate = enabled && ready && !prefersReducedMotion

  return (
    <button
      type="button"
      onClick={toggle}
      aria-pressed={enabled}
      aria-label={enabled ? 'Turn sound off' : 'Turn sound on'}
      className="text-charcoal-soft hover:text-charcoal flex min-h-11 items-center gap-2 px-1 text-xs tracking-widest uppercase transition-colors duration-300"
    >
      {/* Three bars that rise and fall while sound is on and ready, and
          sit flat when it isn't — the state is legible without reading
          the label. aria-hidden because the button's own label says
          it. */}
      <span aria-hidden="true" className="flex h-3.5 items-end gap-[2px]">
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className={`bg-charcoal-soft w-[2px] origin-bottom ${animate ? 'animate-sound-bar' : ''}`}
            style={{
              height: animate ? '100%' : '30%',
              animationDelay: `${i * 0.18}s`,
            }}
          />
        ))}
      </span>
      {enabled ? 'Sound on' : 'Sound'}
    </button>
  )
}
