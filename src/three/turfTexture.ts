import { CanvasTexture, SRGBColorSpace } from 'three'

/** A tight aerial crop of turf -- a yard line, a pair of hash marks, and
 * a yard number -- generated on a 2D canvas rather than a sourced image
 * asset. Same reasoning as the crowd-texture call from the stadium
 * plan: zero network dependency, nothing to license or maintain, and a
 * yard line is easier to draw procedurally (a few fillRect/fillText
 * calls) than the crowd texture would have been.
 *
 * 640x440 matches JourneyScene.tsx's FLOOR_TINT_WIDTH:FLOOR_TINT_DEPTH
 * (16:11) aspect exactly, so the line and numbers don't stretch when
 * mapped onto that plane -- not imported from there directly, since a
 * canvas-drawing module has no real reason to depend on scene layout
 * constants; the relationship is documented here instead. */
const CANVAS_WIDTH = 640
const CANVAS_HEIGHT = 440

const TURF_BASE = '#2d5a34'
/** Mowing stripes: real turf is cut in alternating lengthwise bands,
 * not a flat green -- a few percent darker is enough to read as mowed
 * grass without competing with the yard markings for attention. */
const TURF_STRIPE = '#28502c'
const LINE_WHITE = '#f2f2ec'

/** One patch per station, one call per unique team color -- see the
 * useMemo at the call site (JourneyScene.tsx's Station) for why this
 * isn't invoked per frame or per render. `accentColor` is used at full
 * strength, deliberately: this is a small marking on a large green
 * field, not a large surface that needs to survive scene fog the way
 * the tiered stands (SEAT_ACCENT_MIX) do, but full strength is what a
 * real end zone's team-color numbers look like anyway -- the one
 * departure from turf-green/line-white on an otherwise neutral field,
 * same as a real end zone carries team color while the rest of the
 * field stays grass. */
export function createTurfTexture(accentColor: string): CanvasTexture {
  const canvas = document.createElement('canvas')
  canvas.width = CANVAS_WIDTH
  canvas.height = CANVAS_HEIGHT
  const ctx = canvas.getContext('2d')

  if (ctx) {
    ctx.fillStyle = TURF_BASE
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT)

    const stripeCount = 6
    const stripeWidth = CANVAS_WIDTH / stripeCount
    ctx.fillStyle = TURF_STRIPE
    for (let i = 0; i < stripeCount; i += 2) {
      ctx.fillRect(i * stripeWidth, 0, stripeWidth, CANVAS_HEIGHT)
    }

    // The yard line runs across the field's width (world X, canvas
    // width) at one downfield position (world Z, canvas Y) -- a
    // horizontal stroke, not vertical, since Z is the direction the
    // camera actually travels through the journey.
    const lineY = CANVAS_HEIGHT * 0.42
    ctx.fillStyle = LINE_WHITE
    ctx.fillRect(0, lineY - 3, CANVAS_WIDTH, 6)

    // Hash marks -- short ticks crossing the line at two field
    // positions, not the full NFL array; a tight aerial crop only ever
    // shows a couple of these at once.
    for (const hx of [CANVAS_WIDTH * 0.3, CANVAS_WIDTH * 0.62]) {
      ctx.fillRect(hx - 2, lineY - 22, 4, 16)
      ctx.fillRect(hx - 2, lineY + 6, 4, 16)
    }

    // The primary yard number, in the team's own color.
    ctx.fillStyle = accentColor
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.font = 'bold 150px sans-serif'
    ctx.fillText('20', CANVAS_WIDTH * 0.28, lineY - 75)

    // A second, smaller number bleeding off the right edge -- the
    // "tight crop, continues beyond the frame" read the reference photo
    // called for, not a second complete number (canvas drawing clips
    // at its own boundary for free, no extra work needed to crop it).
    ctx.font = 'bold 110px sans-serif'
    ctx.fillText('30', CANVAS_WIDTH * 0.94, lineY + 85)
  }

  const texture = new CanvasTexture(canvas)
  // Same reasoning as Portrait.tsx's own texture setup: canvas 2D
  // colors need sRGB decoding to render at the intended brightness,
  // not the washed-out default a texture's colorSpace otherwise falls
  // back to.
  texture.colorSpace = SRGBColorSpace
  return texture
}
