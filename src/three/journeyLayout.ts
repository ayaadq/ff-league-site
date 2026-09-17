/** Sky-cam football-kick journey layout math (PLAN.md Phase H) —
 * replaces the old multi-station glide-and-dwell system entirely (this
 * project's second full journey rewrite; the first, Phase G, replaced
 * the stadium with play diagrams but kept the per-station camera glide).
 * One continuous kick now: the first matchup's share of scroll is a
 * static pre-kick beat (the brief's "sky cam has NOT started rising
 * yet"), every matchup after it drives one continuous parabolic flight
 * toward the uprights, ending exactly at the last matchup's end.
 *
 * Separate from the scene/camera-rig components for the same reason the
 * old file was: pure layout math shared by both, and a file that exports
 * both components and constants breaks Fast Refresh. */

export interface Vec3 {
  x: number
  y: number
  z: number
}

/** Kick setup (ground, pre-launch) position — center-left of frame, on a
 * tee. Y is set for a ball standing on its tip (JourneyScene.tsx tilts the
 * ball's local rotation so its long axis points up) — the effective
 * standing half-height is 1.55 (Football.tsx's long semi-axis) * 0.35
 * (JourneyScene's scale wrapper) ≈ 0.54, so this is "one tip touching the
 * ground, the rest of the ball visible above it," not the short-axis
 * clearance a ball lying on its side would need. Phase H's original 0.18
 * was tuned for lying flat and read as buried once actually checked
 * against the ball's real scaled radius (PLAN.md Phase H.1). */
export const KICK_POSITION: Vec3 = { x: -1.6, y: 0.54, z: 5 }
/** Where the ball ends up: dead center between the uprights, above the
 * crossbar (see GoalPosts in JourneyScene.tsx — crossbar sits at y≈2.2,
 * uprights run to y≈5.2, so 3.1 is a real "through the gap" height, not
 * an arbitrary number). */
export const UPRIGHT_POSITION: Vec3 = { x: 0, y: 3.1, z: -15 }
/** The quadratic Bezier control point's height — not the arc's own peak
 * (a Bezier curve doesn't reach its control point when the two endpoints
 * differ), pulled well above both KICK_POSITION.y and UPRIGHT_POSITION.y
 * so the resulting arc actually reads as a kick's rise-and-carry, not a
 * straight ramp between the two. */
const ARC_CONTROL_HEIGHT = 8

/** The ball's position at a given point in its flight (0 = still on the
 * tee, 1 = at the uprights). X and Z are plain lerps (the kick travels
 * in a straight line downfield while centering under the posts); Y is a
 * quadratic Bezier through KICK_POSITION.y → ARC_CONTROL_HEIGHT →
 * UPRIGHT_POSITION.y, which is what actually reads as an arc rather than
 * a ramp. */
export function ballPositionAtFlightT(t: number): Vec3 {
  const clamped = Math.min(Math.max(t, 0), 1)
  const oneMinusT = 1 - clamped
  const quadBezier = (p0: number, p1: number, p2: number) =>
    oneMinusT * oneMinusT * p0 + 2 * oneMinusT * clamped * p1 + clamped * clamped * p2
  return {
    x: KICK_POSITION.x + (UPRIGHT_POSITION.x - KICK_POSITION.x) * clamped,
    y: quadBezier(KICK_POSITION.y, ARC_CONTROL_HEIGHT, UPRIGHT_POSITION.y),
    z: KICK_POSITION.z + (UPRIGHT_POSITION.z - KICK_POSITION.z) * clamped,
  }
}

/** Extra tumble (radians) the ball carries mid-flight, layered on top of
 * whatever base rotation it already had at kickoff — purely cosmetic, so
 * it visibly spins rather than gliding stiffly along the arc. */
export function ballSpinAtFlightT(t: number): number {
  return Math.min(Math.max(t, 0), 1) * Math.PI * 6
}

export interface CameraPose {
  position: Vec3
  fov: number
}

/** Sideline-low and tight at kickoff — watching from close to the field,
 * off to the side of the kicking tee. */
const START_CAM: CameraPose = { position: { x: 3.4, y: 1.1, z: 7.5 }, fov: 32 }
/** Elevated sky-cam and wide once the ball reaches the uprights.
 *
 * Positioned high *above* the uprights (roughly z=0, the field's own
 * midpoint between KICK_POSITION.z=5 and UPRIGHT_POSITION.z=-15) rather
 * than downfield past them — a real bug caught live, not assumed: an
 * earlier version placed this at z=-1, which is a point the *ball itself*
 * flies past en route to the uprights, so easing the camera toward it
 * moved the camera *toward* the ball's own flight path rather than
 * pulling back from the whole arc, and the ball swelled to fill most of
 * the frame partway through instead of shrinking into a wide establishing
 * shot. Sitting above the field's midpoint and looking down/across it
 * (via `camera.lookAt` tracking the ball, JourneyCameraRig.tsx) is what
 * actually reads as "pulled back," regardless of where along Z the ball
 * currently is. */
const END_CAM: CameraPose = { position: { x: 0, y: 12, z: 0 }, fov: 55 }

/** The camera's pose across the flight — a plain lerp between the two
 * poses above. The camera rig (JourneyCameraRig.tsx) is the one that
 * actually points this at the ball every frame (`camera.lookAt`); this
 * function only answers "where does the camera sit," not "what does it
 * look at." */
export function cameraPoseAtFlightT(t: number): CameraPose {
  const clamped = Math.min(Math.max(t, 0), 1)
  return {
    position: {
      x: START_CAM.position.x + (END_CAM.position.x - START_CAM.position.x) * clamped,
      y: START_CAM.position.y + (END_CAM.position.y - START_CAM.position.y) * clamped,
      z: START_CAM.position.z + (END_CAM.position.z - START_CAM.position.z) * clamped,
    },
    fov: START_CAM.fov + (END_CAM.fov - START_CAM.fov) * clamped,
  }
}

/** An extra, isolated push-in for the ball's actual pass through the
 * uprights (PLAN.md Phase H.3) — layered on top of the start->end camera
 * lerp above rather than folded into it, so it only affects the flight's
 * final stretch and leaves the mid-flight pacing already tuned in Phase H
 * (the sqrt easing on `cameraT`, JourneyCameraRig.tsx) untouched. Without
 * this isolation, simply moving `END_CAM` closer would also pull the
 * camera in during the middle of the flight (`cameraT` is already most of
 * the way to 1 by the flight's midpoint), re-introducing the "ball fills
 * the frame too early" bug Phase H fixed. */
const FINALE_ZOOM_START = 0.88
/** Camera-to-ball offset at flightT=1 is this fraction of what the normal
 * end-of-flight pose alone would put it at — 0.7 means ~30% closer, the
 * middle of the brief's own 25-35% figure. */
const FINALE_ZOOM_DISTANCE = 0.7
/** FOV at flightT=1 is this fraction of the normal end pose's FOV — a
 * narrower lens compounds the physical push-in above so the uprights
 * read as unmistakably larger, not just marginally closer. */
const FINALE_ZOOM_FOV = 0.88

/** 0 before the finale window starts, ramping linearly to 1 exactly as
 * the ball reaches the uprights. */
export function finaleZoomFactor(flightT: number): number {
  const clamped = Math.min(Math.max(flightT, 0), 1)
  if (clamped <= FINALE_ZOOM_START) return 0
  return (clamped - FINALE_ZOOM_START) / (1 - FINALE_ZOOM_START)
}

export function finaleZoomDistanceFactor(zoom: number): number {
  return 1 - zoom * (1 - FINALE_ZOOM_DISTANCE)
}

export function finaleZoomFovFactor(zoom: number): number {
  return 1 - zoom * (1 - FINALE_ZOOM_FOV)
}

/** The aspect the two poses above were framed at, and the pullback cap
 * for narrower canvases — same "fov is vertical, a portrait viewport
 * needs to dolly back or it crops" mechanism this journey has used since
 * Phase 9, applied to the new poses instead of the old per-station ones.
 * Pulls the camera back along its own look-direction-adjacent axis by
 * scaling its offset from the current look target, same as
 * ScrollCameraRig's own `fitToViewport`. */
const FRAMED_FOR_ASPECT = 1.5
const MAX_PULLBACK = 2.2

export function cameraPullback(aspect: number): number {
  return Math.min(Math.max(FRAMED_FOR_ASPECT / aspect, 1), MAX_PULLBACK)
}

/** Overall scroll progress (0..1 across the whole track) to flight
 * progress (0..1 across the kick+flight only) — the first matchup's
 * share is a static pre-kick beat, per the brief's "Matchup 1: sky cam
 * has NOT started rising yet." Every matchup after it shares the
 * remaining budget equally ("divide total scroll by matchup count"). */
export function flightProgress(rawProgress: number, matchupCount: number): number {
  if (matchupCount <= 1) return Math.min(Math.max(rawProgress, 0), 1)
  const kickStart = 1 / matchupCount
  if (rawProgress <= kickStart) return 0
  return Math.min(Math.max((rawProgress - kickStart) / (1 - kickStart), 0), 1)
}

/** Which matchup's equal-width segment a given overall progress falls
 * in. */
export function matchupIndexAtProgress(rawProgress: number, matchupCount: number): number {
  if (matchupCount <= 0) return 0
  const clamped = Math.min(Math.max(rawProgress, 0), 1 - 1e-6)
  return Math.min(matchupCount - 1, Math.floor(clamped * matchupCount))
}

/** How close each game was, relative to the *other* games this week —
 * not an absolute margin threshold, matching how weekAwards' own
 * "closest game"/"biggest margin" are already relative-to-the-week
 * stats, not fixed cutoffs. 0 is this week's biggest margin, 1 is its
 * closest game (a tie is the closest possible outcome regardless of its
 * own zero margin).
 *
 * Carried over from this journey's previous camera-dwell system (which
 * used it to weight how long the camera lingered per station) — that
 * consumer is gone (PLAN.md Phase H's equal-segment kick), but
 * WeeklyJourney.tsx's audio duck/roar shaping (bigger roar for a
 * blowout, hush-then-eruption for a close one) still reads this same
 * number, so it stays here rather than being deleted along with the
 * camera code that originally motivated it. */
export function closenessOf(games: Array<{ margin: number; tied: boolean }>): number[] {
  const values = games.map((g) => (g.tied ? 0 : g.margin))
  const minMargin = Math.min(...values)
  const maxMargin = Math.max(...values)
  const spread = maxMargin - minMargin

  return games.map((_, i) => {
    // spread === 0 means every game this week was equally close (or
    // there's only one game) -- nothing to weight against, so every
    // game gets the same middle-of-the-road closeness.
    const normalized = spread > 0 ? (values[i] - minMargin) / spread : 0.5
    return 1 - normalized
  })
}
