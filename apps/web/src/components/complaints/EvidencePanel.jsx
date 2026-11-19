import { useApp } from '../../context/AppContext'
import { ComplaintEvidence } from './ComplaintEvidence'

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
  return <ComplaintEvidence complaintId={ticket.id} />
}
