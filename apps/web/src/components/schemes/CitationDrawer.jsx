import { X, ExternalLink } from 'lucide-react'
import { useApp } from '../../context/AppContext'
import { useDialog } from '../../lib/useDialog'
import { validCitation } from '../../lib/schemes'

export function CitationDrawer() {
  const { activeCitation, setActiveCitation } = useApp()
  const valid = validCitation(activeCitation)
  const dialogRef = useDialog(valid, () => setActiveCitation(null))
  if (!valid) return null
  return <div className="scheme-discovery fixed inset-0 z-[60] bg-slate-950/60 flex justify-end">
    <aside role="dialog" aria-modal="true" aria-label="Source evidence" ref={dialogRef} tabIndex={-1}
      className="scheme-dialog bg-white w-full max-w-xl h-full overflow-y-auto p-5 space-y-4 shadow-2xl">
      <div className="flex justify-between items-start gap-3"><h2 className="text-lg font-bold">Source evidence</h2>
        <button aria-label="Close source evidence" onClick={() => setActiveCitation(null)} className="p-2 rounded-lg hover:bg-slate-100"><X size={20} /></button>
      </div>
      <h3 className="font-semibold">{activeCitation.title}</h3>
      <p className="text-xs text-slate-500">Reviewed {new Date(activeCitation.reviewed_at).toLocaleDateString()}. Curated source summary, not a verbatim government quotation.</p>
      <blockquote className="text-sm whitespace-pre-line bg-slate-50 border border-slate-200 rounded-xl p-4">{activeCitation.excerpt}</blockquote>
      <p className="text-xs break-all text-slate-600">{activeCitation.url}</p>
      <a href={activeCitation.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 bg-violet-600 text-white px-4 py-2 rounded-xl text-xs font-semibold">Open official source <ExternalLink size={14} /></a>
      <p className="text-xs text-slate-500">Review current terms with the administering authority. This evidence does not guarantee eligibility or an open application window.</p>
    </aside>
  </div>
}
