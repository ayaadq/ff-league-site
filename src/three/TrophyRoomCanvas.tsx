import { Canvas } from '@react-three/fiber'
import { Suspense } from 'react'
import { SceneLighting } from './SceneLighting'
import { ScrollCameraRig } from './ScrollCameraRig'
import { TrophyRoomScene } from './TrophyRoomScene'

const REST_POSITION = { x: 0, y: 1.85, z: 9.4 }
const SCROLLED_POSITION = { x: 1.4, y: 2.6, z: 6.2 }
const LOOK_TARGET: [number, number, number] = [0, 1.4, -1]

/** The League History page's 3D backdrop — originally Home's hero
 * (PLAN.md Phase 5/6), moved here once Home became a live weekly
 * scoreboard instead (see WeeklySummaryCanvas.tsx). Own <Canvas>
 * instance rather than a single canvas shared across routes: the two
 * scenes have unrelated content (this one is a static, generic
 * marble/trophy set; Home's is data-driven per week), so there's
 * nothing to gain from keeping one GL context alive across both and
 * conditionally swapping scene graphs — see pages/HistoryPage.tsx for
 * how this mounts/unmounts with the route like any other page content.
 *
 * Mobile performance (SPEC.md §7.2): capped devicePixelRatio, no
 * post-processing, minimal light count, no shadow maps.
 */
export function TrophyRoomCanvas() {
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
      <color attach="background" args={['#f7f5f2']} />
      <fog attach="fog" args={['#f7f5f2', 11, 24]} />
      <Suspense fallback={null}>
        <SceneLighting />
        <TrophyRoomScene />
        <ScrollCameraRig
          trackId="trophy-room-scroll-track"
          restPosition={REST_POSITION}
          scrolledPosition={SCROLLED_POSITION}
          lookTarget={LOOK_TARGET}
        />
      </Suspense>
    </Canvas>
  )
}
