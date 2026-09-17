import { Canvas } from '@react-three/fiber'
import { Suspense } from 'react'
import type { SeasonLeader } from '../api/seasonLeaders'
import { PlayerCardArc } from './PlayerCardArc'
import { SceneLighting } from './SceneLighting'

/** Season leaders (PLAN.md Phase 13C) -- a rotating arc of real player
 * headshots on a paper canvas, sitting between the dark matchup journey
 * and the paper Awards section (a deliberate paper section rather than a
 * second ink "moment" back to back with the journey, keeping the
 * redesign's ink/paper alternation a real rhythm rather than two dark
 * sections in a row).
 *
 * Mobile performance (SPEC.md §7.2): capped devicePixelRatio, no
 * post-processing, the shared SceneLighting rig. The reduced effects tier
 * skips this canvas entirely (see components/SeasonLeadersSection.tsx) --
 * a genuinely simpler 2D strip, not this same scene rendered slower. */
export function PlayerCardCanvas({ leaders }: { leaders: SeasonLeader[] }) {
  return (
    <Canvas
      dpr={[1, 1.5]}
      gl={{ antialias: true, powerPreference: 'high-performance' }}
      camera={{ position: [0, 0.4, 6.4], fov: 42, near: 0.1, far: 30 }}
    >
      <color attach="background" args={['#f5f3ee']} />
      <fog attach="fog" args={['#f5f3ee', 7, 16]} />
      <Suspense fallback={null}>
        <SceneLighting />
        <PlayerCardArc leaders={leaders} />
      </Suspense>
    </Canvas>
  )
}
