import { Environment } from '@react-three/drei'

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
      <Environment preset="studio" />
      <ambientLight intensity={0.45} />
      <directionalLight position={[4, 6, 5]} intensity={0.5} />
      <directionalLight position={[-6, 5, 3]} intensity={0.4} />
      <directionalLight position={[0, 5, -6]} intensity={0.35} />
    </>
  )
}
