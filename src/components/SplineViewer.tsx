import Spline from '@splinetool/react-spline'

/** Thin wrapper for embedding a scene exported from Spline
 * (https://spline.design) -- not used anywhere in this project yet. This
 * exists as prep, per PLAN.md's Lenis/Zustand/Spline phase note, not a
 * shipped feature: pass the `.splinecode` URL a Spline scene exports;
 * nothing currently produces one.
 *
 * This is not a replacement for the site's own r3f pipeline
 * (HeroScene/JourneyScene/TrophyLineScene/PlayerCardArc, all under
 * src/three/) -- those already share this project's own materials,
 * design tokens, and camera-rig/scroll conventions. A Spline scene is
 * opaque and self-contained by comparison, authored outside this repo, so
 * it can't participate in any of that. Reach for this only for a
 * genuinely separate no-code-authored 3D asset, not as a general-purpose
 * 3D component. */
export function SplineViewer({ sceneUrl, className }: { sceneUrl: string; className?: string }) {
  return <Spline scene={sceneUrl} className={className} />
}
