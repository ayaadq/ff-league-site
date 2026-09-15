import type { UseQueryResult } from '@tanstack/react-query'
import { useMatchups, useNflState, useRosters, useSeasonChain, useUsers } from './api/hooks'
import { SLEEPER_LEAGUE_ID } from './config'

function DebugSection({ title, query }: { title: string; query: UseQueryResult<unknown> }) {
  return (
    <section className="mt-8">
      <h2 className="font-display text-2xl">{title}</h2>
      {query.isLoading && <p className="text-charcoal-soft">Loading…</p>}
      {query.isError && (
        <p className="text-charcoal-soft">Error: {(query.error as Error).message}</p>
      )}
      {query.data !== undefined && (
        <pre className="bg-ivory mt-2 max-h-96 overflow-auto rounded p-4 text-xs">
          {JSON.stringify(query.data, null, 2)}
        </pre>
      )}
    </section>
  )
}

function App() {
  const seasonChain = useSeasonChain(SLEEPER_LEAGUE_ID)
  const currentLeagueId = seasonChain.data?.[0]?.leagueId ?? SLEEPER_LEAGUE_ID
  const rosters = useRosters(currentLeagueId)
  const users = useUsers(currentLeagueId)
  const nflState = useNflState()
  const matchups = useMatchups(currentLeagueId, nflState.data?.week ?? 0)

  return (
    <main className="bg-marble text-charcoal min-h-svh px-6 py-10">
      <h1 className="font-display text-4xl">Trophy Room — Phase 1 data check</h1>
      <p className="text-charcoal-soft mt-2">
        Throwaway debug dump per PLAN.md Phase 1 — raw Sleeper API data, live from the browser.
        Replaced by the real UI in Phase 3.
      </p>

      <DebugSection title="Season chain" query={seasonChain} />
      <DebugSection title={`Rosters — league ${currentLeagueId}`} query={rosters} />
      <DebugSection title="Users" query={users} />
      <DebugSection title="NFL state" query={nflState} />
      <DebugSection title={`Matchups — week ${nflState.data?.week ?? '—'}`} query={matchups} />
    </main>
  )
}

export default App
