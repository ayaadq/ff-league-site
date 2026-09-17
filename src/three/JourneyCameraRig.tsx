import { useThree } from '@react-three/fiber'
import { gsap } from 'gsap'
import { useEffect, useRef, type RefObject } from 'react'
import type { Group, PerspectiveCamera } from 'three'
import { useReducedMotion } from '../motion/reducedMotionContext'
import { setupGsap } from '../motion/gsapSetup'
import {
  ballPositionAtFlightT,
  ballSpinAtFlightT,
  cameraPoseAtFlightT,
  cameraPullback,
  flightProgress,
  KICK_POSITION,
  matchupIndexAtProgress,
  UPRIGHT_POSITION,
} from './journeyLayout'

/** The "through the uprights" pass-through beat — a one-shot flourish
 * fired alongside `onFinale`, not scroll-scrubbed (the brief's own
 * "~0.3s satisfying animation," distinct from the continuously
 * scroll-driven flight). The ball keeps flying past the posts and
 * shrinks away, as if continuing off into the distance, rather than
 * simply stopping dead the instant it reaches them. Scroll continuing
 * to drive `place()` afterward will reassert the scrub-driven transform
 * on the next update regardless, so this can't leave the ball stuck in
 * a state scrolling back up wouldn't correct. */
function playPassThrough(ballGroup: Group): void {
  gsap.to(ballGroup.position, { z: UPRIGHT_POSITION.z - 5, duration: 0.3, ease: 'power2.in' })
  gsap.to(ballGroup.scale, { x: 0.4, y: 0.4, z: 0.4, duration: 0.3, ease: 'power2.in' })
}

/** Drives both the sky-cam and the football's flight from one shared
 * scroll-scrubbed progress value (PLAN.md Phase H) — replacing the old
 * per-station glide-and-dwell rig entirely.
 *
 * Ball and camera are updated from the *same* `onUpdate` tick rather
 * than each reading an independently-computed progress, which is what
 * guarantees "camera stays centered on the ball at all times" (the
 * brief's own words) is true by construction, not by two formulas that
 * happen to agree today. The ball's `<group>` itself lives in
 * JourneyScene.tsx; this rig only receives a ref to it (`ballRef`,
 * `Group | null` in an outer ref) and mutates its transform directly —
 * same ref-mutation idiom every other scroll-driven scene here already
 * uses, not a second position rendered through React props every frame. */
export function JourneyCameraRig({
  trackId,
  matchupCount,
  ballRef,
  onMatchupChange,
  onFinale,
}: {
  trackId: string
  matchupCount: number
  ballRef: RefObject<Group | null>
  /** Fires once per matchup, exactly when the scrubbed progress this rig
   * is already reading enters that matchup's equal-width segment —
   * WeeklyJourney's audio duck/roar and small per-matchup confetti burst
   * hang off this, same reasoning the old rig's onStationDwellStart had
   * (sound and the camera's actual position can't drift apart this way).
   * `velocity` (px/sec) rides along for the confetti burst's intensity,
   * read from this same ScrollTrigger rather than a second sampler. */
  onMatchupChange?: (index: number, velocity: number) => void
  /** Fires exactly once, the moment the ball's flight reaches the
   * uprights (flightProgress === 1) — the trigger for the "through the
   * uprights" pass-through beat and the big finale confetti burst. */
  onFinale?: () => void
}) {
  const { camera, size } = useThree()
  const prefersReducedMotion = useReducedMotion()
  const aspect = size.width / size.height
  const onMatchupChangeRef = useRef(onMatchupChange)
  const onFinaleRef = useRef(onFinale)
  useEffect(() => {
    onMatchupChangeRef.current = onMatchupChange
    onFinaleRef.current = onFinale
  })

  useEffect(() => {
    setupGsap()

    const place = (flightT: number) => {
      const ball = ballPositionAtFlightT(flightT)
      const ballGroup = ballRef.current
      if (ballGroup) {
        ballGroup.position.set(ball.x, ball.y, ball.z)
        // Clockwise on screen, matching the hero's own football --
        // negative Z rotation in three.js's right-handed system.
        ballGroup.rotation.z = -ballSpinAtFlightT(flightT)
      }

      const pullback = cameraPullback(aspect)
      // The camera eases toward its wide end pose faster than the ball's
      // own (physically-motivated, quadratic-Bezier) arc timing --
      // confirmed live, not assumed: driving both off the same raw
      // flightT left the camera's pull-back lagging the ball's forward
      // travel early in the flight, so the ball swelled to fill most of
      // the frame right after kickoff before the sky-cam had actually
      // started opening up. A front-loaded sqrt curve here (reaches the
      // wide framing sooner, flattens out later) fixes that while the
      // ball keeps its own realistic arc -- deriving from the same
      // flightT source, not a second, independently-tracked progress
      // value that could drift from it.
      const cameraT = Math.sqrt(Math.min(Math.max(flightT, 0), 1))
      const pose = cameraPoseAtFlightT(cameraT)
      const pulled = {
        x: ball.x + (pose.position.x - ball.x) * pullback,
        y: ball.y + (pose.position.y - ball.y) * pullback,
        z: ball.z + (pose.position.z - ball.z) * pullback,
      }
      camera.position.set(pulled.x, pulled.y, pulled.z)
      camera.lookAt(ball.x, ball.y, ball.z)

      const perspectiveCamera = camera as PerspectiveCamera
      perspectiveCamera.fov = pose.fov
      perspectiveCamera.updateProjectionMatrix()
    }

    // First frame has to be framed correctly before any scroll has
    // happened -- ScrollTrigger doesn't fire onUpdate until the first
    // scroll event, so without this the opening shot uses whatever pose
    // React's own initial render left the camera at.
    place(0)

    const track = document.getElementById(trackId)
    if (prefersReducedMotion || !track || matchupCount === 0) {
      if (ballRef.current) {
        ballRef.current.position.set(KICK_POSITION.x, KICK_POSITION.y, KICK_POSITION.z)
        ballRef.current.rotation.z = 0
      }
      return
    }

    let lastMatchupIndex = -1
    let firedFinale = false
    let lastVelocity = 0
    const state = { progress: 0 }
    const tween = gsap.to(state, {
      progress: 1,
      ease: 'none', // the scrub supplies the weight, not the ease
      scrollTrigger: {
        trigger: track,
        start: 'top top',
        end: 'bottom top',
        scrub: 1.1,
        onUpdate: (self) => {
          lastVelocity = self.getVelocity()
        },
      },
      onUpdate: () => {
        const flightT = flightProgress(state.progress, matchupCount)
        place(flightT)

        const matchupIndex = matchupIndexAtProgress(state.progress, matchupCount)
        if (matchupIndex !== lastMatchupIndex) {
          lastMatchupIndex = matchupIndex
          onMatchupChangeRef.current?.(matchupIndex, lastVelocity)
        }

        if (!firedFinale && flightT >= 1) {
          firedFinale = true
          onFinaleRef.current?.()
          if (ballRef.current) playPassThrough(ballRef.current)
        } else if (firedFinale && flightT < 1) {
          // Scrolled back up out of the finale -- reset the pass-through
          // flourish's scale-down so it doesn't stay shrunk, and let it
          // fire again if the reader scrolls back down to it, rather
          // than a one-shot for the whole page's lifetime.
          firedFinale = false
          if (ballRef.current) ballRef.current.scale.set(1, 1, 1)
        }
      },
    })

    return () => {
      tween.scrollTrigger?.kill()
      tween.kill()
    }
  }, [camera, aspect, prefersReducedMotion, trackId, matchupCount, ballRef])

  return null
}
