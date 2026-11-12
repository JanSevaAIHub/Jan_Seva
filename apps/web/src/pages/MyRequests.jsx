import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  ClipboardList,
  CheckCircle2,
  Clock,
  ArrowRight,
  FileCheck,
  Plus,
  ShieldCheck,
  Filter,
  ExternalLink,
  MapPin,
  Calendar
} from 'lucide-react'
import { useApp } from '../context/AppContext'
import { ComplaintFeedback } from '../components/complaints/ComplaintFeedback'

export function MyRequests() {
  const { complaints, complaintsLoading, complaintsError, refreshComplaints, setPackageModalComplaint } = useApp()
  useEffect(() => { refreshComplaints() }, [])
  const [statusFilter, setStatusFilter] = useState('ALL')

  const filteredComplaints = complaints.filter(c => {
    if (statusFilter === 'ALL') return true
    return c.status === statusFilter
  })

  return (
    <div className="space-y-5">
      <ComplaintFeedback />
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 text-xs text-slate-500 mb-1">
            <Link to="/" className="hover:text-violet-600">Home</Link>
            <span>&gt;</span>
            <span className="font-semibold text-slate-800">My Requests</span>
          </div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
            My Complaints
          </h1>
          <p className="text-xs text-slate-500">
            Follow JanSeva internal status updates, audit history, and official filing packages.
          </p>
        </div>

        <Link
          to="/complaints/new"
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-xs font-semibold shadow-sm transition-all self-start sm:self-auto hover:scale-105"
        >
          <Plus size={16} />
          <span>Raise New Complaint</span>
        </Link>
      </div>

      {/* Filter Tabs */}
      <div className="flex flex-wrap items-center gap-1.5 bg-white p-1.5 rounded-2xl border border-slate-200 shadow-sm max-w-fit">
        {[
          { key: 'ALL', label: `All (${complaints.length})` },
          { key: 'LOCAL_SUBMITTED', label: 'Submitted' },
          { key: 'UNDER_REVIEW', label: 'Under Review' },
          { key: 'IN_PROGRESS', label: 'In Progress' },
          { key: 'RESOLVED', label: 'Resolved' },
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => setStatusFilter(tab.key)}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
              statusFilter === tab.key
                ? 'bg-violet-600 text-white shadow-sm'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Complaints List Cards */}
      <div className="space-y-4">
        {filteredComplaints.map(item => (
          <div
            key={item.id}
            className="bg-white rounded-2xl border border-slate-200 hover:border-violet-300 p-5 shadow-sm hover:shadow-md transition-all space-y-4"
          >
            {/* Top row */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <span className="font-mono text-xs font-bold text-violet-700 bg-violet-50 px-2.5 py-1 rounded-lg border border-violet-100">
                  {item.id}
                </span>
                <span className="text-xs text-slate-500 font-medium flex items-center gap-1">
                  <Calendar size={13} /> {item.submittedAt}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                  item.status === 'RESOLVED' ? 'bg-emerald-100 text-emerald-800' :
                  item.status === 'IN_PROGRESS' ? 'bg-teal-100 text-teal-800' :
                  item.status === 'UNDER_REVIEW' ? 'bg-indigo-100 text-indigo-800' :
                  'bg-amber-100 text-amber-800'
                }`}>
                  {item.status.replace('_', ' ')}
                </span>
                <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-slate-100 text-slate-600">
                  Priority: {item.priority}
                </span>
              </div>
            </div>

            {/* Details */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-start">
              <div className="md:col-span-7 space-y-2">
                <Link to={`/track?id=${item.id}`} className="text-base font-bold text-slate-900 hover:text-violet-700">{item.title}</Link>
                <Link to={`/track?id=${item.id}`} className="block text-xs font-bold text-violet-700">View details &amp; audit history</Link>
                <p className="text-xs text-slate-600 leading-relaxed">{item.description}</p>
                <p className="text-xs text-slate-500">Category: {item.category} | Government filing: {item.officialStatus === 'USER_REPORTED_FILED' ? 'User-reported filed (unverified)' : 'Not filed'}</p>
                <div className="flex items-center gap-1.5 text-xs text-slate-500">
                  <MapPin size={13} className="text-slate-400 flex-none" />
                  <span>{item.locality}</span>
                </div>
                {item.officerNotes && (
                  <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/80 text-xs text-slate-700">
                    <span className="font-bold text-slate-900 block text-[11px] mb-0.5">Department Note:</span>
                    {item.officerNotes}
                  </div>
                )}
              </div>

              {/* Progress Stepper on the right */}
              <div className="md:col-span-5 bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-2.5">
                <div className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                  Internal Resolution Timeline
                </div>

                <div className="space-y-2 text-xs">
                  {item.timeline.map((step, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <div className={`w-4 h-4 rounded-full flex items-center justify-center flex-none text-[9px] ${
                        step.done
                          ? 'bg-emerald-500 text-white'
                          : 'bg-slate-200 text-slate-500'
                      }`}>
                        {step.done ? '✓' : idx + 1}
                      </div>
                      <span className={`text-[11px] font-medium flex-1 ${step.done ? 'text-slate-800' : 'text-slate-400'}`}>
                        {step.step}
                      </span>
                      <span className="text-[10px] text-slate-400">{step.time}</span>
                    </div>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={() => setPackageModalComplaint(item)}
                  className="w-full mt-2 inline-flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold transition-all"
                >
                  <FileCheck size={14} />
                  <span>Copy Official Filing Package</span>
                </button>
              </div>
            </div>
          </div>
        ))}

        {filteredComplaints.length === 0 && !complaintsLoading && !complaintsError && (
          <div className="p-12 text-center bg-white rounded-2xl border border-slate-200 text-slate-500 text-xs space-y-3">
            <ClipboardList size={32} className="mx-auto text-slate-400" />
            <div className="font-bold text-slate-800">No requests found</div>
            <p>You have not logged any requests matching this status filter yet.</p>
          </div>
        )}
      </div>
    </div>
  )
}
