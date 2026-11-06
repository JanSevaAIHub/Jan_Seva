import { useEffect, useState } from 'react'
import { X, ShieldCheck, CheckCircle2, Clock, AlertTriangle, ArrowRight, UserCheck } from 'lucide-react'
import { useApp } from '../../context/AppContext'
import { NEXT_STATUS } from '../../lib/complaints'

export function TicketDetailModal() {
  const { officerTicketModal, setOfficerTicketModal, updateComplaintStatus } = useApp()
  const [selectedStatus, setSelectedStatus] = useState('')
  const [note, setNote] = useState('')

  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  useEffect(() => {
    setSelectedStatus(NEXT_STATUS[officerTicketModal?.status] || '')
    setNote('')
    setError('')
  }, [officerTicketModal?.id, officerTicketModal?.status])
  if (!officerTicketModal) return null

  const handleUpdate = async () => {
    if (!selectedStatus || saving) return
    setSaving(true)
    setError('')
    try {
      await updateComplaintStatus(officerTicketModal.id, selectedStatus, note)
    } catch (error) { setError(error.message) }
    finally { setSaving(false) }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-fade-in">
      <div 
        className="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto border border-slate-200 flex flex-col"
        role="dialog"
        aria-modal="true"
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-indigo-100 text-indigo-700">
              <ShieldCheck size={18} />
            </span>
            <div>
              <h2 className="text-base font-bold text-slate-900">Officer Action &amp; Audit</h2>
              <span className="text-xs text-slate-500">{officerTicketModal.id} • {officerTicketModal.category}</span>
            </div>
          </div>
          <button
            onClick={() => setOfficerTicketModal(null)}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          {error && <p role="alert" className="text-xs text-rose-700">{error}</p>}
          <div>
            <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">Ticket Title</div>
            <h3 className="text-sm font-semibold text-slate-900 mt-1">{officerTicketModal.title}</h3>
            <p className="text-xs text-slate-600 mt-1 leading-relaxed bg-slate-50 p-2.5 rounded-lg border border-slate-200">
              {officerTicketModal.description}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200">
              <span className="text-slate-500 block">Locality</span>
              <b className="text-slate-800">{officerTicketModal.locality}</b>
            </div>
            <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200">
              <span className="text-slate-500 block">Current Status</span>
              <b className="text-violet-700">{officerTicketModal.status}</b>
            </div>
          </div>

          {/* Timeline / Audit trail */}
          <div>
            <div className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">Audit History</div>
            <div className="space-y-2 border-l-2 border-violet-200 pl-3 ml-1.5">
              {officerTicketModal.timeline.map((event, idx) => (
                <div key={idx} className="relative">
                  <div className={`absolute -left-[19px] top-1 w-2.5 h-2.5 rounded-full ${event.done ? 'bg-emerald-500 ring-4 ring-emerald-100' : 'bg-slate-300'}`} />
                  <div className="text-xs font-semibold text-slate-800">{event.step}</div>
                  <div className="text-[11px] text-slate-500">{event.time} — {event.desc}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Status Change Form */}
          <div className="pt-2 border-t border-slate-200 space-y-3">
            <label className="text-xs font-bold text-slate-700 block">Update Ticket Status</label>
            <select
              value={selectedStatus}
              disabled={saving || !NEXT_STATUS[officerTicketModal.status]}
              onChange={e => setSelectedStatus(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:border-violet-500 bg-white"
            >
              <option value="">Select new status...</option>
              {NEXT_STATUS[officerTicketModal.status] && <option value={NEXT_STATUS[officerTicketModal.status]}>{NEXT_STATUS[officerTicketModal.status]} (Internal status)</option>}
            </select>

            <textarea
              rows={2}
              value={note}
              maxLength={2000}
              onChange={e => setNote(e.target.value)}
              placeholder="Optional internal status note..."
              className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:border-violet-500 bg-white resize-none"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
          <button
            onClick={() => setOfficerTicketModal(null)}
            className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900"
          >
            Cancel
          </button>
          <button
            onClick={handleUpdate}
            disabled={!selectedStatus || saving}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-700 disabled:opacity-50 text-white text-xs font-semibold shadow-md shadow-violet-600/20 transition-all"
          >
            {saving ? 'Saving?' : 'Apply Status Update'} <ArrowRight size={14} />
          </button>
        </div>
      </div>
    </div>
  )
}

