import type { LoreEvent } from './types'

/** League storylines that aren't tied to a single rivalry — the trade
 * everyone still argues about, the year the commissioner forgot to set
 * playoff seeding, and so on.
 *
 * `relatedUserIds` is optional; when present, the event also shows up on
 * those managers' team pages rather than only on League History.
 *
 *     export const leagueEvents: LoreEvent[] = [
 *       {
 *         season: 2024,
 *         week: 13,
 *         title: 'The Veto That Never Was',
 *         description: 'Four votes, one abstention, and a league-wide sulk.',
 *         relatedUserIds: ['123456789012345678'],
 *         tags: ['trade'],
 *       },
 *     ]
 */
export const leagueEvents: LoreEvent[] = []
