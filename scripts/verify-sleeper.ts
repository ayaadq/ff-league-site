/**
 * Manual verification script for Phase 1 (see PLAN.md). Calls the real
 * Sleeper API for the configured league and prints standings/roster data
 * to the console — proof the data layer works against live data, not
 * just that it type-checks.
 *
 * Run with: npm run verify:sleeper
 */
import { resolveSeasonChain } from '../src/api/seasonChain'
import {
  getAllPlayers,
  getLeague,
  getMatchups,
  getNflState,
  getRosters,
  getUsers,
} from '../src/api/sleeperClient'
import { sortStandings, teamNameForRoster, totalPoints } from '../src/api/standings'
import { SLEEPER_LEAGUE_ID } from '../src/config'

async function main() {
  console.log(`Resolving season chain for league ${SLEEPER_LEAGUE_ID}...`)
  const chain = await resolveSeasonChain(SLEEPER_LEAGUE_ID)
  console.log(`Found ${chain.length} season(s):`)
  for (const entry of chain) {
    console.log(`  ${entry.season} -> ${entry.leagueId}`)
  }

  const current = chain[0]
  console.log(
    `\nFetching league/rosters/users for current season ${current.season} (${current.leagueId})...`,
  )

  const [league, rosters, users] = await Promise.all([
    getLeague(current.leagueId),
    getRosters(current.leagueId),
    getUsers(current.leagueId),
  ])

  console.log(
    `\nLeague: "${league.name}" — ${league.total_rosters} teams, status: ${league.status}`,
  )

  const standings = sortStandings(rosters)

  console.log('\nStandings:')
  console.log(`  ${'Team'.padEnd(28)} ${'W-L-T'.padEnd(8)} PF`)
  for (const roster of standings) {
    const record = `${roster.settings.wins}-${roster.settings.losses}-${roster.settings.ties}`
    console.log(
      `  ${teamNameForRoster(roster, users).padEnd(28)} ${record.padEnd(8)} ${totalPoints(roster.settings).toFixed(2)}`,
    )
  }

  const nflState = await getNflState()
  console.log(
    `\nNFL state: season ${nflState.season}, week ${nflState.week} (${nflState.season_type})`,
  )

  if (nflState.week > 0) {
    const matchups = await getMatchups(current.leagueId, nflState.week)
    console.log(`\nMatchups for week ${nflState.week}: ${matchups.length} roster entries`)
    for (const m of matchups.slice(0, 4)) {
      console.log(
        `  roster ${m.roster_id} (matchup ${m.matchup_id ?? '—'}): ${m.points} pts, ${m.starters.length} starters`,
      )
    }
  } else {
    console.log('\nNo active week yet — skipping matchups.')
  }

  const sampleRoster = standings[0]
  if (sampleRoster?.starters?.length) {
    console.log(
      '\nFetching the full player dictionary to resolve a sample roster (the ~5MB endpoint — this script calls it once)...',
    )
    const players = await getAllPlayers()
    console.log(`\nSample roster — ${teamNameForRoster(sampleRoster, users)} (starters):`)
    for (const playerId of sampleRoster.starters) {
      const player = players[playerId]
      const name =
        player?.full_name ?? `${player?.first_name ?? ''} ${player?.last_name ?? ''}`.trim()
      console.log(`  ${name || playerId} (${player?.position ?? '?'}, ${player?.team ?? 'FA'})`)
    }
  }

  console.log('\nDone — this was a live call against api.sleeper.app, not mock data.')
}

main().catch((err: unknown) => {
  console.error('Verification script failed:', err)
  process.exitCode = 1
})
