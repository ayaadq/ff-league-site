import type { RankingNote, WeekRecapContent } from '../content/recaps'
import { TeamAvatar } from './TeamAvatar'

/** The week's closing act — power rankings, with the closing piece
 * (PLAN.md Phase 12, act 5). Styled like RecapAwards rather than
 * RecapStorylines: this is a list of per-manager call-outs, not prose,
 * so it gets the same plain `<h2>` (no gold-divider) and the same
 * emoji+title treatment for the closing note that RecapAwards uses per
 * award.
 *
 * Grades render in a small gold-bordered badge rather than gold text --
 * CLAUDE.md's rule that gold/brass never carries readable text below
 * 24px applies to a two-character grade exactly as much as to body copy,
 * so the border is decorative and the letter itself stays charcoal. */
export function RecapRankings({
  title,
  intro,
  rankings,
  closing,
  nameFor,
  avatarFor,
}: {
  title?: string
  intro?: string
  rankings?: RankingNote[]
  closing?: WeekRecapContent['closing']
  nameFor: (userId: string) => string
  avatarFor: (userId: string) => string | null
}) {
  if (!rankings?.length && !closing) return null

  return (
    <section className="mt-12 md:mt-16" aria-labelledby="rankings-heading">
      <h2 id="rankings-heading" className="font-display text-charcoal text-3xl">
        {title ?? 'Power Rankings'}
      </h2>
      {intro && (
        <p className="text-charcoal-soft mt-3 max-w-prose text-sm leading-relaxed">{intro}</p>
      )}

      {rankings && rankings.length > 0 && (
        <ol className="divide-charcoal/10 mt-6 divide-y">
          {rankings.map((rank, i) => (
            <li key={rank.userId} className="flex items-start gap-3 py-4">
              <span className="text-charcoal-soft w-5 shrink-0 pt-0.5 text-sm lining-nums tabular-nums">
                {i + 1}
              </span>
              <TeamAvatar avatarId={avatarFor(rank.userId)} name={nameFor(rank.userId)} />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-charcoal truncate text-sm font-semibold">
                    {nameFor(rank.userId)}
                  </span>
                  {rank.grade && (
                    <span className="border-gold-bright text-charcoal inline-flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full border px-1.5 text-[0.65rem] font-semibold">
                      {rank.grade}
                    </span>
                  )}
                </div>
                <p className="text-charcoal-soft mt-1 text-sm leading-relaxed">{rank.note}</p>
              </div>
            </li>
          ))}
        </ol>
      )}

      {closing && (
        <div className={rankings && rankings.length > 0 ? 'mt-8' : 'mt-6'}>
          <div className="flex items-center gap-3">
            {closing.emoji && (
              <span aria-hidden="true" className="text-lg leading-none">
                {closing.emoji}
              </span>
            )}
            <h3 className="text-charcoal text-xs font-semibold tracking-[0.18em] uppercase">
              {closing.title}
            </h3>
          </div>
          <p className="text-charcoal-soft mt-3 max-w-prose text-sm leading-relaxed">
            {closing.body}
          </p>
        </div>
      )}
    </section>
  )
}
