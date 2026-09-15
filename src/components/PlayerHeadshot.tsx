import { useState } from 'react'
import { playerHeadshotThumbUrl } from '../api/cdn'

/** Falls back to initials on load error rather than up front — unlike
 * `TeamAvatar`, we don't know ahead of time whether Sleeper has a
 * headshot for a given player_id (defenses and many bench/practice-squad
 * players don't). */
export function PlayerHeadshot({ playerId, name }: { playerId: string; name: string }) {
  const [errored, setErrored] = useState(false)

  if (errored) {
    return (
      <div
        className="border-charcoal/15 bg-ivory font-display text-charcoal-soft flex h-10 w-10 shrink-0 items-center justify-center rounded-full border text-xs"
        aria-hidden="true"
      >
        {name.slice(0, 2).toUpperCase()}
      </div>
    )
  }

  return (
    <img
      src={playerHeadshotThumbUrl(playerId)}
      alt={name}
      loading="lazy"
      onError={() => setErrored(true)}
      className="border-charcoal/15 bg-ivory h-10 w-10 shrink-0 rounded-full border object-cover"
    />
  )
}
