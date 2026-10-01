import { Link } from 'react-router-dom'
import { useData } from '../context/DataContext.jsx'
import Board from '../components/Board.jsx'

export default function Home() {
  const { data } = useData()
  const hasLists = data.settings.columns.some((c) => c.type === 'list')
  return (
    <div className="mx-auto flex min-h-0 w-full max-w-[1600px] flex-1 flex-col px-3 py-3 md:px-4">
      {hasLists ? (
        <Board />
      ) : (
        <div className="card mx-auto mt-10 max-w-md p-6 text-center">
          <h1 className="font-display text-xl font-bold">Your board has no columns</h1>
          <p className="mt-2 text-muted">Add a List column in Settings to start placing tasks.</p>
          <Link to="/settings" className="btn btn-primary mt-4">Open settings</Link>
        </div>
      )}
    </div>
  )
}
