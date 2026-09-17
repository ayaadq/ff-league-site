import { gsap } from 'gsap'
import { useEffect, useRef } from 'react'
import type { Group } from 'three'
import { setupGsap } from '../motion/gsapSetup'
import { useReducedMotion } from '../motion/reducedMotionContext'
import { Football } from './Football'

const IGNITE = '#ff5a36'
const REST_POSITION: [number, number, number] = [0, 0.75, -2.4]
/** Well below the visible frustum at the hero's rest camera pose — the
 * ball doesn't literally travel into the journey's own (separate) canvas
 * below, it drops out of the hero canvas's own frame at the bottom,
 * timed to disappear right as the hero's sticky section releases and
 * scrolls away, handing off to the journey starting immediately under
 * it. That handoff illusion is what "drops into the journey" means here
 * — the two canvases have no way to literally share geometry. */
const DROP_Y = -7

/** One football, centered behind the "Scoreboard" title (PLAN.md Phase
 * H — replaces Phase G's three-football composition). Rotation is the
 * same scroll-driven scrub as before; new this phase is a paired
 * scroll-scrubbed drop in Y, both driven off the hero's own scroll track
 * so they progress together regardless of scroll speed.
 *
 * `prefers-reduced-motion`: the ball stays at its rest position and
 * orientation — still rendered, no drop, no spin. */
export function HeroScene({ trackId }: { trackId: string }) {
  const ballRef = useRef<Group>(null)
  const reducedMotion = useReducedMotion()

  useEffect(() => {
    if (reducedMotion || !ballRef.current) return
    setupGsap()
    const track = document.getElementById(trackId)
    if (!track) return

    gsap.set(ballRef.current.position, {
      x: REST_POSITION[0],
      y: REST_POSITION[1],
      z: REST_POSITION[2],
    })
    gsap.set(ballRef.current.rotation, { z: 0 })

    const scrollTrigger = { trigger: track, start: 'top top', end: 'bottom top', scrub: 0.6 }

    const drop = gsap.to(ballRef.current.position, {
      y: DROP_Y,
      ease: 'power1.in',
      scrollTrigger,
    })
    // Clockwise on screen: three.js's rotation.z increases
    // counter-clockwise (right-hand rule, camera looking down -Z), so
    // clockwise needs the negative direction.
    const spin = gsap.to(ballRef.current.rotation, {
      z: -Math.PI * 5,
      ease: 'none',
      scrollTrigger,
    })

    return () => {
      drop.scrollTrigger?.kill()
      drop.kill()
      spin.scrollTrigger?.kill()
      spin.kill()
    }
  }, [reducedMotion, trackId])

  return (
    <group ref={ballRef} position={REST_POSITION}>
      <pointLight color={IGNITE} intensity={3.2} distance={5.5} decay={2} />
      <Football accentColor={IGNITE} />
    </group>
  )
}
