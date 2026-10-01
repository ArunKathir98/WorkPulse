// Google Identity Services (token model). No backend, no client secret.
const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID
const DRIVE_SCOPE = 'https://www.googleapis.com/auth/drive.appdata'
export const SCOPES = `openid email profile ${DRIVE_SCOPE}`

const SESSION_KEY = 'lanes.session'
const HINT_KEY = 'lanes.user'

export class GoogleAuthError extends Error {
  constructor(code, message) {
    super(message || code)
    this.code = code
  }
}

export function friendlyAuthError(e) {
  switch (e?.code) {
    case 'missing_client_id':
      return 'Google Client ID is missing. Add VITE_GOOGLE_CLIENT_ID to your .env file (see README).'
    case 'popup_failed_to_open':
      return 'Your browser blocked the sign-in window. Allow pop-ups for this site and try again.'
    case 'popup_closed':
      return 'The sign-in window was closed before finishing. Try again.'
    case 'access_denied':
      return 'Access was declined. WorkPulse needs Drive app-folder access to save your tasks.'
    case 'scope_missing':
      return 'Please tick the Google Drive permission on the consent screen. WorkPulse needs it to save your tasks.'
    case 'script_failed':
      return 'Google sign-in could not load. Check your connection and reload.'
    default:
      return e?.message || 'Sign-in failed. Try again.'
  }
}

function waitForGoogle() {
  return new Promise((resolve, reject) => {
    if (window.google?.accounts?.oauth2) return resolve()
    let tries = 0
    const t = setInterval(() => {
      if (window.google?.accounts?.oauth2) {
        clearInterval(t)
        resolve()
      } else if (++tries > 100) {
        clearInterval(t)
        reject(new GoogleAuthError('script_failed'))
      }
    }, 100)
  })
}

export async function requestToken({ prompt = '', email } = {}) {
  if (!CLIENT_ID) throw new GoogleAuthError('missing_client_id')
  await waitForGoogle()
  const attempt = new Promise((resolve, reject) => {
    const client = window.google.accounts.oauth2.initTokenClient({
      client_id: CLIENT_ID,
      scope: SCOPES,
      callback: (resp) => {
        if (resp.error) return reject(new GoogleAuthError(resp.error, resp.error_description))
        // Only the Drive scope matters. openid/email/profile come back under longer
        // names, which can make hasGrantedAllScopes report false for a valid sign-in.
        if (!String(resp.scope || '').split(' ').includes(DRIVE_SCOPE)) {
          return reject(new GoogleAuthError('scope_missing'))
        }
        resolve({
          token: resp.access_token,
          expiresAt: Date.now() + (Number(resp.expires_in) - 120) * 1000
        })
      },
      error_callback: (err) => reject(new GoogleAuthError(err?.type || 'unknown'))
    })
    client.requestAccessToken({ prompt, hint: email })
  })
  if (prompt !== 'none') return attempt
  // Silent refresh can hang if the browser blocks the hidden frame.
  return Promise.race([
    attempt,
    new Promise((_, rej) => setTimeout(() => rej(new GoogleAuthError('silent_timeout')), 8000))
  ])
}

export async function fetchUserInfo(token) {
  const res = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
    headers: { Authorization: `Bearer ${token}` }
  })
  if (!res.ok) throw new GoogleAuthError('userinfo_failed', 'Could not read your Google profile.')
  const j = await res.json()
  return { sub: j.sub, name: j.name || '', email: j.email || '', picture: j.picture || '' }
}

export const loadSession = () => {
  try { return JSON.parse(localStorage.getItem(SESSION_KEY)) } catch { return null }
}
export const saveSession = (s) => {
  try {
    localStorage.setItem(SESSION_KEY, JSON.stringify(s))
    localStorage.setItem(HINT_KEY, JSON.stringify(s.user))
  } catch {}
}
export const loadUserHint = () => {
  try { return JSON.parse(localStorage.getItem(HINT_KEY)) } catch { return null }
}
export const clearSession = () => {
  try {
    localStorage.removeItem(SESSION_KEY)
    localStorage.removeItem(HINT_KEY)
  } catch {}
}
