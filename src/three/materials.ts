/** PBR material presets for the 3D scenes — SPEC.md §5.4.
 *
 * Values are tuned to read as real materials under an HDRI environment
 * map (drei's <Environment>), not flat colored plastic:
 * - Marble/ivory: zero metalness, moderate roughness, a faint clearcoat
 *   for the soft sheen real polished stone catches under studio light.
 * - Gold/brass (redesign pass, PLAN.md Phase 13D — colors only, the
 *   metalness/roughness tuning below is unchanged and still applies):
 *   moderate metalness (see the comment below on why it's not higher),
 *   low-to-moderate roughness.
 *
 * Colors match the shipped 2D palette tokens (src/index.css) — kept in
 * sync by hand, so an accent in a 3D scene and the same accent in page
 * chrome read as the same material. `GOLD_MATERIAL_PROPS` now carries
 * the redesign's "ignite" accent (`--color-gold-bright`) rather than the
 * old champagne/antique-brass gold, and `BRASS_MATERIAL_PROPS` carries
 * "current" (`--color-brass`) — the token *names* stayed put (see
 * index.css's own remap comment), so `Trophy.tsx` (PLAN.md Phase H.5,
 * the trophy line that replaced the old marble/gold TrophyRoomScene)
 * picks up the same ignite/current colors without needing its own
 * definitions. `TURF_MATERIAL_PROPS`/`STAND_MATERIAL_PROPS` were removed
 * in PLAN.md Phase G along with the stadium geometry they were
 * exclusively for (JourneyScene.tsx's turf floor and tiered stands) —
 * see that file's own doc comment for the replacement (play-diagram
 * planes, since replaced again by the grass texture, PLAN.md Phase H.3).
 * `IVORY_MATERIAL_PROPS` was removed in Phase H.5 along with
 * `Portrait.tsx`/`SceneFloor.tsx`/`TrophyRoomScene.tsx`, its only
 * consumers — `Portrait.tsx` had already gone unused since the standings
 * wall it was built for was deleted, a gap this cleanup also closes.
 */

export const MARBLE_MATERIAL_PROPS = {
  color: '#f5f3ee',
  roughness: 0.42,
  metalness: 0,
  clearcoat: 0.12,
  clearcoatRoughness: 0.3,
} as const

// Extra directional lights and a boosted envMapIntensity (a prior pass)
// didn't fix it: at metalness ~0.9, a material's visible color comes
// almost entirely from the *reflected environment map*, not scene
// lights — a directional light mostly adds a tiny specular highlight,
// not fill light, on a near-mirror surface. With one studio HDRI, that
// means instances facing away from its bright softbox reflect its dark
// surround and read as black, no matter how many lights are added.
//
// Fix: pull metalness down enough that the diffuse term (which *is*
// lit evenly by the scene's lights, unlike a mirror reflection) carries
// real weight. This trades some "physically exact gold" for "reads as
// gold from every angle in a single-HDRI scene" — the right tradeoff
// for a wall of 12 identically-colored instances facing different
// directions, not a single hero object.
export const GOLD_MATERIAL_PROPS = {
  color: '#ff5a36',
  roughness: 0.35,
  metalness: 0.45,
  envMapIntensity: 1.1,
} as const

export const BRASS_MATERIAL_PROPS = {
  color: '#2ee6d6',
  roughness: 0.4,
  metalness: 0.4,
  envMapIntensity: 1,
} as const
