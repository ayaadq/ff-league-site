import { avatarThumbUrl } from '../api/cdn'

const SIZE_CLASSES = {
  sm: 'h-8 w-8 text-sm',
  md: 'h-12 w-12 text-lg',
  lg: 'h-20 w-20 text-3xl',
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

  if (avatarId) {
    return (
      <img
        src={avatarThumbUrl(avatarId)}
        alt=""
        className={`${dimensions} border-charcoal/15 shrink-0 border object-cover`}
      />
    )
  }

  return (
    <div
      className={`${dimensions} border-charcoal/15 bg-ivory font-display text-charcoal-soft flex shrink-0 items-center justify-center border`}
      aria-hidden="true"
    >
      {name.charAt(0).toUpperCase()}
    </div>
  )
}
