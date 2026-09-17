/** Per-manager accent color — Sleeper doesn't expose real team colors,
 * so this assigns one per manager itself. Hand-authored where set, the
 * same shape content/lore/ already uses for hand-authored data: a plain
 * array keyed by Sleeper `user_id`, empty is a fully supported state,
 * edit this file and commit (no admin UI). Not nested under
 * content/lore/ itself since this isn't narrative content.
 *
 * Originally written for JourneyScene's 3D team-color lighting
 * (AccentLighting), which PLAN.md Phase G's stadium removal deleted;
 * the sole consumer now is GameOfTheWeekHero.tsx's 2D gradient blob.
 *
 * Unauthored managers still get a color rather than no accent light at
 * all — a deterministic hash of their user_id picks one from
 * FALLBACK_PALETTE, so the same manager gets the same color every
 * session without anyone having picked it by hand. */

export interface TeamColor {
  userId: string
  /** A real or well-known team color, e.g. '#013369' (NFL navy). */
  hex: string
}

/**
 * Shape, for when you add entries:
 *
 *     export const teamColors: TeamColor[] = [
 *       { userId: '123456789012345678', hex: '#013369' },
 *     ]
 */
export const teamColors: TeamColor[] = []

/** A spread of distinct, moderately saturated hues — not tuned to any
 * particular real team, just varied enough that a 12-team league's
 * unauthored managers don't visually collide.
 *
 * Redesign note: these used to blend heavily toward a warm neutral before
 * use (JourneyScene's old ACCENT_MIX under 3D lighting), so the raw values
 * were deliberately muted and didn't need to read well on their own. The
 * new flat 2D UI (player-card accents, badges) shows these hexes directly
 * with no lighting blend, so they're re-tuned brighter/more saturated to
 * read clearly as flat fills and against both the paper and ink canvases. */
const FALLBACK_PALETTE = [
  '#e0403d', // brick red
  '#3f7fd6', // steel blue
  '#2fa869', // forest green
  '#d69a2e', // amber
  '#8a4fd6', // violet
  '#2ba6a6', // teal
  '#d63f8f', // magenta
  '#8fae2e', // olive
  '#4a5fd6', // indigo
  '#d67a2e', // rust
  '#2ea84a', // green
  '#a03fd6', // purple
]

function hashUserId(userId: string): number {
  let hash = 0
  for (let i = 0; i < userId.length; i++) {
    hash = (hash * 31 + userId.charCodeAt(i)) | 0
  }
  return Math.abs(hash)
}

/** The one place this module is read from. Accepts the same
 * `string | null | undefined` shape as loreForUser — callers usually
 * pass a matchup side's userId straight through. */
export function teamColorFor(userId: string | null | undefined): string {
  if (!userId) return FALLBACK_PALETTE[0]
  const authored = teamColors.find((t) => t.userId === userId)
  if (authored) return authored.hex
  return FALLBACK_PALETTE[hashUserId(userId) % FALLBACK_PALETTE.length]
}
