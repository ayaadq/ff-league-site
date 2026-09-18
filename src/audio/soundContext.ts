import { createContext, useContext } from 'react'

/** One-shot UI buffers -- click and whoosh. The ambient crowd bed and its
 * 'roar' one-shot swell were removed entirely (both were "crowd noise":
 * a continuous background bed and a discrete version of the same crowd
 * swell), along with `duck()`, which only ever existed to dip the bed
 * around a roar -- with no bed and no roar, there was nothing left for it
 * to duck. */
export type SoundName = 'click' | 'whoosh'

export interface SoundApi {
  /** Whether sound is currently enabled. Always false until the user asks
   * for it: browsers block audio without a gesture, and starting audio in
   * someone's tab uninvited is not a thing to do regardless. */
  enabled: boolean
  /** True once the buffers are decoded and the audio context is running.
   * Lets the toggle show a pending state during the fetch rather than
   * looking broken. */
  ready: boolean
  toggle: () => void
  /** `gain` scales just this one playback (default 1) -- lets a caller
   * make one instance of a buffer louder or quieter than its neighbors
   * without a second buffer. */
  play: (name: SoundName, options?: { gain?: number }) => void
}

export const SoundContext = createContext<SoundApi>({
  enabled: false,
  ready: false,
  toggle: () => {},
  play: () => {},
})

export const useSound = () => useContext(SoundContext)
