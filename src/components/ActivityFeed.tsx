import type { TransactionSummary } from '../api/transactions'
import { SectionKicker } from './SectionKicker'
import { TeamAvatar } from './TeamAvatar'

/** Trades and waiver claims from the last few weeks — renders nothing
 * when the league's been quiet, same as RecapAwards/RecapRankings do
 * for an unauthored week (an empty feed isn't a state worth explaining,
 * it just means no one's moved). */
export function ActivityFeed({
  transactions,
  nameFor,
  avatarFor,
}: {
  transactions: TransactionSummary[]
  nameFor: (rosterId: number) => string
  avatarFor: (rosterId: number) => string | null
}) {
  if (transactions.length === 0) return null

  return (
    <section className="mt-14 md:mt-20" aria-labelledby="activity-heading">
      <SectionKicker>Trades &amp; waivers</SectionKicker>
      <h2 id="activity-heading" className="font-display text-charcoal mt-1 text-3xl">
        Recent Activity
      </h2>

      <div className="gallery-card mt-6 p-2 sm:p-3">
        <ul className="divide-charcoal/10 divide-y">
          {transactions.map((t) => (
            <li key={t.id} className="px-3 py-4 sm:px-4">
              <p className="text-charcoal-soft text-xs tracking-wide uppercase">
                {t.type === 'trade' ? 'Trade' : 'Waiver claim'} · Week {t.week}
              </p>
              <div
                className={`mt-2.5 grid gap-4 ${
                  t.type === 'trade' && t.parties.length > 1 ? 'sm:grid-cols-2' : ''
                }`}
              >
                {t.parties.map((party) => (
                  <div key={party.rosterId} className="flex min-w-0 items-start gap-2.5">
                    <TeamAvatar
                      avatarId={avatarFor(party.rosterId)}
                      name={nameFor(party.rosterId)}
                    />
                    <div className="min-w-0">
                      <p className="text-charcoal truncate text-sm font-medium">
                        {nameFor(party.rosterId)}
                      </p>
                      {party.added.length > 0 && (
                        <p className="text-charcoal-soft text-sm">Added {party.added.join(', ')}</p>
                      )}
                      {party.dropped.length > 0 && (
                        <p className="text-charcoal-soft text-sm">
                          Dropped {party.dropped.join(', ')}
                        </p>
                      )}
                      {party.picksReceived.length > 0 && (
                        <p className="text-charcoal-soft text-sm">
                          Received {party.picksReceived.join(', ')}
                        </p>
                      )}
                      {party.faab !== undefined && (
                        <p className="text-charcoal-soft text-sm">${party.faab} FAAB</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}
