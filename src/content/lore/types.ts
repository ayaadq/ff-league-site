/** Hand-authored lore types — SPEC.md §6.4. Keyed by Sleeper `user_id`,
 * which is durable across seasons, never `roster_id` (CLAUDE.md's
 * identity rule).
 *
 * Everything past the identifiers is optional on purpose: lore gets
 * written by hand over time, so a half-filled entry has to render as
 * cleanly as a complete one. */

export interface LoreEvent {
  season: number
  week?: number
  title: string
  description?: string
  relatedUserIds?: string[]
  tags?: string[]
}

export interface TeamLore {
  userId: string
  nickname?: string
  tagline?: string
  bio?: string
  notableEvents?: LoreEvent[]
}

export interface Rivalry {
  id: string
  teamAUserId: string
  teamBUserId: string
  /** Display name, e.g. "The Marble Bowl". */
  name: string
  description?: string
  /** Season year the rivalry started. */
  since?: number
  notableGames?: LoreEvent[]
}
