import { useEffect, useState } from 'react'
import {
  ShieldCheck,
  TrendingUp,
  Clock,
  CheckCircle2,
  AlertTriangle,
  GitBranch,
  Layers,
  Sparkles,
  ArrowRight,
  Filter,
  Check,
  Building,
  Calendar,
  MoreVertical,
  ExternalLink,
  ChevronDown
} from 'lucide-react'
import { useApp } from '../context/AppContext'
import { ComplaintFeedback } from '../components/complaints/ComplaintFeedback'

export function Officer() {
  const {
    currentUser,
    switchUserRole,
    complaints,
    setOfficerTicketModal,
    loadComplaint,
    refreshComplaints,
    complaintsLoading,
    complaintsError,
    routingItems,
    handleRouteAction,
    addToast
  } = useApp()

  const [deptFilter, setDeptFilter] = useState('all')
  const [timeFilter, setTimeFilter] = useState('All time')

  useEffect(() => { refreshComplaints() }, [])
  const [detailError, setDetailError] = useState('')
  const [opening, setOpening] = useState(null)
  const openTicket = async id => {
    setOpening(id)
    setDetailError('')
    try { setOfficerTicketModal(await loadComplaint(id)) }
    catch (error) { setDetailError(error.message) }
    finally { setOpening(null) }
  }
  const days = timeFilter === 'Last 7 Days' ? 7 : timeFilter === 'Last 30 Days' ? 30 : Infinity
  const queue = currentUser.role === 'officer' ? complaints.filter(ticket =>
    (deptFilter === 'all' || ticket.categoryCode === deptFilter) &&
    Date.now() - new Date(ticket.created_at).getTime() <= days * 86400000) : []
  const countStatus = status => queue.filter(t => t.status === status).length
  const queueUnavailable = complaintsLoading || Boolean(complaintsError)
  const kpis = {
    totalRequests: queue.length, pendingReview: countStatus('LOCAL_SUBMITTED'),
    inProgress: countStatus('IN_PROGRESS'), resolved: countStatus('RESOLVED'),
    underReview: countStatus('UNDER_REVIEW'),
  }
  const trendPoints = Array.from({ length: 5 }, (_, i) => {
    const day = new Date(Date.now() - (4 - i) * 86400000).toISOString().slice(0, 10)
    return { label: day.slice(5),
      received: queue.filter(t => t.created_at.slice(0, 10) === day).length,
      resolved: queue.reduce((total, t) => total + t.events.filter(e => e.new_status === 'RESOLVED' && e.old_status !== 'RESOLVED' && e.event_time.slice(0, 10) === day).length, 0),
    }
  })
  const chartMax = Math.max(1, ...trendPoints.flatMap(p => [p.received, p.resolved]))
  const chartY = value => 140 - value / chartMax * 120
  const chartPath = field => trendPoints.map((p, i) => `${i ? 'L' : 'M'} ${50 + i * 80} ${chartY(p[field])}`).join(' ')
  const categories = [
    { key: 'water', name: 'Water Supply', color: '#3b82f6' },
    { key: 'streetlight', name: 'Streetlight', color: '#8b5cf6' },
    { key: 'road', name: 'Roads', color: '#f59e0b' },
    { key: 'sanitation', name: 'Sanitation', color: '#10b981' },
    { key: 'other', name: 'Others', color: '#94a3b8' },
  ].map(c => ({ ...c, pct: queue.length ? queue.filter(t => t.categoryCode === c.key).length / queue.length * 100 : 0 }))

  if (currentUser.role !== 'officer') return (
    <div className="space-y-5">
      <h1 className="text-2xl font-extrabold text-slate-900">Officer Dashboard</h1>
      <ComplaintFeedback />
      <p className="text-xs">A verified officer account is required to open the authorized queue.</p>
      <button onClick={() => switchUserRole('officer')} className="px-4 py-2 rounded-xl bg-violet-600 text-white text-xs font-bold">Officer Sign In</button>
    </div>
  )

  return (
    <div className="space-y-5">
      <ComplaintFeedback />
      {detailError && <p role="alert" className="text-xs text-rose-700">{detailError}</p>}
      {complaintsError && <p className="text-xs text-slate-500">Counts are unavailable. Any charts or rows shown reflect previously loaded records until refresh succeeds.</p>}
      {/* Header and Filter Row */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-indigo-100 text-indigo-800 border border-indigo-200">
              OFFICER INTERNAL CONSOLE
            </span>
            <span className="text-xs text-slate-400">Verified officer account</span>
          </div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
            Officer Dashboard
          </h1>
          <p className="text-xs text-slate-500">
            Manage citizen requests, streamline department resolution, and monitor service performance.
          </p>
        </div>

        {/* Right filter dropdowns */}
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={deptFilter}
            onChange={e => setDeptFilter(e.target.value)}
            className="px-3 py-1.5 text-xs font-semibold rounded-xl bg-white border border-slate-200 text-slate-700 focus:outline-none shadow-sm"
          >
            <option value="all">All categories</option>
            <option value="road">Roads</option>
            <option value="water">Water Supply</option>
            <option value="sanitation">Sanitation</option>
            <option value="streetlight">Streetlight</option>
            <option value="other">Other</option>
          </select>

          <select
            value={timeFilter}
            onChange={e => setTimeFilter(e.target.value)}
            className="px-3 py-1.5 text-xs font-semibold rounded-xl bg-white border border-slate-200 text-slate-700 focus:outline-none shadow-sm"
          >
            <option value="Last 30 Days">Last 30 Days</option>
            <option value="Last 7 Days">Last 7 Days</option>
            <option value="All time">All time</option>
          </select>

          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-50 border border-indigo-200/80 text-xs font-bold text-indigo-800">
            <ShieldCheck size={14} className="text-indigo-600" />
            <span>{currentUser.name} (Officer)</span>
          </div>
        </div>
      </div>

      {/* 5 Top KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-1">
          <div className="flex items-center justify-between text-xs text-slate-500 font-medium">
            <span>Total Requests</span>
            <span className="p-1 rounded-lg bg-blue-50 text-blue-600"><Layers size={15} /></span>
          </div>
          <div className="text-2xl font-black text-slate-900">{queueUnavailable ? '-' : kpis.totalRequests.toLocaleString()}</div>
          <div className="text-[11px] font-bold text-emerald-600 flex items-center gap-0.5">
            <span>Authorized queue</span>
            <span className="text-slate-400 font-normal ml-1">Current filter</span>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-1">
          <div className="flex items-center justify-between text-xs text-slate-500 font-medium">
            <span>Pending Review</span>
            <span className="p-1 rounded-lg bg-amber-50 text-amber-600"><Clock size={15} /></span>
          </div>
          <div className="text-2xl font-black text-slate-900">{queueUnavailable ? '-' : kpis.pendingReview}</div>
          <div className="text-[11px] font-bold text-emerald-600 flex items-center gap-0.5">
            <span>Authorized queue</span>
            <span className="text-slate-400 font-normal ml-1">Current filter</span>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-1">
          <div className="flex items-center justify-between text-xs text-slate-500 font-medium">
            <span>In Progress</span>
            <span className="p-1 rounded-lg bg-teal-50 text-teal-600"><GitBranch size={15} /></span>
          </div>
          <div className="text-2xl font-black text-slate-900">{queueUnavailable ? '-' : kpis.inProgress}</div>
          <div className="text-[11px] font-bold text-indigo-600 flex items-center gap-0.5">
            <span>Authorized queue</span>
            <span className="text-slate-400 font-normal ml-1">Current filter</span>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-1">
          <div className="flex items-center justify-between text-xs text-slate-500 font-medium">
            <span>Resolved</span>
            <span className="p-1 rounded-lg bg-emerald-50 text-emerald-600"><CheckCircle2 size={15} /></span>
          </div>
          <div className="text-2xl font-black text-slate-900">{queueUnavailable ? '-' : kpis.resolved}</div>
          <div className="text-[11px] font-bold text-emerald-600 flex items-center gap-0.5">
            <span>Authorized queue</span>
            <span className="text-slate-400 font-normal ml-1">Current filter</span>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-1 col-span-2 sm:col-span-1">
          <div className="flex items-center justify-between text-xs text-slate-500 font-medium">
            <span>Under Review</span>
            <span className="p-1 rounded-lg bg-violet-50 text-violet-600"><TrendingUp size={15} /></span>
          </div>
          <div className="text-2xl font-black text-slate-900">{queueUnavailable ? '-' : kpis.underReview}</div>
          <div className="text-[11px] font-bold text-emerald-600 flex items-center gap-0.5">
            <span>Authorized queue</span>
            <span className="text-slate-400 font-normal ml-1">Current filter</span>
          </div>
        </div>
      </div>

      {/* Middle Row: Trend Chart (Left), Category Donut (Middle), AI Duplicates (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Trend Chart (5 cols) */}
        <div className="lg:col-span-5 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Requests Trend</h3>
              <p className="text-[11px] text-slate-400">Last five UTC days in this queue</p>
            </div>
            <div className="flex items-center gap-3 text-[11px]">
              <span className="flex items-center gap-1 text-slate-600">
                <span className="w-2.5 h-2.5 rounded-full bg-violet-600" /> Received
              </span>
              <span className="flex items-center gap-1 text-slate-600">
                <span className="w-2.5 h-2.5 rounded-full bg-teal-500" /> Resolved
              </span>
            </div>
          </div>

          {/* Interactive SVG Line Graph */}
          <div className="relative pt-2">
            <svg viewBox="0 0 400 160" className="w-full h-44 overflow-visible">
              {/* Grid Lines */}
              <line x1="30" y1="20" x2="390" y2="20" stroke="#f1f5f9" strokeDasharray="3 3" />
              <line x1="30" y1="60" x2="390" y2="60" stroke="#f1f5f9" strokeDasharray="3 3" />
              <line x1="30" y1="100" x2="390" y2="100" stroke="#f1f5f9" strokeDasharray="3 3" />
              <line x1="30" y1="140" x2="390" y2="140" stroke="#e2e8f0" />

              {/* Y Axis labels */}
              <text x="5" y="24" fontSize="9" fill="#94a3b8">{chartMax}</text>
              <text x="5" y="64" fontSize="9" fill="#94a3b8">{Math.round(chartMax * 2 / 3)}</text>
              <text x="5" y="104" fontSize="9" fill="#94a3b8">{Math.round(chartMax / 3)}</text>
              <text x="15" y="144" fontSize="9" fill="#94a3b8">0</text>

              {/* Line 1: Received (Violet) */}
              <path
                d={chartPath('received')}
                fill="none"
                stroke="#6552ce"
                strokeWidth="3"
                strokeLinecap="round"
              />

              {/* Line 2: Resolved (Teal) */}
              <path
                d={chartPath('resolved')}
                fill="none"
                stroke="#00a8a0"
                strokeWidth="3"
                strokeLinecap="round"
              />

              {/* Points */}
              {trendPoints.map((pt, i) => {
                const cx = 50 + i * 80
                return (
                  <g key={pt.label} className="cursor-pointer">
                    <circle cx={cx} cy={chartY(pt.received)} r="4" fill="#6552ce" stroke="#fff" strokeWidth="2" />
                    <circle cx={cx} cy={chartY(pt.resolved)} r="4" fill="#00a8a0" stroke="#fff" strokeWidth="2" />
                    <text x={cx} y="155" textAnchor="middle" fontSize="9" fill="#64748b">{pt.label}</text>
                  </g>
                )
              })}
            </svg>
          </div>
        </div>

        {/* Requests by Category Donut Chart (4 cols) */}
        <div className="lg:col-span-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-3">
          <div>
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Requests by Category</h3>
            <p className="text-[11px] text-slate-400">Total volume distribution</p>
          </div>

          <div className="flex items-center justify-between gap-4 pt-1">
            {/* SVG Donut */}
            <div className="relative w-36 h-36 flex-none flex items-center justify-center">
              <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
                <circle cx="50" cy="50" r="38" fill="none" stroke="#f1f5f9" strokeWidth="14" />
                {categories.map((c, i) => <circle key={c.key} cx="50" cy="50" r="38" fill="none" stroke={c.color} strokeWidth="14"
                  strokeDasharray={`${c.pct / 100 * 238.76} 238.76`}
                  strokeDashoffset={-categories.slice(0, i).reduce((sum, item) => sum + item.pct, 0) / 100 * 238.76} />)}
              </svg>
              <div className="absolute flex flex-col items-center">
                <span className="text-xs font-black text-slate-900 leading-tight">{queue.length}</span>
                <span className="text-[9px] text-slate-400 font-medium">Total</span>
              </div>
            </div>

            {/* Legend */}
            <div className="space-y-1.5 text-xs flex-1">
              {categories.map(c => (
                <div key={c.name} className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: c.color }} />
                    <span className="text-slate-700 text-[11px]">{c.name}</span>
                  </div>
                  <span className="text-[11px] font-bold text-slate-800">{Math.round(c.pct)}%</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* AI Duplicate Detection Card (3 cols) */}
        <div className="lg:col-span-3 bg-gradient-to-br from-indigo-900 via-violet-900 to-slate-900 p-5 rounded-2xl text-white shadow-sm flex flex-col justify-between space-y-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="p-2 rounded-xl bg-white/10 text-teal-300">
                <Sparkles size={18} />
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-teal-400/20 text-teal-300 font-bold">
                Not available
              </span>
            </div>
            <h3 className="text-sm font-bold tracking-tight">AI Duplicate Detection</h3>
            <p className="text-xs text-violet-200 leading-relaxed">
              Duplicate detection is not enabled in this phase.
            </p>
          </div>

          <div className="space-y-2 pt-2 border-t border-white/10">
            <div className="text-[11px] text-slate-300">
              Review each assigned ticket and its audit history.
            </div>
            <button
              disabled
              className="w-full flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-white text-violet-900 hover:bg-violet-50 text-xs font-bold transition-all shadow-md active:scale-95"
            >
              <span>Review Duplicates</span>
              <ArrowRight size={13} />
            </button>
          </div>
        </div>
      </div>

      {/* Third Row: Department Routing AI + SLA Progress + AI Insights */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Department Routing AI Recommendation */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
              Department Routing (AI)
            </h3>
            <span className="text-[10px] text-violet-600 font-bold bg-violet-50 px-2 py-0.5 rounded-full">
              Not enabled
            </span>
          </div>

          <div className="space-y-2.5">
            {routingItems.map(item => (
              <div key={item.id} className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center justify-between text-xs">
                <div>
                  <div className="font-bold text-slate-800">{item.issue}</div>
                  <div className="text-[10px] text-slate-500">
                    &rarr; {item.targetDept} <span className="text-teal-600 font-bold">({item.confidence}%)</span>
                  </div>
                </div>
                <button
                  onClick={() => handleRouteAction(item.id, item.targetDept)}
                  className="px-2.5 py-1 rounded-lg bg-violet-600 hover:bg-violet-700 text-white text-[11px] font-semibold transition-all"
                >
                  Route
                </button>
              </div>
            ))}
            {routingItems.length === 0 && (
              <div className="p-4 text-center text-xs text-slate-400">Automated routing is not enabled.</div>
            )}
          </div>
        </div>

        {/* SLA Progress */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-3">
          <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
            SLA Progress
          </h3>

          <div className="space-y-3 pt-1 text-xs text-slate-500">No SLA targets are configured. Internal status does not certify government resolution.</div>
        </div>

        {/* AI Insights Card */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-3">
          <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800 uppercase tracking-wider">
            <Sparkles size={15} className="text-violet-600" />
            <span>Queue Overview (AI unavailable)</span>
          </div>

          <ul className="space-y-2.5 text-xs text-slate-600 leading-relaxed pt-1">
            <li>{kpis.pendingReview} submitted tickets await internal review.</li>
            <li>{kpis.inProgress} tickets are in progress in this queue.</li>
            <li>Advanced complaint AI is not enabled.</li>
          </ul>
        </div>
      </div>

      {/* Bottom Table: Pending Review (27) */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 px-5 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-900">Authorized Queue ({queue.length})</h3>
            <p className="text-xs text-slate-500">Review assigned tickets and update internal status</p>
          </div>
          <button
            onClick={() => refreshComplaints()}
            className="text-xs font-bold text-violet-600 hover:text-violet-800"
          >
            Refresh queue &rarr;
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider text-[10px]">
              <tr>
                <th className="py-3 px-4">Request ID</th>
                <th className="py-3 px-4">Issue Description</th>
                <th className="py-3 px-4">Location</th>
                <th className="py-3 px-4">Priority</th>
                <th className="py-3 px-4">Local Status</th>
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {queue.map(t => (
                <tr key={t.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="py-3.5 px-4 font-mono font-bold text-violet-700 whitespace-nowrap">{t.id}</td>
                  <td className="py-3.5 px-4 font-medium text-slate-900 max-w-xs truncate">{t.title}</td>
                  <td className="py-3.5 px-4 text-slate-600">{t.locality.split(',')[0]}</td>
                  <td className="py-3.5 px-4">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      t.priority === 'High' ? 'bg-rose-100 text-rose-800' : 'bg-amber-100 text-amber-800'
                    }`}>
                      {t.priority}
                    </span>
                  </td>
                  <td className="py-3.5 px-4">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      t.status === 'RESOLVED' ? 'bg-emerald-100 text-emerald-800' :
                      t.status === 'IN_PROGRESS' ? 'bg-teal-100 text-teal-800' :
                      'bg-slate-100 text-slate-700'
                    }`}>
                      {t.status}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-right">
                    <button
                      onClick={() => openTicket(t.id)}
                      disabled={Boolean(opening)}
                      className="px-3 py-1 rounded-lg bg-slate-100 hover:bg-violet-600 hover:text-white text-slate-700 font-semibold transition-all"
                    >
                      {opening === t.id ? 'Loading?' : 'Audit / Review'}
                    </button>
                  </td>
                </tr>
              ))}
              {queue.length === 0 && <tr><td colSpan={6} className="p-6 text-center text-slate-500">No assigned complaints match these filters.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
