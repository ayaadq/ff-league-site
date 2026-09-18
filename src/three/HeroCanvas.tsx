import { Canvas } from '@react-three/fiber'
import { Suspense } from 'react'
import { HeroScene } from './HeroScene'
import { SceneLighting } from './SceneLighting'
import { ScrollCameraRig } from './ScrollCameraRig'

const TRACK_ID = 'hero-scroll-track'
const REST_POSITION = { x: 0, y: 0.4, z: 5.5 }
const SCROLLED_POSITION = { x: -0.6, y: 0.05, z: 8.6 }
const LOOK_TARGET: [number, number, number] = [0, 0.1, -2]

/** Home's hero backdrop (PLAN.md Phase H) — one centered, rotating
 * football behind the hero copy that drops away as the hero scroll track
 * releases, handing off to the journey below (HeroScene.tsx). Same
 * self-contained-canvas shape as this project's other scroll-driven
 * canvases (JourneyCanvas, TrophyLineCanvas): owns its own scroll-track
 * id and camera framing, mounted inside HeroSection.tsx's sticky track.
 *
 * Mobile performance (SPEC.md §7.2): capped devicePixelRatio, no
 * post-processing, the shared three-light SceneLighting rig rather than
 * per-scene lights. The fog range (9-18) happens to also fade the ball
 * out as it nears the bottom of its drop, once the camera's own scroll
 * dolly (ScrollCameraRig below) has pulled back far enough to push it
 * past the near fog boundary — a happy consequence of the two already
 * sharing one scroll track, not something separately tuned. */
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
      <fog attach="fog" args={['#0b0b0e', 9, 18]} />
      <Suspense fallback={null}>
        <SceneLighting />
        <HeroScene trackId={TRACK_ID} />
        <ScrollCameraRig
          trackId={TRACK_ID}
          restPosition={REST_POSITION}
          scrolledPosition={SCROLLED_POSITION}
          lookTarget={LOOK_TARGET}
        />
      </Suspense>
    </Canvas>
  )
}
