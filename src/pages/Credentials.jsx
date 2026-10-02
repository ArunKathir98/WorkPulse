import { useEffect, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import {
  Plus, Copy, Check, Eye, EyeOff, Lock, Pencil, Trash2, ExternalLink, KeyRound, Loader2, Search, X
} from 'lucide-react'
import { useData } from '../context/DataContext.jsx'
import { uid } from '../lib/store.js'
import { unlock, createSecurity, encryptPassword, decryptPassword, isValidPin, canProtect } from '../lib/crypto.js'
import { useConfirm } from '../components/ConfirmDialog.jsx'
import { usePin } from '../components/PinDialog.jsx'

const AUTO_HIDE_MS = 30000

// Only http(s) links are made clickable; anything else is shown as plain text.
function safeHref(url) {
  if (!url) return null
  const withScheme = /^[a-z][a-z0-9+.-]*:/i.test(url) ? url : `https://${url}`
  try {
    const u = new URL(withScheme)
    return u.protocol === 'http:' || u.protocol === 'https:' ? u.href : null
  } catch {
    return null
  }
}

function CredentialForm({ initial, security, onSave, onClose }) {
  const [name, setName] = useState(initial?.name || '')
  const [url, setUrl] = useState(initial?.url || '')
  const [username, setUsername] = useState(initial?.username || '')
  // A protected password is never shown here. Leave this empty to keep it, or type a new one.
  const [password, setPassword] = useState(initial?.protected ? '' : initial?.password || '')
  const [showPw, setShowPw] = useState(false)
  const [needsAuth, setNeedsAuth] = useState(!!initial?.protected)
  const [pin, setPin] = useState('')
  const [notes, setNotes] = useState(initial?.notes || '')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const editing = !!initial?.id

  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const submit = async (e) => {
    e.preventDefault()
    if (!name.trim()) return setError('Give this credential a name.')
    setBusy(true)
    setError('')
    try {
      const base = {
        id: initial?.id || uid('k'),
        createdAt: initial?.createdAt || Date.now(),
        name: name.trim(),
        url: url.trim(),
        username: username.trim(),
        notes: notes.trim()
      }
      if (needsAuth && !security) return setError('Set a security key in Settings first.')
      if (needsAuth && !canProtect(security)) {
        // Key made before key pairs existed: needs the key once to move it to the new format.
        if (!isValidPin(pin)) return setError('Enter your security key to protect this password.')
        const ctx = await unlock(pin, security)
        if (!ctx) return setError('Incorrect security key.')
        const { security: fresh } = await createSecurity(pin, { recovery: false })
        const plain = password || (initial?.protected ? await decryptPassword(ctx, initial.enc) : '')
        const box = await encryptPassword(fresh, plain)
        onSave({ ...base, protected: true, password: '', enc: box }, { ctx, fresh })
      } else if (needsAuth) {
        // Encrypting uses the public key, so saving never asks for the security key.
        const box = password || !initial?.protected ? await encryptPassword(security, password) : initial.enc
        onSave({ ...base, protected: true, password: '', enc: box })
      } else if (initial?.protected && !password) {
        // Removing protection has to read the old password, which does need the key.
        if (!isValidPin(pin)) return setError('Enter your security key to remove protection.')
        const ctx = await unlock(pin, security)
        if (!ctx) return setError('Incorrect security key.')
        onSave({ ...base, protected: false, password: await decryptPassword(ctx, initial.enc), enc: null })
      } else {
        onSave({ ...base, protected: false, password, enc: null })
      }
    } finally {
      setBusy(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-end bg-ink/40 p-0 sm:place-items-center sm:p-4"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <form
        onSubmit={submit}
        role="dialog"
        aria-modal="true"
        aria-label={editing ? 'Edit credential' : 'Add credential'}
        className="card max-h-[92dvh] w-full max-w-md space-y-4 overflow-y-auto rounded-b-none p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] shadow-2xl sm:rounded-b-xl"
      >
        <h2 className="font-display text-xl font-bold">{editing ? 'Edit credential' : 'Add credential'}</h2>

        <div>
          <label htmlFor="c-name" className="mb-1.5 block text-sm font-semibold">Name</label>
          <input id="c-name" autoFocus className="field" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Netflix" />
        </div>
        <div>
          <label htmlFor="c-url" className="mb-1.5 block text-sm font-semibold">URL</label>
          <input id="c-url" type="text" inputMode="url" autoCapitalize="off" className="field" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://example.com" />
        </div>
        <div>
          <label htmlFor="c-user" className="mb-1.5 block text-sm font-semibold">Email or username</label>
          <input id="c-user" autoComplete="off" autoCapitalize="off" className="field" value={username} onChange={(e) => setUsername(e.target.value)} />
        </div>
        <div>
          <label htmlFor="c-pw" className="mb-1.5 block text-sm font-semibold">Password</label>
          <div className="relative">
            <input
              id="c-pw"
              type={showPw ? 'text' : 'password'}
              autoComplete="new-password"
              className="field pr-11"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={initial?.protected ? 'Protected. Leave empty to keep it' : ''}
            />
            <button
              type="button"
              onClick={() => setShowPw((v) => !v)}
              aria-label={showPw ? 'Hide password' : 'Show password'}
              className="absolute right-1 top-1 grid h-8 w-8 place-items-center rounded-md text-muted hover:text-ink"
            >
              {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
        </div>

        <div className="space-y-3 rounded-lg border border-line bg-sunken p-3">
          <label className={`flex items-start gap-2.5 ${security ? 'cursor-pointer' : 'cursor-not-allowed opacity-70'}`}>
            <input
              type="checkbox"
              checked={needsAuth}
              disabled={!security}
              onChange={(e) => setNeedsAuth(e.target.checked)}
              className="mt-0.5 h-4 w-4 accent-[rgb(var(--accent))]"
            />
            <span>
              <span className="text-sm font-semibold">Authentication needed</span>
              <span className="block text-xs text-muted">Viewing or copying the password will ask for your security key.</span>
            </span>
          </label>
          {!security && (
            <p className="text-xs text-muted">
              No security key yet. <Link to="/settings" className="font-semibold text-accent underline">Set one in Settings</Link> to turn this on.
            </p>
          )}
          {security && ((needsAuth && !canProtect(security)) || (initial?.protected && !needsAuth && !password)) && (
            <div>
              <label htmlFor="c-pin" className="mb-1.5 block text-sm font-semibold">Security key</label>
              <input
                id="c-pin"
                type="password"
                inputMode="numeric"
                autoComplete="off"
                maxLength={8}
                className="field tracking-[0.4em]"
                value={pin}
                onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
              />
              <p className="mt-1 text-xs text-muted">
                {needsAuth
                  ? 'Asked once now, to move your key to the new format. Normally saving does not ask for it.'
                  : 'Needed to remove protection, because the password has to be decrypted. Or type a new password above instead.'}
              </p>
            </div>
          )}
        </div>

        <div>
          <label htmlFor="c-notes" className="mb-1.5 block text-sm font-semibold">Additional information</label>
          <textarea id="c-notes" rows={3} className="field h-auto resize-none py-2" value={notes} onChange={(e) => setNotes(e.target.value)} />
        </div>

        {error && <p role="alert" className="text-sm text-danger">{error}</p>}

        <div className="flex justify-end gap-2 pt-1">
          <button type="button" onClick={onClose} className="btn">Cancel</button>
          <button type="submit" disabled={busy} className="btn btn-primary">
            {busy && <Loader2 size={16} className="animate-spin" />} Save
          </button>
        </div>
      </form>
    </div>
  )
}

function IconBtn({ label, onClick, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className="grid h-7 w-7 shrink-0 place-items-center rounded-md text-muted hover:bg-sunken hover:text-ink"
    >
      {children}
    </button>
  )
}

function CredentialCard({ c, security, copied, onCopy, onEdit, onDelete, askPin }) {
  const [revealed, setRevealed] = useState(null) // decrypted/visible password, or null
  const timer = useRef(null)
  const href = safeHref(c.url)

  useEffect(() => () => clearTimeout(timer.current), [])

  // Decrypts with the security key when the card is protected.
  const getPassword = async (why) => {
    if (!c.protected) return c.password
    const ctx = await askPin({
      title: 'Security key required',
      message: `Enter your security key to ${why} the password for "${c.name}".`
    })
    if (!ctx) return null
    try {
      return await decryptPassword(ctx, c.enc)
    } catch {
      return null
    }
  }

  const hide = () => {
    clearTimeout(timer.current)
    setRevealed(null)
  }

  const toggle = async () => {
    if (revealed !== null) return hide()
    const pw = await getPassword('view')
    if (pw === null) return
    setRevealed(pw)
    if (c.protected) timer.current = setTimeout(hide, AUTO_HIDE_MS)
  }

  const copyPw = async () => {
    const pw = revealed ?? (await getPassword('copy'))
    if (pw !== null) onCopy(`${c.id}:pw`, pw)
  }

  const noPassword = !c.protected && !c.password

  return (
    <article className="card flex flex-col gap-1.5 p-3">
      <header className="flex items-center gap-1">
        <h2 className="min-w-0 flex-1 truncate font-display text-base font-bold leading-tight" title={c.name}>{c.name}</h2>
        {c.protected && (
          <span className="inline-flex shrink-0 items-center gap-1 rounded-md bg-accent/10 px-1.5 py-0.5 text-[11px] font-semibold text-accent">
            <Lock size={11} /> Protected
          </span>
        )}
        <IconBtn label={`Edit ${c.name}`} onClick={onEdit}><Pencil size={14} /></IconBtn>
        <IconBtn label={`Delete ${c.name}`} onClick={onDelete}><Trash2 size={14} className="text-danger" /></IconBtn>
      </header>

      {c.url && (
        <div className="flex items-center gap-1">
          {href ? (
            <a href={href} target="_blank" rel="noopener noreferrer" className="flex min-w-0 flex-1 items-center gap-1.5 text-[13px] text-accent hover:underline">
              <ExternalLink size={12} className="shrink-0" />
              <span className="truncate">{c.url}</span>
            </a>
          ) : (
            <span className="min-w-0 flex-1 truncate text-[13px] text-muted">{c.url}</span>
          )}
          <IconBtn label="Copy URL" onClick={() => onCopy(`${c.id}:url`, c.url)}>
            {copied === `${c.id}:url` ? <Check size={14} className="text-accent" /> : <Copy size={14} />}
          </IconBtn>
        </div>
      )}

      {c.username && (
        <div className="flex items-center gap-1">
          <span className="min-w-0 flex-1 truncate text-[13px]">{c.username}</span>
          <IconBtn label="Copy username" onClick={() => onCopy(`${c.id}:user`, c.username)}>
            {copied === `${c.id}:user` ? <Check size={14} className="text-accent" /> : <Copy size={14} />}
          </IconBtn>
        </div>
      )}

      <div className="flex items-center gap-0.5 rounded-md border border-line bg-sunken pl-2.5 pr-1">
        <span
          className="min-w-0 flex-1 truncate py-1 font-mono text-[13px]"
          aria-label={revealed !== null ? 'Password' : 'Password hidden'}
        >
          {noPassword ? <span className="text-muted">{c.lost ? 'Erased by key reset. Edit to add one.' : 'No password'}</span> : revealed !== null ? revealed : '\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022'}
        </span>
        {!noPassword && (
          <>
            <IconBtn label={revealed !== null ? 'Hide password' : 'Show password'} onClick={toggle}>
              {revealed !== null ? <EyeOff size={15} /> : <Eye size={15} />}
            </IconBtn>
            <IconBtn label="Copy password" onClick={copyPw}>
              {copied === `${c.id}:pw` ? <Check size={15} className="text-accent" /> : <Copy size={15} />}
            </IconBtn>
          </>
        )}
      </div>

      {c.notes && <p className="line-clamp-2 whitespace-pre-wrap break-words text-xs text-muted" title={c.notes}>{c.notes}</p>}
    </article>
  )
}

export default function Credentials() {
  const { data, update } = useData()
  const security = data.settings.security || null
  const all = data.credentials || []
  const [params] = useSearchParams()
  const [query, setQuery] = useState(params.get('q') || '')
  const [searchOpen, setSearchOpen] = useState(false)
  const searchRef = useRef(null)
  // Keywords all have to match. Passwords are never searched, only what is visible on the card.
  const words = query.toLowerCase().split(/\s+/).filter(Boolean)
  const list = words.length
    ? all.filter((c) => {
        const hay = `${c.name} ${c.url} ${c.username} ${c.notes}`.toLowerCase()
        return words.every((w) => hay.includes(w))
      })
    : all
  const [form, setForm] = useState(null) // { initial }
  const [copied, setCopied] = useState('')
  const [copyError, setCopyError] = useState(false)
  const copyTimer = useRef(null)
  const [confirm, confirmDialog] = useConfirm()
  const [askPin, pinDialog] = usePin(security)

  useEffect(() => () => clearTimeout(copyTimer.current), [])

  const onCopy = async (id, text) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopyError(false)
      setCopied(id)
    } catch {
      setCopyError(true)
      return
    }
    clearTimeout(copyTimer.current)
    copyTimer.current = setTimeout(() => setCopied(''), 1500)
  }

  const setCreds = (fn) => update((d) => ({ ...d, credentials: fn(d.credentials || []) }))

  const save = async (rec, upgrade) => {
    if (upgrade) {
      // Re-encrypt the other protected passwords with the new key pair in the same update.
      const others = []
      for (const c of list) {
        if (c.id === rec.id) continue
        others.push(c.protected && c.enc ? { ...c, enc: await encryptPassword(upgrade.fresh, await decryptPassword(upgrade.ctx, c.enc)) } : c)
      }
      const exists = list.some((c) => c.id === rec.id)
      const next = exists ? list.map((c) => (c.id === rec.id ? rec : others.find((o) => o.id === c.id))) : [rec, ...others]
      update((d) => ({ ...d, settings: { ...d.settings, security: upgrade.fresh }, credentials: next }))
    } else {
      setCreds((cs) => (cs.some((c) => c.id === rec.id) ? cs.map((c) => (c.id === rec.id ? rec : c)) : [rec, ...cs]))
    }
    setForm(null)
  }

  // Editing never asks for the security key; protected passwords stay encrypted unless replaced.
  const edit = (c) => setForm({ initial: c })

  const remove = async (c) => {
    const ok = await confirm({
      title: `Delete "${c.name}"?`,
      message: 'This credential, including its saved password and notes, will be permanently deleted. This cannot be undone.',
      confirmLabel: 'Delete credential'
    })
    if (ok) setCreds((cs) => cs.filter((x) => x.id !== c.id))
  }

  return (
    <div className="mx-auto w-full max-w-[1200px] space-y-3 px-3 py-4 md:px-4">
      <div className="flex items-center gap-2">
        <h1 className="font-display text-2xl font-bold">Credentials</h1>
        <div className="ml-auto flex min-w-0 items-center gap-2">
          {all.length > 0 &&
            (searchOpen || query ? (
              <div className="relative w-full min-w-0 max-w-[16rem]">
                <Search size={15} className="pointer-events-none absolute left-2.5 top-[13px] text-muted" />
                <input
                  ref={searchRef}
                  type="search"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Escape' && (setQuery(''), setSearchOpen(false))}
                  placeholder="Search credentials"
                  aria-label="Search credentials"
                  autoComplete="off"
                  className="field h-10 pl-8 pr-8 text-sm"
                />
                <button
                  type="button"
                  onClick={() => { setQuery(''); setSearchOpen(false) }}
                  aria-label="Close search"
                  className="absolute right-1.5 top-1.5 grid h-7 w-7 place-items-center rounded-md text-muted hover:text-ink"
                >
                  <X size={15} />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => { setSearchOpen(true); setTimeout(() => searchRef.current?.focus(), 0) }}
                aria-label="Search credentials"
                title="Search credentials"
                className="btn h-10 w-10 px-0"
              >
                <Search size={17} />
              </button>
            ))}
          <button type="button" className="btn btn-primary shrink-0" onClick={() => setForm({ initial: null })}>
            <Plus size={16} /> Add
          </button>
        </div>
      </div>

      {words.length > 0 && (
        <p role="status" className="-mt-2 text-xs text-muted">
          {list.length} of {all.length} credential{all.length === 1 ? '' : 's'}. Passwords are not searched.
        </p>
      )}

      {copyError && (
        <p role="alert" className="rounded-lg border border-line bg-danger/10 px-3 py-2 text-sm text-danger">
          Your browser blocked copying. Allow clipboard access for this site and try again.
        </p>
      )}

      {all.length > 0 && list.length === 0 ? (
        <div className="card mx-auto mt-8 max-w-md space-y-2 p-6 text-center">
          <Search className="mx-auto text-muted" size={28} />
          <p className="font-display text-lg font-bold">No matches</p>
          <p className="text-sm text-muted">Nothing matches "{query.trim()}". Try fewer or different words.</p>
        </div>
      ) : list.length === 0 ? (
        <div className="card mx-auto mt-8 max-w-md space-y-2 p-6 text-center">
          <KeyRound className="mx-auto text-muted" size={28} />
          <p className="font-display text-lg font-bold">No credentials yet</p>
          <p className="text-sm text-muted">Use Add to save a site login. Passwords can be locked behind your security key.</p>
        </div>
      ) : (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,16rem),1fr))] items-start gap-2.5">
          {list.map((c) => (
            <CredentialCard
              key={c.id}
              c={c}
              security={security}
              copied={copied}
              onCopy={onCopy}
              onEdit={() => edit(c)}
              onDelete={() => remove(c)}
              askPin={askPin}
            />
          ))}
        </div>
      )}

      {form && (
        <CredentialForm
          initial={form.initial}
          security={security}
          onSave={save}
          onClose={() => setForm(null)}
        />
      )}
      {confirmDialog}
      {pinDialog}
    </div>
  )
}
