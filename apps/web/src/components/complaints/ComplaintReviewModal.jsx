import { X, ShieldAlert, ArrowRight, CheckCircle2, Building, MapPin, Tag } from 'lucide-react'
import { useApp } from '../../context/AppContext'

export function ComplaintReviewModal() {
  const { reviewModalComplaint, setReviewModalComplaint, addComplaint } = useApp()

  if (!reviewModalComplaint) return null

  const handleConfirm = () => {
    addComplaint(reviewModalComplaint)
    setReviewModalComplaint(null)
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
            <span className="p-1.5 rounded-lg bg-violet-100 text-violet-700">
              <CheckCircle2 size={18} />
            </span>
            <h2 className="text-base font-bold text-slate-900">Review Before Submission</h2>
          </div>
          <button
            onClick={() => setReviewModalComplaint(null)}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-4">
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/80 space-y-3">
            <div>
              <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Issue Title</div>
              <div className="text-sm font-semibold text-slate-900 mt-0.5">{reviewModalComplaint.title}</div>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-200/60">
              <div>
                <div className="text-[11px] font-medium text-slate-500 flex items-center gap-1">
                  <Tag size={12} /> Category
                </div>
                <div className="text-xs font-semibold text-slate-800 mt-0.5">{reviewModalComplaint.category}</div>
              </div>
              <div>
                <div className="text-[11px] font-medium text-slate-500 flex items-center gap-1">
                  <Building size={12} /> Suggested Dept
                </div>
                <div className="text-xs font-semibold text-slate-800 mt-0.5">{reviewModalComplaint.department || 'Urban Infrastructure Dept'}</div>
              </div>
            </div>

            <div className="pt-2 border-t border-slate-200/60">
              <div className="text-[11px] font-medium text-slate-500 flex items-center gap-1">
                <MapPin size={12} /> Locality
              </div>
              <div className="text-xs text-slate-700 mt-0.5">{reviewModalComplaint.locality}</div>
            </div>

            <div className="pt-2 border-t border-slate-200/60">
              <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Description</div>
              <p className="text-xs text-slate-600 mt-0.5 leading-relaxed bg-white p-2.5 rounded-lg border border-slate-200">
                {reviewModalComplaint.description}
              </p>
            </div>
          </div>

          {/* Explicit Scope Guardrail Notice */}
          <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200/80 flex items-start gap-2.5">
            <ShieldAlert size={18} className="text-amber-600 flex-none mt-0.5" />
            <div className="text-[11px] text-amber-900 leading-relaxed">
              <strong>Official Reality Notice:</strong> Submitting will create an internal JanSeva tracking ticket. 
              JanSeva does <em>not</em> file grievances directly into government portals without your manual action. 
              You will receive an official copyable package to file on CPGRAMS / Connect Punjab.
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
          <button
            onClick={() => setReviewModalComplaint(null)}
            className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900"
          >
            Edit Details
          </button>
          <button
            onClick={handleConfirm}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-xs font-semibold shadow-md shadow-violet-600/20 transition-all hover:scale-[1.02]"
          >
            Confirm &amp; Create Ticket <ArrowRight size={14} />
          </button>
        </div>
      </div>
    </div>
  )
}

