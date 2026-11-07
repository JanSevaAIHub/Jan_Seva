import { X, ExternalLink, Bookmark, CheckCircle2, AlertCircle, FileText, ShieldCheck, Calendar } from 'lucide-react'
import { useApp } from '../../context/AppContext'
import { useDialog } from '../../lib/useDialog'

export function SchemeDetailModal() {
  const { activeSchemeModal, setActiveSchemeModal, savedSchemeIds, toggleSaveScheme } = useApp()
  const dialogRef = useDialog(Boolean(activeSchemeModal), () => setActiveSchemeModal(null))

  if (!activeSchemeModal) return null

  const isSaved = savedSchemeIds.includes(activeSchemeModal.id)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-fade-in">
      <div 
        className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-slate-200 flex flex-col"
        role="dialog"
        ref={dialogRef}
        tabIndex={-1}
        aria-modal="true"
      >
        {/* Header */}
        <div className="sticky top-0 bg-white/95 backdrop-blur-md px-6 py-4 border-b border-slate-100 flex items-center justify-between z-10">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-violet-50 text-violet-700 border border-violet-100">
              {activeSchemeModal.type}
            </span>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-teal-50 text-teal-700 border border-teal-100">
              {activeSchemeModal.target}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => toggleSaveScheme(activeSchemeModal.id)}
              className={`p-2 rounded-lg border transition-colors ${
                isSaved ? 'bg-violet-50 border-violet-200 text-violet-700' : 'border-slate-200 text-slate-500 hover:bg-slate-50'
              }`}
              title={isSaved ? 'Saved for this browsing session' : 'Save for later'}
            >
              <Bookmark size={18} fill={isSaved ? 'currentColor' : 'none'} />
            </button>
            <button
              aria-label="Close scheme details"
              onClick={() => setActiveSchemeModal(null)}
              className="p-2 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-6">
          <div>
            <h2 className="text-2xl font-bold text-slate-900 tracking-tight">{activeSchemeModal.title}</h2>
            <p className="text-sm text-slate-600 mt-2 leading-relaxed">{activeSchemeModal.description}</p>
          </div>

          {/* Benefit Highlight Card */}
          <div className="bg-gradient-to-r from-violet-50 via-indigo-50 to-teal-50 p-4 rounded-xl border border-violet-100/70 flex items-center justify-between">
            <div>
              <div className="text-xs uppercase tracking-wider font-bold text-violet-700">Scheme Benefit</div>
              <div className="text-xl font-extrabold text-slate-900 mt-0.5">{activeSchemeModal.benefit}</div>
            </div>
            <div className="text-right">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800">
                <CheckCircle2 size={13} /> Eligibility not assessed
              </span>
            </div>
          </div>

          {/* Official Grounded Source (Truthfulness Box) */}
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/80 space-y-2">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-xs font-bold text-slate-700">
                <ShieldCheck size={16} className="text-teal-600" />
                REVIEWED SUMMARY &amp; OFFICIAL SOURCE
              </span>
              <span className="flex items-center gap-1 text-[11px] text-slate-500">
                <Calendar size={12} /> Reviewed: {activeSchemeModal.lastReviewed}
              </span>
            </div>
            <blockquote className="text-xs text-slate-600 italic bg-white p-3 rounded-lg border border-slate-200">
              {activeSchemeModal.excerpt}
            </blockquote>
            <div className="flex items-center justify-between pt-1">
              <span className="text-xs text-slate-500">Source: <b className="text-slate-700">{activeSchemeModal.sourceTitle}</b></span>
              <a
                href={activeSchemeModal.sourceUrl}
                target="_blank"
                rel="noreferrer"
                className="text-xs font-medium text-violet-700 hover:text-violet-900 inline-flex items-center gap-1 hover:underline"
              >
                Visit official portal <ExternalLink size={12} />
              </a>
            </div>
          </div>

          {/* Matched Rules */}
          <div>
            <h3 className="text-sm font-bold text-slate-900 mb-2">Published Eligibility Conditions</h3>
            <ul className="space-y-1.5">
              {activeSchemeModal.matchedRules.map((rule, idx) => (
                <li key={idx} className="flex items-start gap-2 text-xs text-slate-700">
                  <CheckCircle2 size={14} className="text-emerald-600 flex-none mt-0.5" />
                  <span>{rule}</span>
                </li>
              ))}
              {activeSchemeModal.missingInfo?.map((missing, idx) => (
                <li key={idx} className="flex items-start gap-2 text-xs text-amber-700">
                  <AlertCircle size={14} className="text-amber-500 flex-none mt-0.5" />
                  <span>Missing info: {missing}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Required Documents */}
          <div>
            <h3 className="text-sm font-bold text-slate-900 mb-2">Verified Documents / Enrolment Records</h3>
            <p className="text-xs text-slate-500 mb-2">{activeSchemeModal.documentNote} {activeSchemeModal.requiredDocuments.length === 0 ? 'No complete checklist was verified for this source.' : ''}</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {activeSchemeModal.requiredDocuments.map((doc, idx) => (
                <div key={idx} className="flex items-center gap-2 p-2.5 rounded-lg bg-slate-50 border border-slate-100 text-xs text-slate-700 font-medium">
                  <FileText size={14} className="text-violet-600 flex-none" />
                  <span>{doc}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-slate-50 px-6 py-4 border-t border-slate-100 flex items-center justify-between">
          <button
            onClick={() => setActiveSchemeModal(null)}
            className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 transition-colors"
          >
            Close
          </button>
          <a
            href={activeSchemeModal.sourceUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-xs font-semibold shadow-md shadow-violet-600/20 transition-all hover:scale-[1.02]"
          >
            Check Official Source &amp; Current Terms <ExternalLink size={14} />
          </a>
        </div>
      </div>
    </div>
  )
}

