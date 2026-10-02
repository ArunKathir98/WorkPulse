// Chrome and Edge fire `beforeinstallprompt` once, early, and only when the app is installable and
// not installed. It has to be captured at startup (this module is imported from main.jsx) or the
// Settings page would never see it. Safari on iPhone/iPad never fires it.
let deferred = null
const listeners = new Set()
const notify = () => listeners.forEach((fn) => fn())

if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault() // keep it so our own button can show the prompt
    deferred = e
    notify()
  })
  window.addEventListener('appinstalled', () => {
    deferred = null
    notify()
  })
}

export const subscribe = (fn) => {
  listeners.add(fn)
  return () => listeners.delete(fn)
}

export const canPrompt = () => !!deferred

export function isInstalled() {
  if (typeof window === 'undefined') return false
  return (
    window.matchMedia?.('(display-mode: standalone)').matches ||
    window.matchMedia?.('(display-mode: fullscreen)').matches ||
    window.navigator.standalone === true // iOS Safari
  )
}

export function isIOS() {
  const ua = window.navigator.userAgent
  // iPadOS 13+ reports as a Mac but has touch.
  return /iphone|ipad|ipod/i.test(ua) || (/macintosh/i.test(ua) && navigator.maxTouchPoints > 1)
}

// Returns 'accepted' | 'dismissed' | 'unavailable'.
export async function promptInstall() {
  if (!deferred) return 'unavailable'
  const e = deferred
  deferred = null // the browser allows one prompt per event
  notify()
  try {
    await e.prompt()
    const { outcome } = await e.userChoice
    return outcome
  } catch {
    return 'unavailable'
  }
}
