import type { SleeperTransaction } from './types'

export interface TransactionParty {
  rosterId: number
  added: string[]
  dropped: string[]
  /** Draft picks this roster received, e.g. "2026 3rd-round pick" — a
   * trade can be picks-only, with empty added/dropped. */
  picksReceived: string[]
  /** FAAB spent, only present on a budget-funded waiver claim. */
  faab?: number
}

export interface TransactionSummary {
  id: string
  type: 'trade' | 'waiver'
  created: number
  week: number
  parties: TransactionParty[]
}

/** Reduces a week's raw transaction list to the trade/waiver moves the
 * home page's activity feed shows — drops incomplete transactions and
 * plain free-agent adds (any manager can make one anytime; it's noise
 * next to a trade or a contested waiver claim), then resolves each
 * roster's own adds/drops/FAAB spend out of the transaction's
 * player_id-keyed maps. */
export function summarizeTransactions(
  transactions: SleeperTransaction[],
  week: number,
  playerNameFor: (playerId: string) => string,
): TransactionSummary[] {
  return transactions
    .filter((t) => t.status === 'complete' && (t.type === 'trade' || t.type === 'waiver'))
    .map((t) => summarize(t, week, playerNameFor))
    .sort((a, b) => b.created - a.created)
}

function summarize(
  t: SleeperTransaction,
  week: number,
  playerNameFor: (playerId: string) => string,
): TransactionSummary {
  const faabByRoster = new Map<number, number>()
  for (const budget of t.waiver_budget ?? []) {
    faabByRoster.set(budget.receiver, budget.amount)
  }

  const parties = t.roster_ids.map((rosterId) => ({
    rosterId,
    added: Object.entries(t.adds ?? {})
      .filter(([, r]) => r === rosterId)
      .map(([playerId]) => playerNameFor(playerId)),
    dropped: Object.entries(t.drops ?? {})
      .filter(([, r]) => r === rosterId)
      .map(([playerId]) => playerNameFor(playerId)),
    picksReceived: (t.draft_picks ?? [])
      .filter((pick) => pick.owner_id === rosterId)
      .map((pick) => `${pick.season} ${ordinal(pick.round)}-round pick`),
    faab: faabByRoster.get(rosterId),
  }))

  return {
    id: t.transaction_id,
    type: t.type === 'trade' ? 'trade' : 'waiver',
    created: t.created,
    week,
    parties,
  }
}

function ordinal(n: number): string {
  if (n % 100 >= 11 && n % 100 <= 13) return `${n}th`
  switch (n % 10) {
    case 1:
      return `${n}st`
    case 2:
      return `${n}nd`
    case 3:
      return `${n}rd`
    default:
      return `${n}th`
  }
}
