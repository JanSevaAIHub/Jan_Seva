import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import {
  Compass,
  Search,
  CheckCircle2,
  Clock,
  MapPin,
  Building,
  Calendar,
  FileCheck,
  AlertCircle,
  ArrowRight,
  ShieldCheck
} from 'lucide-react'
import { useApp } from '../context/AppContext'

export function TrackStatus() {
  const [searchParams] = useSearchParams()
  const initialId = searchParams.get('id') || 'REQ-2025-11428'

  const { complaints, setPackageModalComplaint, addToast } = useApp()
  const [searchId, setSearchId] = useState(initialId)
  const [selectedTicket, setSelectedTicket] = useState(
    complaints.find(c => c.id.toLowerCase() === initialId.toLowerCase()) || complaints[0]
  )

  const handleSearch = (e) => {
    e?.preventDefault()
    if (!searchId.trim()) return

    const found = complaints.find(
      c => c.id.toLowerCase() === searchId.trim().toLowerCase()
    )

    if (found) {
      setSelectedTicket(found)
      addToast(`Found tracking record for ${found.id}`, 'success')
    } else {
      addToast(`No ticket found matching "${searchId}"`, 'warning')
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 text-xs text-slate-500 mb-1">
          <Link to="/" className="hover:text-violet-600">Home</Link>
          <span>&gt;</span>
          <span className="font-semibold text-slate-800">Track Status</span>
        </div>
        <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
          Track Grievance Status
        </h1>
        <p className="text-xs text-slate-500">
          Enter your JanSeva Request ID to view live internal resolution milestones and official filing status.
        </p>
      </div>

      {/* Search Bar Card */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200/90 shadow-sm">
        <form onSubmit={handleSearch} className="flex flex-col sm:flex-row items-center gap-3">
          <div className="flex-1 w-full flex items-center gap-2.5 bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 focus-within:border-violet-500 focus-within:ring-2 focus-within:ring-violet-100 transition-all">
            <Search size={18} className="text-slate-400 flex-none" />
            <input
              type="text"
              value={searchId}
              onChange={e => setSearchId(e.target.value)}
              placeholder="Enter Request ID (e.g. REQ-2025-11428, REQ-2025-11587)..."
              className="w-full bg-transparent text-xs text-slate-800 placeholder-slate-400 focus:outline-none py-1 font-mono uppercase"
            />
          </div>
          <button
            type="submit"
            className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-xs font-bold shadow-sm transition-all hover:scale-105 active:scale-95"
          >
            Track Request
          </button>
        </form>

        {/* Quick select pills */}
        <div className="flex items-center gap-2 mt-3 pt-3 border-t border-slate-100 text-xs text-slate-500 flex-wrap">
          <span className="font-medium">Recent Tickets:</span>
          {complaints.slice(0, 3).map(c => (
            <button
              key={c.id}
              type="button"
              onClick={() => {
                setSearchId(c.id)
                setSelectedTicket(c)
              }}
              className={`px-2.5 py-1 rounded-lg font-mono text-[11px] transition-all ${
                selectedTicket?.id === c.id
                  ? 'bg-violet-100 text-violet-800 font-bold'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
              }`}
            >
              {c.id}
            </button>
          ))}
        </div>
      </div>

      {/* Ticket Details & Timeline Display */}
      {selectedTicket ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
          {/* Left: Summary Card */}
          <div className="lg:col-span-6 bg-white rounded-2xl p-6 border border-slate-200/90 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <span className="font-mono text-sm font-bold text-violet-700 bg-violet-50 px-3 py-1 rounded-xl border border-violet-100">
                {selectedTicket.id}
              </span>
              <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                selectedTicket.status === 'RESOLVED' ? 'bg-emerald-100 text-emerald-800' :
                selectedTicket.status === 'IN_PROGRESS' ? 'bg-teal-100 text-teal-800' :
                'bg-amber-100 text-amber-800'
              }`}>
                {selectedTicket.status.replace('_', ' ')}
              </span>
            </div>

            <div>
              <h2 className="text-lg font-bold text-slate-900 leading-snug">{selectedTicket.title}</h2>
              <p className="text-xs text-slate-600 mt-2 leading-relaxed bg-slate-50 p-3 rounded-xl border border-slate-200/80">
                {selectedTicket.description}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs pt-1">
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                <span className="text-[11px] text-slate-400 block mb-0.5">Assigned Department</span>
                <span className="font-bold text-slate-800">{selectedTicket.department || 'Urban Infrastructure Dept'}</span>
              </div>
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                <span className="text-[11px] text-slate-400 block mb-0.5">Priority Level</span>
                <span className="font-bold text-rose-600">{selectedTicket.priority}</span>
              </div>
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                <span className="text-[11px] text-slate-400 block mb-0.5">Date Submitted</span>
                <span className="font-semibold text-slate-700">{selectedTicket.submittedAt}</span>
              </div>
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                <span className="text-[11px] text-slate-400 block mb-0.5">Expected Resolution</span>
                <span className="font-semibold text-teal-700">{selectedTicket.expectedResolution}</span>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 text-xs">
              <span className="text-[11px] text-slate-400 block mb-0.5">Locality / Landmark</span>
              <div className="flex items-center gap-1.5 font-semibold text-slate-700">
                <MapPin size={14} className="text-rose-500" />
                <span>{selectedTicket.locality}</span>
              </div>
            </div>

            {selectedTicket.officerNotes && (
              <div className="p-3 rounded-xl bg-indigo-50 border border-indigo-100 text-xs text-indigo-950">
                <span className="font-bold block mb-1">Nodal Officer Note:</span>
                <p className="leading-relaxed">{selectedTicket.officerNotes}</p>
              </div>
            )}

            <button
              type="button"
              onClick={() => setPackageModalComplaint(selectedTicket)}
              className="w-full inline-flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold shadow-sm transition-all"
            >
              <FileCheck size={16} />
              <span>Copy Official Complaint Package</span>
            </button>
          </div>

          {/* Right: Progression Stepper */}
          <div className="lg:col-span-6 bg-white rounded-2xl p-6 border border-slate-200/90 shadow-sm space-y-4">
            <h3 className="text-sm font-bold text-slate-900">Milestone Progress &amp; Audit Timeline</h3>

            <div className="space-y-6 pl-2 pt-2">
              {selectedTicket.timeline.map((step, idx) => (
                <div key={idx} className="flex items-start gap-4 relative">
                  {idx < selectedTicket.timeline.length - 1 && (
                    <div
                      className={`absolute left-3.5 top-7 w-0.5 h-12 ${
                        step.done ? 'bg-emerald-500' : 'bg-slate-200'
                      }`}
                    />
                  )}

                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center flex-none z-10 text-xs font-bold ${
                      step.done
                        ? step.active
                          ? 'bg-violet-600 text-white ring-4 ring-violet-100 shadow-md'
                          : 'bg-emerald-500 text-white shadow-sm'
                        : 'bg-slate-100 text-slate-400 border border-slate-200'
                    }`}
                  >
                    {step.done ? <CheckCircle2 size={16} /> : idx + 1}
                  </div>

                  <div className="space-y-1">
                    <div className="text-xs font-bold text-slate-900">{step.step}</div>
                    <div className="text-[11px] font-semibold text-slate-400">{step.time}</div>
                    <p className="text-xs text-slate-600 leading-relaxed">{step.desc}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-6 p-4 rounded-xl bg-amber-50 border border-amber-200/70 text-xs text-amber-900 space-y-1">
              <div className="font-bold flex items-center gap-1.5">
                <ShieldCheck size={15} className="text-amber-700" />
                <span>Notice on Official Government Channels</span>
              </div>
              <p className="text-[11px] leading-relaxed text-amber-800">
                This timeline represents JanSeva internal municipal triage. Official resolution occurs under your jurisdiction's municipal portal or CPGRAMS registration ID.
              </p>
            </div>
          </div>
        </div>
      ) : (
        <div className="p-12 text-center bg-white rounded-2xl border border-slate-200 text-slate-500 text-xs">
          No request selected. Enter an ID above to track status.
        </div>
      )}
    </div>
  )
}

