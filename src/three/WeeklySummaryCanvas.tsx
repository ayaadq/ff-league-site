import { Canvas } from '@react-three/fiber'
import { Suspense } from 'react'
import { SceneLighting } from './SceneLighting'
import { ScrollCameraRig } from './ScrollCameraRig'
import { WeeklySummaryScene, type StandingEntry } from './WeeklySummaryScene'

const REST_POSITION = { x: 0, y: 1.85, z: 9.4 }
const SCROLLED_POSITION = { x: 1.4, y: 2.6, z: 6.2 }
const LOOK_TARGET: [number, number, number] = [0, 1.4, -1]

/** Home's 3D backdrop (PLAN.md pivot) — a live standings wall built
 * from real Sleeper avatar photos (WeeklySummaryScene.tsx), replacing
 * the static trophy gallery that used to live here (now on League
 * History, see TrophyRoomCanvas.tsx). Same self-contained-canvas shape
 * as TrophyRoomCanvas: owns its own scroll-track id and camera framing
 * so HomePage.tsx just wraps it in a matching scroll-track div, same
 * pattern as History does for TrophyRoomCanvas.
 *
 * Mobile performance (SPEC.md §7.2): capped devicePixelRatio, no
 * post-processing, minimal light count, no shadow maps. Textures add
 * some load-time/memory cost over TrophyRoomScene's untextured panels,
 * but it's twelve small (400x400, per Sleeper's CDN) images, not a
 * heavy asset -- worth re-checking on an actual mid-range phone per the
 * project's real-device-check convention, same as every 3D phase.
 */
export function WeeklySummaryCanvas({ standings }: { standings: StandingEntry[] }) {
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
      <color attach="background" args={['#f5f3ee']} />
      <fog attach="fog" args={['#f5f3ee', 11, 24]} />
      <Suspense fallback={null}>
        <SceneLighting />
        <WeeklySummaryScene standings={standings} />
        <ScrollCameraRig
          trackId="weekly-summary-scroll-track"
          restPosition={REST_POSITION}
          scrolledPosition={SCROLLED_POSITION}
          lookTarget={LOOK_TARGET}
        />
      </Suspense>
    </Canvas>
  )
}
