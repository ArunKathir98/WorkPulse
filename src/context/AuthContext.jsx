import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'
import {
  requestToken, fetchUserInfo, loadSession, saveSession, loadUserHint, clearSession, friendlyAuthError
} from '../lib/google.js'

const AuthCtx = createContext(null)
export const useAuth = () => useContext(AuthCtx)

// Dev flag: set VITE_DISABLE_AUTH=true in .env.local to skip Google sign-in.
export const AUTH_DISABLED = import.meta.env.VITE_DISABLE_AUTH === 'true'
const DEV_USER = { sub: 'dev-user', name: 'Dev User', email: 'dev@example.com', picture: '' }

export function AuthProvider({ children }) {
  // loading | signedOut | needsReauth | signedIn
  const [status, setStatus] = useState(AUTH_DISABLED ? 'signedIn' : 'loading')
  const [user, setUser] = useState(AUTH_DISABLED ? DEV_USER : null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [expired, setExpired] = useState(false)
  const sessionRef = useRef(null)
  const inflight = useRef(null)

  const refresh = useCallback((prompt) => {
    if (inflight.current) return inflight.current
    inflight.current = (async () => {
      try {
        const email = loadUserHint()?.email
        const t = await requestToken({ prompt, email })
        const info = await fetchUserInfo(t.token)
        const session = { token: t.token, expiresAt: t.expiresAt, user: info }
        sessionRef.current = session
        saveSession(session)
        setUser(info)
        setExpired(false)
        return session
      } finally {
        inflight.current = null
      }
    })()
    return inflight.current
  }, [])

  useEffect(() => {
    if (AUTH_DISABLED) return
    ;(async () => {
      const s = loadSession()
      if (s?.token && s.expiresAt > Date.now()) {
        sessionRef.current = s
        setUser(s.user)
        setStatus('signedIn')
        return
      }
      const hint = loadUserHint()
      if (!hint) return setStatus('signedOut')
      setUser(hint)
      try {
        await refresh('none')
        setStatus('signedIn')
      } catch {
        setStatus('needsReauth')
      }
    })()
  }, [refresh])

  // Must be called from a click handler so the browser allows the pop-up.
  const signIn = useCallback(async () => {
    if (AUTH_DISABLED) return
    setError('')
    setBusy(true)
    try {
      await refresh('')
      setStatus('signedIn')
    } catch (e) {
      setError(friendlyAuthError(e))
    } finally {
      setBusy(false)
    }
  }, [refresh])

  const getToken = useCallback(
    async (force = false) => {
      if (AUTH_DISABLED) return 'dev-token'
      const s = sessionRef.current
      if (s && !force && s.expiresAt > Date.now()) return s.token
      try {
        return (await refresh('none')).token
      } catch {
        setExpired(true)
        throw new Error('Your Google session expired. Reconnect to keep saving.')
      }
    },
    [refresh]
  )

  const signOut = useCallback(() => {
    clearSession()
    sessionRef.current = null
    setUser(null)
    setExpired(false)
    setStatus('signedOut')
  }, [])

  return (
    <AuthCtx.Provider value={{ status, user, error, busy, expired, signIn, signOut, getToken }}>
      {children}
    </AuthCtx.Provider>
  )
}
