import { MARBLE_MATERIAL_PROPS } from './materials'

/** The shared marble floor underfoot for both gallery-style 3D scenes
 * (TrophyRoomScene, WeeklySummaryScene) — a simple large slab, extracted
 * once a second scene needed the exact same treatment rather than
 * duplicating it. */
export function SceneFloor() {
  return (
    <mesh position={[0, -0.001, -1]} rotation={[-Math.PI / 2, 0, 0]}>
      <planeGeometry args={[26, 26]} />
      <meshPhysicalMaterial {...MARBLE_MATERIAL_PROPS} roughness={0.55} />
    </mesh>
  )
}
