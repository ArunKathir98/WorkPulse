const KEY = 'lanes.theme'

export function getStoredTheme() {
  try {
    const t = localStorage.getItem(KEY)
    if (t === 'dark' || t === 'light') return t
  } catch {}
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

export function applyTheme(theme) {
  document.documentElement.classList.toggle('dark', theme === 'dark')
  try { localStorage.setItem(KEY, theme) } catch {}
}
