import { BRASS_MATERIAL_PROPS, GOLD_MATERIAL_PROPS, MARBLE_MATERIAL_PROPS } from './materials'

const PEDESTAL_HEIGHT = 0.5
const GLOW_RADIUS = 0.24

/** Shared trophy geometry (PLAN.md Phase H.5) — a small marble pedestal
 * plus the same gold-cup/brass-base silhouette TrophyRoomScene's
 * TrophyToppers already established (`GOLD_MATERIAL_PROPS`/
 * `BRASS_MATERIAL_PROPS` are literally ignite/current under the hood —
 * see materials.ts's own comment — so this already carries the
 * ignite/current accent the brief asks for without a separate color
 * definition).
 *
 * The glow ring at the base (PLAN.md Phase H.5 hotfix) is a flat,
 * unlit `meshBasicMaterial` disc, `toneMapped={false}` — the same
 * "guaranteed visible regardless of scene lighting" idiom this project's
 * other small accent details already use (Football.tsx's laces,
 * JourneyScene.tsx's yard lines). The lit cup/base above still depend on
 * `SceneLighting`/the per-slot point light actually reaching them; this
 * ring is what keeps every trophy reading as clearly present against the
 * ink background even where that lighting is weak, rather than relying
 * on light placement alone.
 *
 * Deliberately "dumb" beyond that one color prop: no position of its
 * own, same convention as Football.tsx — a caller wanting a bigger
 * trophy wraps this in its own scaled `<group>`, and a slot with more
 * than one title stacks multiple `<Trophy>`s by wrapping each in its own
 * offset `<group>`, rather than this component knowing about sizing or
 * stacking itself. */
export function Trophy({ accentColor }: { accentColor: string }) {
  return (
    <group>
      <mesh position={[0, 0.01, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[GLOW_RADIUS, 24]} />
        <meshBasicMaterial color={accentColor} transparent opacity={0.55} toneMapped={false} />
      </mesh>
      <mesh position={[0, PEDESTAL_HEIGHT / 2, 0]}>
        <cylinderGeometry args={[0.16, 0.19, PEDESTAL_HEIGHT, 20]} />
        <meshPhysicalMaterial {...MARBLE_MATERIAL_PROPS} />
      </mesh>
      <mesh position={[0, PEDESTAL_HEIGHT + 0.14, 0]} rotation={[Math.PI, 0, 0]}>
        <sphereGeometry args={[0.14, 20, 16, 0, Math.PI * 2, 0, Math.PI * 0.65]} />
        <meshStandardMaterial {...GOLD_MATERIAL_PROPS} />
      </mesh>
      <mesh position={[0, PEDESTAL_HEIGHT + 0.045, 0]}>
        <cylinderGeometry args={[0.09, 0.12, 0.09, 16]} />
        <meshStandardMaterial {...BRASS_MATERIAL_PROPS} />
      </mesh>
    </group>
  )
}
