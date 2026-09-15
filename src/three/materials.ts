/** PBR material presets for the gallery scene — SPEC.md §5.4.
 *
 * Values are tuned to read as real materials under an HDRI environment
 * map (drei's <Environment>), not flat colored plastic:
 * - Marble/ivory: zero metalness, moderate roughness, a faint clearcoat
 *   for the soft sheen real polished stone catches under studio light.
 * - Gold/brass: moderate metalness (see the comment below on why it's
 *   not higher), low-to-moderate roughness.
 *
 * Colors match the shipped 2D palette tokens (src/index.css) — kept in
 * sync by hand, so gold in the 3D scene and gold in the page chrome
 * read as the same material. Currently a muted champagne/antique-brass
 * (moved off a brighter yellow gold per user feedback wanting something
 * more modern/minimalist/luxurious).
 */

export const MARBLE_MATERIAL_PROPS = {
  color: '#e6e4e0',
  roughness: 0.42,
  metalness: 0,
  clearcoat: 0.12,
  clearcoatRoughness: 0.3,
} as const

export const IVORY_MATERIAL_PROPS = {
  color: '#efebe4',
  roughness: 0.48,
  metalness: 0,
  clearcoat: 0.08,
  clearcoatRoughness: 0.35,
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
  color: '#a6845c',
  roughness: 0.35,
  metalness: 0.45,
  envMapIntensity: 1.1,
} as const

export const BRASS_MATERIAL_PROPS = {
  color: '#6f5f49',
  roughness: 0.4,
  metalness: 0.4,
  envMapIntensity: 1,
} as const
