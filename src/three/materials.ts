/** PBR material presets for the gallery scene — SPEC.md §5.4.
 *
 * Values are tuned to read as real materials under an HDRI environment
 * map (drei's <Environment>), not flat colored plastic:
 * - Marble/ivory: zero metalness, moderate roughness, a faint clearcoat
 *   for the soft sheen real polished stone catches under studio light.
 * - Gold/brass: high metalness (0.85-0.95), low roughness (0.2-0.32) —
 *   the two knobs that actually sell "metal" under an env map.
 *
 * Colors match the shipped 2D palette tokens (src/index.css) rather than
 * the raw SPEC.md §5.1 swatch table, so gold in the 3D scene and gold in
 * the page chrome read as the same material.
 */

export const MARBLE_MATERIAL_PROPS = {
  color: '#f7f5f2',
  roughness: 0.42,
  metalness: 0,
  clearcoat: 0.12,
  clearcoatRoughness: 0.3,
} as const

export const IVORY_MATERIAL_PROPS = {
  color: '#efe8da',
  roughness: 0.48,
  metalness: 0,
  clearcoat: 0.08,
  clearcoatRoughness: 0.35,
} as const

// envMapIntensity is boosted well past 1 here: a single-HDRI studio
// environment reflects unevenly across instances facing different
// directions (some catch the bright softbox, some reflect a dark studio
// wall) — physically correct, but on a wall of 12 differently-angled
// gold frames it reads as "half the frames are black," not gold. Extra
// intensity plus the added gallery-track fill lights in GalleryCanvas
// keep every instance legible regardless of which way it faces.
export const GOLD_MATERIAL_PROPS = {
  color: '#d4af37',
  roughness: 0.22,
  metalness: 0.9,
  envMapIntensity: 1.8,
} as const

export const BRASS_MATERIAL_PROPS = {
  color: '#8c6d46',
  roughness: 0.34,
  metalness: 0.8,
  envMapIntensity: 1.5,
} as const
