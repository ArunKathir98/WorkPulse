import { useState } from 'react'
import { KeyRound, Loader2, Copy, Check, LifeBuoy, TriangleAlert } from 'lucide-react'
import { useData } from '../context/DataContext.jsx'
import {
  createSecurity, changePin, addRecovery, unlock, unlockWithRecovery, isValidPin, isValidRecoveryCode,
  encryptPassword, decryptPassword, canProtect
} from '../lib/crypto.js'

const digits = (v) => v.replace(/\D/g, '').slice(0, 8)

function PinField({ id, label, value, onChange, autoFocus }) {
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-sm font-semibold">{label}</label>
      <input
        id={id}
        type="password"
        inputMode="numeric"
        autoComplete="off"
        maxLength={8}
        autoFocus={autoFocus}
        value={value}
        onChange={(e) => onChange(digits(e.target.value))}
        className="field tracking-[0.4em]"
      />
    </div>
  )
}

// Shown once. The code is never stored in readable form, so it cannot be shown again.
function RecoveryCodeDialog({ code, onClose }) {
  const [saved, setSaved] = useState(false)
  const [copied, setCopied] = useState(false)
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(code)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      // The code is on screen to copy by hand.
    }
  }
  return (
    <div className="fixed inset-0 z-[70] grid place-items-end bg-ink/40 p-0 sm:place-items-center sm:p-4">
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="rc-title"
        className="card w-full max-w-md space-y-4 rounded-b-none p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] shadow-2xl sm:rounded-b-xl"
      >
        <div className="flex items-start gap-3">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-accent/10 text-accent"><LifeBuoy size={18} /></span>
          <div>
            <h2 id="rc-title" className="font-display text-lg font-bold">Save your recovery code</h2>
            <p className="mt-1 text-sm text-muted">
              If you forget your security key, this code lets you set a new one without losing your protected passwords.
              It is shown only once. Keep it in a password manager or on paper, away from this app.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 rounded-lg border border-line bg-sunken px-3 py-3">
          <code className="min-w-0 flex-1 break-all text-center font-mono text-lg font-bold tracking-wider">{code}</code>
          <button type="button" onClick={copy} aria-label="Copy recovery code" className="grid h-9 w-9 shrink-0 place-items-center rounded-md text-muted hover:bg-line/50 hover:text-ink">
            {copied ? <Check size={17} className="text-accent" /> : <Copy size={17} />}
          </button>
        </div>
        <label className="flex cursor-pointer items-start gap-2.5">
          <input type="checkbox" checked={saved} onChange={(e) => setSaved(e.target.checked)} className="mt-0.5 h-4 w-4 accent-[rgb(var(--accent))]" />
          <span className="text-sm font-semibold">I have saved this code somewhere safe</span>
        </label>
        <div className="flex justify-end">
          <button type="button" className="btn btn-primary" disabled={!saved} onClick={onClose}>Done</button>
        </div>
      </div>
    </div>
  )
}

// One numeric key protects every credential marked "authentication needed".
// It can be changed but not removed. A recovery code (shown once) can reset a forgotten key.
export default function SecurityKeySettings() {
  const { data, update } = useData()
  const security = data.settings.security
  const creds = data.credentials || []
  const protectedCount = creds.filter((c) => c.protected).length

  const [mode, setMode] = useState(null) // null | change | recovery | forgot
  const [forgotPath, setForgotPath] = useState('code') // code | erase
  const [current, setCurrent] = useState('')
  const [next, setNext] = useState('')
  const [confirm, setConfirm] = useState('')
  const [code, setCode] = useState('')
  const [typed, setTyped] = useState('')
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [busy, setBusy] = useState(false)
  const [shownCode, setShownCode] = useState(null)

  const reset = () => {
    setCurrent(''); setNext(''); setConfirm(''); setCode(''); setTyped(''); setError(''); setMode(null)
  }
  const open = (m) => { reset(); setNotice(''); setMode(m) }

  const save = (fresh, nextCreds, message, newCode) => {
    update((d) => ({ ...d, settings: { ...d.settings, security: fresh }, credentials: nextCreds ?? d.credentials }))
    setNotice(message)
    if (newCode) setShownCode(newCode)
    reset()
  }

  const checkNewPin = () => {
    if (!isValidPin(next)) return 'Use 4 to 8 digits. Numbers only.'
    if (next !== confirm) return 'The new keys do not match.'
    return ''
  }

  // Set the first key, or change it (needs the current key).
  const submitChange = async (e) => {
    e.preventDefault()
    setError('')
    const bad = checkNewPin()
    if (bad) return setError(bad)
    setBusy(true)
    try {
      if (!security) {
        const r = await createSecurity(next)
        return save(r.security, null, 'Security key saved. You can now protect credentials with it.', r.recoveryCode)
      }
      const ctx = await unlock(current, security)
      if (!ctx) return setError('The current security key is not correct.')
      if (canProtect(security)) {
        if (current === next) return setError('The new key is the same as the current one.')
        // Same key pair, locked under the new key: saved passwords stay valid.
        return save(await changePin(ctx, security, next), null, 'Security key updated.')
      }
      // Older record without a key pair: make one and re-encrypt the protected passwords.
      const r = await createSecurity(next)
      const out = []
      for (const c of creds) {
        out.push(c.protected && c.enc ? { ...c, enc: await encryptPassword(r.security, await decryptPassword(ctx, c.enc)) } : c)
      }
      save(r.security, out, 'Security key upgraded.', r.recoveryCode)
    } catch {
      setError('Could not update the key. Nothing was changed.')
    } finally {
      setBusy(false)
    }
  }

  // Create (or replace) the recovery code. Needs the current key.
  const submitRecovery = async (e) => {
    e.preventDefault()
    setError('')
    setBusy(true)
    try {
      const ctx = await unlock(current, security)
      if (!ctx) return setError('The security key is not correct.')
      const r = await addRecovery(ctx, security)
      save(r.security, null, 'New recovery code created. The old one no longer works.', r.recoveryCode)
    } catch {
      setError('Could not create a recovery code. Nothing was changed.')
    } finally {
      setBusy(false)
    }
  }

  // Forgot the key, but have the recovery code: same data, new key.
  const submitForgotCode = async (e) => {
    e.preventDefault()
    setError('')
    const bad = checkNewPin()
    if (bad) return setError(bad)
    if (!isValidRecoveryCode(code)) return setError('Enter the full 24-character recovery code.')
    setBusy(true)
    try {
      const ctx = await unlockWithRecovery(code, security)
      if (!ctx) return setError('That recovery code is not correct.')
      save(await changePin(ctx, security, next), null, 'Security key reset. Your protected passwords are unchanged.')
    } catch {
      setError('Could not reset the key. Nothing was changed.')
    } finally {
      setBusy(false)
    }
  }

  // Last resort: erase protected passwords, then start over with a new key pair.
  const submitErase = async (e) => {
    e.preventDefault()
    setError('')
    const bad = checkNewPin()
    if (bad) return setError(bad)
    if (typed.trim().toUpperCase() !== 'RESET') return setError('Type RESET to confirm.')
    setBusy(true)
    try {
      const r = await createSecurity(next)
      const out = creds.map((c) => (c.protected ? { ...c, protected: false, password: '', enc: null, lost: true } : c))
      save(r.security, out, 'Security key reset. Protected passwords were erased; add them again.', r.recoveryCode)
    } catch {
      setError('Could not reset the key. Nothing was changed.')
    } finally {
      setBusy(false)
    }
  }

  const actions = (submitLabel, disabled) => (
    <div className="flex justify-end gap-2">
      <button type="button" className="btn" onClick={reset}>Cancel</button>
      <button type="submit" className="btn btn-primary" disabled={busy || disabled}>
        {busy && <Loader2 size={16} className="animate-spin" />} {submitLabel}
      </button>
    </div>
  )

  return (
    <section className="card p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 font-display text-lg font-bold"><KeyRound size={18} className="text-accent" /> Security key</h2>
          <p className="mt-1 text-sm text-muted">
            A numeric key (4 to 8 digits) that locks credentials marked "authentication needed". Their passwords
            are encrypted with it. It cannot be removed.
          </p>
        </div>
        {!mode && (
          <button type="button" className="btn shrink-0" onClick={() => open('change')}>
            {security ? 'Change key' : 'Set key'}
          </button>
        )}
      </div>

      {security && !mode && (
        <div className="mt-3 space-y-2">
          <div className="flex items-center gap-3 rounded-lg border border-line bg-sunken px-3 py-2.5">
            <span className="text-lg tracking-[0.35em]" aria-label="Security key is set">••••••</span>
            <span className="text-sm text-muted">
              {canProtect(security) ? 'Key is set' : 'Key is set. Use Change key once to upgrade it (you can re-enter the same key).'}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-x-3 gap-y-2 rounded-lg border border-line px-3 py-2.5 text-sm">
            <LifeBuoy size={16} className={security.recovery ? 'text-accent' : 'text-muted'} />
            <span className="min-w-0 flex-1">
              {security.recovery
                ? 'Recovery code is set. Keep it safe; it is how you reset a forgotten key.'
                : canProtect(security)
                  ? 'No recovery code yet. Without one, a forgotten key cannot be reset without erasing protected passwords.'
                  : 'Upgrade the key above to enable a recovery code.'}
            </span>
            {canProtect(security) && (
              <button type="button" className="btn h-8 text-sm" onClick={() => open('recovery')}>
                {security.recovery ? 'New code' : 'Create code'}
              </button>
            )}
          </div>

          <button type="button" className="text-sm font-semibold text-accent underline" onClick={() => open('forgot')}>
            Forgot your security key?
          </button>
        </div>
      )}
      {notice && <p role="status" className="mt-3 text-sm font-semibold text-accent">{notice}</p>}

      {mode === 'change' && (
        <form onSubmit={submitChange} className="mt-4 space-y-3">
          {security && <PinField id="sk-cur" label="Current key" value={current} onChange={setCurrent} autoFocus />}
          <PinField id="sk-new" label={security ? 'New key' : 'Security key'} value={next} onChange={setNext} autoFocus={!security} />
          <PinField id="sk-conf" label="Confirm key" value={confirm} onChange={setConfirm} />
          {error && <p role="alert" className="text-sm text-danger">{error}</p>}
          {actions(security ? 'Update key' : 'Save key', !next || !confirm || (security && !current))}
        </form>
      )}

      {mode === 'recovery' && (
        <form onSubmit={submitRecovery} className="mt-4 space-y-3">
          <p className="text-sm text-muted">
            Creates a new recovery code. {security?.recovery && 'The old code stops working.'} Enter your current key to continue.
          </p>
          <PinField id="sk-rec" label="Current key" value={current} onChange={setCurrent} autoFocus />
          {error && <p role="alert" className="text-sm text-danger">{error}</p>}
          {actions('Create code', !current)}
        </form>
      )}

      {mode === 'forgot' && (
        <div className="mt-4 space-y-3">
          <div role="tablist" aria-label="Reset method" className="flex gap-1 rounded-lg border border-line bg-surface p-0.5">
            {[
              { v: 'code', label: 'I have my recovery code' },
              { v: 'erase', label: "I don't have it" }
            ].map((t) => (
              <button
                key={t.v}
                type="button"
                role="tab"
                aria-selected={forgotPath === t.v}
                onClick={() => { setForgotPath(t.v); setError('') }}
                className={'h-9 flex-1 rounded-md px-2 text-sm font-semibold transition-colors ' + (forgotPath === t.v ? 'bg-accent text-accentink' : 'text-muted hover:text-ink')}
              >
                {t.label}
              </button>
            ))}
          </div>

          {forgotPath === 'code' ? (
            security?.recovery ? (
              <form onSubmit={submitForgotCode} className="space-y-3">
                <p className="text-sm text-muted">Enter your recovery code and choose a new key. Nothing is lost.</p>
                <div>
                  <label htmlFor="sk-code" className="mb-1.5 block text-sm font-semibold">Recovery code</label>
                  <input
                    id="sk-code"
                    autoFocus
                    autoComplete="off"
                    autoCapitalize="characters"
                    spellCheck={false}
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    placeholder="XXXX-XXXX-XXXX-XXXX-XXXX-XXXX"
                    className="field font-mono uppercase"
                  />
                </div>
                <PinField id="sk-fnew" label="New key" value={next} onChange={setNext} />
                <PinField id="sk-fconf" label="Confirm new key" value={confirm} onChange={setConfirm} />
                {error && <p role="alert" className="text-sm text-danger">{error}</p>}
                {actions('Reset key', !code || !next || !confirm)}
              </form>
            ) : (
              <div className="space-y-3">
                <p className="text-sm text-muted">No recovery code was created for this key, so there is nothing to recover with.</p>
                <button type="button" className="btn" onClick={reset}>Close</button>
              </div>
            )
          ) : (
            <form onSubmit={submitErase} className="space-y-3">
              <div className="flex items-start gap-2.5 rounded-lg border border-danger/40 bg-danger/10 p-3 text-sm">
                <TriangleAlert size={18} className="mt-0.5 shrink-0 text-danger" />
                <p>
                  Without the key or recovery code, protected passwords cannot be decrypted. Resetting
                  <strong> permanently erases the {protectedCount} protected password{protectedCount === 1 ? '' : 's'}</strong>.
                  The cards stay with their name, URL, username and notes. Unprotected credentials are not affected.
                  This cannot be undone.
                </p>
              </div>
              <PinField id="sk-enew" label="New key" value={next} onChange={setNext} />
              <PinField id="sk-econf" label="Confirm new key" value={confirm} onChange={setConfirm} />
              <div>
                <label htmlFor="sk-type" className="mb-1.5 block text-sm font-semibold">Type RESET to confirm</label>
                <input id="sk-type" autoComplete="off" className="field" value={typed} onChange={(e) => setTyped(e.target.value)} />
              </div>
              {error && <p role="alert" className="text-sm text-danger">{error}</p>}
              <div className="flex justify-end gap-2">
                <button type="button" className="btn" onClick={reset}>Cancel</button>
                <button
                  type="submit"
                  disabled={busy || !next || !confirm || typed.trim().toUpperCase() !== 'RESET'}
                  className="btn border-transparent bg-danger text-white hover:bg-danger/90"
                >
                  {busy && <Loader2 size={16} className="animate-spin" />} Erase and reset
                </button>
              </div>
            </form>
          )}
        </div>
      )}

      {shownCode && <RecoveryCodeDialog code={shownCode} onClose={() => setShownCode(null)} />}
    </section>
  )
}
