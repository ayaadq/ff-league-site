import { gsap } from 'gsap'
import { useCallback, useEffect, useRef, useState, type TouchEvent as ReactTouchEvent } from 'react'
import { EASE, MOTION, setupGsap } from '../motion/gsapSetup'
import { useReducedMotion } from '../motion/reducedMotionContext'

type SceneId = 'approaching' | 'spin' | 'hurdle' | 'stiffarm' | 'celebration'
type Move = 'spin' | 'hurdle' | 'stiffarm'

interface SceneConfig {
  src: string
  alt: string
  label: string
}

/** Five keyframes, expected at public/assets/anime-scenes/scene-{1-5}.png.
 * Nothing generates these -- they don't exist in this repo yet. Each one
 * falls back to a labeled placeholder panel (SceneImage below) until a
 * real PNG is dropped at its path; nothing else needs to change when
 * that happens. */
const SCENES: Record<SceneId, SceneConfig> = {
  approaching: {
    src: '/assets/anime-scenes/scene-1.png',
    alt: 'Anime-style running back sprinting toward a defender',
    label: 'Approaching the defender',
  },
  spin: {
    src: '/assets/anime-scenes/scene-2.png',
    alt: 'Anime-style running back spinning past a defender',
    label: 'Spin move',
  },
  hurdle: {
    src: '/assets/anime-scenes/scene-3.png',
    alt: 'Anime-style running back hurdling over a defender',
    label: 'Hurdle',
  },
  stiffarm: {
    src: '/assets/anime-scenes/scene-4.png',
    alt: 'Anime-style running back stiff-arming a defender',
    label: 'Stiff arm',
  },
  celebration: {
    src: '/assets/anime-scenes/scene-5.png',
    alt: 'Anime-style player celebrating a touchdown in the end zone',
    label: 'Touchdown!',
  },
}

const MOVE_HOLD_MS = 900
const CELEBRATION_HOLD_MS = 2200
/** Three taps inside this window (spacebar or touch) trigger the stiff
 * arm -- "rapid taps," not a single press. */
const TAP_WINDOW_MS = 600
const TAP_THRESHOLD = 3
/** Minimum swipe distance (px) before a touch counts as directional
 * rather than a tap toward the stiff-arm counter. */
const SWIPE_THRESHOLD = 40

/** Keyed by `scene` from the parent so a fresh `broken` state is used
 * per scene -- an image that 404s once shouldn't poison every future
 * render of a *different* scene that might load fine. */
function SceneImage({ scene }: { scene: SceneId }) {
  const [broken, setBroken] = useState(false)
  const config = SCENES[scene]

  if (broken) {
    return (
      <div
        className="flex h-full w-full items-center justify-center bg-gradient-to-br from-neutral-900 to-neutral-800 px-6 text-center"
        role="img"
        aria-label={config.alt}
      >
        <div>
          <p className="text-[0.65rem] tracking-[0.3em] text-neutral-500 uppercase">Placeholder</p>
          <p className="font-display mt-2 text-3xl text-white">{config.label}</p>
          <p className="mx-auto mt-3 max-w-xs text-xs text-neutral-500">
            Drop a real image at public{config.src} to replace this panel.
          </p>
        </div>
      </div>
    )
  }

  return (
    <img
      src={config.src}
      alt={config.alt}
      onError={() => setBroken(true)}
      className="h-full w-full object-cover"
    />
  )
}

/** Gesture-driven anime highlight-reel playground for the Fun Tab --
 * entirely separate from the homepage's sky-cam Journey
 * (WeeklyJourney.tsx/JourneyScene.tsx), which this doesn't touch. Five
 * static images stand in for the "scene," switched by gesture rather
 * than a 3D/scroll-driven camera: swipe right / → for a spin move, swipe
 * up / ↑ to hurdle, three rapid taps / mashing space for a stiff arm.
 * Any move scene holds briefly, auto-advances to the touchdown
 * celebration, then resets.
 *
 * Hand-rolled touch/keyboard gesture detection rather than a library
 * (hammerjs was the original ask) -- three directional/tap checks don't
 * need a general gesture-recognition dependency, and hammerjs itself has
 * had no meaningful maintenance in years. */
export function AnimeFootballScene() {
  const [scene, setScene] = useState<SceneId>('approaching')
  const reducedMotion = useReducedMotion()
  const sceneRef = useRef<HTMLDivElement>(null)
  const tapTimestamps = useRef<number[]>([])
  const touchStart = useRef<{ x: number; y: number } | null>(null)
  const advanceTimer = useRef<number | undefined>(undefined)

  const triggerMove = useCallback((move: Move) => {
    setScene((current) => (current === 'approaching' ? move : current))
  }, [])

  const reset = useCallback(() => setScene('approaching'), [])

  const registerTap = useCallback(() => {
    const now = Date.now()
    const recent = [...tapTimestamps.current, now].filter((t) => now - t < TAP_WINDOW_MS)
    tapTimestamps.current = recent
    if (recent.length >= TAP_THRESHOLD) {
      tapTimestamps.current = []
      triggerMove('stiffarm')
    }
  }, [triggerMove])

  // Move -> celebration -> reset, timed. Re-runs (and clears any pending
  // timer first) whenever `scene` changes, so a fast re-trigger can't
  // stack multiple pending advances.
  useEffect(() => {
    window.clearTimeout(advanceTimer.current)
    if (scene === 'spin' || scene === 'hurdle' || scene === 'stiffarm') {
      advanceTimer.current = window.setTimeout(() => setScene('celebration'), MOVE_HOLD_MS)
    } else if (scene === 'celebration') {
      advanceTimer.current = window.setTimeout(reset, CELEBRATION_HOLD_MS)
    }
    return () => window.clearTimeout(advanceTimer.current)
  }, [scene, reset])

  // Crossfade on every scene change -- skipped under reduced motion (a
  // static end-state, not a disabled animation, same discipline
  // Reveal.tsx uses elsewhere in this project).
  useEffect(() => {
    const el = sceneRef.current
    if (!el) return
    if (reducedMotion) {
      gsap.set(el, { opacity: 1 })
      return
    }
    setupGsap()
    gsap.fromTo(el, { opacity: 0 }, { opacity: 1, duration: MOTION.minor, ease: EASE.weighted })
  }, [scene, reducedMotion])

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'ArrowRight') {
        event.preventDefault()
        triggerMove('spin')
      } else if (event.key === 'ArrowUp') {
        event.preventDefault()
        triggerMove('hurdle')
      } else if (event.code === 'Space') {
        event.preventDefault()
        registerTap()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [triggerMove, registerTap])

  const handleTouchStart = (event: ReactTouchEvent<HTMLDivElement>) => {
    const touch = event.touches[0]
    touchStart.current = { x: touch.clientX, y: touch.clientY }
  }

  const handleTouchEnd = (event: ReactTouchEvent<HTMLDivElement>) => {
    const start = touchStart.current
    touchStart.current = null
    if (!start) return
    const touch = event.changedTouches[0]
    const dx = touch.clientX - start.x
    const dy = touch.clientY - start.y

    if (Math.abs(dx) > SWIPE_THRESHOLD && Math.abs(dx) > Math.abs(dy)) {
      if (dx > 0) triggerMove('spin')
      return
    }
    if (Math.abs(dy) > SWIPE_THRESHOLD && Math.abs(dy) > Math.abs(dx)) {
      if (dy < 0) triggerMove('hurdle')
      return
    }
    // Not a swipe -- counts toward the rapid-tap stiff-arm gesture.
    registerTap()
  }

  const config = SCENES[scene]

  return (
    <div
      className="relative h-full w-full touch-none overflow-hidden bg-black select-none"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      <div ref={sceneRef} className="absolute inset-0">
        <SceneImage key={scene} scene={scene} />
      </div>

      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 to-transparent px-6 pt-16 pb-8 sm:px-10">
        <p className="text-[0.65rem] tracking-[0.3em] text-white/60 uppercase">{config.label}</p>

        {scene === 'approaching' && (
          <>
            <p className="mt-2 max-w-md text-sm text-white/80">
              Swipe right (or press →) for a spin move. Swipe up (or press ↑) to hurdle. Tap fast
              three times (or mash space) for a stiff arm.
            </p>
            <div className="mt-4 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => triggerMove('spin')}
                className="border-gold-bright text-marble min-h-11 rounded-full border px-5 text-sm tracking-wide uppercase"
              >
                Spin move
              </button>
              <button
                type="button"
                onClick={() => triggerMove('hurdle')}
                className="border-gold-bright text-marble min-h-11 rounded-full border px-5 text-sm tracking-wide uppercase"
              >
                Hurdle
              </button>
              <button
                type="button"
                onClick={() => triggerMove('stiffarm')}
                className="border-gold-bright text-marble min-h-11 rounded-full border px-5 text-sm tracking-wide uppercase"
              >
                Stiff arm
              </button>
            </div>
          </>
        )}

        {scene === 'celebration' && (
          <button
            type="button"
            onClick={reset}
            className="bg-gold-bright text-marble mt-4 min-h-11 rounded-full px-6 text-sm font-semibold tracking-wide uppercase"
          >
            Run it back
          </button>
        )}
      </div>
    </div>
  )
}
