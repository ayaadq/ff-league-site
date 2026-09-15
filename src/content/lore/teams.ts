import type { TeamLore } from './types'

/** Per-owner identity lore, keyed by Sleeper user_id.
 *
 * Hand-authored: edit this file and commit. There is no admin UI, by
 * design (SPEC.md §4). A manager's user_id is in their team page URL —
 * /team/<user_id>.
 *
 * Shape, for when you add entries:
 *
 *     export const teamLore: TeamLore[] = [
 *       {
 *         userId: '123456789012345678',
 *         nickname: 'The Marble Dynasty',
 *         tagline: 'Three titles, zero humility.',
 *         bio: 'Back-to-back in 2023 and 2024, then never shut up about it.',
 *       },
 *     ]
 *
 * Empty is a fully supported state, not a TODO: every lore section
 * simply doesn't render when there is nothing to show, with no
 * placeholder copy (CLAUDE.md). Partial entries work too — fill in a
 * nickname now and a bio whenever. */
export const teamLore: TeamLore[] = []
