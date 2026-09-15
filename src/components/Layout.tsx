import type { ReactNode } from 'react'
import { NavLink } from 'react-router'
import { useCurrentSeason, useUsers } from '../api/hooks'

const navLinkClass = ({ isActive }: { isActive: boolean }) =>
  `whitespace-nowrap border-b-2 px-1 py-3 text-sm text-charcoal transition-colors duration-300 ${
    isActive ? 'border-gold' : 'border-transparent hover:border-charcoal/30'
  }`

function TeamTabs() {
  const { leagueId } = useCurrentSeason()
  const users = useUsers(leagueId)

  if (!users.data) return null

  return (
    <>
      {users.data.map((user) => (
        <NavLink key={user.user_id} to={`/team/${user.user_id}`} className={navLinkClass}>
          {user.metadata?.team_name ?? user.display_name}
        </NavLink>
      ))}
    </>
  )
}

export function Layout({ children }: { children: ReactNode }) {
  return (
    <div className="bg-marble text-charcoal min-h-svh">
      <header className="border-charcoal/10 border-b px-6">
        <nav className="flex gap-6 overflow-x-auto">
          <NavLink to="/" end className={navLinkClass}>
            Home
          </NavLink>
          <TeamTabs />
          <NavLink to="/history" className={navLinkClass}>
            League History
          </NavLink>
        </nav>
      </header>
      <div className="px-6 py-10">{children}</div>
    </div>
  )
}
