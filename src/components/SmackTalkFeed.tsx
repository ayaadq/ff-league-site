import type { BanterLine } from '../content/banter'
import { SectionKicker } from './SectionKicker'
import { TeamAvatar } from './TeamAvatar'

/** The week's smack talk (PLAN.md Phase 13D) — hand-authored, same
 * empty-by-default convention as RecapAwards/RecapRankings: with nothing
 * written this week, the whole section is absent, not an empty
 * placeholder. */
export function SmackTalkFeed({
  lines,
  nameFor,
  avatarFor,
}: {
  lines: BanterLine[]
  nameFor: (userId: string) => string
  avatarFor: (userId: string) => string | null
}) {
  if (lines.length === 0) return null

  return (
    <section className="mt-14 md:mt-20" aria-labelledby="smack-talk-heading">
      <SectionKicker>Trash talk</SectionKicker>
      <h2 id="smack-talk-heading" className="font-display text-charcoal mt-1 text-3xl">
        Smack Talk
      </h2>

      <ul className="divide-charcoal/10 mt-6 divide-y">
        {lines.map((line, i) => (
          <li key={i} className="flex items-start gap-3 py-5">
            <TeamAvatar avatarId={avatarFor(line.userId)} name={nameFor(line.userId)} />
            <div className="min-w-0">
              <p className="text-charcoal text-sm font-semibold">
                {nameFor(line.userId)}
                {line.toUserId && (
                  <span className="text-charcoal-soft font-normal">
                    {' '}
                    to {nameFor(line.toUserId)}
                  </span>
                )}
              </p>
              <p className="text-charcoal-soft mt-1 text-sm leading-relaxed">“{line.line}”</p>
            </div>
          </li>
        ))}
      </ul>
    </section>
  )
}
