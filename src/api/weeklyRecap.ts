import type { SleeperMatchup, SleeperPlayersMap } from './types'

/** Which positions each starting slot accepts. Covers the common Sleeper
 * slots, not just this league's, so changing the roster shape later
 * doesn't require touching this file. */
const SLOT_ELIGIBILITY: Record<string, readonly string[]> = {
  QB: ['QB'],
  RB: ['RB'],
  WR: ['WR'],
  TE: ['TE'],
  K: ['K'],
  DEF: ['DEF'],
  DL: ['DL'],
  LB: ['LB'],
  DB: ['DB'],
  FLEX: ['RB', 'WR', 'TE'],
  WRRB_FLEX: ['RB', 'WR'],
  REC_FLEX: ['WR', 'TE'],
  SUPER_FLEX: ['QB', 'RB', 'WR', 'TE'],
  IDP_FLEX: ['DL', 'LB', 'DB'],
}

const NON_STARTING = new Set(['BN', 'IR', 'TAXI'])

export interface LineupSlot {
  slot: string
  playerId: string
  points: number
}

export interface BestLineup {
  total: number
  slots: LineupSlot[]
}

/** The positions a player may fill. `fantasy_positions` is the list
 * Sleeper actually uses for eligibility (a player can be RB and WR);
 * `position` is the single primary one and the fallback. */
function eligibleFor(playerId: string, players: SleeperPlayersMap): readonly string[] {
  const p = players[playerId]
  if (p?.fantasy_positions?.length) return p.fantasy_positions
  return p?.position ? [p.position] : []
}

/** The highest-scoring legal lineup from a full roster.
 *
 * Slots are filled most-restrictive-first: every dedicated slot takes the
 * best player it can, then the flex slots take the best of whatever is
 * left. That is not merely a good heuristic here — it is exact whenever
 * the slot eligibility sets form a laminar family (any two sets are
 * disjoint, or one contains the other), which this league satisfies:
 * QB/RB/WR/TE are disjoint singletons and FLEX is their union minus QB.
 * The exchange argument is the usual one — if an optimal solution put a
 * lesser player in a dedicated slot, swapping in the better one cannot
 * reduce the total, because anything the better player could have been
 * doing instead is also available to the player being displaced.
 *
 * A roster mixing genuinely overlapping flexes (WRRB_FLEX alongside
 * REC_FLEX, say) breaks laminarity, and greedy could then fall short of
 * optimal by a small margin. No Sleeper default does that, and this
 * league does not; if one ever did, this would need a proper max-weight
 * bipartite matching instead. */
export function bestLineup(
  playersPoints: Record<string, number>,
  rosteredIds: string[],
  rosterPositions: string[],
  players: SleeperPlayersMap,
): BestLineup {
  const slots = rosterPositions.filter((s) => !NON_STARTING.has(s))
  const candidates = rosteredIds
    .filter((id) => id && id !== '0')
    .map((id) => ({
      id,
      points: playersPoints[id] ?? 0,
      positions: eligibleFor(id, players),
    }))
    .sort((a, b) => b.points - a.points)

  const used = new Set<string>()
  const ordered = slots
    .map((slot, index) => ({ slot, index, width: SLOT_ELIGIBILITY[slot]?.length ?? 99 }))
    .sort((a, b) => a.width - b.width || a.index - b.index)

  // Track where each slot sat in the roster so the result can be handed
  // back in roster order rather than in the order slots were filled.
  const filled: Array<LineupSlot & { order: number }> = []
  for (const { slot, index } of ordered) {
    const accepts = SLOT_ELIGIBILITY[slot]
    if (!accepts) continue
    const pick = candidates.find(
      (c) => !used.has(c.id) && c.positions.some((p) => accepts.includes(p)),
    )
    if (!pick) continue
    used.add(pick.id)
    filled.push({ slot, playerId: pick.id, points: pick.points, order: index })
  }
  filled.sort((a, b) => a.order - b.order)

  return {
    total: round2(filled.reduce((sum, f) => sum + f.points, 0)),
    slots: filled.map(({ slot, playerId, points }) => ({ slot, playerId, points })),
  }
}

export interface TeamWeek {
  rosterId: number
  userId: string | null
  /** What they actually scored. */
  actual: number
  /** What their best legal lineup would have scored. */
  possible: number
  /** actual / possible, 0..1. */
  efficiency: number
  /** possible - actual: the points a perfect lineup would have added. */
  leftOnBench: number
  best: BestLineup
  /** Highest-scoring player they actually started. */
  topStarter: LineupSlot | null
  /** Highest-scoring player they did NOT start — the one that stings. */
  topBenched: { playerId: string; points: number } | null
}

const round2 = (n: number) => Math.round(n * 100) / 100

export function teamWeek(
  matchup: SleeperMatchup,
  userId: string | null,
  rosterPositions: string[],
  players: SleeperPlayersMap,
): TeamWeek {
  const pts = matchup.players_points ?? {}
  const best = bestLineup(pts, matchup.players ?? [], rosterPositions, players)
  const actual = round2(matchup.points ?? 0)
  const started = new Set(matchup.starters ?? [])

  const startedScores = (matchup.starters ?? [])
    .filter((id) => id && id !== '0')
    .map((id) => ({ slot: 'STARTER', playerId: id, points: pts[id] ?? 0 }))
    .sort((a, b) => b.points - a.points)

  const benchedScores = (matchup.players ?? [])
    .filter((id) => id && id !== '0' && !started.has(id))
    .map((id) => ({ playerId: id, points: pts[id] ?? 0 }))
    .sort((a, b) => b.points - a.points)

  return {
    rosterId: matchup.roster_id,
    userId,
    actual,
    possible: best.total,
    // A team that somehow scored above its computed best (bad data) should
    // read as 100%, not over.
    efficiency: best.total > 0 ? Math.min(actual / best.total, 1) : 0,
    leftOnBench: round2(Math.max(best.total - actual, 0)),
    best,
    topStarter: startedScores[0] ?? null,
    topBenched: benchedScores[0] ?? null,
  }
}

export interface MatchupRecap {
  matchupId: number | null
  winner: TeamWeek
  loser: TeamWeek
  margin: number
  /** True when both scored the same — rare, but it should not render as a
   * win with a zero margin. */
  tied: boolean
}

/** Pairs a week's matchups and computes both sides. Teams whose matchup
 * has no opponent (bye, or an odd league) are returned unpaired rather
 * than dropped. */
export function weekRecap(
  matchups: SleeperMatchup[],
  ownerByRosterId: Map<number, string | null>,
  rosterPositions: string[],
  players: SleeperPlayersMap,
): { teams: TeamWeek[]; games: MatchupRecap[] } {
  const teams = matchups.map((m) =>
    teamWeek(m, ownerByRosterId.get(m.roster_id) ?? null, rosterPositions, players),
  )
  const byId = new Map<number, TeamWeek[]>()
  for (const [i, m] of matchups.entries()) {
    if (m.matchup_id == null) continue
    const list = byId.get(m.matchup_id) ?? []
    list.push(teams[i])
    byId.set(m.matchup_id, list)
  }

  const games: MatchupRecap[] = []
  for (const [matchupId, pair] of byId) {
    if (pair.length !== 2) continue
    const [a, b] = pair
    const [winner, loser] = a.actual >= b.actual ? [a, b] : [b, a]
    games.push({
      matchupId,
      winner,
      loser,
      margin: round2(winner.actual - loser.actual),
      tied: a.actual === b.actual,
    })
  }
  games.sort((x, y) => y.winner.actual - x.winner.actual)
  return { teams, games }
}

export interface WeekAwards {
  highScore: TeamWeek | null
  lowScore: TeamWeek | null
  perfectLineups: TeamWeek[]
  worstEfficiency: TeamWeek | null
  mostLeftOnBench: TeamWeek | null
  biggestBlowout: MatchupRecap | null
  closestGame: MatchupRecap | null
  /** Best single player anyone started, across the league. */
  playerOfWeek: { team: TeamWeek; slot: LineupSlot } | null
}

const maxBy = <T>(xs: T[], f: (x: T) => number): T | null =>
  xs.length ? xs.reduce((best, x) => (f(x) > f(best) ? x : best)) : null
const minBy = <T>(xs: T[], f: (x: T) => number): T | null =>
  xs.length ? xs.reduce((best, x) => (f(x) < f(best) ? x : best)) : null

/** Everything in the recap's awards page that can be derived rather than
 * written. The prose that goes with each one is authored per week; these
 * are the facts underneath it. */
export function weekAwards({
  teams,
  games,
}: {
  teams: TeamWeek[]
  games: MatchupRecap[]
}): WeekAwards {
  const withPlayers = teams.filter((t) => t.topStarter)
  const pow = maxBy(withPlayers, (t) => t.topStarter?.points ?? 0)
  return {
    highScore: maxBy(teams, (t) => t.actual),
    lowScore: minBy(teams, (t) => t.actual),
    perfectLineups: teams.filter((t) => t.efficiency >= 0.9999),
    worstEfficiency: minBy(teams, (t) => t.efficiency),
    mostLeftOnBench: maxBy(teams, (t) => t.leftOnBench),
    biggestBlowout: maxBy(games, (g) => g.margin),
    closestGame: minBy(games, (g) => g.margin),
    playerOfWeek: pow && pow.topStarter ? { team: pow, slot: pow.topStarter } : null,
  }
}
