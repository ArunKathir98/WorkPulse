import { NavLink, Outlet, Link } from 'react-router-dom'
import { LayoutDashboard, Settings, UserRound, KeyRound, Loader2, Check, CloudOff } from 'lucide-react'
import { useAuth } from '../context/AuthContext.jsx'
import { useData } from '../context/DataContext.jsx'
import Avatar from './Avatar.jsx'
import { HeaderQuote } from './DailyQuote.jsx'
import ReminderEngine from './ReminderEngine.jsx'
import ChatBot from './ChatBot.jsx'
import GlobalSearch from './GlobalSearch.jsx'

const nav = [
  { to: '/', label: 'Board', icon: LayoutDashboard, end: true },
  { to: '/credentials', label: 'Credentials', icon: KeyRound },
  { to: '/settings', label: 'Settings', icon: Settings },
  { to: '/profile', label: 'Profile', icon: UserRound }
]

export function Brand() {
  return (
    <span className="flex items-center gap-2 font-display text-lg font-bold">
      <img src="favicon.svg" alt="" className="h-7 w-7" />
      WorkPulse
    </span>
  )
}

function SaveStatus() {
  const { saveState, retry } = useData()
  if (saveState === 'saving')
    return <span className="flex items-center gap-1.5 text-xs text-muted"><Loader2 size={14} className="animate-spin" />Saving</span>
  if (saveState === 'saved')
    return <span className="flex items-center gap-1.5 text-xs text-muted"><Check size={14} className="text-accent" />Saved to Drive</span>
  if (saveState === 'error')
    return (
      <button onClick={retry} className="flex items-center gap-1.5 text-xs font-semibold text-danger">
        <CloudOff size={14} />Not saved. Retry
      </button>
    )
  return null
}

export default function Layout() {
  const { expired, signIn, busy } = useAuth()
  const { saveState, saveError, retry } = useData()

  const reconnect = async () => {
    await signIn()
    retry()
  }

  return (
    <div className="flex h-dvh flex-col overflow-hidden">
      <header className="z-30 shrink-0 border-b border-line bg-surface/90 pt-[env(safe-area-inset-top)] backdrop-blur">
        <div className="mx-auto flex h-14 max-w-[1600px] items-center gap-4 px-4">
          <Link to="/"><Brand /></Link>
          <nav className="ml-4 hidden gap-1 md:flex" aria-label="Main">
            {nav.filter((n) => n.to !== '/profile').map(({ to, label, icon: I, end }) => (
              <NavLink
                key={to}
                to={to}
                end={end}
                className={({ isActive }) =>
                  'flex h-9 items-center gap-2 rounded-lg px-3 text-sm font-semibold ' +
                  (isActive ? 'bg-sunken text-ink' : 'text-muted hover:text-ink')
                }
              >
                <I size={16} />{label}
              </NavLink>
            ))}
          </nav>
          <div className="ml-auto flex items-center gap-4">
            <HeaderQuote />
            <GlobalSearch />
            <SaveStatus />
            <Link to="/profile" aria-label="Profile" className="hidden md:block"><Avatar /></Link>
          </div>
        </div>
      </header>

      {(expired || (saveState === 'error' && saveError)) && (
        <div role="alert" className="border-b border-line bg-danger/10 px-4 py-2 text-sm">
          <div className="mx-auto flex max-w-[1600px] flex-wrap items-center gap-x-3 gap-y-1">
            <span className="text-danger">{expired ? 'Your Google session expired, so changes are not being saved.' : saveError}</span>
            <button
              onClick={expired ? reconnect : retry}
              disabled={busy}
              className="font-semibold underline underline-offset-2"
            >
              {expired ? 'Reconnect Google' : 'Retry'}
            </button>
          </div>
        </div>
      )}

      <main className="flex min-h-0 flex-1 flex-col overflow-y-auto pb-16 md:pb-0"><Outlet /></main>
      <ReminderEngine />
      <ChatBot />

      <nav
        aria-label="Main"
        className="z-30 grid shrink-0 grid-cols-4 border-t border-line bg-surface pb-[env(safe-area-inset-bottom)] md:hidden"
      >
        {nav.map(({ to, label, icon: I, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              'flex h-14 flex-col items-center justify-center gap-0.5 text-xs font-semibold ' +
              (isActive ? 'text-accent' : 'text-muted')
            }
          >
            <I size={20} />{label}
          </NavLink>
        ))}
      </nav>
    </div>
  )
}
