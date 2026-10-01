import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'
import { useAuth, AUTH_DISABLED } from './AuthContext.jsx'
import { findFile, readFile, createFile, updateFile } from '../lib/drive.js'
import { defaultData, normalize } from '../lib/store.js'
import { applyTheme } from '../lib/theme.js'

const DataCtx = createContext(null)
export const useData = () => useContext(DataCtx)

const cacheKey = (sub) => `lanes.cache.${sub}`
const readCache = (sub) => {
  try { return JSON.parse(localStorage.getItem(cacheKey(sub))) } catch { return null }
}

export function DataProvider({ children }) {
  const { getToken, user } = useAuth()
  const [data, setData] = useState(null)
  const [loadState, setLoadState] = useState('loading') // loading | ready | error
  const [loadError, setLoadError] = useState('')
  const [saveState, setSaveState] = useState('idle') // idle | saving | saved | error
  const [saveError, setSaveError] = useState('')

  const dataRef = useRef(null)
  const fileId = useRef(null)
  const timer = useRef(null)
  const saving = useRef(false)
  const queued = useRef(false)
  const dirty = useRef(false)
  const started = useRef(false)

  const save = useCallback(async () => {
    clearTimeout(timer.current)
    if (AUTH_DISABLED) {
      // Local-only mode: update() already wrote to localStorage.
      dirty.current = false
      setSaveState('saved')
      return
    }
    if (saving.current) {
      queued.current = true
      return
    }
    saving.current = true
    setSaveState('saving')
    try {
      do {
        queued.current = false
        dirty.current = false
        const snapshot = dataRef.current
        let id = fileId.current
        if (!id) id = (await findFile(getToken))?.id || null
        if (id) await updateFile(getToken, id, snapshot)
        else id = await createFile(getToken, snapshot)
        fileId.current = id
      } while (queued.current)
      setSaveState('saved')
      setSaveError('')
    } catch (e) {
      dirty.current = true
      setSaveState('error')
      setSaveError(e.message)
    } finally {
      saving.current = false
    }
  }, [getToken])

  const init = useCallback((d) => {
    dataRef.current = d
    setData(d)
    applyTheme(d.settings.theme)
  }, [])

  const load = useCallback(async () => {
    setLoadState('loading')
    setLoadError('')
    if (AUTH_DISABLED) {
      const cached = readCache(user.sub)
      init(cached ? normalize(cached) : defaultData())
      setLoadState('ready')
      return
    }
    try {
      const f = await findFile(getToken)
      if (f) {
        fileId.current = f.id
        init(normalize(await readFile(getToken, f.id)))
      } else {
        const d = defaultData()
        fileId.current = await createFile(getToken, d)
        init(d)
      }
      setLoadState('ready')
    } catch (e) {
      const cached = readCache(user.sub)
      if (cached) {
        init(normalize(cached))
        dirty.current = true
        setSaveState('error')
        setSaveError('Offline: showing your last saved copy. Tap Retry when you are back online.')
        setLoadState('ready')
      } else {
        setLoadError(e.message)
        setLoadState('error')
      }
    }
  }, [getToken, init, user.sub])

  useEffect(() => {
    if (started.current) return
    started.current = true
    load()
  }, [load])

  const update = useCallback(
    (fn) => {
      const prev = dataRef.current
      const next = fn(prev)
      if (!next || next === prev) return
      dataRef.current = next
      setData(next)
      try { localStorage.setItem(cacheKey(user.sub), JSON.stringify(next)) } catch {}
      if (next.settings.theme !== prev.settings.theme) applyTheme(next.settings.theme)
      dirty.current = true
      clearTimeout(timer.current)
      timer.current = setTimeout(save, 800)
    },
    [save, user.sub]
  )

  // Save right away when the tab is hidden or the app is backgrounded.
  useEffect(() => {
    const onHide = () => {
      if (document.visibilityState === 'hidden' && dirty.current) save()
    }
    document.addEventListener('visibilitychange', onHide)
    return () => document.removeEventListener('visibilitychange', onHide)
  }, [save])

  return (
    <DataCtx.Provider
      value={{ data, update, loadState, loadError, reload: load, saveState, saveError, retry: save }}
    >
      {children}
    </DataCtx.Provider>
  )
}
