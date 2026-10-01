import { useCallback, useEffect, useRef, useState } from 'react'
import { Lock, Loader2 } from 'lucide-react'
import { unlock } from '../lib/crypto.js'

export function PinDialog({ security, title, message, onDone }) {
  const [pin, setPin] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    ref.current?.focus()
    const onKey = (e) => e.key === 'Escape' && onDone(null)
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onDone])

  const submit = async (e) => {
    e.preventDefault()
    if (busy || !pin) return
    setBusy(true)
    setError('')
    try {
      const key = await unlock(pin, security)
      if (key) return onDone(key)
      setError('Incorrect security key. Try again.')
      setPin('')
      ref.current?.focus()
    } finally {
      setBusy(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-[70] grid place-items-end bg-ink/40 p-0 sm:place-items-center sm:p-4"
      onMouseDown={(e) => e.target === e.currentTarget && onDone(null)}
    >
      <form
        onSubmit={submit}
        role="dialog"
        aria-modal="true"
        aria-labelledby="pin-title"
        className="card w-full max-w-sm space-y-4 rounded-b-none p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] shadow-2xl sm:rounded-b-xl"
      >
        <div className="flex items-start gap-3">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-accent/10 text-accent">
            <Lock size={18} />
          </span>
          <div>
            <h2 id="pin-title" className="font-display text-lg font-bold">{title || 'Enter security key'}</h2>
            <p className="mt-1 text-sm text-muted">{message || 'This item is protected. Enter your numeric security key to continue.'}</p>
          </div>
        </div>
        <div>
          <label htmlFor="pin-input" className="mb-1.5 block text-sm font-semibold">Security key</label>
          <input
            id="pin-input"
            ref={ref}
            type="password"
            inputMode="numeric"
            autoComplete="off"
            maxLength={8}
            value={pin}
            onChange={(e) => { setPin(e.target.value.replace(/\D/g, '')); setError('') }}
            className="field tracking-[0.4em]"
            aria-invalid={!!error}
            aria-describedby={error ? 'pin-error' : undefined}
          />
          {error && <p id="pin-error" role="alert" className="mt-1.5 text-sm text-danger">{error}</p>}
        </div>
        <div className="flex justify-end gap-2">
          <button type="button" onClick={() => onDone(null)} className="btn">Cancel</button>
          <button type="submit" disabled={!pin || busy} className="btn btn-primary">
            {busy && <Loader2 size={16} className="animate-spin" />} Unlock
          </button>
        </div>
      </form>
    </div>
  )
}

// const [askPin, pinDialog] = usePin(security)
// const key = await askPin({ title, message })   // CryptoKey, or null if cancelled
export function usePin(security) {
  const [req, setReq] = useState(null)
  const ask = useCallback((opts = {}) => new Promise((resolve) => setReq({ ...opts, resolve })), [])
  const done = useCallback(
    (key) => {
      req?.resolve(key)
      setReq(null)
    },
    [req]
  )
  const dialog = req && <PinDialog security={security} title={req.title} message={req.message} onDone={done} />
  return [ask, dialog]
}
