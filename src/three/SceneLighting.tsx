import { Environment } from '@react-three/drei'
import { Component, type ReactNode } from 'react'

/** drei's <Environment preset> fetches its HDRI at runtime from a
 * third-party CDN (raw.githack.com). That fetch failing throws inside
 * the r3f tree, and with nothing catching it the error propagates out of
 * the <Canvas> and unmounts the *entire* scene — not a degraded scene, a
 * blank one, on both Home and League History.
 *
 * This isn't theoretical: it happened in this project's own cloud dev
 * environment, where that host isn't reachable — "Could not load
 * studio_small_03_1k.hdr: Failed to fetch" took the whole canvas down,
 * root element empty, no geometry rendered at all. A user on a flaky
 * connection, or a raw.githack outage, gets the same result in
 * production.
 *
 * The fill lights below are enough to read either scene on their own
 * (flatter, less specular bounce on the gold/marble, but intact), so
 * catching here is a real degrade path rather than a silent failure —
 * SPEC.md §5.4's "always provide a static-fallback/degrade path". Same
 * boundary pattern as WeeklySummaryScene's PanelErrorBoundary, which
 * does this per-portrait for avatar textures. */
class EnvironmentBoundary extends Component<{ children: ReactNode }, { hasError: boolean }> {
  state = { hasError: false }
  static getDerivedStateFromError() {
    return { hasError: true }
  }
  render() {
    return this.state.hasError ? null : this.props.children
  }
}

/** Shared lighting rig for both gallery-style scenes (TrophyRoomScene,
 * WeeklySummaryScene) — SPEC.md §5.4 (HDRI environment + a couple of
 * fill lights, not many discrete lights) and §7.2's mobile budget (keep
 * light count low). Extracted once both scenes needed the same "studio
 * HDRI + three-point fill" setup rather than duplicating it — see
 * materials.ts on why a single key light alone leaves metal instances
 * facing away from it reading as black. */
export function SceneLighting() {
  return (
    <>
      <EnvironmentBoundary>
        <Environment preset="studio" />
      </EnvironmentBoundary>
      <ambientLight intensity={0.45} />
      <directionalLight position={[4, 6, 5]} intensity={0.5} />
      <directionalLight position={[-6, 5, 3]} intensity={0.4} />
      <directionalLight position={[0, 5, -6]} intensity={0.35} />
    </>
  )
}
