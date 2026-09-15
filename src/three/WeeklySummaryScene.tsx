import { useTexture } from '@react-three/drei'
import { Component, Suspense, useMemo, type ReactNode } from 'react'
import { avatarUrl } from '../api/cdn'
import { arcSlots } from './arcLayout'
import { SceneFloor } from './SceneFloor'
import { GOLD_MATERIAL_PROPS, IVORY_MATERIAL_PROPS, MARBLE_MATERIAL_PROPS } from './materials'

/** One team's rank going into the scene — deliberately minimal (just
 * enough to place and texture a portrait). Callers (HomePage.tsx) derive
 * this from live standings via api/standings.ts; this module has no
 * data-fetching of its own, matching TrophyRoomScene's presentational-
 * only pattern. Must be passed already sorted best (index 0) to worst. */
export interface StandingEntry {
  rosterId: number
  avatarId: string | null
}

const FRAME_WIDTH = 0.92
const FRAME_HEIGHT = 1.18
const FRAME_DEPTH = 0.07
const CANVAS_WIDTH = 0.76
const CANVAS_HEIGHT = 1

/** The top three ranks get their own literal podium blocks (1st tallest
 * and centered, 2nd/3rd flanking, shorter) — an actual medal-stand
 * layout rather than TrophyRoomScene's single stacked pedestal, since
 * this scene needs to show three specific teams, not just gesture at
 * "there is a podium." */
const PODIUM_LAYOUT: Array<{ x: number; height: number }> = [
  { x: 0, height: 0.85 }, // 1st
  { x: -1.55, height: 0.55 }, // 2nd
  { x: 1.55, height: 0.42 }, // 3rd
]

/** A team's real Sleeper avatar, textured onto a portrait panel. Verified
 * against a live Sleeper avatar URL in a real browser before building
 * this (a canvas-taint check with crossOrigin: 'anonymous', the same
 * failure mode three.js's TextureLoader hits) — Sleeper's avatar CDN
 * sends proper CORS headers, so this is safe to load directly rather
 * than needing a proxy. */
function AvatarPanel({ avatarId }: { avatarId: string }) {
  const texture = useTexture(avatarUrl(avatarId))
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
function BlankCanvas() {
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
function Portrait({
  avatarId,
  position,
  rotationY,
  scale = 1,
}: {
  avatarId: string | null
  position: [number, number, number]
  rotationY: number
  scale?: number
}) {
  return (
    <group position={position} rotation={[0, rotationY, 0]} scale={scale}>
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

/** The three podium blocks plus whichever of the top three standings
 * entries exist (defensive for a league with fewer than three rosters,
 * or before standings have loaded). */
function StandingsPodium({ top3 }: { top3: Array<StandingEntry | undefined> }) {
  return (
    <group position={[0, 0, 1.6]}>
      {PODIUM_LAYOUT.map((slot, i) => {
        const entry = top3[i]
        return (
          <group key={i}>
            <mesh position={[slot.x, slot.height / 2, 0]}>
              <boxGeometry args={[1.1, slot.height, 1.1]} />
              <meshPhysicalMaterial {...MARBLE_MATERIAL_PROPS} />
            </mesh>
            {entry && (
              <Portrait
                avatarId={entry.avatarId}
                position={[slot.x, slot.height + 0.62, 0.35]}
                rotationY={0}
                scale={1.15}
              />
            )}
          </group>
        )
      })}
    </group>
  )
}

/** Ranks 4+ on the same wide arc TrophyRoomScene's portrait wall used —
 * fewer items than that scene's fixed twelve, so arcSlots naturally
 * spaces them a little further apart across the same total spread
 * rather than needing a different layout. */
function RemainingWall({ rest }: { rest: StandingEntry[] }) {
  const slots = useMemo(() => arcSlots(rest.length, 7.6, 2.15, -3.2, Math.PI * 0.38), [rest.length])

  return (
    <>
      {rest.map((entry, i) => (
        <Portrait
          key={entry.rosterId}
          avatarId={entry.avatarId}
          position={slots[i].position}
          rotationY={slots[i].rotationY}
        />
      ))}
    </>
  )
}

/** Home's 3D scene (PLAN.md pivot, replacing the old static trophy
 * gallery — see TrophyRoomScene.tsx, now on League History) — a live
 * standings podium: top 3 on their own medal-stand blocks, the rest on
 * the same portrait-wall arc, everyone showing their actual team photo.
 * Re-renders whenever `standings` changes (new scores come in, ranks
 * shuffle) since it's plain props in, not internal data-fetching. */
export function WeeklySummaryScene({ standings }: { standings: StandingEntry[] }) {
  const top3 = [standings[0], standings[1], standings[2]]
  const rest = standings.slice(3)

  return (
    <group>
      <SceneFloor />
      <StandingsPodium top3={top3} />
      <RemainingWall rest={rest} />
    </group>
  )
}
