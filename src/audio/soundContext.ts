import { createContext, useContext } from 'react'

/** One-shot interaction sounds. The ambient bed is not in here — it is
 * not something a component triggers, it is simply on or off. */
export type SoundName = 'click' | 'whoosh'

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
  play: (name: SoundName) => void
}

export const SoundContext = createContext<SoundApi>({
  enabled: false,
  ready: false,
  toggle: () => {},
  play: () => {},
})

export const useSound = () => useContext(SoundContext)
