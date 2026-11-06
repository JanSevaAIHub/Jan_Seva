import { useEffect, useState } from 'react'
import { X } from 'lucide-react'
import { useApp } from '../../context/AppContext'
import { useDialog } from '../../lib/useDialog'

export function LoginModal() {
  const { loginRole, setLoginRole, signIn, authError, authBusy } = useApp()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const dialogRef = useDialog(Boolean(loginRole), () => setLoginRole(null), authBusy)
  useEffect(() => { setEmail(''); setPassword('') }, [loginRole])
  if (!loginRole) return null
  const submit = async event => {
    event.preventDefault()
    if (await signIn(email, password)) { setPassword(''); setLoginRole(null) }
  }
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm">
      <form ref={dialogRef} tabIndex={-1} onSubmit={submit} role="dialog" aria-modal="true" aria-labelledby="login-heading" className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6 space-y-4">
        <div className="flex justify-between items-center">
          <h2 id="login-heading" className="font-bold text-slate-900">Sign in — {loginRole === 'officer' ? 'Officer' : 'Citizen'}</h2>
          <button type="button" aria-label="Close sign in" disabled={authBusy} onClick={() => setLoginRole(null)}><X size={18} /></button>
        </div>
        <p className="text-xs text-slate-500">Use your provisioned account{loginRole === 'officer' ? ' (demo: R. Singh)' : ' (demo: Arjun Mishra)'}. Your account determines access.</p>
        <label className="block text-xs font-semibold">Email
          <input type="email" autoComplete="username" required value={email} onChange={e => setEmail(e.target.value)} className="mt-1 w-full px-3 py-2 rounded-lg border border-slate-300" />
        </label>
        <label className="block text-xs font-semibold">Password
          <input type="password" autoComplete="current-password" required value={password} onChange={e => setPassword(e.target.value)} className="mt-1 w-full px-3 py-2 rounded-lg border border-slate-300" />
        </label>
        {authError && <p role="alert" className="text-xs text-rose-700">{authError}</p>}
        <button disabled={authBusy} className="w-full py-2 rounded-xl bg-violet-600 text-white text-xs font-bold disabled:opacity-50">{authBusy ? 'Signing in…' : 'Sign in'}</button>
      </form>
    </div>
  )
}
