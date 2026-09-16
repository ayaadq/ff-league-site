import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { SoundContext, type SoundName } from './soundContext'

const SOURCES = {
  ambience: '/audio/ambience.mp3',
  roar: '/audio/roar.mp3',
  click: '/audio/click.mp3',
  whoosh: '/audio/whoosh.mp3',
} as const

/** Session-scoped, like the password gate (SPEC.md §3). Surviving a
 * reload inside one visit is convenient; surviving until next week means
 * someone opens the site on Sunday morning and a stadium starts up,
 * which is the behaviour everyone hates. */
const PREF_KEY = 'trophy-room-sound'

const AMBIENCE_LEVEL = 0.55
/** Slow on purpose: the bed emerges underneath the roar as the roar
 * decays, so enabling sound is one continuous event rather than two
 * things starting at once. */
const FADE_IN = 4.5
const FADE_OUT = 0.7
/** The roar is already mixed hotter than the bed and builds its own
 * swell over ~3s, so it needs no envelope from this end. */
const ROAR_LEVEL = 1.0

/** Skip the first and last moments of the decoded bed when looping. MP3
 * encoders pad the start and end of a file, and looping across that
 * padding is what produces the classic tick every time a loop wraps. */
const LOOP_TRIM = 0.05

/** Minimum gap between one-shots. Reveal sounds are fired by scroll, and
 * a fast flick down the page can cross several triggers in one frame —
 * without this you get a machine-gun burst instead of a texture. */
const ONE_SHOT_GAP_MS = 130

interface Loaded {
  ctx: AudioContext
  buffers: Record<string, AudioBuffer>
  ambienceGain: GainNode
  uiGain: GainNode
  source: AudioBufferSourceNode
}

/** Owns the site's audio. Nothing is fetched, decoded, or constructed
 * until the user opts in, so a visitor who never touches the toggle pays
 * nothing for any of this — not the ~150 KB of audio, not an
 * AudioContext.
 *
 * Web Audio rather than <audio> elements: the bed needs a sample-accurate
 * gapless loop and a real fade curve, and the one-shots need to overlap
 * without stealing each other's playback. Both are awkward with media
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
        const { ctx, ambienceGain } = loaded.current
        await ctx.resume()
        ambienceGain.gain.cancelScheduledValues(ctx.currentTime)
        ambienceGain.gain.setValueAtTime(ambienceGain.gain.value, ctx.currentTime)
        ambienceGain.gain.linearRampToValueAtTime(AMBIENCE_LEVEL, ctx.currentTime + FADE_IN)
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

      const ambienceGain = ctx.createGain()
      ambienceGain.gain.value = 0
      ambienceGain.connect(ctx.destination)

      const uiGain = ctx.createGain()
      uiGain.gain.value = 1
      uiGain.connect(ctx.destination)

      const source = ctx.createBufferSource()
      source.buffer = buffers.ambience
      source.loop = true
      source.loopStart = LOOP_TRIM
      source.loopEnd = Math.max(buffers.ambience.duration - LOOP_TRIM, LOOP_TRIM + 1)
      source.connect(ambienceGain)
      source.start(0, LOOP_TRIM)

      ambienceGain.gain.linearRampToValueAtTime(AMBIENCE_LEVEL, ctx.currentTime + FADE_IN)

      // Turning sound on is a touchdown: the crowd goes up, then settles
      // into the bed. The roar file starts near-silent and takes about
      // three seconds to peak, so this fires at full level and still
      // arrives as a build rather than a blast.
      const roar = ctx.createBufferSource()
      roar.buffer = buffers.roar
      const roarGain = ctx.createGain()
      roarGain.gain.value = ROAR_LEVEL
      roarGain.connect(ctx.destination)
      roar.connect(roarGain)
      roar.start()

      loaded.current = { ctx, buffers, ambienceGain, uiGain, source }
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
    const { ctx, ambienceGain } = current
    ambienceGain.gain.cancelScheduledValues(ctx.currentTime)
    ambienceGain.gain.setValueAtTime(ambienceGain.gain.value, ctx.currentTime)
    ambienceGain.gain.linearRampToValueAtTime(0, ctx.currentTime + FADE_OUT)
    // Both of these wait out the fade rather than firing now. `ready`
    // means "the bed is audible", and during a fade-out it still is —
    // flipping it here would also be a synchronous setState inside the
    // effect below, costing an extra render pass every toggle.
    // Suspend rather than close: the buffers stay decoded, so toggling
    // back on is instant instead of re-fetching.
    window.setTimeout(
      () => {
        if (enabledRef.current) return
        setReady(false)
        void ctx.suspend()
      },
      FADE_OUT * 1000 + 60,
    )
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

  const play = useCallback((name: SoundName) => {
    const current = loaded.current
    if (!current || current.ctx.state !== 'running') return
    const now = performance.now()
    if (now - lastOneShot.current < ONE_SHOT_GAP_MS) return
    lastOneShot.current = now
    const node = current.ctx.createBufferSource()
    node.buffer = current.buffers[name]
    node.connect(current.uiGain)
    node.start()
  }, [])

  const value = useMemo(() => ({ enabled, ready, toggle, play }), [enabled, ready, toggle, play])

  return <SoundContext.Provider value={value}>{children}</SoundContext.Provider>
}
