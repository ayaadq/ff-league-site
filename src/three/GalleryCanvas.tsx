import { Environment } from '@react-three/drei'
import { Canvas } from '@react-three/fiber'
import { Suspense } from 'react'
import { GalleryScene } from './GalleryScene'

/** The persistent gallery canvas — SPEC.md §5.4/PLAN.md Phase 5. Mounted
 * once at the Layout level (see components/Layout.tsx) and reused across
 * routes rather than remounted per page, per CLAUDE.md's "reuse the
 * shared r3f canvas" convention.
 *
 * Phase 5 scope: scene lit, materialed, and performant with placeholder
 * (static) camera framing. No scroll-driven camera yet — that's
 * PLAN.md Phase 6.
 *
 * Mobile performance (SPEC.md §7.2, a hard requirement from this phase
 * on): capped devicePixelRatio, no post-processing, minimal light count
 * (one HDRI environment + one directional fill), no shadow maps.
 */
export function GalleryCanvas() {
  return (
    <Canvas
      dpr={[1, 1.5]}
      gl={{ antialias: true, powerPreference: 'high-performance' }}
      camera={{ position: [0, 1.85, 9.4], fov: 45, near: 0.1, far: 40 }}
    >
      <color attach="background" args={['#f7f5f2']} />
      <fog attach="fog" args={['#f7f5f2', 11, 24]} />
      <Suspense fallback={null}>
        <Environment preset="studio" />
        <ambientLight intensity={0.35} />
        <directionalLight position={[4, 6, 5]} intensity={0.55} />
        <GalleryScene />
      </Suspense>
    </Canvas>
  )
}
