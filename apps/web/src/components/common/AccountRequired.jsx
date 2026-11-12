import { useApp } from '../../context/AppContext'
import { ComplaintFeedback } from '../complaints/ComplaintFeedback'

export function AccountRequired({ children }) {
  const { session, authLoading } = useApp()
  if (authLoading && !session) return <section><h1 className="text-xl font-bold">My Complaints</h1><p role="status">Restoring your session...</p></section>
  if (!session) return <section className="space-y-4"><h1 className="text-xl font-bold">My Complaints</h1><ComplaintFeedback /><p className="text-sm">Your saved complaints and history are private. Sign in to continue on this page.</p></section>
  return children
}
