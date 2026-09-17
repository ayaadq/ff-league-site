import { CanvasTexture, SRGBColorSpace } from 'three'

/** Procedural, transparent-background canvas textures of abstract play
 * diagrams (PLAN.md Phase G) — offense marked with O, defense with X,
 * routes as arrowed lines, the same "draw it on a canvas, no network
 * asset" approach turfTexture.ts/crowdTexture.ts already use. Kept
 * deliberately schematic (a whiteboard sketch, not a broadcast graphic)
 * so it reads as ambient texture behind the matchup scorecards rather
 * than competing content — the brief's "ultra-minimal, doesn't steal
 * focus." Transparent background (the canvas 2D context starts fully
 * transparent, so nothing here fills one) — the consuming material must
 * set `transparent: true` or the alpha channel is wasted. */

const CANVAS_SIZE = 512

interface Point {
  x: number
  y: number
}

interface Route {
  from: Point
  to: Point
  /** Quadratic bezier control point — omit for a straight line. */
  curve?: Point
}

interface Variant {
  offense: Point[]
  defense: Point[]
  routes: Route[]
}

/** Three schematic formations, coordinates normalized to [0, 1]. Not
 * real playbook diagrams — legible shapes at a glance from a distance,
 * which is all this ever needs to be. */
const VARIANTS: Variant[] = [
  {
    offense: [
      { x: 0.5, y: 0.82 },
      { x: 0.5, y: 0.64 },
      { x: 0.16, y: 0.5 },
      { x: 0.84, y: 0.5 },
      { x: 0.32, y: 0.5 },
      { x: 0.68, y: 0.5 },
    ],
    defense: [
      { x: 0.3, y: 0.22 },
      { x: 0.5, y: 0.14 },
      { x: 0.7, y: 0.22 },
      { x: 0.18, y: 0.16 },
      { x: 0.82, y: 0.16 },
    ],
    routes: [
      { from: { x: 0.16, y: 0.5 }, to: { x: 0.34, y: 0.1 }, curve: { x: 0.1, y: 0.28 } },
      { from: { x: 0.84, y: 0.5 }, to: { x: 0.66, y: 0.1 }, curve: { x: 0.9, y: 0.28 } },
      { from: { x: 0.5, y: 0.64 }, to: { x: 0.5, y: 0.3 } },
    ],
  },
  {
    offense: [
      { x: 0.5, y: 0.85 },
      { x: 0.22, y: 0.68 },
      { x: 0.78, y: 0.68 },
      { x: 0.5, y: 0.6 },
      { x: 0.12, y: 0.5 },
      { x: 0.88, y: 0.5 },
    ],
    defense: [
      { x: 0.5, y: 0.2 },
      { x: 0.28, y: 0.3 },
      { x: 0.72, y: 0.3 },
      { x: 0.5, y: 0.36 },
    ],
    routes: [
      { from: { x: 0.12, y: 0.5 }, to: { x: 0.85, y: 0.22 }, curve: { x: 0.55, y: 0.14 } },
      { from: { x: 0.22, y: 0.68 }, to: { x: 0.22, y: 0.15 } },
      { from: { x: 0.78, y: 0.68 }, to: { x: 0.78, y: 0.15 } },
    ],
  },
  {
    offense: [
      { x: 0.5, y: 0.8 },
      { x: 0.35, y: 0.6 },
      { x: 0.65, y: 0.6 },
      { x: 0.5, y: 0.6 },
      { x: 0.2, y: 0.55 },
      { x: 0.8, y: 0.55 },
    ],
    defense: [
      { x: 0.4, y: 0.28 },
      { x: 0.6, y: 0.28 },
      { x: 0.5, y: 0.18 },
      { x: 0.25, y: 0.2 },
      { x: 0.75, y: 0.2 },
    ],
    routes: [
      { from: { x: 0.35, y: 0.6 }, to: { x: 0.15, y: 0.35 }, curve: { x: 0.15, y: 0.55 } },
      { from: { x: 0.65, y: 0.6 }, to: { x: 0.85, y: 0.35 }, curve: { x: 0.85, y: 0.55 } },
      { from: { x: 0.5, y: 0.6 }, to: { x: 0.5, y: 0.22 } },
    ],
  },
]

export const PLAY_DIAGRAM_VARIANT_COUNT = VARIANTS.length

function drawArrowhead(ctx: CanvasRenderingContext2D, x: number, y: number, angle: number): void {
  const size = 14
  ctx.beginPath()
  ctx.moveTo(x, y)
  ctx.lineTo(x - size * Math.cos(angle - 0.4), y - size * Math.sin(angle - 0.4))
  ctx.lineTo(x - size * Math.cos(angle + 0.4), y - size * Math.sin(angle + 0.4))
  ctx.closePath()
  ctx.fill()
}

export function createPlayDiagramTexture(color: string, variant: number): CanvasTexture {
  const canvas = document.createElement('canvas')
  canvas.width = CANVAS_SIZE
  canvas.height = CANVAS_SIZE
  const ctx = canvas.getContext('2d')
  const v = VARIANTS[variant % VARIANTS.length]

  if (ctx) {
    ctx.strokeStyle = color
    ctx.fillStyle = color
    ctx.lineWidth = 4

    for (const route of v.routes) {
      const fx = route.from.x * CANVAS_SIZE
      const fy = route.from.y * CANVAS_SIZE
      const tx = route.to.x * CANVAS_SIZE
      const ty = route.to.y * CANVAS_SIZE
      const cx = route.curve ? route.curve.x * CANVAS_SIZE : fx
      const cy = route.curve ? route.curve.y * CANVAS_SIZE : fy

      ctx.beginPath()
      ctx.moveTo(fx, fy)
      if (route.curve) ctx.quadraticCurveTo(cx, cy, tx, ty)
      else ctx.lineTo(tx, ty)
      ctx.stroke()

      drawArrowhead(ctx, tx, ty, Math.atan2(ty - cy, tx - cx))
    }

    ctx.lineWidth = 5
    for (const p of v.offense) {
      ctx.beginPath()
      ctx.arc(p.x * CANVAS_SIZE, p.y * CANVAS_SIZE, 16, 0, Math.PI * 2)
      ctx.stroke()
    }

    for (const p of v.defense) {
      const cx = p.x * CANVAS_SIZE
      const cy = p.y * CANVAS_SIZE
      const r = 14
      ctx.beginPath()
      ctx.moveTo(cx - r, cy - r)
      ctx.lineTo(cx + r, cy + r)
      ctx.moveTo(cx + r, cy - r)
      ctx.lineTo(cx - r, cy + r)
      ctx.stroke()
    }
  }

  const texture = new CanvasTexture(canvas)
  texture.colorSpace = SRGBColorSpace
  return texture
}
