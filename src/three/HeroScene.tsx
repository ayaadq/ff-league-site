import { gsap } from 'gsap'
import { useEffect, useMemo, useRef } from 'react'
import type { Group } from 'three'
import { useEffectsTier } from '../motion/effectsTierContext'
import { setupGsap } from '../motion/gsapSetup'
import { useReducedMotion } from '../motion/reducedMotionContext'

const IGNITE = '#ff5a36'
const CURRENT = '#2ee6d6'
/** A neutral pewter-grey body rather than literal leather brown — reads
 * as a graphic silhouette belonging to this site's palette rather than
 * an unrelated new hue, while staying clearly visible against the ink
 * canvas (an ink-toned ball on an ink background was tried first and
 * was nearly invisible — confirmed by screenshot, not assumed away).
 * Close to `--color-mute-on-ink`, already proven legible against ink for
 * exactly this reason. Ignite and current do the actual "accent" work
 * per PLAN.md Phase G's brief, as glowing laces plus a tinted point
 * light per ball, not as the ball's own base color. */
const BODY_COLOR = '#5c5a62'

interface FootballConfig {
  position: [number, number, number]
  scale: number
  /** Full clockwise turns completed over the hero's entire scroll span —
   * varied per ball so the three don't spin in obvious lockstep. */
  turns: number
  accent: string
}

/** Positions kept within ~1.5 units of the camera's own Z (5.5, see
 * HeroCanvas.tsx) rather than the old blob composition's deeper spread —
 * confirmed by screenshot that the previous depths (2-4 units further
 * back) sat far enough into the fog gradient that a neutral-grey ball
 * blended almost invisibly toward the fog's own near-black color, a
 * failure mode a saturated-color object (the old blobs) doesn't share. */
const FULL_FOOTBALLS: FootballConfig[] = [
  { position: [-3.1, 1.9, -1.6], scale: 0.6, turns: 1.6, accent: IGNITE },
  { position: [3.0, -2.2, -1.6], scale: 0.75, turns: -1.1, accent: CURRENT },
  { position: [2.7, 2.3, -2.1], scale: 0.5, turns: 2.1, accent: IGNITE },
]
const REDUCED_FOOTBALLS: FootballConfig[] = [FULL_FOOTBALLS[1]]

/** A football rendered as a scaled sphere (a cheap, no-extra-geometry
 * stand-in for a true prolate spheroid — three.js has no built-in
 * "football" primitive) plus a row of lace boxes along the seam. Laces
 * and the backing point light both carry the ball's accent color, so
 * ignite/current read as *lighting the ball*, not as the ball's own
 * material — matching the brief's "keep ignite/current as accent
 * lighting on the footballs," not a literally orange or teal ball. */
function Football({ config, trackId }: { config: FootballConfig; trackId: string }) {
  const groupRef = useRef<Group>(null)
  const reducedMotion = useReducedMotion()

  useEffect(() => {
    if (reducedMotion || !groupRef.current) return
    setupGsap()
    const track = document.getElementById(trackId)
    if (!track) return

    // Clockwise as viewed on screen: in three.js's right-handed
    // coordinate system (camera looking down -Z), increasing rotation.z
    // reads as counter-clockwise, so clockwise needs the negative
    // direction — hence turns is negated here rather than at each
    // config's own call site (config.turns stays a plain "how many turns,
    // which way looks best for this ball" tuning knob).
    const tween = gsap.to(groupRef.current.rotation, {
      z: -config.turns * Math.PI * 2,
      ease: 'none',
      scrollTrigger: { trigger: track, start: 'top top', end: 'bottom top', scrub: 0.6 },
    })

    return () => {
      tween.scrollTrigger?.kill()
      tween.kill()
    }
  }, [reducedMotion, trackId, config.turns])

  return (
    <group position={config.position} scale={config.scale}>
      <pointLight color={config.accent} intensity={3.5} distance={5} decay={2} />
      <group ref={groupRef} scale={[1.55, 0.88, 0.88]}>
        <mesh>
          <sphereGeometry args={[1, 40, 28]} />
          <meshStandardMaterial color={BODY_COLOR} roughness={0.45} metalness={0.1} />
        </mesh>
        {/* Laces — five short bars along the top seam, evenly spaced
            along the ball's elongated local X axis. Un-scaled per-instance
            so they stay bar-shaped rather than inheriting the parent
            group's [1.55, 0.88, 0.88] squash. */}
        {[-0.5, -0.25, 0, 0.25, 0.5].map((t, i) => (
          <mesh key={i} position={[t, 1.02 / 0.88, 0]} scale={[1 / 1.55, 1 / 0.88, 1 / 0.88]}>
            <boxGeometry args={[0.05, 0.03, 0.16]} />
            <meshBasicMaterial color={config.accent} toneMapped={false} />
          </mesh>
        ))}
      </group>
    </group>
  )
}

/** The hero's 3D presence (PLAN.md Phase G) — rotating footballs,
 * replacing the liquid-blob composition from the previous redesign pass.
 * Idle rotation is entirely scroll-driven (each ball's own GSAP scrub
 * tween against the hero's scroll track) rather than a useFrame time-based
 * spin, per this phase's explicit brief ("rotate ... based on scroll
 * progress"). `prefers-reduced-motion` leaves the balls fully rendered at
 * their rest orientation — a real branch, not a blanket kill. */
export function HeroScene({ trackId }: { trackId: string }) {
  const effectsTier = useEffectsTier()
  const footballs = useMemo(
    () => (effectsTier === 'reduced' ? REDUCED_FOOTBALLS : FULL_FOOTBALLS),
    [effectsTier],
  )

  return (
    <>
      {footballs.map((config, i) => (
        <Football key={i} config={config} trackId={trackId} />
      ))}
    </>
  )
}
