import { useEffect, useState } from 'react'
import { X } from 'lucide-react'
import { useApp } from '../../context/AppContext'
import { useDialog } from '../../lib/useDialog'

export function LoginModal() {
  const { loginRole, setLoginRole, signIn, signUp, authError, authBusy } = useApp()
  const [creating, setCreating] = useState(false)
  const [notice, setNotice] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const dialogRef = useDialog(Boolean(loginRole), () => setLoginRole(null), authBusy)
  useEffect(() => { setEmail(''); setPassword(''); setCreating(false); setNotice('') }, [loginRole])
  if (!loginRole) return null
  const submit = async event => {
    event.preventDefault()
    if (authBusy) return
    if (creating) {
      const result = await signUp(email, password)
      if (result.ok) {
        setPassword('')
        if (result.confirmationRequired) { setNotice('Check your email to confirm your account, then sign in.'); setCreating(false) }
        else setLoginRole(null)
      }
    } else if (await signIn(email, password)) { setPassword(''); setLoginRole(null) }
  }
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm">
      <form ref={dialogRef} tabIndex={-1} onSubmit={submit} role="dialog" aria-modal="true" aria-labelledby="login-heading" className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6 space-y-4">
        <div className="flex justify-between items-center">
          <h2 id="login-heading" className="font-bold text-slate-900">Sign in — {loginRole === 'officer' ? 'Officer' : 'Citizen'}</h2>
          <button type="button" aria-label="Close sign in" disabled={authBusy} onClick={() => setLoginRole(null)}><X size={18} /></button>
        </div>
        <div className="flex items-center justify-between">
          <p className="text-xs text-slate-500">Use your provisioned account{loginRole === 'officer' ? ' (demo: R. Singh)' : ' (demo: Arjun Mishra)'}.</p>
        </div>
        <label className="block text-xs font-semibold">Email
          <input type="email" autoComplete="username" required value={email} onChange={e => setEmail(e.target.value)} className="mt-1 w-full px-3 py-2 rounded-lg border border-slate-300" />
        </label>
        <label className="block text-xs font-semibold">Password
          <input type="password" autoComplete={creating ? 'new-password' : 'current-password'} minLength={creating ? 8 : undefined} required value={password} onChange={e => setPassword(e.target.value)} className="mt-1 w-full px-3 py-2 rounded-lg border border-slate-300" />
        </label>
        {authError && <p role="alert" className="text-xs text-rose-700">{authError}</p>}
        {notice && <p role="status" className="text-xs text-teal-700">{notice}</p>}
        <button disabled={authBusy} className="w-full py-2 rounded-xl bg-violet-600 text-white text-xs font-bold disabled:opacity-50">{authBusy ? 'Please wait…' : creating ? 'Create citizen account' : 'Sign in'}</button>
        {loginRole !== 'officer' && <button type="button" disabled={authBusy} onClick={() => setCreating(v => !v)} className="text-xs text-violet-700 underline">{creating ? 'Already registered? Sign in' : 'New citizen? Create account'}</button>}
      </form>
    </div>
  )
}
