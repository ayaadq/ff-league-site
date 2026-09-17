import { Canvas } from '@react-three/fiber'
import { Suspense, useRef } from 'react'
import type { Group } from 'three'
import { JourneyCameraRig } from './JourneyCameraRig'
import { JourneyScene } from './JourneyScene'
import { SceneLighting } from './SceneLighting'

/** Dark ink sky (PLAN.md Phase H) — `#0B0B0E`, this project's shared ink
 * token (index.css's `--color-ink`/`--color-charcoal`), used here as a
 * background/fog color the same way the previous journey redesign
 * already established (kept in sync by hand, not a CSS var — this is a
 * literal three.js color, not a stylesheet). */
const SKY_COLOR = '#0B0B0E'

/** The kick journey's canvas (PLAN.md Phase H) — owns the one ref shared
 * between the scene (which renders the ball) and the camera rig (which
 * mutates that same ball's transform every scroll update, alongside the
 * camera's own), so "camera stays centered on the ball" is guaranteed by
 * both reading/writing the literal same object, not two independently
 * computed positions that happen to agree.
 *
 * SceneLighting (HDRI + fill rig, shared with every other 3D scene) is
 * still needed even though this scene has no textures — the football and
 * goalposts both use lit `meshStandardMaterial`, not emissive/unlit
 * materials, so they need real light to read as anything but flat black
 * silhouettes. */
export function JourneyCanvas({
  trackId,
  matchupCount,
  onMatchupChange,
  onFinale,
}: {
  trackId: string
  matchupCount: number
  /** Passed straight through to JourneyCameraRig -- see its own prop
   * comment for why the camera rig, not this canvas, owns firing it. */
  onMatchupChange?: (index: number, velocity: number) => void
  onFinale?: () => void
}) {
  const ballRef = useRef<Group>(null)

  return (
    <Canvas
      dpr={[1, 1.5]}
      gl={{ antialias: true, powerPreference: 'high-performance' }}
      camera={{ position: [3.4, 1.1, 7.5], fov: 32, near: 0.1, far: 120 }}
    >
      <color attach="background" args={[SKY_COLOR]} />
      <fog attach="fog" args={[SKY_COLOR, 14, 42]} />
      <Suspense fallback={null}>
        <SceneLighting />
        <JourneyScene ballRef={ballRef} />
        <JourneyCameraRig
          trackId={trackId}
          matchupCount={matchupCount}
          ballRef={ballRef}
          onMatchupChange={onMatchupChange}
          onFinale={onFinale}
        />
      </Suspense>
    </Canvas>
  )
}
