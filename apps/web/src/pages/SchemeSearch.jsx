import { useState, useRef, useEffect } from 'react'
import { Link } from 'react-router-dom'
import {
  Search,
  Sparkles,
  Send,
  Mic,
  Bot,
  User,
  ExternalLink,
  Bookmark,
  CheckCircle2,
  AlertCircle,
  FileText,
  Filter,
  ArrowRight,
  ShieldCheck,
  Check,
  Building,
  CreditCard,
  Heart,
  Home as HomeIcon,
  ChevronDown
} from 'lucide-react'
import { useApp } from '../context/AppContext'

export function SchemeSearch() {
  const {
    schemes,
    schemesLoading, schemesError, schemeChatError, loadSchemes,
    savedSchemeIds,
    toggleSaveScheme,
    setActiveSchemeModal,
    schemeSearchQuery,
    setSchemeSearchQuery,
    chatMessages,
    sendChatMessage,
    isAiTyping,
    currentUser,
    selectedState, setSelectedState
  } = useApp()

  const [activeTab, setActiveTab] = useState('all') // 'recommended' | 'all' | 'saved'
  const [sectorFilter, setSectorFilter] = useState('All')
  const [chatInput, setChatInput] = useState('')
  const chatBottomRef = useRef(null)

  // Scroll chat to bottom when message arrives
  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [chatMessages, isAiTyping])

  useEffect(() => {
    if (schemeSearchQuery.trim().length > 0 && schemeSearchQuery.trim().length < 3) return
    const timer = setTimeout(() => loadSchemes({ query: schemeSearchQuery, state: selectedState, category: sectorFilter }), 300)
    return () => clearTimeout(timer)
  }, [schemeSearchQuery, selectedState, sectorFilter, loadSchemes])

  const handleSendChat = async event => {
    event?.preventDefault()
    if (!chatInput.trim() || isAiTyping) return
    const question = chatInput
    if (await sendChatMessage(question, sectorFilter)) setChatInput(current => current === question ? '' : current)
  }

  const filteredSchemes = schemes.filter(scheme => {
    if (schemeSearchQuery.trim().length > 0 && schemeSearchQuery.trim().length < 3) return false
    if (activeTab === 'recommended' && scheme.evidence_kind !== 'reviewed_paraphrase') return false
    if (activeTab === 'saved' && !savedSchemeIds.includes(scheme.id)) return false
    return true
  })
  const officialSources = [...new Map(schemes.map(s => [s.sourceUrl, { url: s.sourceUrl, name: s.sourceTitle }])).values()]

  const getSchemeIcon = (type) => {
    switch (type) {
      case 'credit-card': return <CreditCard size={18} className="text-amber-600" />
      case 'shield': return <ShieldCheck size={18} className="text-teal-600" />
      case 'heart': return <Heart size={18} className="text-rose-600" />
      case 'home': return <HomeIcon size={18} className="text-indigo-600" />
      default: return <Sparkles size={18} className="text-emerald-600" />
    }
  }

  return (
    <div className="space-y-4">
      {/* Breadcrumb & Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <div className="flex items-center gap-2 text-xs text-slate-500 mb-1">
            <Link to="/" className="hover:text-violet-600">Home</Link>
            <span>&gt;</span>
            <span className="font-semibold text-slate-800">Scheme Discovery</span>
          </div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
            Discover Government Schemes with AI
          </h1>
          <p className="text-xs text-slate-500">
            Search reviewed official scheme evidence. Check published conditions; this service does not determine your eligibility.
          </p>
        </div>
      </div>

      {/* Main 3-Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* ================= LEFT COLUMN: AI Chat Assistant (4 Cols) ================= */}
        <div className="lg:col-span-4 bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col h-[750px] overflow-hidden">
          {/* Chat Header */}
          <div className="p-3.5 px-4 bg-slate-900 text-white flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-violet-600 flex items-center justify-center text-white shadow-sm">
                <Bot size={18} />
              </div>
              <div>
                <div className="text-xs font-bold flex items-center gap-1.5">
                  <span>JanSeva AI Assistant</span>
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                </div>
                <div className="text-[10px] text-slate-300">Answers from stored source evidence</div>
              </div>
            </div>
          </div>

          {/* Chat Message Scroll Area */}
          <div className="flex-1 p-4 overflow-y-auto space-y-3.5 bg-slate-50/50">
            {chatMessages.map(msg => (
              <div
                key={msg.id}
                className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}
              >
                <div
                  className={`max-w-[88%] p-3.5 rounded-2xl text-xs leading-relaxed ${
                    msg.sender === 'user'
                      ? 'bg-violet-600 text-white rounded-br-none shadow-sm'
                      : 'bg-white text-slate-800 rounded-bl-none border border-slate-200 shadow-sm space-y-2'
                  }`}
                >
                  <p className="whitespace-pre-line">{msg.text}</p>

                  {/* Bullet points for scheme recommendations */}
                  {msg.bullets && (
                    <ul className="space-y-1.5 pt-1 border-t border-slate-100">
                      {msg.bullets.map((b, i) => (
                        <li key={i} className="flex items-start gap-1.5 text-slate-700">
                          <CheckCircle2 size={13} className="text-emerald-600 flex-none mt-0.5" />
                          <span>{b}</span>
                        </li>
                      ))}
                    </ul>
                  )}

                  {msg.footnote && (
                    <p className="text-[11px] text-slate-500 pt-1 italic border-t border-slate-100">
                      {msg.footnote}
                    </p>
                  )}

                  {/* Citations */}
                  {msg.citations && (
                    <div className="pt-1 flex flex-wrap gap-1">
                      {msg.citations.map((c, i) => (
                        <a
                          key={i}
                          href={c.url}
                          title={`${c.excerpt} ? reviewed ${new Date(c.reviewed_at).toLocaleDateString()}`}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 text-[10px] text-violet-700 bg-violet-50 px-2 py-0.5 rounded-md hover:underline font-medium"
                        >
                          <ExternalLink size={10} />
                          {c.title}
                        </a>
                      ))}
                    </div>
                  )}
                </div>
                <span className="text-[10px] text-slate-400 mt-1 px-1">{msg.time}</span>
              </div>
            ))}

            {chatMessages.length === 0 && <p className="text-xs text-slate-500">Ask about the reviewed collection. Answers include source links; missing evidence will be stated.</p>}
            {schemeChatError && <p role="alert" className="text-xs text-rose-700">{schemeChatError} Your question is kept so you can retry.</p>}
            {isAiTyping && (
              <div className="flex items-center gap-1.5 p-3 rounded-2xl bg-white border border-slate-200 text-slate-500 text-xs w-28">
                <span className="w-1.5 h-1.5 rounded-full bg-violet-600 animate-bounce" />
                <span className="w-1.5 h-1.5 rounded-full bg-violet-600 animate-bounce [animation-delay:0.2s]" />
                <span className="w-1.5 h-1.5 rounded-full bg-violet-600 animate-bounce [animation-delay:0.4s]" />
                <span className="text-[11px] font-medium ml-1">Thinking...</span>
              </div>
            )}
            <div ref={chatBottomRef} />
          </div>

          {/* Quick Chat Suggestions */}
          <div className="p-2 bg-white border-t border-slate-100 flex gap-1.5 overflow-x-auto text-[11px]">
            <button
              disabled={isAiTyping}
              onClick={() => sendChatMessage('What documents do I need for PM Kisan?', sectorFilter)}
              className="px-2.5 py-1 rounded-full bg-slate-100 hover:bg-violet-50 hover:text-violet-700 text-slate-600 whitespace-nowrap"
            >
              PM Kisan docs?
            </button>
            <button
              disabled={isAiTyping}
              onClick={() => sendChatMessage('What documents are required for Sukanya Samriddhi Yojana?', sectorFilter)}
              className="px-2.5 py-1 rounded-full bg-slate-100 hover:bg-violet-50 hover:text-violet-700 text-slate-600 whitespace-nowrap"
            >
              SSY documents?
            </button>
          </div>

          {/* Sticky Chat Input */}
          <form onSubmit={handleSendChat} className="p-3 bg-white border-t border-slate-200 flex items-center gap-2">
            <input
              type="text"
              value={chatInput}
              minLength={3}
              maxLength={1000}
              onChange={e => setChatInput(e.target.value)}
              placeholder="Ask a follow-up question..."
              className="flex-1 px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-violet-500"
            />
            <button
              type="button"
              className="p-2 text-slate-400 hover:text-violet-600 rounded-lg hover:bg-slate-100 transition-colors"
              title="Voice input is not enabled"
              disabled
            >
              <Mic size={16} />
            </button>
            <button
              type="submit"
              aria-label="Send question"
              disabled={chatInput.trim().length < 3 || isAiTyping}
              className="p-2 rounded-xl bg-violet-600 hover:bg-violet-700 disabled:opacity-50 text-white shadow-sm transition-all"
            >
              <Send size={15} />
            </button>
          </form>
        </div>

        {/* ================= MIDDLE COLUMN: Scheme Cards & Filters (5 Cols) ================= */}
        <div className="lg:col-span-5 space-y-4">
          {/* Tabs: Recommended, All, Saved */}
          <div className="flex flex-wrap items-center justify-between bg-white p-1.5 rounded-2xl border border-slate-200 shadow-sm">
            <div className="flex flex-wrap gap-1">
              <button
                onClick={() => setActiveTab('recommended')}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                  activeTab === 'recommended'
                    ? 'bg-violet-600 text-white shadow-sm'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                Reviewed Sources ({schemes.filter(s => s.evidence_kind === 'reviewed_paraphrase').length})
              </button>
              <button
                onClick={() => setActiveTab('all')}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                  activeTab === 'all'
                    ? 'bg-violet-600 text-white shadow-sm'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                All Schemes ({schemes.length})
              </button>
              <button
                onClick={() => setActiveTab('saved')}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                  activeTab === 'saved'
                    ? 'bg-violet-600 text-white shadow-sm'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                Saved ({savedSchemeIds.length})
              </button>
            </div>
          </div>

          {/* Filter Bar */}
          <div className="bg-white p-3 rounded-2xl border border-slate-200 shadow-sm flex flex-wrap items-center gap-2 text-xs">
            <div className="flex items-center gap-1.5 text-slate-500 font-medium">
              <Filter size={14} className="text-violet-600" />
              <span>Filters:</span>
            </div>

            <select
              aria-label="Scheme category"
              value={sectorFilter}
              onChange={e => setSectorFilter(e.target.value)}
              className="px-2.5 py-1 rounded-lg border border-slate-200 text-xs font-medium text-slate-700 bg-slate-50 focus:outline-none"
            >
              <option value="All">All Sectors</option>
              <option value="Agriculture">Sector: Agriculture</option>
              <option value="Education">Sector: Education</option>
              <option value="Insurance">Sector: Insurance</option>
              <option value="Savings">Sector: Savings</option>
              <option value="Employment">Sector: Employment</option>
              <option value="Social Welfare">Sector: Social Welfare</option>
            </select>

            <select aria-label="Scheme state" value={selectedState} onChange={e => setSelectedState(e.target.value)} className="px-2.5 py-1 rounded-lg border border-slate-200 text-xs bg-slate-50">
              <option value="All">All states</option><option value="Punjab">Punjab + National</option>
              <option value="Haryana">Haryana + National</option><option value="Uttar Pradesh">Uttar Pradesh + National</option>
            </select>
            <div className="flex-1 min-w-[140px] relative">
              <Search size={14} className="absolute left-2.5 top-2 text-slate-400" />
              <input
                type="text"
                value={schemeSearchQuery}
                onChange={e => setSchemeSearchQuery(e.target.value)}
                placeholder="Search scheme name or keyword..."
                className="w-full pl-8 pr-3 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-none focus:border-violet-500"
              />
            </div>
          </div>

          {schemesLoading && <p role="status" className="text-xs text-slate-500">Loading schemes from the database?</p>}
          {schemesError && <p role="alert" className="text-xs text-rose-700">{schemesError} <button onClick={() => loadSchemes({ query: schemeSearchQuery, state: selectedState, category: sectorFilter })} className="underline">Retry search</button></p>}
          {schemeSearchQuery.trim().length > 0 && schemeSearchQuery.trim().length < 3 && <p className="text-xs text-slate-500">Enter at least three characters to search.</p>}
          {/* Scheme Cards List */}
          <div className="space-y-3.5">
            {filteredSchemes.map(scheme => {
              const isSaved = savedSchemeIds.includes(scheme.id)
              return (
                <div
                  key={scheme.id}
                  className="bg-white rounded-2xl border border-slate-200 hover:border-violet-300 p-5 shadow-sm hover:shadow-md transition-all duration-200 space-y-3"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center flex-none">
                        {getSchemeIcon(scheme.iconType)}
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-slate-900 leading-snug">{scheme.title}</h3>
                        <p className="text-[11px] text-slate-500 line-clamp-1">{scheme.benefitShort} &bull; {scheme.category}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 flex-none">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold ${
                        scheme.eligibilityStatus === 'POTENTIAL'
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-amber-100 text-amber-800'
                      }`}>
                        <CheckCircle2 size={11} />
                        Published conditions
                      </span>
                      <button
                        onClick={() => toggleSaveScheme(scheme.id)}
                        className={`p-1.5 rounded-lg border transition-colors ${
                          isSaved ? 'bg-violet-50 text-violet-700 border-violet-200' : 'text-slate-400 hover:text-slate-600 border-slate-200'
                        }`}
                        aria-label="Save scheme"
                      >
                        <Bookmark size={15} fill={isSaved ? 'currentColor' : 'none'} />
                      </button>
                    </div>
                  </div>

                  <p className="text-xs text-slate-600 leading-relaxed line-clamp-2">
                    {scheme.description}
                  </p>

                  {/* Metadata Chips */}
                  <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
                    <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 font-semibold">
                      {scheme.benefitShort}
                    </span>
                    <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-600">
                      {scheme.type}
                    </span>
                    <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-600">
                      {scheme.target}
                    </span>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                    <button
                      onClick={() => setActiveSchemeModal(scheme)}
                      className="text-xs font-semibold text-violet-700 hover:text-violet-900 inline-flex items-center gap-1 hover:underline"
                    >
                      View Details &amp; Citation &rarr;
                    </button>

                    <a
                      href={scheme.sourceUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-xs font-semibold shadow-sm transition-all hover:scale-105 active:scale-95"
                    >
                      <span>Official Source</span>
                      <ExternalLink size={12} />
                    </a>
                  </div>
                </div>
              )
            })}

            {filteredSchemes.length === 0 && !schemesLoading && !schemesError && (
              <div className="p-8 text-center bg-white rounded-2xl border border-slate-200 text-slate-500 text-xs">
                No schemes match the selected filters or search query.
              </div>
            )}
          </div>
        </div>

        {/* ================= RIGHT COLUMN: Profile & Documents (3 Cols) ================= */}
        <div className="lg:col-span-3 space-y-4">
          {/* User Profile Card */}
          <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-violet-600 text-white flex items-center justify-center font-bold text-sm">
                {currentUser.avatar}
              </div>
              <div>
                <h4 className="text-xs font-bold text-slate-900">{currentUser.name}</h4>
                <p className="text-[11px] text-slate-500">{currentUser.occupation} &bull; {selectedState}</p>
              </div>
            </div>

            {/* Profile Completeness */}
            <div>
              <div className="flex items-center justify-between text-[11px] mb-1">
                <span className="text-slate-500 font-medium">Profile Completeness</span>
                <span className="font-bold text-violet-700">{currentUser.completeness}%</span>
              </div>
              <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                <div
                  className="bg-gradient-to-r from-violet-600 to-teal-500 h-full rounded-full transition-all duration-500"
                  style={{ width: `${currentUser.completeness}%` }}
                />
              </div>
            </div>
          </div>

          {/* Eligibility & Documents Accordion */}
          <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                Eligibility &amp; Documents
              </h4>
              <span className="text-[10px] text-slate-400 font-medium">Not assessed</span>
            </div>

            <div className="space-y-2 text-xs">
              {currentUser.documents?.map(doc => (
                <div key={doc.id} className="flex items-center justify-between p-2 rounded-lg bg-slate-50 border border-slate-100">
                  <div className="flex items-center gap-2">
                    {doc.verified ? (
                      <CheckCircle2 size={14} className="text-emerald-600 flex-none" />
                    ) : (
                      <span className="w-3.5 h-3.5 rounded-full border border-amber-400 flex items-center justify-center text-[9px] text-amber-600">○</span>
                    )}
                    <span className="text-slate-700 text-[11px]">{doc.name}</span>
                  </div>
                  <span className={`text-[10px] font-semibold ${doc.verified ? 'text-emerald-700' : 'text-amber-600'}`}>
                    {doc.verified ? 'Verified' : 'Pending'}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Official Sources Card */}
          <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm space-y-2.5">
            <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
              <ShieldCheck size={14} className="text-teal-600" />
              Official Sources
            </h4>
            <p className="text-[11px] text-slate-500 leading-relaxed">
              Source links for the records returned by the database:
            </p>

            <div className="space-y-1.5 pt-1">
              {officialSources.slice(0, 3).map(source => (
                <a
                  key={source.url}
                  href={source.url}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center justify-between p-2 rounded-lg hover:bg-slate-50 border border-slate-100 text-xs font-medium text-slate-700 group transition-colors"
                >
                  <span className="text-[11px] group-hover:text-violet-700">{source.name}</span>
                  <ExternalLink size={12} className="text-slate-400 group-hover:text-violet-600" />
                </a>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
