import { gsap } from 'gsap'
import { lazy, Suspense, useEffect, useRef } from 'react'
import { EnableSoundPrompt } from '../audio/EnableSoundPrompt'
import { setupGsap } from '../motion/gsapSetup'
import { useReducedMotion } from '../motion/reducedMotionContext'
import { ChunkErrorBoundary } from './ChunkErrorBoundary'
import { ScrollCue } from './ScrollCue'
import { SectionKicker } from './SectionKicker'

/** Same code-split reasoning as the other two canvases (HomePage.tsx,
 * HistoryPage.tsx) — three/r3f/drei/gsap stay out of the initial bundle,
 * loaded after the page paints. `fallback={null}` because the sticky
 * track below already reserves the space. */
const HeroCanvas = lazy(() =>
  import('../three/HeroCanvas').then((m) => ({ default: m.HeroCanvas })),
)

/** Home's hero (PLAN.md Phase 13B) — a full-bleed ink "moment" section
 * with a liquid 3D backdrop, replacing the old plain-text header. Same
 * sticky-track-inside-a-taller-wrapper shape the other two scenes use
 * (three/ScrollCameraRig.tsx drives the camera against `hero-scroll-track`)
 * so scrolling this section moves the camera through the blob cluster
 * before the page settles into the first paper section below.
 *
 * The foreground copy (kicker, title, sound prompt, scroll cue) sits
 * inside the same sticky element as the canvas and fades/lifts out on
 * scroll via a small scrubbed GSAP tween — a "clean transition" out of
 * the hero rather than the content just scrolling off past a fixed
 * canvas. `prefers-reduced-motion` skips the tween entirely (the copy
 * stays fully visible, matching the reduced-motion camera which stays
 * parked at its rest pose per ScrollCameraRig). */
export function HeroSection({ season }: { season?: string }) {
  const contentRef = useRef<HTMLDivElement>(null)
  const reducedMotion = useReducedMotion()

  useEffect(() => {
    if (reducedMotion || !contentRef.current) return
    setupGsap()

    const track = document.getElementById('hero-scroll-track')
    if (!track) return

    const tween = gsap.to(contentRef.current, {
      opacity: 0,
      y: -28,
      scale: 0.97,
      ease: 'none',
      scrollTrigger: {
        trigger: track,
        start: 'top top',
        end: '35% top',
        scrub: 1.2,
      },
    })

    return () => {
      tween.scrollTrigger?.kill()
      tween.kill()
    }
  }, [reducedMotion])

  return (
    <div id="hero-scroll-track" className="ink-surface relative -mx-6 h-[170vh]">
      <div className="sticky top-0 h-svh w-full overflow-hidden">
        <div className="absolute inset-0">
          <ChunkErrorBoundary>
            <Suspense fallback={null}>
              <HeroCanvas />
            </Suspense>
          </ChunkErrorBoundary>
        </div>

        <div
          ref={contentRef}
          className="relative flex h-full flex-col items-center justify-center px-6 text-center"
        >
          <SectionKicker tone="ink">
            {season ? `${season} Season` : 'Loading season…'}
          </SectionKicker>
          <h1 className="font-display text-marble mt-2 max-w-3xl text-[clamp(2.25rem,7vw,3.75rem)] leading-[0.95]">
            WELCOME TO THE TROPHYROOM MFER!
          </h1>
          <div className="gold-divider mx-auto mt-5 w-16" aria-hidden="true" />

          <div className="mt-8 flex flex-col items-center gap-9">
            <EnableSoundPrompt tone="ink" />
            <ScrollCue tone="ink" />
          </div>
        </div>
      </div>
    </div>
  )
}
