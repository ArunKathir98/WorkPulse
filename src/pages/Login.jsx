import {
  Loader2, LayoutDashboard, StickyNote, BellRing, KeyRound, Bot, Search, Smartphone, ShieldCheck
} from 'lucide-react'
import { useAuth } from '../context/AuthContext.jsx'
import { Brand } from '../components/Layout.jsx'

function GoogleMark() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
      <path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9.1 3.6l6.8-6.8C35.8 2.4 30.3 0 24 0 14.6 0 6.5 5.4 2.6 13.2l7.9 6.1C12.4 13.6 17.7 9.5 24 9.5z"/>
      <path fill="#4285F4" d="M46.5 24.5c0-1.6-.1-3.1-.4-4.5H24v9h12.7c-.6 3-2.3 5.5-4.8 7.2l7.5 5.8c4.4-4.1 7.1-10.1 7.1-17.5z"/>
      <path fill="#FBBC05" d="M10.5 28.7A14.5 14.5 0 0 1 9.5 24c0-1.6.3-3.2.8-4.7l-7.9-6.1A24 24 0 0 0 0 24c0 3.9.9 7.5 2.6 10.8l7.9-6.1z"/>
      <path fill="#34A853" d="M24 48c6.5 0 11.9-2.1 15.9-5.8l-7.5-5.8c-2.1 1.4-4.9 2.3-8.4 2.3-6.3 0-11.6-4.1-13.5-9.8l-7.9 6.1C6.5 42.6 14.6 48 24 48z"/>
    </svg>
  )
}

// Fixed positions, so the stars do not jump on every render.
const STARS = Array.from({ length: 36 }, (_, i) => ({
  left: `${(i * 37 + 11) % 100}%`,
  top: `${(i * 53 + 7) % 100}%`,
  size: 1 + (i % 3),
  delay: `${(i % 9) * 0.7}s`,
  dur: `${3 + (i % 5)}s`
}))

function TechBackground() {
  return (
    <div aria-hidden="true" className="pointer-events-none fixed inset-0 -z-10 overflow-hidden tech-bg">
      <div className="tech-orb -left-24 -top-24 h-[28rem] w-[28rem] bg-violet-600" />
      <div className="tech-orb -right-32 top-1/4 h-[26rem] w-[26rem] bg-fuchsia-600/80 [animation-delay:-7s]" />
      <div className="tech-orb -bottom-40 left-1/3 h-[30rem] w-[30rem] bg-indigo-600/80 [animation-delay:-13s]" />
      <div className="absolute inset-x-0 bottom-0 h-[55%] overflow-hidden [perspective:700px]">
        <div className="tech-grid absolute -inset-x-1/2 bottom-[-10%] h-[160%]" />
      </div>
      {STARS.map((s, i) => (
        <span
          key={i}
          className="tech-star"
          style={{ left: s.left, top: s.top, width: s.size, height: s.size, animationDelay: s.delay, animationDuration: s.dur }}
        />
      ))}
      <div className="tech-vignette absolute inset-0" />
    </div>
  )
}

// A static sketch of the app: tabs, a date grid, and the assistant answering.
function Preview() {
  const lists = ['To do', 'In progress', 'Done']
  const rows = [
    { d: 'Mon', n: '6 Oct', cells: [['Call the bank'], ['Fix login bug'], []] },
    { d: 'Tue', n: '7 Oct', cells: [['Plan sprint'], [], ['Pay rent']] }
  ]
  return (
    <div aria-hidden="true" className="relative mx-auto w-full max-w-lg">
      <div className="absolute -inset-4 rounded-[2rem] bg-violet-500/20 blur-2xl" />
      <div className="relative overflow-hidden rounded-2xl border border-white/15 bg-white/[0.06] shadow-2xl shadow-violet-950/50 backdrop-blur-md">
        <div className="flex items-center gap-1.5 border-b border-white/10 px-3 py-2">
          <span className="h-2.5 w-2.5 rounded-full bg-rose-400/80" />
          <span className="h-2.5 w-2.5 rounded-full bg-amber-300/80" />
          <span className="h-2.5 w-2.5 rounded-full bg-emerald-400/80" />
          <div className="ml-3 flex gap-3 text-[11px] font-semibold text-white/60">
            <span className="border-b-2 border-violet-400 pb-0.5 text-white">Tasks</span>
            <span>Notes</span>
            <span>Reminders</span>
          </div>
        </div>
        <div className="grid grid-cols-[3.2rem_repeat(3,1fr)] text-[11px] text-white/90">
          <div className="border-b border-white/10 bg-white/5 px-2 py-2 font-bold text-white/60">Date</div>
          {lists.map((l) => (
            <div key={l} className="border-b border-l border-white/10 bg-white/5 px-2 py-2 font-bold">{l}</div>
          ))}
          {rows.map((r, ri) => (
            <div key={r.d} className="contents">
              <div className={`px-2 py-2.5 leading-tight ${ri === 1 ? 'bg-violet-500/10' : ''}`}>
                <div className="font-bold">{r.d}</div>
                <div className="text-white/50">{r.n}</div>
              </div>
              {r.cells.map((c, ci) => (
                <div key={ci} className={`min-h-[4.2rem] border-l border-t border-white/10 p-1.5 ${ri === 1 ? 'bg-violet-500/10' : ''}`}>
                  {c.map((t) => (
                    <div key={t} className="rounded-md border border-white/15 bg-white/10 px-1.5 py-1.5">{t}</div>
                  ))}
                </div>
              ))}
            </div>
          ))}
        </div>
        <div className="space-y-1.5 border-t border-white/10 bg-black/20 p-3 text-[11px]">
          <div className="ml-auto w-fit max-w-[85%] rounded-2xl rounded-br-sm bg-violet-500 px-3 py-1.5 text-white">
            remind me to call mom tomorrow at 5pm
          </div>
          <div className="flex w-fit max-w-[85%] items-center gap-1.5 rounded-2xl rounded-bl-sm bg-white/10 px-3 py-1.5 text-white/90">
            <Bot size={12} className="shrink-0 text-violet-300" /> Reminder set for tomorrow, 5:00 PM.
          </div>
        </div>
      </div>
    </div>
  )
}

const FEATURES = [
  { I: LayoutDashboard, t: 'Date board', d: 'Day, month and all-dates views' },
  { I: StickyNote, t: 'Sticky notes', d: 'Colour-coded and draggable' },
  { I: BellRing, t: 'Reminders', d: 'On time, 5 or 10 min before, snooze' },
  { I: KeyRound, t: 'Credential vault', d: 'Locked behind your security key' },
  { I: Bot, t: 'Built-in assistant', d: 'Add tasks and reminders by typing' },
  { I: Search, t: 'Instant search', d: 'Press Ctrl+K anywhere' }
]

export default function Login() {
  const { status, user, signIn, busy, error } = useAuth()
  const returning = status === 'needsReauth' && user

  return (
    // The landing page is always dark, whatever theme the app uses inside.
    <div className="dark relative min-h-dvh bg-[#0a0614] text-ink">
      <TechBackground />
      <div className="px-5 pb-12 pt-[max(1.5rem,env(safe-area-inset-top))]">
        <div className="mx-auto flex max-w-6xl flex-col gap-10 lg:min-h-[calc(100dvh-4rem)] lg:flex-row lg:items-center lg:gap-14">
          <div className="flex-1 space-y-6 lg:max-w-xl">
            <Brand />
            <p className="inline-flex items-center gap-2 rounded-full border border-violet-400/30 bg-violet-500/10 px-3 py-1 text-xs font-semibold text-violet-200">
              <span className="h-1.5 w-1.5 rounded-full bg-violet-300 shadow-[0_0_8px_2px_rgba(167,139,250,.8)]" />
              Tasks, notes, reminders and logins in one place
            </p>
            <h1 className="font-display text-4xl font-bold leading-[1.08] sm:text-5xl">
              Plan it. Remember it.{' '}
              <span className="bg-gradient-to-r from-violet-300 via-fuchsia-300 to-indigo-300 bg-clip-text text-transparent">
                Secure it.
              </span>
            </h1>
            <p className="max-w-md text-base text-muted">
              Sign in with Google and everything is saved to a private folder in your own Drive. No extra
              account, no password to keep, and no one else can read it.
            </p>

            <div className="max-w-sm space-y-3">
              <button
                onClick={signIn}
                disabled={busy}
                className="btn h-12 w-full gap-3 border-transparent bg-white text-base text-[#1f1f1f] shadow-[0_0_30px_-4px_rgba(167,139,250,.7)] hover:bg-white/90"
              >
                {busy ? <Loader2 size={18} className="animate-spin" /> : returning && user.picture ? (
                  <img src={user.picture} alt="" referrerPolicy="no-referrer" className="h-6 w-6 rounded-full" />
                ) : <GoogleMark />}
                {returning ? `Continue as ${user.name || user.email}` : 'Continue with Google'}
              </button>
              {error && <p role="alert" className="text-sm text-danger">{error}</p>}
              <p className="flex items-start gap-2 text-xs text-muted">
                <ShieldCheck size={14} className="mt-0.5 shrink-0 text-violet-300" />
                WorkPulse only asks for access to its own hidden app folder and cannot see your other Drive files.
                Protected passwords are encrypted in your browser.
              </p>
            </div>

            <ul className="grid max-w-xl grid-cols-2 gap-2.5 pt-2 sm:grid-cols-3">
              {FEATURES.map(({ I, t, d }) => (
                <li key={t} className="rounded-xl border border-white/10 bg-white/[0.04] p-3 backdrop-blur-sm">
                  <I size={17} className="text-violet-300" />
                  <p className="mt-1.5 text-sm font-bold">{t}</p>
                  <p className="text-xs leading-snug text-muted">{d}</p>
                </li>
              ))}
            </ul>
            <p className="flex items-center gap-2 text-xs text-muted">
              <Smartphone size={14} className="text-violet-300" /> Installs like an app on your phone and works on any screen.
            </p>
          </div>

          <div className="flex-1"><Preview /></div>
        </div>
      </div>
    </div>
  )
}
