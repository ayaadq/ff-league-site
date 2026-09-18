import type { VercelRequest, VercelResponse } from '@vercel/node'

/** Vercel serverless function (PLAN.md Phase H.6) — the only place this
 * project's Anthropic API key ever exists. It lives in this project's env
 * vars (`ANTHROPIC_API_KEY`, set in the Vercel dashboard, never committed),
 * and this function is the sole thing that reads it.
 *
 * This is a deliberate departure from CLAUDE.md's "no backend/serverless
 * functions required" — that line described the site as it stood before
 * this feature, not a hard constraint. Calling api.anthropic.com directly
 * from the browser (as first specified) would mean shipping the API key
 * inside the JS bundle every visitor downloads, readable by anyone from
 * the network tab or the bundle itself. This function exists specifically
 * so that never happens: the client posts an already-computed, already
 * player-named summary of a week's results (src/api/weeklyRecapAi.ts),
 * and only this function — running server-side — ever holds the real key
 * or talks to Anthropic. */

const ANTHROPIC_VERSION = '2023-06-01'
const MODEL = 'claude-sonnet-5'
const MAX_TOKENS = 900

interface RecapGame {
  winner: string
  winnerScore: number
  loser: string
  loserScore: number
  margin: number
  tied: boolean
  winnerTopStarter?: { name: string; points: number }
  loserTopStarter?: { name: string; points: number }
}

interface RecapSummary {
  season: string
  week: number
  games: RecapGame[]
  highScore?: { name: string; points: number }
  lowScore?: { name: string; points: number }
  biggestBlowout?: { winner: string; loser: string; margin: number }
  closestGame?: { winner: string; loser: string; margin: number }
  worstEfficiency?: { name: string; efficiency: number }
  mostLeftOnBench?: { name: string; points: number }
  playerOfWeek?: { team: string; player: string; points: number }
}

function isRecapSummary(value: unknown): value is RecapSummary {
  if (!value || typeof value !== 'object') return false
  const candidate = value as Record<string, unknown>
  return (
    typeof candidate.season === 'string' &&
    typeof candidate.week === 'number' &&
    Array.isArray(candidate.games)
  )
}

/** Plain-text prompt, not JSON or markdown — kept short deliberately
 * (only the derived stats every number here comes from `api/weeklyRecap.ts`'s
 * existing `weekRecap`/`weekAwards` computations, not full roster dumps)
 * so the round trip stays fast. */
function buildPrompt(summary: RecapSummary): string {
  const lines: string[] = [`Week ${summary.week}, ${summary.season} season.`, '', 'Matchups:']

  for (const g of summary.games) {
    lines.push(
      g.tied
        ? `- ${g.winner} tied ${g.loser} ${g.winnerScore.toFixed(2)}-${g.loserScore.toFixed(2)}`
        : `- ${g.winner} beat ${g.loser} ${g.winnerScore.toFixed(2)}-${g.loserScore.toFixed(2)} (margin ${g.margin.toFixed(2)})`,
    )
    if (g.winnerTopStarter) {
      lines.push(
        `  ${g.winner}'s top starter: ${g.winnerTopStarter.name} (${g.winnerTopStarter.points.toFixed(1)} pts)`,
      )
    }
    if (g.loserTopStarter) {
      lines.push(
        `  ${g.loser}'s top starter: ${g.loserTopStarter.name} (${g.loserTopStarter.points.toFixed(1)} pts)`,
      )
    }
  }

  lines.push('', 'Week-wide notes:')
  if (summary.highScore) {
    lines.push(
      `- Highest score: ${summary.highScore.name} (${summary.highScore.points.toFixed(2)})`,
    )
  }
  if (summary.lowScore) {
    lines.push(`- Lowest score: ${summary.lowScore.name} (${summary.lowScore.points.toFixed(2)})`)
  }
  if (summary.biggestBlowout) {
    lines.push(
      `- Biggest blowout: ${summary.biggestBlowout.winner} over ${summary.biggestBlowout.loser} by ${summary.biggestBlowout.margin.toFixed(2)}`,
    )
  }
  if (summary.closestGame) {
    lines.push(
      `- Closest game: ${summary.closestGame.winner} over ${summary.closestGame.loser} by ${summary.closestGame.margin.toFixed(2)}`,
    )
  }
  if (summary.worstEfficiency) {
    lines.push(
      `- Worst lineup efficiency: ${summary.worstEfficiency.name} (${Math.round(summary.worstEfficiency.efficiency * 100)}% of their best possible lineup)`,
    )
  }
  if (summary.mostLeftOnBench) {
    lines.push(
      `- Most points left on the bench: ${summary.mostLeftOnBench.name} (${summary.mostLeftOnBench.points.toFixed(2)} pts stranded)`,
    )
  }
  if (summary.playerOfWeek) {
    lines.push(
      `- Player of the week: ${summary.playerOfWeek.player} for ${summary.playerOfWeek.team} (${summary.playerOfWeek.points.toFixed(1)} pts)`,
    )
  }

  return lines.join('\n')
}

const SYSTEM_PROMPT =
  'You write short, sharp, funny trash-talk recaps for a private 12-team fantasy football ' +
  'league. Roast specific managers by name using the real stats given -- lowest scorer, worst ' +
  'bench decisions, blowouts, upsets. Keep it playful and clever, never mean-spirited about ' +
  'anything outside the game itself. Write 3-4 short paragraphs, no headers, no markdown ' +
  'formatting -- plain prose only, separated by blank lines.'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' })
    return
  }

  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    res.status(500).json({ error: 'ANTHROPIC_API_KEY is not configured on the server' })
    return
  }

  if (!isRecapSummary(req.body)) {
    res.status(400).json({ error: 'Invalid recap summary' })
    return
  }
  const summary = req.body

  try {
    const anthropicResponse = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': ANTHROPIC_VERSION,
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: MAX_TOKENS,
        system: SYSTEM_PROMPT,
        messages: [{ role: 'user', content: buildPrompt(summary) }],
      }),
    })

    if (!anthropicResponse.ok) {
      const errorBody = await anthropicResponse.text()
      res.status(502).json({ error: `Anthropic API error: ${errorBody.slice(0, 300)}` })
      return
    }

    const data = (await anthropicResponse.json()) as {
      content: Array<{ type: string; text?: string }>
    }
    const text = data.content.find((block) => block.type === 'text')?.text?.trim()
    if (!text) {
      res.status(502).json({ error: 'Anthropic API returned no text content' })
      return
    }

    res.status(200).json({ recap: text })
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' })
  }
}
