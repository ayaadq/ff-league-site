/** Material presets for the redesign's "liquid" 3D motifs (PLAN.md Phase
 * 13B) — drei's `MeshDistortMaterial` gives a continuous organic-surface
 * distortion for free (a noise-based vertex displacement in its own
 * shader), which is the concrete, no-extra-dependency answer to "liquid
 * motion graphics" for a 3D mesh, the same way the redesign's CSS blob
 * keyframe (`--animate-blob` in index.css) answers it for a 2D div.
 *
 * Colors match the shipped 2D tokens (src/index.css `--color-gold-bright`
 * "ignite" / `--color-brass` "current") — kept in sync by hand, same
 * convention the old marble/gold materials.ts used.
 *
 * `speed` here is the material's own internal distortion animation speed,
 * not a mesh rotation speed — callers pass their own idle rotation
 * separately (see HeroScene.tsx) and override `speed` per instance when
 * respecting `prefers-reduced-motion`/`effectsTier`. */

export const IGNITE_LIQUID_PROPS = {
  color: '#ff5a36',
  distort: 0.4,
  speed: 1.2,
  roughness: 0.25,
  metalness: 0.1,
  envMapIntensity: 0.8,
} as const

export const CURRENT_LIQUID_PROPS = {
  color: '#2ee6d6',
  distort: 0.35,
  speed: 1.0,
  roughness: 0.3,
  metalness: 0.1,
  envMapIntensity: 0.8,
} as const
