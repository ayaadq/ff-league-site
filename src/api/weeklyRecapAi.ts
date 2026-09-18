/** Client for this project's own `/api/weekly-recap` serverless function
 * (PLAN.md Phase H.6) — the single place a request for an AI-generated
 * recap leaves the browser. Mirrors CLAUDE.md's "one typed client module"
 * rule for the Sleeper API, applied to this second external call: nothing
 * outside this file constructs the request or knows the endpoint path.
 *
 * No API key lives here or anywhere else in client code — the actual
 * Anthropic call happens server-side, in `api/weekly-recap.ts`, which is
 * the only thing that reads `ANTHROPIC_API_KEY`. This module only ever
 * talks to this project's own same-origin `/api/weekly-recap` route. */

export interface RecapGameSummary {
  winner: string
  winnerScore: number
  loser: string
  loserScore: number
  margin: number
  tied: boolean
  winnerTopStarter?: { name: string; points: number }
  loserTopStarter?: { name: string; points: number }
}

export interface WeeklyRecapSummary {
  season: string
  week: number
  games: RecapGameSummary[]
  highScore?: { name: string; points: number }
  lowScore?: { name: string; points: number }
  biggestBlowout?: { winner: string; loser: string; margin: number }
  closestGame?: { winner: string; loser: string; margin: number }
  worstEfficiency?: { name: string; efficiency: number }
  mostLeftOnBench?: { name: string; points: number }
  playerOfWeek?: { team: string; player: string; points: number }
}

export async function generateWeeklyTrashTalk(summary: WeeklyRecapSummary): Promise<string> {
  const response = await fetch('/api/weekly-recap', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(summary),
  })

  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as { error?: string } | null
    throw new Error(body?.error ?? `Recap generation failed (${response.status})`)
  }

  const data = (await response.json()) as { recap: string }
  return data.recap
}
