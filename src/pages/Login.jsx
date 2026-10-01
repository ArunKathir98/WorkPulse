import { Loader2 } from 'lucide-react'
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

// A static sketch of the board, with one card caught mid-drag.
function Preview() {
  const lanes = [
    { t: 'To do', cards: ['Book dentist', 'Renew passport'] },
    { t: 'In progress', cards: ['Plan trip budget'] },
    { t: 'Completed', cards: ['Pay rent', 'Order groceries'] }
  ]
  return (
    <div aria-hidden="true" className="relative mx-auto w-full max-w-lg overflow-hidden rounded-xl border border-line bg-surface">
      <div className="grid grid-cols-3">
        {lanes.map((l) => (
          <div key={l.t} className="border-r border-line last:border-r-0">
            <div className="h-10 border-b border-line bg-sunken px-3 pt-2.5 font-display text-sm font-bold">{l.t}</div>
            <div className="min-h-44 space-y-2 p-2">
              {l.cards.map((c) => (
                <div key={c} className="rounded-lg border border-line bg-surface px-2.5 py-2 text-xs">{c}</div>
              ))}
            </div>
          </div>
        ))}
      </div>
      <div className="absolute left-[38%] top-[5.5rem] w-[28%] rotate-3 rounded-lg border border-accent bg-surface px-2.5 py-2 text-xs shadow-xl ring-2 ring-accent/30">
        Call the bank
      </div>
    </div>
  )
}

export default function Login() {
  const { status, user, signIn, busy, error } = useAuth()
  const returning = status === 'needsReauth' && user

  return (
    <div className="min-h-dvh px-5 pb-10 pt-[max(1.5rem,env(safe-area-inset-top))]">
      <div className="mx-auto flex max-w-5xl flex-col gap-10 md:min-h-[calc(100dvh-4rem)] md:flex-row md:items-center md:gap-16">
        <div className="flex-1 space-y-6 md:max-w-sm">
          <Brand />
          <h1 className="font-display text-4xl font-bold leading-[1.1]">Your to-dos, in columns you define.</h1>
          <p className="text-muted">
            Sign in with Google. Your board is saved to a private folder in your own Drive, so there is no
            separate account or password to keep.
          </p>

          <div className="space-y-3">
            <button onClick={signIn} disabled={busy} className="btn h-12 w-full gap-3 text-base">
              {busy ? <Loader2 size={18} className="animate-spin" /> : returning && user.picture ? (
                <img src={user.picture} alt="" referrerPolicy="no-referrer" className="h-6 w-6 rounded-full" />
              ) : <GoogleMark />}
              {returning ? `Continue as ${user.name || user.email}` : 'Continue with Google'}
            </button>
            {error && <p role="alert" className="text-sm text-danger">{error}</p>}
            <p className="text-xs text-muted">
              WorkPulse only asks for access to its own hidden app folder. It cannot see your other Drive files.
            </p>
          </div>
        </div>

        <div className="flex-1"><Preview /></div>
      </div>
    </div>
  )
}
