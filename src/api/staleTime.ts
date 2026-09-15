/** Tiered cache lifetimes — see SPEC.md §6.3. Completed weeks/seasons never
 * change, so they're cached effectively forever; only the live week and
 * the players dictionary need a bounded staleTime. */
export const STALE_TIME = {
  live: 2 * 60 * 1000,
  immutable: Infinity,
  playersDaily: 24 * 60 * 60 * 1000,
} as const
