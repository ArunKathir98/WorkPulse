import { useState } from 'react'
import { KeyRound, Loader2 } from 'lucide-react'
import { useData } from '../context/DataContext.jsx'
import { createSecurity, changePin, unlock, isValidPin, encryptPassword, decryptPassword, canProtect } from '../lib/crypto.js'

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

// One numeric key protects every credential marked "authentication needed".
// It can be changed but not removed, since protected passwords are encrypted with it.
export default function SecurityKeySettings() {
  const { data, update } = useData()
  const security = data.settings.security
  const [open, setOpen] = useState(false)
  const [current, setCurrent] = useState('')
  const [next, setNext] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [busy, setBusy] = useState(false)

  const reset = () => {
    setCurrent(''); setNext(''); setConfirm(''); setError(''); setOpen(false)
  }

  const submit = async (e) => {
    e.preventDefault()
    setError('')
    if (!isValidPin(next)) return setError('Use 4 to 8 digits. Numbers only.')
    if (next !== confirm) return setError('The new keys do not match.')
    setBusy(true)
    try {
      let fresh
      let creds = data.credentials || []
      if (!security) {
        fresh = await createSecurity(next)
      } else {
        const ctx = await unlock(current, security)
        if (!ctx) return setError('The current security key is not correct.')
        if (canProtect(security)) {
          if (current === next) return setError('The new key is the same as the current one.')
          // Same key pair, locked under the new key: saved passwords stay valid.
          fresh = await changePin(ctx, security, next)
        } else {
          // Older record without a key pair: create one and re-encrypt the protected passwords.
          fresh = await createSecurity(next)
          const out = []
          for (const c of creds) {
            out.push(c.protected && c.enc ? { ...c, enc: await encryptPassword(fresh, await decryptPassword(ctx, c.enc)) } : c)
          }
          creds = out
        }
      }
      update((d) => ({ ...d, settings: { ...d.settings, security: fresh }, credentials: creds }))
      setNotice(security ? 'Security key updated.' : 'Security key saved. You can now protect credentials with it.')
      reset()
    } catch {
      setError('Could not update the key. Nothing was changed.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="card p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 font-display text-lg font-bold"><KeyRound size={18} className="text-accent" /> Security key</h2>
          <p className="mt-1 text-sm text-muted">
            A numeric key (4 to 8 digits) that locks credentials marked "authentication needed". Their passwords
            are encrypted with it. It cannot be removed, and if you forget it those passwords cannot be recovered.
          </p>
        </div>
        {!open && (
          <button type="button" className="btn shrink-0" onClick={() => { setNotice(''); setOpen(true) }}>
            {security ? 'Change key' : 'Set key'}
          </button>
        )}
      </div>

      {security && !open && (
        <div className="mt-3 flex items-center gap-3 rounded-lg border border-line bg-sunken px-3 py-2.5">
          <span className="text-lg tracking-[0.35em]" aria-label="Security key is set">••••••</span>
          <span className="text-sm text-muted">
            {canProtect(security) ? 'Key is set' : 'Key is set. Use Change key once to upgrade it (you can re-enter the same key).'}
          </span>
        </div>
      )}
      {notice && <p role="status" className="mt-3 text-sm font-semibold text-accent">{notice}</p>}

      {open && (
        <form onSubmit={submit} className="mt-4 space-y-3">
          {security && <PinField id="sk-cur" label="Current key" value={current} onChange={setCurrent} autoFocus />}
          <PinField id="sk-new" label={security ? 'New key' : 'Security key'} value={next} onChange={setNext} autoFocus={!security} />
          <PinField id="sk-conf" label="Confirm key" value={confirm} onChange={setConfirm} />
          {error && <p role="alert" className="text-sm text-danger">{error}</p>}
          <div className="flex justify-end gap-2">
            <button type="button" className="btn" onClick={reset}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={busy || !next || !confirm || (security && !current)}>
              {busy && <Loader2 size={16} className="animate-spin" />} {security ? 'Update key' : 'Save key'}
            </button>
          </div>
        </form>
      )}
    </section>
  )
}
