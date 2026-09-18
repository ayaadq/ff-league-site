import { Canvas } from '@react-three/fiber'
import { Suspense } from 'react'
import { SceneLighting } from './SceneLighting'
import { TrophyLineCameraRig } from './TrophyLineCameraRig'
import { TrophyLineScene, type TrophyLineEntry } from './TrophyLineScene'
import { EYE_HEIGHT, SIDE_OFFSET, slotZ } from './trophyLineLayout'

const INK = '#0b0b0e'

/** The trophy line's own canvas (PLAN.md Phase H.5) — replaces
 * TrophyRoomCanvas.tsx entirely on the League History page. Ink
 * background rather than TrophyRoomCanvas's flat paper-white
 * (`#f5f3ee`), matching the "no white background, dark/immersive" brief
 * directly rather than relying on canvas transparency + whatever the
 * surrounding page happens to be (History's own page background is the
 * light paper canvas everywhere else, so a transparent 3D layer here
 * would just show that through instead of reading as dark/immersive).
 *
 * Own `<Canvas>` instance, same reasoning TrophyRoomCanvas itself
 * documented: unrelated content from anything else on this route, so
 * there's nothing to gain from sharing a GL context.
 *
 * Mobile performance (SPEC.md §7.2): capped devicePixelRatio, no
 * post-processing, minimal light count, no shadow maps. */
export function TrophyLineCanvas({
  trackId,
  entries,
  onActiveChange,
}: {
  trackId: string
  entries: TrophyLineEntry[]
  onActiveChange?: (index: number) => void
}) {
  return (
    <Canvas
      dpr={[1, 1.5]}
      gl={{ antialias: true, powerPreference: 'high-performance' }}
      camera={{
        position: [SIDE_OFFSET, EYE_HEIGHT, slotZ(0) + 2],
        fov: 42,
        near: 0.1,
        far: 60,
      }}
    >
      <color attach="background" args={[INK]} />
      <fog attach="fog" args={[INK, 9, 28]} />
      <Suspense fallback={null}>
        <SceneLighting />
        <TrophyLineScene entries={entries} />
        <TrophyLineCameraRig
          trackId={trackId}
          count={entries.length}
          onActiveChange={onActiveChange}
        />
      </Suspense>
    </Canvas>
  )
}
