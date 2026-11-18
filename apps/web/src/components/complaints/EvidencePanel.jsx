import { useEffect, useState } from 'react'
import { useApp } from '../../context/AppContext'
import { apiRequest } from '../../lib/api'
import { EvidencePicker } from './EvidencePicker'

export function EvidenceUploadState({ ticketId }) {
  const { pendingEvidence, uploadEvidence } = useApp()
  if (!pendingEvidence || (ticketId && pendingEvidence.ticketId !== ticketId)) return null
  return <div className="text-xs p-3 rounded-xl bg-slate-50 border border-slate-200" role={pendingEvidence.state === 'failed' ? 'alert' : 'status'}>
    {pendingEvidence.state === 'uploading' ? 'Uploading evidence…' : pendingEvidence.state === 'uploaded' ? 'Evidence uploaded successfully.' : <>
      Internal ticket {pendingEvidence.ticketId} is saved. Photo upload failed: {pendingEvidence.error} Your selected photo is kept for this session.
      <button type="button" className="ml-2 text-violet-700 underline" onClick={() => uploadEvidence(pendingEvidence.ticketId, pendingEvidence.file)}>Retry photo upload</button>
    </>}
  </div>
}

export function EvidencePanel({ ticket }) {
  const { session, currentUser, pendingEvidence, uploadEvidence } = useApp()
  const [records, setRecords] = useState([])
  const [url, setUrl] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [revision, setRevision] = useState(0)
  const [file, setFile] = useState(null)
  useEffect(() => {
    let cancelled = false
    setRecords([]); setUrl(''); setError(''); setLoading(true)
    const load = async () => {
      try {
        const data = await apiRequest(`/complaints/${ticket.id}/evidence`, session?.access_token)
        if (!Array.isArray(data)) throw new Error('Evidence metadata is unavailable. Please retry.')
        if (!cancelled) setRecords(data)
        if (data[0]) {
          const access = await apiRequest(`/complaints/${ticket.id}/evidence/${data[0].id}/access`, session?.access_token)
          const parsed = new URL(access.url)
          const project = import.meta.env.VITE_SUPABASE_URL
          if (!project || parsed.origin !== new URL(project).origin || !parsed.pathname.includes('/object/sign/complaint-evidence/')) throw new Error('The evidence service returned an invalid access link.')
          if (!cancelled) setUrl(access.url)
        }
      } catch (e) { if (!cancelled) setError(e.message) }
      finally { if (!cancelled) setLoading(false) }
    }
    load()
    return () => { cancelled = true }
  }, [ticket.id, session?.access_token, revision, pendingEvidence?.state])
  return <section aria-label="Complaint evidence" className="space-y-3 border-t border-slate-200 pt-3">
    <h3 className="text-sm font-bold text-slate-900">Photo Evidence</h3>
    {loading && <p role="status" className="text-xs">Loading private evidence…</p>}
    {error && <p role="alert" className="text-xs text-rose-700">{error} <button type="button" onClick={() => setRevision(v => v + 1)} className="underline">Retry evidence</button></p>}
    {!loading && !error && !records.length && <p className="text-xs text-slate-500">No photo attached.</p>}
    {records.map(r => <div key={r.id} className="text-xs space-y-2">
      <p className="break-all">{r.filename} · {(r.size_bytes / 1024).toFixed(1)} KB</p>
      {url && <img src={url} alt="Uploaded complaint evidence" referrerPolicy="no-referrer" onError={() => { setUrl(''); setError('The photo is unavailable or its access link expired.') }} className="max-h-64 rounded-xl object-contain max-w-full" />}
      <button className="text-violet-700 underline" type="button" onClick={() => setRevision(v => v + 1)}>Refresh private photo</button>
    </div>)}
    <EvidenceUploadState ticketId={ticket.id} />
    {currentUser.role === 'citizen' && ticket.user_id === session?.user.id && <>
      <EvidencePicker file={file} onChange={setFile} disabled={pendingEvidence?.state === 'uploading'} />
      {file && <button type="button" disabled={pendingEvidence?.state === 'uploading'} className="px-3 py-2 bg-violet-600 text-white rounded-lg text-xs" onClick={async () => { if (await uploadEvidence(ticket.id, file)) setFile(null) }}>Upload / replace photo</button>}
    </>}
  </section>
}
