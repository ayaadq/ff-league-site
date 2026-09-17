/** Hand-authored smack talk (PLAN.md Phase 13D) — Sleeper has no chat/
 * trash-talk API, so this mirrors content/lore/'s pattern exactly:
 * hand-authored, versioned in the repo, keyed by Sleeper `user_id`
 * (durable across seasons, never `roster_id`), empty is a fully
 * supported state with no placeholder copy. */

export interface BanterLine {
  /** Who's talking. */
  userId: string
  /** Who it's aimed at, if anyone — omit for a general league-wide line
   * rather than one matchup in particular. */
  toUserId?: string
  season: number
  /** Omit for a line that isn't tied to one specific week. */
  week?: number
  line: string
}
