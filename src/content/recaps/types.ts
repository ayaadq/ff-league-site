/** The authored half of a weekly recap.
 *
 * Every number in the recap — scores, margins, possible points,
 * efficiency, who left what on the bench — is computed live from Sleeper
 * by api/weeklyRecap.ts and is NOT repeated here. This file is only the
 * writing: headlines, storylines, the roast attached to each award, the
 * line under each power ranking.
 *
 * Keyed by Sleeper `user_id` throughout, never `roster_id`, so a recap
 * written today still points at the right managers after the league
 * rolls over to a new season (CLAUDE.md's identity rule).
 *
 * Every field past season/week is optional. A week with no file at all
 * renders as pure data; a week with only matchup headlines renders those
 * and nothing else. Nothing here is required for the page to work. */

export interface RecapChip {
  label: string
  /** Pre-formatted for display — "170.10", "98.5%", "9.0 pts". These are
   * editorial picks, not computed, so they carry their own units. */
  value: string
}

export interface Storyline {
  /** The bolded opening clause. */
  lede: string
  body: string
}

export interface MatchupNote {
  /** The two managers, in either order — lookups match both ways. */
  userIds: [string, string]
  headline: string
  /** Promotes this game in the sequence; at most one per week. */
  gameOfTheWeek?: boolean
  /** The four stat callouts above the prose. */
  chips?: RecapChip[]
  /** One entry per paragraph. */
  body?: string[]
}

export interface AwardNote {
  emoji?: string
  title: string
  /** Who won it. Omit for awards that aren't about one manager. */
  userId?: string
  body: string
}

export interface RankingNote {
  userId: string
  /** Letter grade as written — "S", "A−", "B+", "D+". Free text because
   * the scale is editorial, not computed. */
  grade?: string
  note: string
}

export interface WeekRecapContent {
  /** Matches the Sleeper season string, e.g. '2026'. */
  season: string
  week: number
  /** Small line above the title — "OFFICIAL · UNAUTHORIZED · UNAPOLOGETIC". */
  kicker?: string
  title?: string
  subtitle?: string
  storylinesTitle?: string
  storylines?: Storyline[]
  matchups?: MatchupNote[]
  awardsTitle?: string
  awards?: AwardNote[]
  rankingsTitle?: string
  rankingsIntro?: string
  rankings?: RankingNote[]
  /** The closing section — the recap's "S-Rank Tribunal" slot. */
  closing?: { emoji?: string; title: string; body: string }
}
