import { useParams } from 'react-router'
import { useCurrentSeason, useUsers } from '../api/hooks'

export function TeamPage() {
  const { ownerId } = useParams<{ ownerId: string }>()
  const { leagueId } = useCurrentSeason()
  const users = useUsers(leagueId)
  const user = users.data?.find((u) => u.user_id === ownerId)

  return (
    <section>
      <h1 className="font-display text-4xl">
        {user?.metadata?.team_name ?? user?.display_name ?? 'Team'}
      </h1>
      <p className="text-charcoal-soft mt-2">
        Season-by-season rosters and results land here in Phase 6/7 (PLAN.md).
      </p>
    </section>
  )
}
