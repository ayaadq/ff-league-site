import { createContext, useContext } from 'react'

/** One-shot buffers. The ambient bed is not in here — it is not
 * something a component triggers, it is simply on or off (enable/
 * disable/toggle below). 'roar' is the same crowd swell the bed's own
 * touchdown moment uses internally on enable — exposed here too so a
 * caller can time it to something else, e.g. WeeklyJourney pairing it
 * with duck() for a game-outcome swell, rather than only ever firing
 * once at startup. */
export type SoundName = 'click' | 'whoosh' | 'roar'

export interface SoundApi {
  /** Whether the ambient bed is currently running. Always false until the
   * user asks for it: browsers block audio without a gesture, and even
   * where they didn't, starting a stadium in someone's tab uninvited is
   * not a thing to do. */
  enabled: boolean
  /** True once the buffers are decoded and playing. Lets the toggle show
   * a pending state during the fetch rather than looking broken. */
  ready: boolean
  toggle: () => void
  /** `gain` scales just this one playback (default 1, i.e. exactly
   * today's behavior) -- lets a caller make one instance of a buffer
   * louder or quieter than its neighbors, e.g. a bigger roar for a
   * blowout than for an ordinary game, without a second buffer. */
  play: (name: SoundName, options?: { gain?: number }) => void
  /** Dips the ambient bed to `AMBIENCE_LEVEL * depth` over half of
   * `duration`, then back up to AMBIENCE_LEVEL over the second half --
   * a generic hush-and-recover envelope a caller can layer a one-shot
   * over (e.g. play('roar') timed to land at the dip's bottom, so the
   * roar reads as an eruption out of the hush rather than a sound
   * competing with the bed at full volume). A no-op before the bed
   * exists or while it isn't running, same guard as play(). */
  duck: (depth: number, duration: number) => void
}

export const SoundContext = createContext<SoundApi>({
  enabled: false,
  ready: false,
  toggle: () => {},
  play: () => {},
  duck: () => {},
})

export const useSound = () => useContext(SoundContext)
