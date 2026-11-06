import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  Bell,
  CheckCircle2,
  AlertCircle,
  FileText,
  Clock,
  Check,
  Trash2,
  ArrowRight,
  ShieldCheck
} from 'lucide-react'
import { useApp } from '../context/AppContext'

export function NotificationsPage() {
  const navigate = useNavigate()
  const { notifications, markNotificationsRead, addToast } = useApp()
  const [filter, setFilter] = useState('ALL') // 'ALL' | 'UNREAD'

  const filtered = notifications.filter(n => {
    if (filter === 'UNREAD') return !n.read
    return true
  })

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 text-xs text-slate-500 mb-1">
            <Link to="/" className="hover:text-violet-600">Home</Link>
            <span>&gt;</span>
            <span className="font-semibold text-slate-800">Notifications</span>
          </div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
            Notifications &amp; Activity Updates
          </h1>
          <p className="text-xs text-slate-500">
            Real-time status updates on your grievances, newly matched public schemes, and document actions.
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            markNotificationsRead()
            addToast('All notifications marked as read', 'info')
          }}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold shadow-xs transition-all self-start sm:self-auto"
        >
          <Check size={14} className="text-violet-600" />
          <span>Mark all as read</span>
        </button>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2">
        <button
          onClick={() => setFilter('ALL')}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all ${
            filter === 'ALL' ? 'bg-violet-600 text-white shadow-sm' : 'bg-white text-slate-600 border border-slate-200'
          }`}
        >
          All Updates ({notifications.length})
        </button>
        <button
          onClick={() => setFilter('UNREAD')}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all ${
            filter === 'UNREAD' ? 'bg-violet-600 text-white shadow-sm' : 'bg-white text-slate-600 border border-slate-200'
          }`}
        >
          Unread ({notifications.filter(n => !n.read).length})
        </button>
      </div>

      {/* Notifications List */}
      <div className="space-y-3">
        {filtered.map(item => (
          <div
            key={item.id}
            className={`p-4 rounded-2xl border transition-all ${
              item.read
                ? 'bg-white border-slate-200'
                : 'bg-violet-50/60 border-violet-200/90 shadow-xs'
            } flex items-start justify-between gap-4`}
          >
            <div className="flex items-start gap-3.5">
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-none ${
                item.type === 'status' ? 'bg-teal-100 text-teal-700' :
                item.type === 'scheme' ? 'bg-violet-100 text-violet-700' :
                'bg-amber-100 text-amber-700'
              }`}>
                {item.type === 'status' && <Clock size={18} />}
                {item.type === 'scheme' && <CheckCircle2 size={18} />}
                {item.type === 'document' && <FileText size={18} />}
              </div>

              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <h3 className="text-xs font-bold text-slate-900">{item.title}</h3>
                  {!item.read && (
                    <span className="w-2 h-2 rounded-full bg-violet-600 flex-none" />
                  )}
                </div>
                <p className="text-xs text-slate-600 leading-relaxed max-w-xl">{item.message}</p>
                <div className="text-[11px] text-slate-400 font-medium pt-1">{item.time}</div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {item.type === 'status' && (
                <button
                  type="button"
                  onClick={() => navigate('/track')}
                  className="px-3 py-1.5 rounded-lg bg-white border border-slate-200 hover:border-violet-300 text-xs font-semibold text-violet-700 hover:bg-violet-50 transition-all flex items-center gap-1"
                >
                  <span>Track</span>
                  <ArrowRight size={13} />
                </button>
              )}
              {item.type === 'scheme' && (
                <button
                  type="button"
                  onClick={() => navigate('/schemes')}
                  className="px-3 py-1.5 rounded-lg bg-white border border-slate-200 hover:border-violet-300 text-xs font-semibold text-violet-700 hover:bg-violet-50 transition-all flex items-center gap-1"
                >
                  <span>View Scheme</span>
                  <ArrowRight size={13} />
                </button>
              )}
            </div>
          </div>
        ))}

        {filtered.length === 0 && (
          <div className="p-12 text-center bg-white rounded-2xl border border-slate-200 text-slate-500 text-xs space-y-2">
            <Bell size={28} className="mx-auto text-slate-300" />
            <div className="font-bold text-slate-700">No unread notifications</div>
            <p className="text-slate-400">You are completely up to date.</p>
          </div>
        )}
      </div>
    </div>
  )
}

