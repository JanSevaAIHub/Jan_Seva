import { useEffect, useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import {
  Search,
  Sparkles,
  ArrowRight,
  Mic,
  Layers,
  CheckSquare,
  Megaphone,
  MapPin,
  Users,
  Database,
  ClipboardList,
  CheckCircle2,
  FileText,
  Bookmark
} from 'lucide-react'
import { useApp } from '../context/AppContext'
import heroBg from '../assets/hero-bg.png'
import { ComplaintFeedback } from '../components/complaints/ComplaintFeedback'

const PROMPT_CHIPS = [
  '✦ PM Kisan eligibility',
  '✦ Raise road repair complaint',
  '✦ Scholarship for students',
  '✦ Track my request'
]

export function Home() {
  const navigate = useNavigate()
  const { setSchemeSearchQuery, complaints, schemes, loadSchemes, currentUser,
    complaintsLoading, complaintsError, schemesLoading, schemesError } = useApp()
  useEffect(() => { loadSchemes() }, [loadSchemes])
  const [query, setQuery] = useState('')

  const handleSearch = (e) => {
    e?.preventDefault()
    if (!query.trim()) return
    setSchemeSearchQuery(query)
    navigate('/schemes')
  }

  const handleChip = (chip) => {
    const text = chip.replace('✦ ', '')
    if (text.toLowerCase().includes('road') || text.toLowerCase().includes('complaint')) {
      navigate('/complaints/new')
    } else if (text.toLowerCase().includes('track')) {
      navigate('/track')
    } else {
      setSchemeSearchQuery(text)
      navigate('/schemes')
    }
  }

  return (
    <div className="space-y-6">
      {/* ================= HERO BANNER ================= */}
      <section 
        className="relative overflow-hidden rounded-[24px] border border-slate-200/90 shadow-sm min-h-[340px] flex items-center bg-cover bg-center"
        style={{
          backgroundImage: `url(${heroBg})`,
          backgroundPosition: 'right 30%',
          backgroundSize: 'cover'
        }}
      >
        {/* Soft gradient wash on left side so UI elements have 100% contrast */}
        <div className="absolute inset-0 bg-gradient-to-r from-white via-white/85 to-transparent w-full md:w-3/4 pointer-events-none" />

        {/* Content on Left */}
        <div className="relative z-10 p-6 md:p-10 max-w-2xl space-y-4">
          <div className="space-y-1">
            <h1 className="text-3xl md:text-[34px] font-extrabold tracking-tight leading-[1.18] text-[#1e1b4b]">
              <span className="text-[#3b3486] block">Your AI-Powered</span>
              <span>Citizen Services Assistant</span>
            </h1>
            <p className="text-xs md:text-sm text-slate-600 leading-relaxed max-w-md pt-1">
              Discover schemes, review published conditions, raise complaints and track requests — all in one place.
            </p>
          </div>

          {/* Floating AI Search Container */}
          <div className="bg-white/95 backdrop-blur-md rounded-2xl p-4 shadow-xl border border-white/80 space-y-3 max-w-xl">
            {/* Header */}
            <div className="flex items-center gap-1.5 text-xs font-bold text-[#4338ca]">
              <Sparkles size={15} className="text-[#6552ce]" />
              <span>Search reviewed schemes</span>
            </div>

            <p className="text-[11px] text-slate-500">Scheme search only. General-purpose chat and voice are not available here; ask source-grounded scheme questions on the next page.</p>
            {/* Input Row */}
            <form onSubmit={handleSearch} className="flex items-center gap-2 bg-white border border-slate-200/90 rounded-full px-4 py-1.5 shadow-sm focus-within:border-violet-500 focus-within:ring-2 focus-within:ring-violet-100 transition-all">
              <Search size={17} className="text-slate-400 flex-none" />
              <input
                type="text"
                value={query}
                minLength={3}
                maxLength={1000}
                onChange={e => setQuery(e.target.value)}
                placeholder="Search for schemes or published conditions..."
                className="w-full bg-transparent text-xs text-slate-800 placeholder-slate-400 focus:outline-none py-1"
              />
              <button
                type="button"
                disabled
                className="p-1.5 text-slate-400 hover:text-violet-600 rounded-full hover:bg-slate-100 transition-colors"
                title="Voice input is not available"
              >
                <Mic size={17} />
              </button>
              <button
                type="submit"
                className="flex-none w-8 h-8 rounded-full bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white flex items-center justify-center shadow-md transition-all hover:scale-105 active:scale-95"
                aria-label="Search schemes"
                disabled={query.trim().length < 3}
              >
                <ArrowRight size={15} />
              </button>
            </form>

            {/* Prompt Chips */}
            <div className="flex flex-wrap gap-2 pt-0.5">
              {PROMPT_CHIPS.map(chip => (
                <button
                  key={chip}
                  type="button"
                  onClick={() => handleChip(chip)}
                  className="px-3 py-1 rounded-full text-[11px] font-medium bg-white/90 hover:bg-violet-50 hover:text-violet-700 text-slate-600 border border-slate-200/80 shadow-xs transition-all active:scale-95"
                >
                  {chip}
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ================= 4 QUICK ACTION CARDS ================= */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* 1. Find Schemes */}
        <Link
          to="/schemes"
          className="group relative p-5 bg-white rounded-2xl border border-slate-200/80 hover:border-emerald-300 shadow-sm hover:shadow-md transition-all duration-200 flex flex-col justify-between min-h-[148px]"
        >
          <div>
            <div className="w-10 h-10 rounded-xl bg-[#e7f7f3] text-[#00a8a0] flex items-center justify-center font-bold mb-3 group-hover:scale-105 transition-transform">
              <Layers size={20} />
            </div>
            <h3 className="text-sm font-bold text-slate-900 group-hover:text-emerald-700 transition-colors">
              Find Schemes
            </h3>
            <p className="text-xs text-slate-500 mt-1 leading-relaxed">
              Discover relevant government schemes with AI
            </p>
          </div>
          <div className="self-end mt-2 text-emerald-600 group-hover:translate-x-1 transition-transform">
            <ArrowRight size={16} />
          </div>
        </Link>

        {/* 2. Check Eligibility */}
        <Link
          to="/schemes"
          className="group relative p-5 bg-white rounded-2xl border border-slate-200/80 hover:border-violet-300 shadow-sm hover:shadow-md transition-all duration-200 flex flex-col justify-between min-h-[148px]"
        >
          <div>
            <div className="w-10 h-10 rounded-xl bg-[#f0edff] text-[#6552ce] flex items-center justify-center font-bold mb-3 group-hover:scale-105 transition-transform">
              <CheckSquare size={20} />
            </div>
            <h3 className="text-sm font-bold text-slate-900 group-hover:text-violet-700 transition-colors">
              Check Eligibility
            </h3>
            <p className="text-xs text-slate-500 mt-1 leading-relaxed">
              Review published conditions; personal eligibility assessment is unavailable
            </p>
          </div>
          <div className="self-end mt-2 text-violet-600 group-hover:translate-x-1 transition-transform">
            <ArrowRight size={16} />
          </div>
        </Link>

        {/* 3. Raise Complaint */}
        <Link
          to="/complaints/new"
          className="group relative p-5 bg-white rounded-2xl border border-slate-200/80 hover:border-orange-300 shadow-sm hover:shadow-md transition-all duration-200 flex flex-col justify-between min-h-[148px]"
        >
          <div>
            <div className="w-10 h-10 rounded-xl bg-[#fff2e5] text-[#f58b30] flex items-center justify-center font-bold mb-3 group-hover:scale-105 transition-transform">
              <Megaphone size={20} />
            </div>
            <h3 className="text-sm font-bold text-slate-900 group-hover:text-orange-700 transition-colors">
              Raise Complaint
            </h3>
            <p className="text-xs text-slate-500 mt-1 leading-relaxed">
              Report civic issues and locality for internal tracking
            </p>
          </div>
          <div className="self-end mt-2 text-orange-500 group-hover:translate-x-1 transition-transform">
            <ArrowRight size={16} />
          </div>
        </Link>

        {/* 4. Track Requests */}
        <Link
          to="/track"
          className="group relative p-5 bg-white rounded-2xl border border-slate-200/80 hover:border-sky-300 shadow-sm hover:shadow-md transition-all duration-200 flex flex-col justify-between min-h-[148px]"
        >
          <div>
            <div className="w-10 h-10 rounded-xl bg-[#eaf3ff] text-[#0284c7] flex items-center justify-center font-bold mb-3 group-hover:scale-105 transition-transform">
              <MapPin size={20} />
            </div>
            <h3 className="text-sm font-bold text-slate-900 group-hover:text-sky-700 transition-colors">
              Track Requests
            </h3>
            <p className="text-xs text-slate-500 mt-1 leading-relaxed">
              View your saved tickets and internal status updates
            </p>
          </div>
          <div className="self-end mt-2 text-sky-600 group-hover:translate-x-1 transition-transform">
            <ArrowRight size={16} />
          </div>
        </Link>
      </section>

      {/* ================= BOTTOM SPLIT ROW ================= */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Left: Platform at a Glance */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-sm space-y-4">
          <h3 className="text-sm font-bold text-slate-900">Platform at a Glance</h3>
          <p className="text-[11px] text-slate-500">Loaded records for this account. Platform-wide statistics are not available.</p>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
            {/* Citizens Served */}
            <div className="flex flex-col items-center text-center p-3 rounded-xl hover:bg-slate-50 transition-colors">
              <div className="w-10 h-10 rounded-full bg-[#f3f0ff] text-[#7c3aed] flex items-center justify-center mb-2 shadow-xs">
                <Users size={18} />
              </div>
              <div className="text-lg font-black text-slate-900">{currentUser.role === 'guest' ? 'Guest' : currentUser.role}</div>
              <div className="text-[11px] text-slate-500 font-medium">Account role</div>
            </div>

            {/* Govt Schemes */}
            <div className="flex flex-col items-center text-center p-3 rounded-xl hover:bg-slate-50 transition-colors">
              <div className="w-10 h-10 rounded-full bg-[#eef2ff] text-[#4f46e5] flex items-center justify-center mb-2 shadow-xs">
                <Database size={18} />
              </div>
              <div className="text-lg font-black text-slate-900">{schemesLoading || schemesError ? '-' : schemes.length}</div>
              <div className="text-[11px] text-slate-500 font-medium">Loaded schemes</div>
            </div>

            {/* Requests Processed */}
            <div className="flex flex-col items-center text-center p-3 rounded-xl hover:bg-slate-50 transition-colors">
              <div className="w-10 h-10 rounded-full bg-[#fff7ed] text-[#ea580c] flex items-center justify-center mb-2 shadow-xs">
                <ClipboardList size={18} />
              </div>
              <div className="text-lg font-black text-slate-900">{complaintsLoading || complaintsError ? '-' : complaints.length}</div>
              <div className="text-[11px] text-slate-500 font-medium">Accessible tickets</div>
            </div>

            {/* On-time Resolution */}
            <div className="flex flex-col items-center text-center p-3 rounded-xl hover:bg-slate-50 transition-colors">
              <div className="w-10 h-10 rounded-full bg-[#ecfdf5] text-[#059669] flex items-center justify-center mb-2 shadow-xs">
                <CheckCircle2 size={18} />
              </div>
              <div className="text-lg font-black text-slate-900">{complaintsLoading || complaintsError ? '-' : complaints.filter(c => c.status === 'RESOLVED').length}</div>
              <div className="text-[11px] text-slate-500 font-medium">Internally resolved</div>
            </div>
          </div>
        </div>

        {/* Right: Your Recent Tickets */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900">Your Recent Tickets</h3>
            <Link to="/requests" className="text-xs font-semibold text-violet-600 hover:text-violet-800 flex items-center gap-0.5">
              <span>View All</span>
              <ArrowRight size={13} />
            </Link>
          </div>

          <ComplaintFeedback />
          {schemesError && <p role="alert" className="text-xs text-rose-700">{schemesError} <button onClick={() => loadSchemes()} className="underline">Retry schemes</button></p>}
          <div className="space-y-2.5">
            {complaints.slice(0, 3).map(ticket => (
              <Link key={ticket.id} to={`/track?id=${ticket.id}`} className="p-3 rounded-xl bg-slate-50/70 hover:bg-violet-50/50 border border-slate-100 transition-all flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center flex-none">
                    {ticket.status === 'RESOLVED' ? <CheckCircle2 size={16} /> : <ClipboardList size={16} />}
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs font-bold text-slate-900">{ticket.title}</div>
                    <div className="text-[11px] text-slate-500 break-all">{ticket.id}</div>
                    <div className="text-[11px] text-slate-500">{ticket.submittedAt}</div>
                  </div>
                </div>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#e6f4ea] text-[#137333]">{ticket.status.replaceAll('_', ' ')}</span>
              </Link>
            ))}
            {!complaintsLoading && !complaintsError && complaints.length === 0 && <p className="text-xs text-slate-500">No saved tickets are loaded. Create a complaint or sign in to view your records.</p>}
          </div>
        </div>
      </section>
    </div>
  )
}
