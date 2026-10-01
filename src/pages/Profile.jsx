import { useRef, useState } from 'react'
import { Camera, LogOut, ExternalLink } from 'lucide-react'
import { useAuth } from '../context/AuthContext.jsx'
import { useData } from '../context/DataContext.jsx'
import Avatar from '../components/Avatar.jsx'

async function toSquareDataUrl(file, size = 256) {
  const bmp = await createImageBitmap(file)
  const s = Math.min(bmp.width, bmp.height)
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = size
  canvas.getContext('2d').drawImage(bmp, (bmp.width - s) / 2, (bmp.height - s) / 2, s, s, 0, 0, size, size)
  return canvas.toDataURL('image/jpeg', 0.85)
}

export default function Profile() {
  const { user, signOut } = useAuth()
  const { data, update } = useData()
  const [name, setName] = useState(data.profile.displayName || user.name || '')
  const [err, setErr] = useState('')
  const fileRef = useRef(null)

  const setProfile = (patch) => update((d) => ({ ...d, profile: { ...d.profile, ...patch } }))

  const onFile = async (e) => {
    const f = e.target.files?.[0]
    e.target.value = ''
    if (!f) return
    if (!f.type.startsWith('image/')) return setErr('Choose an image file (JPG, PNG or WebP).')
    try {
      setErr('')
      setProfile({ customPicture: await toSquareDataUrl(f) })
    } catch {
      setErr('That image could not be read. Try a different one.')
    }
  }

  return (
    <div className="mx-auto w-full max-w-2xl space-y-6 px-4 py-6">
      <h1 className="font-display text-2xl font-bold">Profile</h1>

      <section className="card p-5">
        <div className="flex flex-wrap items-center gap-5">
          <Avatar size={88} />
          <div className="space-y-2">
            <div className="flex flex-wrap gap-2">
              <button className="btn" onClick={() => fileRef.current?.click()}><Camera size={16} /> Upload photo</button>
              {data.profile.customPicture && (
                <button className="btn" onClick={() => setProfile({ customPicture: null })}>Use Google photo</button>
              )}
            </div>
            <p className="text-xs text-muted">Your photo is cropped square and saved with your data in Drive.</p>
            {err && <p role="alert" className="text-sm text-danger">{err}</p>}
          </div>
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={onFile} />
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="dn" className="mb-1.5 block text-sm font-semibold">Display name</label>
            <input
              id="dn"
              className="field"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onBlur={() => setProfile({ displayName: name.trim() })}
            />
          </div>
          <div>
            <label htmlFor="em" className="mb-1.5 block text-sm font-semibold">Google account</label>
            <input id="em" className="field opacity-70" value={user.email} readOnly />
          </div>
        </div>
      </section>

      <section className="card space-y-3 p-5">
        <h2 className="font-display text-lg font-bold">Password and data</h2>
        <p className="text-sm text-muted">
          You sign in with Google, so your password is managed by your Google account. Your tasks live in a
          private app folder in your Google Drive that only WorkPulse can open.
        </p>
        <div className="flex flex-wrap gap-2">
          <a className="btn" href="https://myaccount.google.com/security" target="_blank" rel="noreferrer">
            Google security <ExternalLink size={14} />
          </a>
          <a className="btn" href="https://myaccount.google.com/permissions" target="_blank" rel="noreferrer">
            Manage app access <ExternalLink size={14} />
          </a>
        </div>
      </section>

      <button onClick={signOut} className="btn btn-danger w-full sm:w-auto">
        <LogOut size={16} /> Log out
      </button>
    </div>
  )
}
