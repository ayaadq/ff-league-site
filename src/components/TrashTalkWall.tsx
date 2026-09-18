import { useState, type FormEvent } from 'react'
import { useLeagueStore } from '../store/leagueStore'
import { SectionKicker } from './SectionKicker'
import { TeamAvatar } from './TeamAvatar'

/** Per-team trash-talk wall, reading and writing through
 * `useLeagueStore` (PLAN.md's Lenis/Zustand/Spline phase). Not wired into
 * any route yet -- this is prep, same as `SplineViewer.tsx` in the same
 * phase, not a shipped feature: the store behind it is in-memory only
 * (no backend, this is a static SPA per CLAUDE.md), so posts/points reset
 * on every reload and never leave the visitor's own browser. There's also
 * no spec yet for what a point actually "unlocks" (the brief's own
 * "userPoints (which trash talkers unblocked)" language) -- this only
 * builds the part that has a concrete shape: leaving a post, and a +1 on
 * a post attributed to its author.
 *
 * Presentational, same as RecapAwards/RecapRankings -- `nameFor`/
 * `avatarFor` resolvers passed in rather than this component making its
 * own Sleeper calls. `wallOwnerUserId` is a Sleeper user_id, this
 * project's only durable cross-season identity key (CLAUDE.md). */
export function TrashTalkWall({
  wallOwnerUserId,
  nameFor,
  avatarFor,
  authorUserId,
}: {
  wallOwnerUserId: string
  nameFor: (userId: string) => string
  avatarFor: (userId: string) => string | null
  /** Whoever is posting right now -- this site has no per-visitor
   * identity (single shared password, SPEC.md §8), so callers pass
   * whichever user_id the visitor picked to post as. */
  authorUserId: string
}) {
  const posts = useLeagueStore((state) => state.trashTalkWalls[wallOwnerUserId] ?? [])
  const points = useLeagueStore((state) => state.userPoints)
  const spongeSize = useLeagueStore((state) => state.spongeSize[wallOwnerUserId] ?? 1)
  const addTrashTalkPost = useLeagueStore((state) => state.addTrashTalkPost)
  const awardPoint = useLeagueStore((state) => state.awardPoint)

  const [draft, setDraft] = useState('')

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault()
    const body = draft.trim()
    if (!body) return
    addTrashTalkPost(wallOwnerUserId, {
      id: `${authorUserId}-${Date.now()}`,
      authorUserId,
      body,
      postedAt: Date.now(),
    })
    setDraft('')
  }

  return (
    <section className="gallery-card p-6 sm:p-8" aria-label={`${nameFor(wallOwnerUserId)}'s wall`}>
      <div className="flex items-center gap-3">
        <TeamAvatar
          avatarId={avatarFor(wallOwnerUserId)}
          name={nameFor(wallOwnerUserId)}
          size="md"
        />
        <div className="min-w-0">
          <SectionKicker>Trash talk wall</SectionKicker>
          <p className="font-display text-charcoal truncate text-xl">{nameFor(wallOwnerUserId)}</p>
        </div>
        {/* Cosmetic only -- see setSpongeSizeFromStanding's own doc
          comment for why this scale isn't a tuned number. */}
        <span
          aria-hidden="true"
          className="ml-auto"
          style={{ fontSize: `${Math.max(1, spongeSize) * 0.6 + 0.8}rem` }}
        >
          🧽
        </span>
      </div>

      <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-3 sm:flex-row">
        <label className="sr-only" htmlFor="trash-talk-draft">
          Leave a message on {nameFor(wallOwnerUserId)}'s wall
        </label>
        <input
          id="trash-talk-draft"
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          placeholder="Say something..."
          className="border-charcoal/20 text-charcoal placeholder:text-charcoal-soft flex-1 rounded-full border bg-transparent px-4 py-2 text-sm outline-none"
          maxLength={280}
        />
        <button
          type="submit"
          disabled={!draft.trim()}
          className="bg-gold-bright text-marble shrink-0 rounded-full px-6 py-2 text-sm font-semibold tracking-wide uppercase transition-transform hover:scale-105 disabled:opacity-40 disabled:hover:scale-100"
        >
          Post
        </button>
      </form>

      {posts.length === 0 ? (
        <p className="text-charcoal-soft mt-6 text-sm">No posts yet.</p>
      ) : (
        <ul className="divide-charcoal/10 mt-6 divide-y">
          {posts.map((post) => (
            <li key={post.id} className="flex items-start justify-between gap-4 py-3">
              <div className="min-w-0">
                <p className="text-charcoal-soft text-xs">{nameFor(post.authorUserId)}</p>
                <p className="text-charcoal mt-1 text-sm">{post.body}</p>
              </div>
              <button
                type="button"
                onClick={() => awardPoint(post.authorUserId)}
                className="text-charcoal-soft hover:text-gold-metal shrink-0 text-xs tabular-nums"
                aria-label={`Give ${nameFor(post.authorUserId)} a point`}
              >
                +1 ({points[post.authorUserId] ?? 0})
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
