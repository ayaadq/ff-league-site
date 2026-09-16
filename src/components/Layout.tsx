import { useEffect, useRef, useState, type ReactNode } from 'react'
import { NavLink } from 'react-router'
import { useCurrentSeason, useUsers } from '../api/hooks'
import { SoundToggle } from '../audio/SoundToggle'
import { useSound } from '../audio/soundContext'
import { useEffectsTier } from '../motion/effectsTierContext'

const overlayLinkClass = ({ isActive }: { isActive: boolean }) =>
  `block py-3 font-display text-2xl transition-colors duration-300 ${
    isActive
      ? 'text-charcoal underline decoration-gold-bright decoration-2 underline-offset-8'
      : 'text-charcoal-soft hover:text-charcoal'
  }`

/** SPEC.md §7.1 — a menu/overlay, not a horizontal tab strip. Fourteen
 * nav targets (Home, League History, 12 teams) don't fit a mobile-first
 * header, and this pattern scales up to desktop as-is with no separate
 * desktop-only implementation. */
function NavOverlay({ onClose }: { onClose: () => void }) {
  const closeButtonRef = useRef<HTMLButtonElement>(null)
  const { leagueId } = useCurrentSeason()
  const users = useUsers(leagueId)

  useEffect(() => {
    closeButtonRef.current?.focus()

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleKeyDown)

    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = previousOverflow
    }
  }, [onClose])

  return (
    <div
      id="site-nav-overlay"
      role="dialog"
      aria-modal="true"
      aria-label="Site navigation"
      className="marble-surface fixed inset-0 z-50 flex flex-col overflow-y-auto"
    >
      <div className="flex items-center justify-between px-6 py-4">
        <span className="font-display text-charcoal text-lg">Trophy Room</span>
        <button
          ref={closeButtonRef}
          type="button"
          onClick={onClose}
          className="text-charcoal flex min-h-11 min-w-11 items-center justify-center text-sm tracking-widest uppercase"
        >
          Close
        </button>
      </div>

      <nav className="mx-auto w-full max-w-sm flex-1 px-6 pb-16">
        <NavLink to="/" end className={overlayLinkClass} onClick={onClose}>
          Home
        </NavLink>
        <NavLink to="/history" className={overlayLinkClass} onClick={onClose}>
          League History
        </NavLink>

        <div className="gold-divider my-6 w-16" aria-hidden="true" />

        {users.data?.map((user) => (
          <NavLink
            key={user.user_id}
            to={`/team/${user.user_id}`}
            className={overlayLinkClass}
            onClick={onClose}
          >
            {user.metadata?.team_name ?? user.display_name}
          </NavLink>
        ))}
      </nav>
    </div>
  )
}

export function Layout({ children }: { children: ReactNode }) {
  const [menuOpen, setMenuOpen] = useState(false)
  const { play } = useSound()
  const effectsTier = useEffectsTier()

  return (
    // data-effects-tier isn't decorative: it's the one place this value
    // is genuinely observable from outside React (Playwright/devtools),
    // and a legitimate CSS hook if a future tier-gated 2D style ever
    // needs one -- not a throwaway debug attribute to strip out later.
    <div className="marble-surface text-charcoal min-h-svh" data-effects-tier={effectsTier}>
      <header className="border-charcoal/10 flex items-center justify-between border-b px-6 py-4">
        <NavLink to="/" className="font-display text-charcoal text-lg">
          Trophy Room
        </NavLink>
        <div className="flex items-center gap-4">
          <SoundToggle />
          <button
            type="button"
            aria-expanded={menuOpen}
            aria-controls="site-nav-overlay"
            onClick={() => {
              play('click')
              setMenuOpen(true)
            }}
            className="text-charcoal flex min-h-11 min-w-11 items-center justify-center text-sm tracking-widest uppercase"
          >
            Menu
          </button>
        </div>
      </header>

      {menuOpen && <NavOverlay onClose={() => setMenuOpen(false)} />}

      <div className="px-6 py-10">{children}</div>
    </div>
  )
}
