import { lazy, Suspense } from 'react'
import { ChunkErrorBoundary } from './ChunkErrorBoundary'

const PaperCrumpleCanvas = lazy(() =>
  import('../three/PaperCrumpleCanvas').then((m) => ({ default: m.PaperCrumpleCanvas })),
)

const TRACK_ID = 'paper-crumple-track'

/** The paper-crumple transition between the journey and the recap teaser
 * (PLAN.md "Paper Crumple Animation") — a single off-white card crumples
 * up and launches away as this stretch of the page scrolls past. Just
 * the canvas now; the "View Full Weekly Recap" CTA that used to overlay
 * it moved to sit below `WeeklyRecapSection`'s own content instead
 * (layout hotfix) — this component no longer owns any button/link
 * markup. Full-bleed (same `w-screen` + calc-based negative margin trick
 * WeeklyJourney.tsx and the trophy line use) since this sits inside
 * HomePage.tsx's `max-w-4xl` reading column. */
export function PaperCrumpleSection() {
  return (
    <div id={TRACK_ID} className="mx-[calc(50%-50vw)] mt-16 w-screen md:mt-24">
      <div className="bg-charcoal relative h-[70svh] w-full overflow-hidden sm:h-[80svh]">
        <ChunkErrorBoundary>
          <Suspense fallback={null}>
            <PaperCrumpleCanvas trackId={TRACK_ID} />
          </Suspense>
        </ChunkErrorBoundary>
      </div>
    </div>
  )
}
