import { useRef, useState } from 'react'
import { useApp } from '../../context/AppContext'
import { publicApiRequest } from '../../lib/api'

const BOOLS = {
  bank_account: 'Participating bank/post-office account', auto_debit_consent: 'Consent to premium auto-debit',
  income_tax_payer: 'Income-tax payer', landholding_farmer: 'Cultivable landholding farmer family',
  government_employee_family: 'Government employee in family', indian_citizen: 'Indian citizen',
  girl_child: 'Beneficiary is a girl', punjab_domicile: 'Parents/guardians have Punjab domicile',
  covered_social_category: 'Meets a source-listed social/family category', notified_artisan_trade: 'Works in a notified artisan trade',
  recent_similar_credit: 'Received similar government credit in last five years', selected_state_exam: 'Selected through State/UT scholarship exam', sc_st: 'SC/ST category',
}

export function EligibilityChecker() {
  const { schemes, eligibilityProfile: profile, setEligibilityProfile: setProfile } = useApp()
  const [selected, setSelected] = useState('')
  const [result, setResult] = useState(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const version = useRef(0)
  const edit = (key, value) => { version.current++; setResult(null); setError(''); setProfile(previous => ({ ...previous, [key]: value })) }
  const submit = async event => {
    event.preventDefault()
    if (busy || !schemes.length) return
    const current = ++version.current
    setBusy(true); setError('')
    try {
      const reply = await publicApiRequest('/schemes/screen', { method: 'POST', body: { scheme_id: selected || schemes[0].id, profile } })
      if (!['POTENTIAL', 'NOT_MATCHED', 'NEEDS_INFO'].includes(reply.status) || !Array.isArray(reply.reasons) || !Array.isArray(reply.missing_fields)) throw new Error('Eligibility screening returned an invalid response. Please retry.')
      if (current === version.current) setResult(reply)
    } catch (e) { if (current === version.current) setError(e.message) }
    finally { setBusy(false) }
  }
  return <form onSubmit={submit} aria-label="Eligibility profile" className="space-y-3 text-xs bg-white rounded-2xl p-4 border border-slate-200">
    <h3 className="font-bold text-slate-900">Check Eligibility</h3>
    <p className="text-[11px] text-slate-500">Edit the beneficiary profile. Omit unknown facts. This checks limited reviewed rules; final eligibility rests with the authority.</p>
    <label className="block">Scheme<select aria-label="Eligibility scheme" value={selected || schemes[0]?.id || ''} onChange={e => { version.current++; setSelected(e.target.value); setResult(null) }} className="w-full mt-1 border rounded-lg p-2">
      {schemes.map(s => <option key={s.id} value={s.id}>{s.title}</option>)}
    </select></label>
    <div className="grid grid-cols-2 gap-2">{[['age', 'Beneficiary age', 120], ['annual_income', 'Annual family income (Rs.)', 1000000000]].map(([key, label, max]) => <label key={key}>{label}<input aria-label={label} type="number" min="0" max={max} step="1" value={profile[key] ?? ''} onChange={e => edit(key, e.target.value === '' ? null : Number(e.target.value))} className="w-full border rounded-lg p-2 mt-1" /></label>)}</div>
    <details><summary className="cursor-pointer text-violet-700 font-semibold">More profile conditions</summary>
      <div className="space-y-2 mt-2">{Object.entries(BOOLS).map(([key, label]) => <label key={key} className="block">{label}<select aria-label={label} value={profile[key] == null ? '' : String(profile[key])} onChange={e => edit(key, e.target.value === '' ? null : e.target.value === 'true')} className="w-full border rounded-lg p-2 mt-1"><option value="">Unknown</option><option value="true">Yes</option><option value="false">No</option></select></label>)}
        <label className="block">School type<select aria-label="School type" value={profile.school_type ?? ''} onChange={e => edit('school_type', e.target.value || null)} className="w-full border rounded-lg p-2"><option value="">Unknown</option>{['government', 'aided', 'local_body', 'private'].map(type => <option key={type}>{type}</option>)}</select></label>
        {[['class_level', 'School class', 12], ['class_vii_marks', 'Class VII marks (%)', 100]].map(([key, label, max]) => <label key={key} className="block">{label}<input aria-label={label} type="number" min={key === 'class_level' ? 1 : 0} max={max} step={key === 'class_level' ? 1 : '0.01'} value={profile[key] ?? ''} onChange={e => edit(key, e.target.value === '' ? null : Number(e.target.value))} className="w-full border rounded-lg p-2" /></label>)}
      </div>
    </details>
    <button disabled={busy || !schemes.length} className="bg-violet-600 text-white rounded-xl px-3 py-2 disabled:opacity-50">{busy ? 'Checking…' : 'Screen reviewed conditions'}</button>
    {error && <p role="alert" className="text-rose-700">{error}</p>}
    {result && <div role="status" className="bg-slate-50 rounded-xl p-3 space-y-2"><strong>{result.status}</strong><p>{result.reasons.join(' ')}</p>{result.missing_fields.length > 0 && <p>Missing information: {result.missing_fields.map(f => f.replaceAll('_', ' ')).join(', ')}</p>}<p>{result.notice}</p></div>}
  </form>
}
