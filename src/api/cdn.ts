/** Sleeper CDN URL helpers — see SPEC.md §6.2. This is the single place
 * that knows these URL patterns; never inline-template a sleepercdn.com
 * URL elsewhere. */

export const avatarUrl = (avatarId: string) => `https://sleepercdn.com/avatars/${avatarId}`

export const avatarThumbUrl = (avatarId: string) =>
  `https://sleepercdn.com/avatars/thumbs/${avatarId}`

export const playerHeadshotUrl = (playerId: string) =>
  `https://sleepercdn.com/content/nfl/players/${playerId}.jpg`

export const playerHeadshotThumbUrl = (playerId: string) =>
  `https://sleepercdn.com/content/nfl/players/thumb/${playerId}.jpg`
