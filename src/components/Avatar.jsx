import { useAuth } from '../context/AuthContext.jsx'
import { useData } from '../context/DataContext.jsx'

export default function Avatar({ size = 32 }) {
  const { user } = useAuth()
  const { data } = useData()
  const src = data.profile.customPicture || user.picture
  const name = data.profile.displayName || user.name || user.email || '?'
  const style = { width: size, height: size, fontSize: size * 0.42 }
  return src ? (
    <img src={src} alt="" referrerPolicy="no-referrer" style={style} className="rounded-full object-cover" />
  ) : (
    <span style={style} className="grid place-items-center rounded-full bg-accent font-bold text-accentink">
      {name.trim()[0]?.toUpperCase()}
    </span>
  )
}
