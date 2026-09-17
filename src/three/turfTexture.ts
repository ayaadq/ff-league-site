import { CanvasTexture, RepeatWrapping, SRGBColorSpace } from 'three'

/** Generated on a 2D canvas rather than a sourced image asset, same
 * reasoning as the crowd-texture call from the stadium plan: zero
 * network dependency, nothing to license or maintain, and turf is
 * easier to draw procedurally (fillRect/fillText calls) than the crowd
 * texture would have been. */

/** 640x440 matches JourneyScene.tsx's FLOOR_TINT_WIDTH:FLOOR_TINT_DEPTH
 * (16:11) aspect exactly, so a station's own patch's line and numbers
 * don't stretch when mapped onto that plane -- not imported from there
 * directly, since a canvas-drawing module has no real reason to depend
 * on scene layout constants; the relationship is documented here
 * instead. */
const CANVAS_WIDTH = 640
const CANVAS_HEIGHT = 440

/** The connecting floor's tile -- square, not 16:11, since it has no
 * yard-line content that needs a specific aspect to avoid stretching;
 * it only ever needs to tile cleanly, which paintTurfBase's own
 * stripe-only pattern does at any aspect. */
const FIELD_CANVAS_SIZE = 256

const TURF_BASE = '#2d5a34'
/** Mowing stripes: real turf is cut in alternating lengthwise bands,
 * not a flat green -- a few percent darker is enough to read as mowed
 * grass without competing with the yard markings for attention. */
const TURF_STRIPE = '#28502c'
const LINE_WHITE = '#f2f2ec'

/** Fills the base green and mowing stripes -- shared by createTurfTexture
 * (a station's own featured patch, with yard-line detail on top) and
 * createFieldTurfTexture (the connecting floor between stations, stripes
 * only) so both draw from the same turf language rather than two
 * independently-tuned green fills that could drift apart. */
function paintTurfBase(ctx: CanvasRenderingContext2D, width: number, height: number): void {
  ctx.fillStyle = TURF_BASE
  ctx.fillRect(0, 0, width, height)

  const stripeCount = 6
  const stripeWidth = width / stripeCount
  ctx.fillStyle = TURF_STRIPE
  for (let i = 0; i < stripeCount; i += 2) {
    ctx.fillRect(i * stripeWidth, 0, stripeWidth, height)
  }
}

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
    paintTurfBase(ctx, CANVAS_WIDTH, CANVAS_HEIGHT)

    // The yard line runs across the field's width (world X, canvas
    // width) at one downfield position (world Z, canvas Y) -- a
    // horizontal stroke, not vertical, since Z is the direction the
    // camera actually travels through the journey.
    //
    // 0.87, not the original 0.42 -- a live side-by-side screenshot
    // comparison (real dwell camera, DOM panel included, not the
    // panel-hidden diagnostic angle used to first build this) caught
    // the whole marking cluster landing almost exactly where the panel
    // sits, at the original position: visible during travel, invisible
    // for the entire time actually spent reading a station's own panel,
    // which is most of the time spent per station. 0.87 was reached by
    // testing actual candidate values against the real camera (0.85 too
    // high -- the line itself still clipped the panel's bottom edge;
    // 0.9 too low -- the "20" 's own top clipped it instead), not
    // derived from the plane's UV/rotation math up front, which was a
    // real option but a much easier place to get the flip direction
    // wrong than just looking at the actual screenshots.
    const lineY = CANVAS_HEIGHT * 0.87
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
    // +45, not the original +85 -- at lineY's new 0.87, +85 pushed this
    // past CANVAS_HEIGHT entirely (0.87*440 + 85 > 440), off the canvas
    // and simply never drawn at all rather than bleeding at the edge as
    // intended.
    ctx.font = 'bold 110px sans-serif'
    ctx.fillText('30', CANVAS_WIDTH * 0.94, lineY + 45)
  }

  const texture = new CanvasTexture(canvas)
  // Same reasoning as Portrait.tsx's own texture setup: canvas 2D
  // colors need sRGB decoding to render at the intended brightness,
  // not the washed-out default a texture's colorSpace otherwise falls
  // back to.
  texture.colorSpace = SRGBColorSpace
  return texture
}

/** The connecting floor between stations -- same turf base/stripe
 * language as each station's own featured patch (paintTurfBase),
 * without the yard-line/number detail, which belongs to a station's
 * own patch, not the open run between them. "Reads as running through
 * stadium turf, not a marble hallway" was the actual design ask this
 * replaced a plain marble floor for -- the previous connecting floor
 * used the site's marble material (materials.ts), which read as an
 * open corridor with football pockets at each station rather than
 * turf end to end.
 *
 * A single small tileable square, not a texture sized to the whole
 * floor plane -- same reasoning as the crowd texture: a texture that
 * repeats doesn't need to be sized to what it's covering. The caller
 * (JourneyScene's own floor mesh) sets `.repeat` based on the floor's
 * actual world dimensions, which this module has no reason to know. */
export function createFieldTurfTexture(): CanvasTexture {
  const canvas = document.createElement('canvas')
  canvas.width = FIELD_CANVAS_SIZE
  canvas.height = FIELD_CANVAS_SIZE
  const ctx = canvas.getContext('2d')

  if (ctx) paintTurfBase(ctx, FIELD_CANVAS_SIZE, FIELD_CANVAS_SIZE)

  const texture = new CanvasTexture(canvas)
  texture.wrapS = RepeatWrapping
  texture.wrapT = RepeatWrapping
  texture.colorSpace = SRGBColorSpace
  return texture
}
