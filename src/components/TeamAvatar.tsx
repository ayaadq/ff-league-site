import { avatarThumbUrl } from '../api/cdn'

const SIZE_CLASSES = {
  sm: 'h-8 w-8 text-sm',
  md: 'h-12 w-12 text-lg',
  lg: 'h-20 w-20 text-3xl',
} as const

/** Only the larger, sparingly-used showcase sizes (Team page header,
 * Home's high-score callout) get the gold frame — the "trophy portrait"
 * treatment matters most where it's rare. Small list-row avatars (used
 * a dozen times per page) keep the neutral charcoal border so gold
 * doesn't get diluted into background noise. */
const FRAME_CLASSES = {
  sm: 'border-charcoal/15 border',
  md: 'gold-frame border-2',
  lg: 'gold-frame border-2',
} as const

/** Square, framed — the "portraits on a gallery wall" motif from
 * SPEC.md §5.4, not a rounded social-avatar treatment. Alt is empty
 * because callers always render this beside the team name as text. */
export function TeamAvatar({
  avatarId,
  name,
  size = 'sm',
}: {
  avatarId: string | null
  name: string
  size?: keyof typeof SIZE_CLASSES
}) {
  const dimensions = SIZE_CLASSES[size]
  const frame = FRAME_CLASSES[size]

  if (avatarId) {
    return (
      <img
        src={avatarThumbUrl(avatarId)}
        alt=""
        className={`${dimensions} ${frame} shrink-0 object-cover`}
      />
    )
  }

  return (
    <div
      className={`${dimensions} ${frame} bg-ivory font-display text-charcoal-soft flex shrink-0 items-center justify-center`}
      aria-hidden="true"
    >
      {name.charAt(0).toUpperCase()}
    </div>
  )
}
