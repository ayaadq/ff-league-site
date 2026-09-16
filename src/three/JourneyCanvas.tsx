import { Canvas } from '@react-three/fiber'
import { Suspense } from 'react'
import { JourneyCameraRig } from './JourneyCameraRig'
import { JourneyScene } from './JourneyScene'
import type { JourneyStation, StationTiming } from './journeyLayout'
import { SceneLighting } from './SceneLighting'

/** Night, reskinned toward the site's marble/gold family rather than an
 * unrelated near-black -- the journey is still the one atmospheric,
 * darker place on the site (moving all the way to the other scenes'
 * bright `#f7f5f2` would make WeeklyJourney's hardcoded light-on-dark
 * DOM text illegible, since those panels have no background of their
 * own and rely entirely on this canvas showing through behind them).
 * `#2B2926` is SPEC.md's own `--color-charcoal` token -- the darkest,
 * warmest neutral already in the palette, used here as a background
 * instead of text for the first time, rather than an ad hoc hex with no
 * relationship to the rest of the site.
 *
 * Fog rather than a far plane ends the world, so the next station
 * surfaces out of the dark as the camera approaches instead of popping
 * in at a boundary.
 *
 * SceneLighting (materials.ts's HDRI + fill-light rig, shared with
 * TrophyRoomScene and the standings wall) replaces the two bespoke
 * lights this canvas used to define on its own -- MARBLE_MATERIAL_PROPS/
 * GOLD_MATERIAL_PROPS were tuned assuming that environment map, per
 * materials.ts's own comments. Still SPEC 7.2's mobile budget: capped
 * devicePixelRatio, no post-processing, and SceneLighting's own light
 * count is the same "one HDRI plus a couple of fills" shape the other
 * two scenes already use -- the winner's glow stays an emissive
 * material, not a per-station light. */
export function JourneyCanvas({
  stations,
  trackId,
  timings,
  onStationDwellStart,
}: {
  stations: JourneyStation[]
  trackId: string
  /** Per-station dwell/travel shares (journeyLayout.ts). Optional --
   * JourneyCameraRig falls back to uniformTiming when omitted. */
  timings?: StationTiming[]
  /** Passed straight through to JourneyCameraRig -- see its own prop
   * comment for why the camera rig, not this canvas, owns firing it. */
  onStationDwellStart?: (index: number) => void
}) {
  return (
    <Canvas
      dpr={[1, 1.5]}
      gl={{ antialias: true, powerPreference: 'high-performance' }}
      camera={{ position: [0, 5.4, 9], fov: 45, near: 0.1, far: 120 }}
    >
      <color attach="background" args={['#2B2926']} />
      <fog attach="fog" args={['#2B2926', 14, 58]} />
      <Suspense fallback={null}>
        <SceneLighting />
        <JourneyScene stations={stations} />
        <JourneyCameraRig
          trackId={trackId}
          stationCount={stations.length}
          timings={timings}
          onStationDwellStart={onStationDwellStart}
        />
      </Suspense>
    </Canvas>
  )
}
