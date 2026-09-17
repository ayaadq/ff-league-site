/** Championships from before this league moved to Sleeper (PLAN.md Phase
 * H.4) — hand-authored, not fetched from any API, matching the
 * `src/content/lore/` and `src/content/banter/` convention for content
 * that has no live data source.
 *
 * Deliberately keyed by plain display names, not Sleeper `user_id` — these
 * seasons predate the league's Sleeper account for anyone, and guessing
 * which current `user_id` a name like "Nidhish" maps to would risk
 * silently misattributing someone else's championship. `HistoryPage.tsx`
 * renders these as plain text (no avatar), distinct from the Sleeper-era
 * rows (2024+) that resolve a real `user_id` to a team avatar/name.
 *
 * Read directly by `HistoryPage.tsx` — there's no per-user_id matching or
 * merge logic here (unlike lore/banter), so this doesn't need its own
 * `index.ts` read surface. */
export interface PreSleeperChampionship {
  season: string
  championName: string
  runnerUpName: string
}

export const preSleeperArchive: PreSleeperChampionship[] = [
  { season: '2020', championName: 'Rohan Haware', runnerUpName: 'Jai Kumar' },
  { season: '2021', championName: 'Nidhish', runnerUpName: 'Joey' },
  { season: '2022', championName: 'Ayaad', runnerUpName: 'Zuhayr' },
  { season: '2023', championName: 'Tejas', runnerUpName: 'Sabeeh' },
]
