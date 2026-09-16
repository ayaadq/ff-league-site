import { useTexture } from '@react-three/drei'
import { useThree } from '@react-three/fiber'
import { Component, Suspense, useEffect, type ReactNode } from 'react'
import { SRGBColorSpace } from 'three'
import type { Group } from 'three'
import { avatarUrl } from '../api/cdn'
import { GOLD_MATERIAL_PROPS, IVORY_MATERIAL_PROPS } from './materials'

/** A gold-framed portrait showing a team's real Sleeper avatar, shared by
 * every scene that needs one.
 *
 * Extracted from WeeklySummaryScene once the weekly journey needed the
 * same thing. The texture handling here is not obvious -- colour space,
 * anisotropy, and a per-portrait error boundary so one bad avatar URL
 * cannot take a whole scene down with it -- and is exactly the kind of
 * code that rots when it exists in two places.
 */

export const FRAME_WIDTH = 0.92
export const FRAME_HEIGHT = 1.18
export const FRAME_DEPTH = 0.07
const CANVAS_WIDTH = 0.76
const CANVAS_HEIGHT = 1

/** A team's real Sleeper avatar, textured onto a portrait panel. Verified
 * against a live Sleeper avatar URL in a real browser before building
 * this (a canvas-taint check with crossOrigin: 'anonymous', the same
 * failure mode three.js's TextureLoader hits) — Sleeper's avatar CDN
 * sends proper CORS headers, so this is safe to load directly rather
 * than needing a proxy. */
function AvatarPanel({ avatarId }: { avatarId: string }) {
  const texture = useTexture(avatarUrl(avatarId))
  const { gl } = useThree()

  // useTexture/TextureLoader leaves color space and anisotropy at their
  // (wrong-for-photos) defaults. Without sRGB decoding the photo reads
  // washed out; without anisotropic filtering, every portrait *except*
  // ones facing the camera dead-on (i.e. most of them -- these sit on a
  // curved arc) blurs heavily, which is what "pixelated and blurry"
  // turned out to be. Sleeper's avatars are a fixed 400x400 regardless,
  // so this is a filtering fix, not a fix for the source image itself --
  // very close/large portraits (the journey's face-off pair, see
  // JourneyScene.tsx) will still look softer than a native-res photo
  // would, that's a real ceiling, not a bug.
  // Mutates the texture useTexture() returns rather than configuring it
  // at construction, since drei's useTexture doesn't expose a way to do
  // that -- safe here because useTexture caches one Texture instance per
  // URL and this always sets the same two values for that same instance,
  // so repeat runs (route changes, re-renders) are idempotent, not a
  // growing pile of side effects on a shared object.
  useEffect(() => {
    texture.colorSpace = SRGBColorSpace
    texture.anisotropy = gl.capabilities.getMaxAnisotropy()
    texture.needsUpdate = true
  }, [texture, gl])

  return (
    <mesh position={[0, 0, FRAME_DEPTH / 2 + 0.001]}>
      <planeGeometry args={[CANVAS_WIDTH, CANVAS_HEIGHT]} />
      <meshBasicMaterial map={texture} toneMapped={false} />
    </mesh>
  )
}

/** Untextured fallback — TrophyRoomScene's blank-ivory-canvas treatment —
 * shown while a photo is loading or if it fails to load, so one slow or
 * broken avatar URL never blanks out the rest of the scene. */
export function BlankCanvas() {
  return (
    <mesh position={[0, 0, FRAME_DEPTH / 2 + 0.001]}>
      <planeGeometry args={[CANVAS_WIDTH, CANVAS_HEIGHT]} />
      <meshPhysicalMaterial {...IVORY_MATERIAL_PROPS} />
    </mesh>
  )
}

/** Catches a failed avatar texture load (bad/missing avatar id, network
 * error, a future CORS regression on Sleeper's CDN) and falls back to
 * BlankCanvas instead of taking down the whole scene. Avatar URLs are
 * third-party and can fail independently of the CORS check above. */
class PanelErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean }> {
  state = { hasError: false }
  static getDerivedStateFromError() {
    return { hasError: true }
  }
  render() {
    return this.state.hasError ? <BlankCanvas /> : this.props.children
  }
}

/** A gold-framed portrait, sized/positioned/rotated like TrophyRoomScene's
 * portrait wall, but showing the team's real photo (or the blank-canvas
 * fallback) instead of an always-untextured panel. */
export function Portrait({
  avatarId,
  position,
  rotationY,
  groupRef,
}: {
  avatarId: string | null
  position: [number, number, number]
  rotationY: number
  /** Optional handle on the portrait's own <group>, so a parent can run
   * the entrance tween in usePortraitReveal against it. A callback ref
   * rather than forwardRef: each caller collects these into an indexed
   * array (matching TrophyToppers' `ref={(el) => { refs.current[i] = el }}`
   * pattern), which a forwarded ref object can't express as cleanly. */
  groupRef?: (el: Group | null) => void
}) {
  return (
    <group ref={groupRef} position={position} rotation={[0, rotationY, 0]}>
      <mesh>
        <boxGeometry args={[FRAME_WIDTH, FRAME_HEIGHT, FRAME_DEPTH]} />
        <meshStandardMaterial {...GOLD_MATERIAL_PROPS} />
      </mesh>
      {avatarId ? (
        <PanelErrorBoundary>
          <Suspense fallback={<BlankCanvas />}>
            <AvatarPanel avatarId={avatarId} />
          </Suspense>
        </PanelErrorBoundary>
      ) : (
        <BlankCanvas />
      )}
    </group>
  )
}
