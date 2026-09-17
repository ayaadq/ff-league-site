import { RepeatWrapping, Texture } from 'three'

/** Small on purpose (PLAN.md Phase G/H.1's own WebGL-memory lesson) — a
 * mottled blade pattern tiled via `RepeatWrapping` reads as grass at any
 * repeat count, unlike a texture with sharp repeating features (yard
 * numbers, logos) where low resolution would show visible seams. */
const CANVAS_SIZE = 128
const BASE_TONES = ['#173a1e', '#1d4526', '#153018', '#204d2a']
const FLECK_COUNT = 900

let cached: Texture | null = null

/** Procedural tileable turf texture (PLAN.md Phase H.3) — replaces
 * Phase H.1's flat `FIELD_COLOR` fill, which under this scene's HDRI
 * lighting read as smooth CGI plastic rather than grass. Cached at
 * module scope since the journey canvas mounts this once per page
 * lifetime; guards against a future second caller re-generating it. */
export function grassTexture(): Texture {
  if (cached) return cached

  const canvas = document.createElement('canvas')
  canvas.width = CANVAS_SIZE
  canvas.height = CANVAS_SIZE
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('2D canvas context unavailable for grass texture')

  ctx.fillStyle = BASE_TONES[1]
  ctx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE)

  for (let i = 0; i < FLECK_COUNT; i++) {
    ctx.fillStyle = BASE_TONES[i % BASE_TONES.length]
    const x = Math.random() * CANVAS_SIZE
    const y = Math.random() * CANVAS_SIZE
    const w = 1 + Math.random() * 2.5
    const h = 3 + Math.random() * 6
    ctx.save()
    ctx.translate(x, y)
    ctx.rotate((Math.random() - 0.5) * 0.6)
    ctx.fillRect(-w / 2, -h / 2, w, h)
    ctx.restore()
  }

  const texture = new Texture(canvas)
  texture.wrapS = RepeatWrapping
  texture.wrapT = RepeatWrapping
  texture.needsUpdate = true
  cached = texture
  return texture
}
