/** Sleeper API response shapes. Only fields this project actually reads
 * are typed — Sleeper's responses carry more than this. */

export interface SleeperLeague {
  league_id: string
  name: string
  season: string
  season_type: string
  status: string
  sport: string
  total_rosters: number
  avatar: string | null
  previous_league_id: string | null
  roster_positions: string[]
}

export interface SleeperRosterSettings {
  wins: number
  losses: number
  ties: number
  fpts: number
  fpts_decimal?: number
  fpts_against?: number
  fpts_against_decimal?: number
}

export interface SleeperRoster {
  roster_id: number
  owner_id: string | null
  league_id: string
  players: string[] | null
  starters: string[] | null
  settings: SleeperRosterSettings
}

export interface SleeperUser {
  user_id: string
  display_name: string
  avatar: string | null
  metadata?: { team_name?: string }
}

export interface SleeperMatchup {
  roster_id: number
  matchup_id: number | null
  points: number
  starters: string[]
  players: string[]
  players_points?: Record<string, number>
}

export interface SleeperNflState {
  week: number
  display_week: number
  season: string
  season_type: string
  league_season: string
}

export interface SleeperPlayer {
  player_id: string
  full_name?: string
  first_name?: string
  last_name?: string
  position?: string | null
  team?: string | null
}

export type SleeperPlayersMap = Record<string, SleeperPlayer>
