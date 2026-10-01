import { Routes, Route, Navigate } from 'react-router-dom'
import { Loader2 } from 'lucide-react'
import { useAuth } from './context/AuthContext.jsx'
import { DataProvider, useData } from './context/DataContext.jsx'
import Layout from './components/Layout.jsx'
import Login from './pages/Login.jsx'
import Home from './pages/Home.jsx'
import Settings from './pages/Settings.jsx'
import Profile from './pages/Profile.jsx'
import Credentials from './pages/Credentials.jsx'

function Splash({ children }) {
  return (
    <div className="grid min-h-dvh place-items-center px-6 text-center">
      {children || <Loader2 className="animate-spin text-accent" aria-label="Loading" />}
    </div>
  )
}

function Shell() {
  const { loadState, loadError, reload } = useData()
  const { signOut } = useAuth()
  if (loadState === 'loading') return <Splash />
  if (loadState === 'error')
    return (
      <Splash>
        <div className="max-w-sm space-y-4">
          <h1 className="font-display text-xl font-bold">Could not open your board</h1>
          <p className="text-muted">{loadError}</p>
          <div className="flex justify-center gap-2">
            <button className="btn btn-primary" onClick={reload}>Try again</button>
            <button className="btn" onClick={signOut}>Log out</button>
          </div>
        </div>
      </Splash>
    )
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Home />} />
        <Route path="settings" element={<Settings />} />
        <Route path="credentials" element={<Credentials />} />
        <Route path="profile" element={<Profile />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  )
}

export default function App() {
  const { status, user } = useAuth()
  if (status === 'loading') return <Splash />
  if (status !== 'signedIn') return <Login />
  return (
    <DataProvider key={user.sub}>
      <Shell />
    </DataProvider>
  )
}
