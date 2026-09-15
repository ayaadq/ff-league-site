import { useState } from 'react'
import { GATE_SESSION_KEY } from '../config'

function readUnlocked(): boolean {
  try {
    return sessionStorage.getItem(GATE_SESSION_KEY) === 'true'
  } catch {
    // sessionStorage can throw in locked-down browser contexts — fail closed.
    return false
  }
}

/** SPEC.md §3 — session-scoped, client-side only. Not real security. */
export function useAuthGate() {
  const [unlocked, setUnlocked] = useState(readUnlocked)

  const unlock = () => {
    try {
      sessionStorage.setItem(GATE_SESSION_KEY, 'true')
    } catch {
      // Ignore — the in-memory state below still unlocks this page load.
    }
    setUnlocked(true)
  }

  return { unlocked, unlock }
}
