import { CanvasTexture, RepeatWrapping, SRGBColorSpace } from 'three'

const CANVAS_SIZE = 128
const BASE = '#c9c9c4'
const HIGHLIGHT = '#f2f2ec'
const SHADOW = '#767068'
/** Fewer, much bigger blobs than an original 90-count/2-4px pass --
 * that version was confirmed live to look fine under a macro diagnostic
 * camera but read as flat solid color at the distance a station is
 * actually viewed from (15-30+ world units away). At that range, a
 * 2-4px dot on a 128px tile spanning a ~2-unit seat-block face works
 * out to roughly 0.02-0.03 world units per dot -- far below what
 * resolves at that distance, so texture filtering just averages the
 * whole pattern down to its own mean color, same as a fine-print
 * fabric reading as a flat tone from across a room. 10-20px dots on the
 * same tile are roughly 0.15-0.3 world units instead, large enough to
 * actually survive the distance. */
const DOT_COUNT = 26
const DOT_RADIUS_MIN = 10
const DOT_RADIUS_MAX = 20

/** Deterministic, not Math.random() -- reproducible across reloads
 * rather than a new pattern flickering in on every mount. Since this is
 * generated once and memoized (see the useMemo at the call site,
 * JourneyScene.tsx's FullStands), the practical difference is small,
 * but a fixed seed is simply the more correct choice for a texture
 * that's supposed to look the same every time you look at it. */
function seededRandom(seed: number): () => number {
  let state = seed
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0
    return state / 4294967296
  }
}

/** A tileable "crowd" pattern -- small light/dark dot clusters implying
 * heads in a packed stand, not individually modeled fans. Generated
 * once, shared across every seat-block instance regardless of team or
 * station (unlike turfTexture.ts's per-station, per-team texture) --
 * team-vs-neutral coloring still comes from the existing per-instance
 * <Instance color> mechanism (JourneyScene.tsx's FullStands), which
 * multiplies against whatever this texture draws.
 *
 * Kept in a light-gray range rather than mid-gray on purpose:
 * multiplying a mid-gray texture against a bright accent color would
 * undo half of the saturation SEAT_ACCENT_MIX=1 already fixed -- this
 * is meant to add a flecked, textured read, not darken the block
 * underneath it.
 *
 * Applied to the whole seat-block, not just its inner (field-facing)
 * face -- boxGeometry UV-maps every face to the same range, and
 * <Instances> shares one material across every instance in a group;
 * texturing only the inner face would need either custom per-face UVs
 * (a geometry change) or splitting each block into a separate
 * front-face plane (doubling the instance count for a detail barely
 * visible from the other faces given the camera's own established
 * angles). Not worth either cost for what's mostly unseen anyway.
 *
 * Dots near an edge are drawn again, offset by a full canvas width/
 * height -- the standard trick for a seamless RepeatWrapping tile
 * without solving the tiling math exactly; any dot straddling an edge
 * just gets its other half drawn on the opposite side. */
export function createCrowdTexture(): CanvasTexture {
  const canvas = document.createElement('canvas')
  canvas.width = CANVAS_SIZE
  canvas.height = CANVAS_SIZE
  const ctx = canvas.getContext('2d')

  if (ctx) {
    ctx.fillStyle = BASE
    ctx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE)

    const random = seededRandom(20260916)
    for (let i = 0; i < DOT_COUNT; i++) {
      const x = random() * CANVAS_SIZE
      const y = random() * CANVAS_SIZE
      const r = DOT_RADIUS_MIN + random() * (DOT_RADIUS_MAX - DOT_RADIUS_MIN)
      ctx.fillStyle = random() > 0.5 ? HIGHLIGHT : SHADOW
      for (const dx of [0, -CANVAS_SIZE, CANVAS_SIZE]) {
        for (const dy of [0, -CANVAS_SIZE, CANVAS_SIZE]) {
          const cx = x + dx
          const cy = y + dy
          if (cx + r > 0 && cx - r < CANVAS_SIZE && cy + r > 0 && cy - r < CANVAS_SIZE) {
            ctx.beginPath()
            ctx.arc(cx, cy, r, 0, Math.PI * 2)
            ctx.fill()
          }
        }
      }
    }
  }

  const texture = new CanvasTexture(canvas)
  texture.wrapS = RepeatWrapping
  texture.wrapT = RepeatWrapping
  texture.colorSpace = SRGBColorSpace
  return texture
}
