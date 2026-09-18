/** Realistic metal presets for the trophy line (PLAN.md Phase H.5 hotfix
 * #5), replacing the previous hotfix's solid ignite/current colors —
 * those read as "neon glow-sticks" rather than championship trophies.
 *
 * Kept out of Trophy.tsx itself (which otherwise exports only components)
 * for the same Fast Refresh reason journeyLayout.ts/trophyLineLayout.ts
 * are their own files: a module mixing component and non-component
 * exports breaks it.
 *
 * Metalness kept moderate rather than pushed toward 0.9+ for the same
 * reason `materials.ts`'s own `GOLD_MATERIAL_PROPS` comment documents: at
 * very high metalness a material's visible color comes almost entirely
 * from the *reflected* environment map, and a single-HDRI scene can leave
 * instances facing away from its bright side reading as flat black.
 * `emissive` is what keeps "still glows" true despite switching off the
 * previous hotfix's fully unlit `meshBasicMaterial` — a lit
 * `meshStandardMaterial` needs *some* light reaching it to be visible at
 * all, so a nonzero emissive floor (plus each cup's own point light,
 * Trophy.tsx) guarantees these never go dark regardless of how the
 * scene's own lighting/HDRI happens to hit them from a given angle. */
export interface MedalMaterial {
  color: string
  emissive: string
  metalness: number
  roughness: number
}

const MEDAL_MATERIALS: readonly MedalMaterial[] = [
  { color: '#f0c454', emissive: '#5c4416', metalness: 0.55, roughness: 0.32 },
  { color: '#dfe3e8', emissive: '#42474d', metalness: 0.6, roughness: 0.28 },
  { color: '#c98a4b', emissive: '#4a2f14', metalness: 0.5, roughness: 0.4 },
]

/** Gold for the most championships, silver for the next, bronze after
 * that, cycling if there are more than three distinct cups in the whole
 * line (rather than throwing/crashing past index 2) — the brief's own
 * "first trophy gold, second silver, third bronze, etc." */
export function medalMaterialAt(globalCupIndex: number): MedalMaterial {
  return MEDAL_MATERIALS[globalCupIndex % MEDAL_MATERIALS.length]
}
