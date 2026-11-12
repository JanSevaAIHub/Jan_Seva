import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { X } from 'lucide-react'
import { useApp } from '../../context/AppContext'
import { useDialog } from '../../lib/useDialog'

export function LoginModal() {
  const { loginRole, setLoginRole, signIn, signUp, requestPasswordReset, resetPassword,
    authMode: mode, setAuthMode, clearAuthError, authError, authBusy } = useApp()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [notice, setNotice] = useState('')
  const [validation, setValidation] = useState('')
  const pending = useRef(false)
  const close = () => { if (!pending.current) { setLoginRole(null); setAuthMode('login') } }
  const dialogRef = useDialog(Boolean(loginRole), close, authBusy)
  useEffect(() => { setEmail(''); setPassword(''); setConfirm(''); setNotice(''); setValidation('') }, [loginRole])
  if (!loginRole) return null
  const changeMode = value => { setAuthMode(value); clearAuthError(); setNotice(''); setValidation(''); setPassword(''); setConfirm('') }
  const submit = async event => {
    event.preventDefault()
    if (pending.current) return
    setValidation('')
    if (['signup', 'reset'].includes(mode) && password !== confirm) { setValidation('Passwords must match.'); return }
    pending.current = true
    try {
      if (mode === 'login') {
        if (await signIn(email.trim(), password)) { setPassword(''); setLoginRole(null) }
      } else {
        const result = mode === 'signup' ? await signUp(email, password)
          : mode === 'forgot' ? await requestPasswordReset(email) : await resetPassword(password)
        if (result) {
          setNotice(result.message); setPassword(''); setConfirm('')
          if (mode === 'signup' && result.signedIn) { setLoginRole(null); navigate('/requests') }
          if (mode === 'reset') setAuthMode('login')
        }
      }
    } finally { pending.current = false }
  }
  const heading = mode === 'signup' ? 'Create citizen account' : mode === 'forgot' ? 'Reset your password'
    : mode === 'reset' ? 'Choose a new password' : `Sign in - ${loginRole === 'officer' ? 'Officer' : 'Citizen'}`
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm">
      <form ref={dialogRef} tabIndex={-1} onSubmit={submit} role="dialog" aria-modal="true" aria-labelledby="login-heading"
        className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6 space-y-4 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center gap-3">
          <h2 id="login-heading" className="font-bold text-slate-900">{heading}</h2>
          <button type="button" aria-label="Close sign in" disabled={authBusy} onClick={close}><X size={18} /></button>
        </div>
        <p className="text-xs text-slate-500">{loginRole === 'officer' ? 'Officer access requires an operator-assigned account.' : 'Create an account to save and revisit your complaints. New accounts receive citizen access.'}</p>
        {mode !== 'reset' && <label className="block text-xs font-semibold">Email
          <input type="email" autoComplete="username" required maxLength={254} disabled={authBusy} value={email} onChange={e => setEmail(e.target.value)} className="mt-1 w-full px-3 py-2 rounded-lg border border-slate-300" />
        </label>}
        {mode !== 'forgot' && <label className="block text-xs font-semibold">Password
          <input type="password" autoComplete={mode === 'login' ? 'current-password' : 'new-password'} required minLength={mode === 'login' ? 1 : 8} maxLength={256} disabled={authBusy} value={password} onChange={e => setPassword(e.target.value)} className="mt-1 w-full px-3 py-2 rounded-lg border border-slate-300" />
        </label>}
        {['signup', 'reset'].includes(mode) && <label className="block text-xs font-semibold">Confirm password
          <input type="password" autoComplete="new-password" required minLength={8} maxLength={256} disabled={authBusy} value={confirm} onChange={e => setConfirm(e.target.value)} className="mt-1 w-full px-3 py-2 rounded-lg border border-slate-300" />
        </label>}
        {(authError || validation) && <p role="alert" className="text-xs text-rose-700">{validation || authError}</p>}
        {notice && <p role="status" className="text-xs text-teal-800">{notice}</p>}
        <button disabled={authBusy} className="w-full py-2 rounded-xl bg-violet-600 text-white text-xs font-bold disabled:opacity-50">
          {authBusy ? 'Please wait...' : mode === 'signup' ? 'Create account' : mode === 'forgot' ? 'Send reset link' : mode === 'reset' ? 'Update password' : 'Sign in'}
        </button>
        <div className="flex flex-wrap gap-3 text-xs font-semibold text-violet-700">
          {mode === 'login' ? <>
            {loginRole !== 'officer' && <button type="button" disabled={authBusy} onClick={() => changeMode('signup')}>Sign up</button>}
            <button type="button" disabled={authBusy} onClick={() => changeMode('forgot')}>Forgot password?</button>
          </> : <button type="button" disabled={authBusy} onClick={() => changeMode('login')}>Back to sign in</button>}
        </div>
      </form>
    </div>
  )
}
