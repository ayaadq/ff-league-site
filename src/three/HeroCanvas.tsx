import { Canvas } from '@react-three/fiber'
import { Suspense } from 'react'
import { HeroScene } from './HeroScene'
import { SceneLighting } from './SceneLighting'
import { ScrollCameraRig } from './ScrollCameraRig'

const REST_POSITION = { x: 0, y: 0.4, z: 5.5 }
const SCROLLED_POSITION = { x: -0.6, y: 0.05, z: 8.6 }
const LOOK_TARGET: [number, number, number] = [0, 0.1, -2]

/** Home's hero backdrop (PLAN.md Phase 13B) — three liquid blobs
 * (HeroScene.tsx) behind the hero copy, replacing the old plain-text
 * header. Same self-contained-canvas shape as the other two scenes
 * (WeeklySummaryCanvas, TrophyRoomCanvas): owns its own scroll-track id
 * and camera framing, mounted inside HeroSection.tsx's sticky track.
 *
 * Mobile performance (SPEC.md §7.2): capped devicePixelRatio, no
 * post-processing, the shared three-light SceneLighting rig rather than
 * per-scene lights, and HeroScene itself drops from three blobs to one
 * under the reduced effects tier. */
export function HeroCanvas() {
  return (
    <Canvas
      dpr={[1, 1.5]}
      gl={{ antialias: true, powerPreference: 'high-performance' }}
      camera={{
        position: [REST_POSITION.x, REST_POSITION.y, REST_POSITION.z],
        fov: 45,
        near: 0.1,
        far: 40,
      }}
    >
      <color attach="background" args={['#0b0b0e']} />
      <fog attach="fog" args={['#0b0b0e', 6, 16]} />
      <Suspense fallback={null}>
        <SceneLighting />
        <HeroScene />
        <ScrollCameraRig
          trackId="hero-scroll-track"
          restPosition={REST_POSITION}
          scrolledPosition={SCROLLED_POSITION}
          lookTarget={LOOK_TARGET}
        />
      </Suspense>
    </Canvas>
  )
}
