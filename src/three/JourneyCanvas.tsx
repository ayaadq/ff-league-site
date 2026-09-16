import { Canvas } from '@react-three/fiber'
import { Suspense } from 'react'
import { JourneyCameraRig } from './JourneyCameraRig'
import { JourneyScene } from './JourneyScene'
import type { JourneyStation, StationTiming } from './journeyLayout'

/** Night. The weekly journey's world is the one dark place on an
 * otherwise marble site, which is the point: you leave the gallery, go
 * out under the lights for the week's six games, and come back in for
 * the standings.
 *
 * Fog rather than a far plane ends the world, so the next station
 * surfaces out of the dark as the camera approaches instead of popping
 * in at a boundary.
 *
 * Same mobile budget as the other canvases (SPEC 7.2): capped
 * devicePixelRatio, no post-processing, and two lights total for the
 * whole scene -- the winner's glow is an emissive material, not a
 * per-station light. */
export function JourneyCanvas({
  stations,
  trackId,
  timings,
}: {
  stations: JourneyStation[]
  trackId: string
  /** Per-station dwell/travel shares (journeyLayout.ts). Optional --
   * JourneyCameraRig falls back to uniformTiming when omitted. */
  timings?: StationTiming[]
}) {
  return (
    <Canvas
      dpr={[1, 1.5]}
      gl={{ antialias: true, powerPreference: 'high-performance' }}
      camera={{ position: [0, 5.4, 9], fov: 45, near: 0.1, far: 120 }}
    >
      <color attach="background" args={['#0b0b0c']} />
      <fog attach="fog" args={['#0b0b0c', 14, 58]} />
      <Suspense fallback={null}>
        <ambientLight intensity={0.22} />
        <directionalLight position={[3, 12, 6]} intensity={0.55} />
        <JourneyScene stations={stations} />
        <JourneyCameraRig trackId={trackId} stationCount={stations.length} timings={timings} />
      </Suspense>
    </Canvas>
  )
}
