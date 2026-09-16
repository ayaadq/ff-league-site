import type { AwardNote } from '../content/recaps'
import { TeamAvatar } from './TeamAvatar'

/** The week's awards. Each is a title, the manager it lands on, and the
 * line that does the damage.
 *
 * `userId` is optional by design — "Player of the Week" and "Bust of the
 * Week" are about players, not managers, and those entries render
 * without an avatar rather than being excluded or given a placeholder
 * face. */
export function RecapAwards({
  title,
  awards,
  nameFor,
  avatarFor,
}: {
  title?: string
  awards?: AwardNote[]
  nameFor: (userId: string) => string
  avatarFor: (userId: string) => string | null
}) {
  if (!awards?.length) return null

  return (
    <section className="mt-12 md:mt-16" aria-labelledby="awards-heading">
      <h2 id="awards-heading" className="font-display text-charcoal text-3xl">
        {title ?? 'The Week’s Awards'}
      </h2>

      <ul className="divide-charcoal/10 mt-6 divide-y">
        {awards.map((award, i) => (
          <li key={`${award.title}-${i}`} className="py-5">
            <div className="flex items-center gap-3">
              {award.emoji && (
                <span aria-hidden="true" className="text-lg leading-none">
                  {award.emoji}
                </span>
              )}
              <h3 className="text-charcoal text-xs font-semibold tracking-[0.18em] uppercase">
                {award.title}
              </h3>
            </div>

            <div className="mt-3 flex items-start gap-3">
              {award.userId && (
                <span className="mt-0.5 shrink-0">
                  <TeamAvatar avatarId={avatarFor(award.userId)} name={nameFor(award.userId)} />
                </span>
              )}
              <p className="text-charcoal-soft max-w-prose text-sm leading-relaxed">{award.body}</p>
            </div>
          </li>
        ))}
      </ul>
    </section>
  )
}
