import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  Siren,
  MapPin,
  Upload,
  X,
  Sparkles,
  CheckCircle2,
  Clock,
  AlertCircle,
  FileCheck,
  ChevronRight,
  ShieldCheck,
  Image as ImageIcon,
  Flame,
  Info
} from 'lucide-react'
import { useApp } from '../context/AppContext'
import { ComplaintFeedback } from '../components/complaints/ComplaintFeedback'

const SAMPLE_PHOTO_PREVIEW = 'https://images.unsplash.com/photo-1517486808906-6ca8b3f04846?auto=format&fit=crop&w=400&q=80'

export function ComplaintForm() {
  const navigate = useNavigate()
  const {
    session,
    activeComplaint,
    complaints,
    setReviewModalComplaint,
    setPackageModalComplaint,
    addToast
  } = useApp()

  const [activeTab, setActiveTab] = useState('new') // 'new' | 'my-complaints'
  const [createdTicket, setCreatedTicket] = useState(null)
  useEffect(() => { setCreatedTicket(null) }, [session?.user.id])
  
  // Form fields
  const [title, setTitle] = useState('')
  const [category, setCategory] = useState('Streetlight & Public Lighting')
  const [description, setDescription] = useState('')
  const [locality, setLocality] = useState('')
  const [priority, setPriority] = useState('Medium')
  const [hasPhoto, setHasPhoto] = useState(false)
  const [aiDetected, setAiDetected] = useState(false)

  // Auto-detect category from title typing
  const handleTitleChange = (val) => {
    setTitle(val)
    const lower = val.toLowerCase()
    if (lower.includes('water') || lower.includes('pipe') || lower.includes('drain')) {
      setCategory('Water Supply & Drainage')
      setAiDetected(true)
    } else if (lower.includes('road') || lower.includes('pothole') || lower.includes('traffic')) {
      setCategory('Roads & Potholes')
      setAiDetected(true)
    } else if (lower.includes('garbage') || lower.includes('waste') || lower.includes('clean')) {
      setCategory('Sanitation & Garbage')
      setAiDetected(true)
    } else if (lower.includes('light') || lower.includes('street') || lower.includes('lamp')) {
      setCategory('Streetlight & Public Lighting')
      setAiDetected(true)
    }
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!title.trim() || !description.trim()) {
      addToast('Please enter both title and description', 'warning')
      return
    }

    // Open the Review Modal before committing!
    setReviewModalComplaint({
      title,
      category,
      description,
      locality,
      priority,
      department: category === 'Streetlight & Public Lighting' ? 'Urban Infrastructure Dept' :
                  category === 'Roads & Potholes' ? 'Roads & Transport Dept' :
                  category === 'Sanitation & Garbage' ? 'Sanitation Dept' : 'Water Supply Dept',
      evidenceCount: 0,
      onSuccess: (savedTicket) => {
        setCreatedTicket(savedTicket)
        setTitle('')
        setDescription('')
        setLocality('')
        setHasPhoto(false)
        setAiDetected(false)
      }
    })
  }

  return (
    <div className="space-y-4">
      <ComplaintFeedback />
      {/* Breadcrumb & Title */}
      <div>
        <div className="flex items-center gap-2 text-xs text-slate-500 mb-1">
          <Link to="/" className="hover:text-violet-600">Home</Link>
          <span>&gt;</span>
          <span className="font-semibold text-slate-800">Raise Complaint</span>
        </div>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
              Raise a Civic Grievance
            </h1>
            <p className="text-xs text-slate-500">
              Report local municipal issues and track internal review. Government filing remains a separate manual step.
            </p>
          </div>

          {/* Tab Selector */}
          <div className="flex bg-slate-100 p-1 rounded-xl">
            <button
              onClick={() => setActiveTab('new')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeTab === 'new' ? 'bg-violet-600 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              New Complaint
            </button>
            <button
              onClick={() => navigate('/requests')}
              className="px-3.5 py-1.5 rounded-lg text-xs font-semibold text-slate-600 hover:text-slate-900"
            >
              My Complaints ({complaints.length})
            </button>
          </div>
        </div>
      </div>

      {/* Newly Created Ticket Success Banner */}
      {createdTicket && createdTicket.user_id === session?.user.id && (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200/90 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-fade-in">
          <div className="flex items-start sm:items-center gap-3">
            <div className="p-2 rounded-xl bg-emerald-100 text-emerald-700 flex-none mt-0.5 sm:mt-0">
              <CheckCircle2 size={20} />
            </div>
            <div>
              <div className="text-xs font-bold text-emerald-950 flex items-center gap-2">
                <span>Internal Ticket Successfully Saved!</span>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-200/70 text-emerald-900">
                  {createdTicket.status}
                </span>
              </div>
              <div className="text-xs text-emerald-800 flex items-center gap-1.5 mt-1 flex-wrap">
                <span className="font-medium text-emerald-700">Tracking ID:</span>
                <code className="font-mono font-bold bg-white px-2 py-0.5 rounded border border-emerald-300 text-emerald-900 text-xs">
                  {createdTicket.id}
                </code>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap pt-2 sm:pt-0 border-t sm:border-t-0 border-emerald-200/60">
            <button
              type="button"
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(createdTicket.id)
                  addToast('Tracking ID copied to clipboard!', 'success')
                } catch {
                  addToast('Could not copy. Select the tracking ID and copy it manually.', 'warning')
                }
              }}
              className="px-3 py-1.5 rounded-xl bg-white border border-emerald-300 text-emerald-800 text-xs font-semibold hover:bg-emerald-100/50 shadow-sm transition-all"
            >
              Copy ID
            </button>
            <Link
              to={`/track?id=${encodeURIComponent(createdTicket.id)}`}
              className="px-3 py-1.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold shadow-sm transition-all"
            >
              Track Status &rarr;
            </Link>
            <button
              type="button"
              onClick={() => setPackageModalComplaint(createdTicket)}
              className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold shadow-sm transition-all"
            >
              View Package
            </button>
            <button
              type="button"
              onClick={() => setCreatedTicket(null)}
              className="p-1.5 text-emerald-700 hover:text-emerald-900 hover:bg-emerald-100 rounded-lg"
              title="Dismiss"
            >
              <X size={16} />
            </button>
          </div>
        </div>
      )}

      {/* Main Grid: Form Left (7 Cols) + Tracker Right (5 Cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Left: Interactive Complaint Form */}
        <form onSubmit={handleSubmit} className="lg:col-span-7 bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-4">
          {/* Issue Title */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                Issue Title *
              </label>
              <button
                type="button"
                onClick={() => { setTitle('[SYNTHETIC] Streetlight needs repair'); setDescription('Synthetic demonstration only: a streetlight requires internal review.'); setLocality('[SYNTHETIC] Test Ward'); setCategory('Streetlight & Public Lighting'); setAiDetected(false) }}
                className="text-[10px] text-violet-600 hover:underline"
              >
                Load sample
              </button>
            </div>
            <input
              type="text"
              required
              minLength={3}
              maxLength={250}
              value={title}
              onChange={e => handleTitleChange(e.target.value)}
              placeholder="e.g. Streetlight not working near City Park"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs focus:outline-none focus:border-violet-500 font-medium text-slate-800"
            />
          </div>

          {/* Category Dropdown with AI Badge */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                Category *
              </label>
              {aiDetected && (
                <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-violet-700 bg-violet-50 px-2 py-0.5 rounded-full border border-violet-100">
                  <Sparkles size={11} className="text-violet-600" />
                  Keyword suggestion (editable)
                </span>
              )}
            </div>
            <select
              value={category}
              onChange={e => {
                setCategory(e.target.value)
                setAiDetected(false)
              }}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-medium text-slate-800 bg-white focus:outline-none focus:border-violet-500"
            >
              <option value="Streetlight & Public Lighting">Streetlight &amp; Public Lighting</option>
              <option value="Roads & Potholes">Roads &amp; Potholes</option>
              <option value="Water Supply & Drainage">Water Supply &amp; Drainage</option>
              <option value="Sanitation & Garbage">Sanitation &amp; Garbage</option>
              <option value="Public Transport">Public Transport</option>
              <option value="Other">Other Civic Grievance</option>
            </select>
          </div>

          {/* Description */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                Description *
              </label>
              <span className="text-[10px] text-slate-400">{description.length}/500</span>
            </div>
            <textarea
              rows={4}
              minLength={10}
              required
              maxLength={500}
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Describe what happened, exact location landmark, and when it started..."
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs focus:outline-none focus:border-violet-500 text-slate-800 leading-relaxed resize-none"
            />
          </div>

          {/* Location Box with Simulated Map Pin */}
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <MapPin size={15} className="text-rose-500" />
                Approximate Location
              </span>
              <button
                type="button"
                onClick={() => addToast('Map preview only. Enter your locality below; GPS is not connected.', 'info')}
                className="text-[10px] font-semibold text-violet-600 hover:underline"
              >
                Map preview only
              </button>
            </div>

            {/* Map Visual Simulation */}
            <div className="relative h-24 rounded-lg overflow-hidden border border-slate-200 bg-slate-200 flex items-center justify-center">
              <div className="absolute inset-0 opacity-40 bg-[radial-gradient(#94a3b8_1px,transparent_1px)] [background-size:12px_12px]" />
              <div className="z-10 flex flex-col items-center">
                <div className="w-8 h-8 rounded-full bg-rose-500 text-white flex items-center justify-center shadow-lg animate-bounce">
                  <MapPin size={16} />
                </div>
                <span className="text-[10px] font-bold bg-white/95 px-2 py-0.5 rounded shadow mt-1 text-slate-800">
                  {locality.split(',')[0]}
                </span>
              </div>
            </div>

            <input
              type="text"
              aria-label="Locality"
              placeholder="Enter locality or landmark"
              value={locality}
              required
              minLength={2}
              maxLength={250}
              onChange={e => setLocality(e.target.value)}
              className="w-full text-xs bg-white px-3 py-1.5 rounded-lg border border-slate-200 text-slate-700 focus:outline-none"
            />
          </div>

          {/* Priority Selector (3 Clickable Cards) */}
          <div>
            <label className="text-xs font-bold text-slate-800 uppercase tracking-wider block mb-2">
              Urgency / Priority
            </label>
            <div className="grid grid-cols-3 gap-2.5">
              {[
                { label: 'Low', time: 'Preview only', tone: 'text-slate-700' },
                { label: 'Medium', time: 'Preview only', tone: 'text-violet-700' },
                { label: 'High', time: 'Preview only', tone: 'text-rose-600' }
              ].map(p => (
                <button
                  key={p.label}
                  type="button"
                  onClick={() => setPriority(p.label)}
                  className={`p-2.5 rounded-xl border text-center transition-all ${
                    priority === p.label
                      ? 'border-violet-600 bg-violet-50/70 ring-2 ring-violet-200 shadow-sm'
                      : 'border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <div className={`text-xs font-bold ${p.tone}`}>{p.label}</div>
                  <div className="text-[10px] text-slate-400 mt-0.5">{p.time}</div>
                </button>
              ))}
            </div>
          </div>

          <p className="text-[11px] text-slate-500">Priority and response-time estimates are not assessed or saved in this phase.</p>
          {/* Upload Evidence */}
          <div>
            <label className="text-xs font-bold text-slate-800 uppercase tracking-wider block mb-2">
              Upload Evidence
            </label>
            <div className="flex items-center gap-3">
              {hasPhoto ? (
                <div className="relative w-20 h-20 rounded-xl overflow-hidden border border-slate-200 group">
                  <img
                    src={SAMPLE_PHOTO_PREVIEW}
                    alt="Evidence preview"
                    className="w-full h-full object-cover"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      setHasPhoto(false)
                      addToast('Sample preview hidden. No attachment was uploaded.', 'info')
                    }}
                    className="absolute top-1 right-1 p-1 bg-black/70 hover:bg-black text-white rounded-full transition-colors"
                  >
                    <X size={12} />
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    setHasPhoto(true)
                    addToast('Sample preview only; attachments are not uploaded in this phase.', 'info')
                  }}
                  className="w-20 h-20 rounded-xl border-2 border-dashed border-slate-300 hover:border-violet-400 flex flex-col items-center justify-center text-slate-400 hover:text-violet-600 transition-colors"
                >
                  <Upload size={18} />
                  <span className="text-[9px] font-bold mt-1">Preview</span>
                </button>
              )}

              <div className="text-xs text-slate-500 leading-relaxed">
                <div>Sample preview only; attachments are not saved.</div>
                <div className="text-[11px] text-slate-400">Location is stored as the locality text you enter.</div>
              </div>
            </div>
          </div>

          {/* Similar Complaints (AI Suggestion Alert) */}
          <div className="p-3.5 rounded-xl bg-indigo-50/70 border border-indigo-200/80 flex items-start gap-2.5">
            <Sparkles size={16} className="text-indigo-600 flex-none mt-0.5" />
            <div className="text-xs text-indigo-950 leading-relaxed">
              <strong>Similar Complaints:</strong> Duplicate detection is not enabled in this phase.
            </div>
          </div>

          <p className="text-[11px] text-slate-500">Draft storage is unavailable. Your values stay in this form for review or retry; refreshing clears unsaved values.</p>
          {/* Action Buttons */}
          <div className="flex items-center justify-between pt-3 border-t border-slate-100">
            <button
              type="button"
              disabled
              title="Draft storage is unavailable; form values remain while you review or retry."
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 border border-slate-200 rounded-xl hover:bg-slate-50"
            >
              Save as Draft
            </button>
            <button
              type="submit"
              className="px-6 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-xs font-bold shadow-md shadow-violet-600/20 transition-all hover:scale-[1.02] active:scale-95"
            >
              Submit Complaint
            </button>
          </div>
        </form>

        {/* Right: Live Complaint Tracker (Track Your Complaints) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Track Your Complaints</h3>
                <p className="text-xs text-slate-500">Live progress of active ticket</p>
              </div>
              <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-teal-100 text-teal-800">
                {activeComplaint?.status.replace('_', ' ')}
              </span>
            </div>

            {/* Ticket Card Details */}
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 space-y-1">
              <div className="text-xs font-bold text-violet-700 break-all">{activeComplaint?.id}</div>
              <div className="text-xs font-semibold text-slate-800">{activeComplaint?.title}</div>
              <div className="text-[11px] text-slate-500">{activeComplaint?.locality}</div>
            </div>

            {/* Stepper Timeline */}
            <div className="space-y-4 pl-2 pt-2">
              {activeComplaint?.timeline.map((step, idx) => (
                <div key={idx} className="flex items-start gap-3 relative">
                  {/* Vertical connecting line */}
                  {idx < activeComplaint.timeline.length - 1 && (
                    <div
                      className={`absolute left-3.5 top-6 w-0.5 h-10 ${
                        step.done ? 'bg-emerald-500' : 'bg-slate-200'
                      }`}
                    />
                  )}

                  {/* Step icon */}
                  <div
                    className={`w-7 h-7 rounded-full flex items-center justify-center flex-none z-10 text-xs font-bold ${
                      step.done
                        ? step.active
                          ? 'bg-violet-600 text-white ring-4 ring-violet-100 animate-pulse'
                          : 'bg-emerald-500 text-white shadow-sm'
                        : 'bg-slate-100 text-slate-400 border border-slate-200'
                    }`}
                  >
                    {step.done ? <CheckCircle2 size={15} /> : idx + 1}
                  </div>

                  <div className="space-y-0.5">
                    <div className="text-xs font-bold text-slate-900">{step.step}</div>
                    <div className="text-[11px] text-slate-500">{step.time}</div>
                    <div className="text-[11px] text-slate-600">{step.desc}</div>
                  </div>
                </div>
              ))}
            </div>

            {/* Differentiator Action: Copy Official Complaint Package */}
            <div className="pt-3 border-t border-slate-100">
              <button
                type="button"
                disabled={!activeComplaint}
                onClick={() => setPackageModalComplaint(activeComplaint)}
                className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold shadow-sm transition-all"
              >
                <FileCheck size={15} />
                <span>View &amp; Copy Official Package</span>
              </button>
            </div>
          </div>

          {/* Official Reality Card */}
          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 text-xs text-slate-600 space-y-2">
            <div className="flex items-center gap-1.5 font-bold text-slate-800">
              <ShieldCheck size={16} className="text-teal-600" />
              Official Government Filing Boundary
            </div>
            <p className="text-[11px] text-slate-500 leading-relaxed">
              JanSeva tracks internal review only. To file a government grievance, copy your complaint package and submit it yourself on the appropriate official channel. Internal resolution does not confirm government resolution.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
