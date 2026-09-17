import { useTexture } from '@react-three/drei'
import { useThree } from '@react-three/fiber'
import { Component, Suspense, useEffect, type ReactNode } from 'react'
import { SRGBColorSpace } from 'three'
import { playerHeadshotUrl } from '../api/cdn'
import type { SeasonLeader } from '../api/seasonLeaders'
import type { Slot } from './arcLayout'

const CARD_WIDTH = 1.1
const CARD_HEIGHT = 1.42
const CARD_DEPTH = 0.05
const PHOTO_WIDTH = 0.92
const PHOTO_HEIGHT = 1.06

/** Alternating ignite/current per rank, same "two-accent" language as
 * GameOfTheWeekHero and the fallback team-color palette -- no per-player
 * color data exists, so this is purely a rhythm device across the arc. */
const ACCENT_COLORS = ['#ff5a36', '#2ee6d6'] as const

/** Same texture-handling concerns as three/Portrait.tsx's AvatarPanel
 * (color space, anisotropy) -- extracted there rather than duplicated in
 * comments here, see that file for the full rationale. Sleeper serves
 * player headshots from the same CDN already verified CORS-safe for
 * avatars, and 2D <img> tags already load this exact URL pattern
 * elsewhere (components/PlayerHeadshot.tsx) without issue. */
function HeadshotPhoto({ playerId }: { playerId: string }) {
  const texture = useTexture(playerHeadshotUrl(playerId))
  const { gl } = useThree()

  useEffect(() => {
    texture.colorSpace = SRGBColorSpace
    texture.anisotropy = gl.capabilities.getMaxAnisotropy()
    texture.needsUpdate = true
  }, [texture, gl])

  return (
    <mesh position={[0, 0.08, CARD_DEPTH / 2 + 0.001]}>
      <planeGeometry args={[PHOTO_WIDTH, PHOTO_HEIGHT]} />
      <meshBasicMaterial map={texture} toneMapped={false} />
    </mesh>
  )
}

/** Fallback for a loading or missing/broken headshot (defenses have none,
 * and third-party photo URLs can fail independently of anything this app
 * controls) -- a flat paper-toned panel rather than a blank hole. */
function BlankPhoto() {
  return (
    <mesh position={[0, 0.08, CARD_DEPTH / 2 + 0.001]}>
      <planeGeometry args={[PHOTO_WIDTH, PHOTO_HEIGHT]} />
      <meshStandardMaterial color="#eae7df" roughness={0.6} metalness={0} />
    </mesh>
  )
}

class PhotoErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean }> {
  state = { hasError: false }
  static getDerivedStateFromError() {
    return { hasError: true }
  }
  render() {
    return this.state.hasError ? <BlankPhoto /> : this.props.children
  }
}

/** One card in the season-leaders arc (three/PlayerCardArc.tsx) --
 * an ignite/current-tinted backing with the player's real Sleeper
 * headshot in front, positioned/rotated by the shared arc-layout math
 * (three/arcLayout.ts) also used by the trophy wall and standings wall. */
export function PlayerCard({
  leader,
  slot,
  rank,
}: {
  leader: SeasonLeader
  slot: Slot
  rank: number
}) {
  const accent = ACCENT_COLORS[rank % ACCENT_COLORS.length]

  return (
    <group position={slot.position} rotation={[0, slot.rotationY, 0]}>
      <mesh>
        <boxGeometry args={[CARD_WIDTH, CARD_HEIGHT, CARD_DEPTH]} />
        <meshStandardMaterial color={accent} roughness={0.4} metalness={0.1} />
      </mesh>
      <PhotoErrorBoundary>
        <Suspense fallback={<BlankPhoto />}>
          <HeadshotPhoto playerId={leader.playerId} />
        </Suspense>
      </PhotoErrorBoundary>
    </group>
  )
}
