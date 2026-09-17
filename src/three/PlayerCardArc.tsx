import { useFrame, useThree } from '@react-three/fiber'
import { gsap } from 'gsap'
import { useEffect, useMemo, useRef } from 'react'
import type { Group } from 'three'
import type { SeasonLeader } from '../api/seasonLeaders'
import { EASE, setupGsap } from '../motion/gsapSetup'
import { useReducedMotion } from '../motion/reducedMotionContext'
import { arcSlots } from './arcLayout'
import { PlayerCard } from './PlayerCard'

export const PLAYER_CARDS_TRACK_ID = 'player-cards-scroll-track'

const RADIUS = 3.6
const SPREAD = Math.PI * 1.15
/** Radians of rotation per pixel of horizontal drag -- tuned so a full
 * phone-width swipe (~350px) turns the arc a little under a third of a
 * full rotation, a satisfying "spin the rack" amount without needing
 * several repeated swipes. */
const DRAG_SENSITIVITY = 0.008

/** Drives the arc's group rotation from two independent sources that are
 * summed rather than allowed to fight each other: `scrollRotation` (a
 * GSAP scrub tween against the section's own scroll track, one full turn
 * across its height -- "3D elements that animate based on scroll
 * position") and `dragOffset` (a pointer-drag override that eases back to
 * 0 on release via its own GSAP tween). Both live in refs rather than
 * React state since they're read every frame in useFrame, not something
 * a re-render should chase.
 *
 * `prefers-reduced-motion` disables the scroll-driven rotation entirely
 * (the arc holds its starting orientation) but leaves drag intact --
 * a deliberate, user-initiated gesture isn't the kind of motion that
 * preference is about, unlike an ambient scroll-linked spin. */
export function PlayerCardArc({ leaders }: { leaders: SeasonLeader[] }) {
  const groupRef = useRef<Group>(null)
  const scrollRotation = useRef(0)
  const dragOffset = useRef(0)
  const { gl } = useThree()
  const reducedMotion = useReducedMotion()

  const slots = useMemo(() => arcSlots(leaders.length, RADIUS, 0, -1, SPREAD), [leaders.length])

  useEffect(() => {
    if (reducedMotion) return
    setupGsap()
    const track = document.getElementById(PLAYER_CARDS_TRACK_ID)
    if (!track) return

    const proxy = { angle: 0 }
    const tween = gsap.to(proxy, {
      angle: Math.PI * 2,
      ease: 'none',
      scrollTrigger: { trigger: track, start: 'top top', end: 'bottom top', scrub: 1 },
      onUpdate: () => {
        scrollRotation.current = proxy.angle
      },
    })

    return () => {
      tween.scrollTrigger?.kill()
      tween.kill()
    }
  }, [reducedMotion])

  useEffect(() => {
    const el = gl.domElement
    let dragging = false
    let lastX = 0
    let releaseTween: gsap.core.Tween | null = null

    const onDown = (event: PointerEvent) => {
      dragging = true
      lastX = event.clientX
      releaseTween?.kill()
      el.setPointerCapture(event.pointerId)
    }
    const onMove = (event: PointerEvent) => {
      if (!dragging) return
      const dx = event.clientX - lastX
      lastX = event.clientX
      dragOffset.current += dx * DRAG_SENSITIVITY
    }
    const onUp = () => {
      if (!dragging) return
      dragging = false
      setupGsap()
      releaseTween = gsap.to(dragOffset, { current: 0, duration: 1.1, ease: EASE.weighted })
    }

    el.addEventListener('pointerdown', onDown)
    el.addEventListener('pointermove', onMove)
    el.addEventListener('pointerup', onUp)
    el.addEventListener('pointercancel', onUp)
    return () => {
      el.removeEventListener('pointerdown', onDown)
      el.removeEventListener('pointermove', onMove)
      el.removeEventListener('pointerup', onUp)
      el.removeEventListener('pointercancel', onUp)
      releaseTween?.kill()
    }
  }, [gl])

  useFrame(() => {
    if (!groupRef.current) return
    groupRef.current.rotation.y = scrollRotation.current + dragOffset.current
  })

  return (
    <group ref={groupRef}>
      {leaders.map((leader, i) => (
        <PlayerCard key={leader.playerId} leader={leader} slot={slots[i]} rank={i} />
      ))}
    </group>
  )
}
