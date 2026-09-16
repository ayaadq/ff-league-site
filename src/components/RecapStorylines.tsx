import type { Storyline } from '../content/recaps'

/** The recap's opening act — the "what the hell just happened" block.
 *
 * Purely authored: nothing here is computed, and when a week has no
 * recap written the whole section is absent rather than empty. The lede
 * carries the weight, so it gets the display face and the body follows
 * in reading text. */
export function RecapStorylines({
  title,
  storylines,
}: {
  title?: string
  storylines?: Storyline[]
}) {
  if (!storylines?.length) return null

  return (
    <section className="mt-14 md:mt-20" aria-labelledby="storylines-authored-heading">
      <h2
        id="storylines-authored-heading"
        className="font-display text-charcoal text-3xl sm:text-4xl"
      >
        {title ?? 'What happened'}
      </h2>
      <div className="gold-divider mt-5 w-16" aria-hidden="true" />

      <div className="mt-8 space-y-7">
        {storylines.map((story, i) => (
          <p key={i} className="text-charcoal-soft max-w-prose text-[0.95rem] leading-relaxed">
            <span className="font-display text-charcoal block text-xl leading-snug">
              {story.lede}
            </span>
            <span className="mt-2 block">{story.body}</span>
          </p>
        ))}
      </div>
    </section>
  )
}
