import { useApp } from '../../context/AppContext'
import { eligibilityLabels } from '../../lib/schemes'
import { fieldName } from '../../lib/schemeProfile'

export function EligibilityBadge({ result }) {
  return <span data-status={result?.status} className={`inline-flex rounded-full px-2 py-1 text-[10px] font-bold ${
    result?.status === 'POTENTIAL' ? 'bg-teal-50 text-teal-800' : result?.status === 'NOT_MATCHED' ? 'bg-rose-50 text-rose-800' : 'bg-orange-50 text-orange-900'}`}>
    {result ? eligibilityLabels[result.status] : 'Not checked'}
  </span>
}

export function EligibilityAssessment({ scheme, compact = false }) {
  const { eligibility, checkEligibility, setActiveCitation, setProfileEditing, setActiveSchemeModal } = useApp()
  const entry = eligibility[scheme.id]
  const result = entry?.result
  if (compact) return result ? <p className="text-[11px] text-slate-600">{result.reasons[0]}</p> : null
  return <section aria-label="Eligibility assessment" className="rounded-xl border border-slate-200 p-4 space-y-3 text-xs">
    <div className="flex flex-wrap items-center justify-between gap-2"><h3 className="font-bold">Your eligibility check</h3><EligibilityBadge result={result} /></div>
    <p className="text-slate-600">Deterministic checks of reviewed conditions. A potential match is not official approval. No LLM decides eligibility.</p>
    {entry?.loading && <p role="status">Checking your supplied information…</p>}
    {entry?.error && <p role="alert" className="text-rose-700">{entry.error}</p>}
    {result && <div aria-live="polite" className="space-y-2">
      {result.matched_rules.length > 0 && <div><h4 className="font-semibold">Matched conditions</h4><ul className="list-disc pl-4">{result.matched_rules.map((rule, i) => <li key={i}>{rule}</li>)}</ul></div>}
      {result.missing_fields.length > 0 && <p className="text-orange-900">Missing: {result.missing_fields.map(fieldName).join(', ')}</p>}
      <ul className="space-y-1 text-slate-600">{result.reasons.map((reason, i) => <li key={i}>{reason}</li>)}</ul>
      {result.citations.map((citation, i) => <button key={i} onClick={() => setActiveCitation(citation)} className="block text-violet-700 underline text-left">
        View evidence for {citation.title}
      </button>)}
    </div>}
    <div className="flex flex-wrap gap-3">
      <button disabled={entry?.loading} onClick={() => checkEligibility(scheme)} className="rounded-xl bg-violet-600 px-3 py-2 text-white font-semibold disabled:opacity-50">
        {entry?.error ? 'Retry eligibility' : result ? 'Check again' : 'Check eligibility'}
      </button>
      <button onClick={() => { setActiveSchemeModal(null); setProfileEditing(true) }} className="text-violet-700 underline">Edit profile</button>
    </div>
  </section>
}
