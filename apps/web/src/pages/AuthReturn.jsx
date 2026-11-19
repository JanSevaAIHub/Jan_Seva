import { useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useApp } from '../context/AppContext'

export function AuthReturn() {
  const { session, authLoading, authMode, switchUserRole } = useApp()
  const navigate = useNavigate()
  const recovery = window.location.pathname === '/auth/reset'
  useEffect(() => {
    if (session && !authLoading && !recovery && authMode !== 'reset') navigate('/requests', { replace: true })
  }, [session, authLoading, recovery, authMode, navigate])
  return <section className="bg-white rounded-2xl border p-6 space-y-4">
    <h1 className="text-xl font-bold">{recovery ? 'Password recovery' : 'Email confirmation'}</h1>
    <p role="status">{authLoading ? 'Checking your session…' : recovery
      ? 'Use the new-password dialog after opening your recovery email. If the link expired or was already used, request a fresh reset link.'
      : 'If your email was confirmed, sign in to continue. Expired or already-used links require a fresh registration or recovery email.'}</p>
    <button className="text-violet-700 font-semibold" onClick={() => switchUserRole('citizen')}>Open sign in</button>
    <Link className="block text-violet-700" to="/">Return home</Link>
  </section>
}
