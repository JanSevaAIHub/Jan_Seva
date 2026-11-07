import { useApp } from '../../context/AppContext'

export function ComplaintFeedback() {
  const { session, authLoading, authError, complaintsLoading, complaintsError, refreshComplaints, switchUserRole } = useApp()
  return (
    <div className="text-xs space-y-2" aria-live="polite">
      {authLoading ? <p>Loading your session…</p> : !session && (
        <div className="p-3 rounded-xl bg-amber-50 border border-amber-200">
          Sign in to create and view your complaints.{' '}
          <button className="font-bold text-violet-700" onClick={() => switchUserRole('citizen')}>Sign in</button>
        </div>
      )}
      {authError && <p role="alert" className="text-rose-700">{authError}</p>}
      {complaintsLoading && <p>Loading saved complaints…</p>}
      {complaintsError && <p role="alert" className="text-rose-700">{complaintsError} <button onClick={() => refreshComplaints()} className="underline">Retry</button></p>}
    </div>
  )
}
