/** Per-manager accent color for 3D scene lighting (JourneyScene's
 * AccentLighting) — Sleeper doesn't expose real team colors, so this
 * assigns one per manager itself. Hand-authored where set, the same
 * shape content/lore/ already uses for hand-authored data: a plain
 * array keyed by Sleeper `user_id`, empty is a fully supported state,
 * edit this file and commit (no admin UI). Not nested under
 * content/lore/ itself since this isn't narrative content.
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
 * unauthored managers don't visually collide. The accent light blends
 * heavily toward a warm neutral before use (JourneyScene's ACCENT_MIX),
 * so these don't need to be subtle on their own. */
const FALLBACK_PALETTE = [
  '#8a3b3b', // brick red
  '#3b5d8a', // steel blue
  '#3b8a5d', // forest green
  '#8a6f3b', // amber
  '#5d3b8a', // violet
  '#3b8a8a', // teal
  '#8a3b6f', // magenta
  '#6f8a3b', // olive
  '#3b4f8a', // indigo
  '#8a5d3b', // rust
  '#3b8a3b', // green
  '#6f3b8a', // purple
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
