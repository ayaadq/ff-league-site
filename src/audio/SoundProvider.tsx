import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { SoundContext, type SoundName } from './soundContext'

const SOURCES = {
  click: '/audio/click.mp3',
  whoosh: '/audio/whoosh.mp3',
} as const

/** Session-scoped, like the password gate (SPEC.md §3). Surviving a
 * reload inside one visit is convenient; surviving until next week is
 * the behaviour that's easy to forget you turned on. */
const PREF_KEY = 'trophy-room-sound'

/** Minimum gap between one-shots. Reveal sounds are fired by scroll, and
 * a fast flick down the page can cross several triggers in one frame —
 * without this you get a machine-gun burst instead of a texture. */
const ONE_SHOT_GAP_MS = 130

interface Loaded {
  ctx: AudioContext
  buffers: Record<string, AudioBuffer>
  uiGain: GainNode
}

/** Owns the site's audio -- click/whoosh UI one-shots only. The
 * continuous crowd-ambience bed and its 'roar' one-shot swell (plus the
 * scroll-velocity-reactive gain modulation and duck() envelope that
 * existed solely to shape them) were removed entirely, not muted or
 * gated behind a flag -- this project doesn't keep dead code around
 * "just in case" (CLAUDE.md's own convention). `enable`/`disable`/
 * `toggle`/`ready` are kept exactly as they were: browsers still require
 * a user gesture before any AudioContext can produce sound at all,
 * ambience or not, so the same opt-in ceremony still applies to the
 * one-shots that remain.
 *
 * Nothing is fetched, decoded, or constructed until the user opts in, so
 * a visitor who never touches the toggle pays nothing for any of this —
 * not the audio, not an AudioContext.
 *
 * Web Audio rather than <audio> elements: the one-shots need to overlap
 * without stealing each other's playback, which is awkward with media
 * elements and free here. */
export function SoundProvider({ children }: { children: ReactNode }) {
  const [enabled, setEnabled] = useState(false)
  const [ready, setReady] = useState(false)
  const loaded = useRef<Loaded | null>(null)
  // Mirrors `enabled` for callbacks that must stay identity-stable —
  // stop() reads it from inside a timeout, long after its closure was
  // created.
  const enabledRef = useRef(false)
  const lastOneShot = useRef(0)
  const starting = useRef(false)

  const start = useCallback(async () => {
    if (loaded.current || starting.current) {
      // Already running, or a second click landed mid-fetch.
      if (loaded.current) {
        await loaded.current.ctx.resume()
        setReady(true)
      }
      return
    }
    starting.current = true
    try {
      const ctx = new AudioContext()
      const entries = await Promise.all(
        Object.entries(SOURCES).map(async ([name, url]) => {
          const res = await fetch(url)
          if (!res.ok) throw new Error(`${url} -> ${res.status}`)
          return [name, await ctx.decodeAudioData(await res.arrayBuffer())] as const
        }),
      )
      const buffers = Object.fromEntries(entries)

      const uiGain = ctx.createGain()
      uiGain.gain.value = 1
      uiGain.connect(ctx.destination)

      loaded.current = { ctx, buffers, uiGain }
      setReady(true)
    } catch {
      // A blocked AudioContext or a failed fetch should leave the site
      // exactly as it was, silently. Sound is decoration; nothing here is
      // worth surfacing an error to someone checking a scoreboard.
      setEnabled(false)
      setReady(false)
    } finally {
      starting.current = false
    }
  }, [])

  const stop = useCallback(() => {
    const current = loaded.current
    if (!current) return
    setReady(false)
    // Suspend rather than close: the buffers stay decoded, so toggling
    // back on is instant instead of re-fetching. No fade-out envelope
    // needed anymore -- that existed only to fade the ambience bed out
    // gracefully; a one-shot has nothing to fade, it just stops being
    // playable once suspended.
    void current.ctx.suspend()
  }, [])

  // Starting and stopping happen in the event that caused them, not in
  // an effect reacting to `enabled`. An effect here would mean the state
  // change and the audio action are one render apart for no reason, and
  // audio is an external system driven by an explicit user action — the
  // one case where doing the work in the handler is plainly right.
  const enable = useCallback(() => {
    enabledRef.current = true
    setEnabled(true)
    void start()
  }, [start])

  const disable = useCallback(() => {
    enabledRef.current = false
    setEnabled(false)
    stop()
  }, [stop])

  const toggle = useCallback(() => {
    const next = !enabledRef.current
    try {
      sessionStorage.setItem(PREF_KEY, String(next))
    } catch {
      // Private mode and locked-down contexts throw here; the toggle
      // still works for this page load, it just won't be remembered.
    }
    if (next) enable()
    else disable()
  }, [enable, disable])

  // Remembered from earlier in this visit. Browsers still require a
  // gesture, so arm the next one rather than trying (and failing) to
  // start on load.
  useEffect(() => {
    let remembered = false
    try {
      remembered = sessionStorage.getItem(PREF_KEY) === 'true'
    } catch {
      remembered = false
    }
    if (!remembered) return
    const resume = () => enable()
    window.addEventListener('pointerdown', resume, { once: true })
    window.addEventListener('keydown', resume, { once: true })
    return () => {
      window.removeEventListener('pointerdown', resume)
      window.removeEventListener('keydown', resume)
    }
  }, [enable])

  const play = useCallback((name: SoundName, options?: { gain?: number }) => {
    const current = loaded.current
    if (!current || current.ctx.state !== 'running') return
    const now = performance.now()
    if (now - lastOneShot.current < ONE_SHOT_GAP_MS) return
    lastOneShot.current = now
    const node = current.ctx.createBufferSource()
    node.buffer = current.buffers[name]
    // Same graph as before (node straight to uiGain) when gain is 1 or
    // omitted -- every existing call site (click/whoosh, no options
    // argument) keeps exactly today's routing rather than gaining an
    // extra always-unity node in its path.
    const gain = options?.gain ?? 1
    if (gain === 1) {
      node.connect(current.uiGain)
    } else {
      const perCallGain = current.ctx.createGain()
      perCallGain.gain.value = gain
      node.connect(perCallGain)
      perCallGain.connect(current.uiGain)
    }
    node.start()
  }, [])

  const value = useMemo(() => ({ enabled, ready, toggle, play }), [enabled, ready, toggle, play])

  return <SoundContext.Provider value={value}>{children}</SoundContext.Provider>
}
