import { gsap } from 'gsap'
import { lazy, Suspense, useEffect, useRef } from 'react'
import { Link } from 'react-router'
import { setupGsap } from '../motion/gsapSetup'
import { useReducedMotion } from '../motion/reducedMotionContext'
import { ChunkErrorBoundary } from './ChunkErrorBoundary'

const PaperCrumpleCanvas = lazy(() =>
  import('../three/PaperCrumpleCanvas').then((m) => ({ default: m.PaperCrumpleCanvas })),
)

const TRACK_ID = 'paper-crumple-track'

/** The "here's the full recap" transition between the journey and the
 * CTA into `/weekly-recaps` (PLAN.md "Paper Crumple Animation") — a
 * single off-white card crumples up and launches away as this stretch of
 * the page scrolls past, revealing the button underneath it. Full-bleed
 * (same `w-screen` + calc-based negative margin trick WeeklyJourney.tsx
 * and the trophy line use) since this sits inside HomePage.tsx's
 * `max-w-4xl` reading column.
 *
 * The button lifts slightly as the reader scrolls through this section
 * (the brief's own "content below slides up as paper exits") — a plain
 * scrubbed transform, not tied to the canvas's own progress ref, since
 * this is DOM content and has no reason to route through r3f. */
export function PaperCrumpleSection() {
  const ctaRef = useRef<HTMLDivElement>(null)
  const reducedMotion = useReducedMotion()

  useEffect(() => {
    if (reducedMotion || !ctaRef.current) return
    setupGsap()
    const track = document.getElementById(TRACK_ID)
    if (!track) return

    const tween = gsap.fromTo(
      ctaRef.current,
      { y: 32, opacity: 0.5 },
      {
        y: 0,
        opacity: 1,
        ease: 'none',
        scrollTrigger: {
          trigger: track,
          start: 'top bottom',
          end: 'bottom center',
          scrub: 0.5,
        },
      },
    )

    return () => {
      tween.scrollTrigger?.kill()
      tween.kill()
    }
  }, [reducedMotion])

  return (
    <div id={TRACK_ID} className="mx-[calc(50%-50vw)] mt-16 w-screen md:mt-24">
      <div className="bg-charcoal relative h-[70svh] w-full overflow-hidden sm:h-[80svh]">
        <ChunkErrorBoundary>
          <Suspense fallback={null}>
            <PaperCrumpleCanvas trackId={TRACK_ID} />
          </Suspense>
        </ChunkErrorBoundary>

        <div
          ref={ctaRef}
          className="pointer-events-none absolute inset-x-0 bottom-10 flex justify-center sm:bottom-14"
        >
          <Link
            to="/weekly-recaps"
            className="bg-gold-bright text-marble pointer-events-auto rounded-full px-8 py-3 text-sm font-semibold tracking-[0.1em] uppercase shadow-lg transition-transform hover:scale-105"
          >
            View Full Weekly Recap
          </Link>
        </div>
      </div>
    </div>
  )
}
