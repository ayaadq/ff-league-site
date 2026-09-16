import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { useEffect, useState } from 'react'
import { useReducedMotion } from '../motion/reducedMotionContext'

/** TEMPORARY. Diagnoses the "3D cameras frozen, zero console errors, DOM
 * motion fine" bug reported live but not reproducible in any sandboxed
 * environment (dev server, local `vite preview`) -- see the chat history
 * around this commit.
 *
 * Not gated by device capability or GPU tier: grepping the codebase for
 * that turned up nothing (no hardwareConcurrency/deviceMemory/quality-tier
 * logic anywhere), and neither <Canvas> sets `frameloop`, so both scenes
 * use r3f's default "always" -- continuous rendering, no invalidate()
 * gate to silently miss. What both JourneyCameraRig.tsx and
 * ScrollCameraRig.tsx *do* have is one shared early-return: if
 * `document.getElementById(trackId)` doesn't find the scroll-track
 * element at the moment the rig's effect runs, the camera is positioned
 * once at its rest pose and the function returns *before* creating the
 * GSAP scrub tween -- silently, by design, no error, because it's the
 * same branch that handles prefers-reduced-motion. From the outside,
 * "reduced motion is on" and "the track element wasn't found" are
 * indistinguishable. This overlay exists to tell them apart on a real
 * device.
 *
 * To remove: delete this file and the one <MotionDiagnostics /> line
 * (plus its import) in Layout.tsx. Nothing else references it. */

const JOURNEY_TRACK_ID = 'weekly-journey-track'
const SUMMARY_TRACK_ID = 'weekly-summary-scroll-track'

function getGpuInfo(): string {
  try {
    const canvas = document.createElement('canvas')
    const gl = (canvas.getContext('webgl') ??
      canvas.getContext('experimental-webgl')) as WebGLRenderingContext | null
    if (!gl) return 'no WebGL context'
    const ext = gl.getExtension('WEBGL_debug_renderer_info')
    if (!ext) return 'WEBGL_debug_renderer_info unavailable'
    const vendor = gl.getParameter(ext.UNMASKED_VENDOR_WEBGL) as string
    const renderer = gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) as string
    return `${vendor} / ${renderer}`
  } catch {
    return 'error reading GPU info'
  }
}

interface Snapshot {
  matchMediaReduced: boolean
  journeyTrackFound: boolean
  summaryTrackFound: boolean
  scrollTriggerCount: number
  cameraRigTriggers: Array<{ id: string; start: number; end: number }>
  scrollY: number
  scrollHeight: number
  innerHeight: number
}

function takeSnapshot(): Snapshot {
  const all = ScrollTrigger.getAll()
  const cameraRigTriggers = [JOURNEY_TRACK_ID, SUMMARY_TRACK_ID].flatMap((id) => {
    const st = all.find((t) => (t.trigger as HTMLElement | null)?.id === id)
    return st ? [{ id, start: Math.round(st.start), end: Math.round(st.end) }] : []
  })
  return {
    matchMediaReduced: window.matchMedia('(prefers-reduced-motion: reduce)').matches,
    journeyTrackFound: !!document.getElementById(JOURNEY_TRACK_ID),
    summaryTrackFound: !!document.getElementById(SUMMARY_TRACK_ID),
    scrollTriggerCount: all.length,
    cameraRigTriggers,
    scrollY: Math.round(window.scrollY),
    scrollHeight: document.documentElement.scrollHeight,
    innerHeight: window.innerHeight,
  }
}

export function MotionDiagnostics() {
  const prefersReducedMotion = useReducedMotion()
  const [snap, setSnap] = useState<Snapshot>(takeSnapshot)
  const [gpu] = useState(getGpuInfo)

  useEffect(() => {
    const id = window.setInterval(() => setSnap(takeSnapshot()), 500)
    return () => window.clearInterval(id)
  }, [])

  const nav = navigator as Navigator & { deviceMemory?: number }

  return (
    <div
      style={{
        position: 'fixed',
        bottom: 8,
        left: 8,
        zIndex: 99999,
        maxWidth: '92vw',
        background: 'rgba(10, 10, 12, 0.88)',
        color: '#d9c7a8',
        font: '11px/1.5 ui-monospace, monospace',
        padding: '10px 12px',
        borderRadius: 6,
        whiteSpace: 'pre-wrap',
        pointerEvents: 'none',
      }}
    >
      {`MOTION DIAGNOSTICS (temporary)
context prefersReducedMotion: ${prefersReducedMotion}
matchMedia(reduce).matches:   ${snap.matchMediaReduced}
frameloop (both canvases):    always (no frameloop prop set, r3f default)
journey track (#${JOURNEY_TRACK_ID}) found: ${snap.journeyTrackFound}
summary track (#${SUMMARY_TRACK_ID}) found: ${snap.summaryTrackFound}
ScrollTrigger instances total: ${snap.scrollTriggerCount}
camera-rig triggers found: ${snap.cameraRigTriggers.length ? '' : 'NONE'}${snap.cameraRigTriggers
        .map((t) => `\n  ${t.id}: start=${t.start} end=${t.end}`)
        .join('')}
scrollY: ${snap.scrollY} / scrollHeight: ${snap.scrollHeight} / innerHeight: ${snap.innerHeight}
devicePixelRatio: ${window.devicePixelRatio}
hardwareConcurrency: ${navigator.hardwareConcurrency ?? 'n/a'}
deviceMemory: ${nav.deviceMemory ?? 'n/a'}
GPU: ${gpu}`}
    </div>
  )
}
