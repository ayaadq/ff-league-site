import { createContext, useContext } from 'react'

/** SPEC.md §7.2's "real reduced-quality tier" -- the signal a heavy,
 * always-running-per-frame 3D effect should check before doing the
 * expensive version of itself. 'full' is the default (see
 * EffectsTierProvider.tsx for why), so an effect that never checks this
 * at all just keeps behaving exactly as it does today, opting nothing
 * out by accident. */
export type EffectsTier = 'full' | 'reduced'

export const EffectsTierContext = createContext<EffectsTier>('full')

export const useEffectsTier = () => useContext(EffectsTierContext)
