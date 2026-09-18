import { useThree } from '@react-three/fiber'
import { gsap } from 'gsap'
import { useEffect, useRef } from 'react'
import { setupGsap } from '../motion/gsapSetup'
import { useReducedMotion } from '../motion/reducedMotionContext'
import {
  activeIndexAtProgress,
  cameraZAtProgress,
  EYE_HEIGHT,
  SIDE_OFFSET,
} from './trophyLineLayout'

/** Scroll-driven side-view dolly along the trophy line (PLAN.md Phase
 * H.5) — same single-shared-progress idiom as every other scroll-driven
 * camera in this project (ScrollCameraRig, JourneyCameraRig): one
 * GSAP-tweened value drives the camera's Z every frame, read from the
 * same `onUpdate` that also reports which slot is now active, rather
 * than two independently-computed reads of scroll position.
 *
 * Side-view rather than a fixed shot of the whole line: the camera sits
 * off to the side at a constant X/Y and slides along Z, always looking
 * straight across at whichever slot it's currently level with — "camera
 * pans along the line, revealing each champion in order" from the brief,
 * done as a literal geometric dolly rather than a series of cuts. */
export function TrophyLineCameraRig({
  trackId,
  count,
  onActiveChange,
}: {
  trackId: string
  count: number
  /** Fires whenever the camera crosses into a new slot's stretch of the
   * line — HistoryPage.tsx's DOM name caption hangs off this rather than
   * a second, independent scroll listener. */
  onActiveChange?: (index: number) => void
}) {
  const { camera } = useThree()
  const prefersReducedMotion = useReducedMotion()
  const onActiveChangeRef = useRef(onActiveChange)
  useEffect(() => {
    onActiveChangeRef.current = onActiveChange
  })

  useEffect(() => {
    setupGsap()

    let lastActiveIndex = -1
    const place = (progress: number) => {
      const z = cameraZAtProgress(progress, count)
      camera.position.set(SIDE_OFFSET, EYE_HEIGHT, z)
      camera.lookAt(0, EYE_HEIGHT, z)

      const activeIndex = activeIndexAtProgress(progress, count)
      if (activeIndex !== lastActiveIndex) {
        lastActiveIndex = activeIndex
        onActiveChangeRef.current?.(activeIndex)
      }
    }

    place(0)

    const track = document.getElementById(trackId)
    if (prefersReducedMotion || !track || count === 0) {
      place(0)
      return
    }

    const state = { progress: 0 }
    const tween = gsap.to(state, {
      progress: 1,
      ease: 'none', // the scrub value below supplies the "liquid" lag, not this ease
      scrollTrigger: {
        trigger: track,
        start: 'top top',
        end: 'bottom top',
        // 1.2 (this project's usual scrub value, matching
        // ScrollCameraRig/JourneyCameraRig) read as sluggish specifically
        // here (PLAN.md Phase H.5 hotfix #5) -- a bigger scrub number is
        // more lag between the actual scroll position and where the
        // camera currently is, and on a line this long that lag was
        // enough that the camera never really caught up to a normal
        // scroll speed. 0.45 keeps a little of the "liquid" smoothing
        // this project's scroll rigs are built around, rather than an
        // instant 1:1 scrub that would feel rigid, while responding fast
        // enough to read as premium rather than delayed.
        scrub: 0.45,
      },
      onUpdate: () => place(state.progress),
    })

    return () => {
      tween.scrollTrigger?.kill()
      tween.kill()
    }
  }, [camera, prefersReducedMotion, trackId, count])

  return null
}
