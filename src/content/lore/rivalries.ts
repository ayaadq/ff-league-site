import type { Rivalry } from './types'

/** Rivalries between two managers, keyed by Sleeper user_id on both
 * sides. Order doesn't matter — lookups match either direction.
 *
 * A rivalry here surfaces in two places automatically: a callout on the
 * matching week rows of both managers' team pages, and the Rivalries
 * section on League History.
 *
 *     export const rivalries: Rivalry[] = [
 *       {
 *         id: 'marble-bowl',
 *         teamAUserId: '123456789012345678',
 *         teamBUserId: '876543210987654321',
 *         name: 'The Marble Bowl',
 *         description: 'Decided by under 3 points four years running.',
 *         since: 2021,
 *       },
 *     ]
 */
export const rivalries: Rivalry[] = []
