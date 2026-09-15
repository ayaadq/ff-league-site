import type { SleeperPlayer } from './types'

/** Falls back to the raw player_id (e.g. a team defense code like "SF")
 * when the ~5MB player dictionary hasn't loaded yet or has no entry. */
export function playerDisplayName(player: SleeperPlayer | undefined, playerId: string): string {
  if (player?.full_name) return player.full_name
  if (player?.first_name || player?.last_name) {
    return [player.first_name, player.last_name].filter(Boolean).join(' ')
  }
  return playerId
}
