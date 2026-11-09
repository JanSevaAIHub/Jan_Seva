import { useEffect, useRef, useState } from 'react'
import { useApp } from '../../context/AppContext'
import { fieldName, parseProfileDraft, profileConditions, profileDraft, profileNumbers } from '../../lib/schemeProfile'

export function SchemeProfileEditor() {
  const { currentUser, schemeProfile, updateSchemeProfile, profileEditing, setProfileEditing } = useApp()
  const [draft, setDraft] = useState(() => profileDraft(schemeProfile))
  const [error, setError] = useState('')
  const formRef = useRef(null)
  const editRef = useRef(null)
  const wasEditing = useRef(false)
  useEffect(() => { setDraft(profileDraft(schemeProfile)); setError('') }, [schemeProfile])
  useEffect(() => {
    const previous = wasEditing.current
    wasEditing.current = profileEditing
    if (!profileEditing) {
      if (previous) editRef.current?.focus({ preventScroll: true })
      return
    }
    const frame = requestAnimationFrame(() => {
      formRef.current?.scrollIntoView({ block: 'center', behavior: 'smooth' })
      formRef.current?.querySelector('input,select')?.focus({ preventScroll: true })
    })
    return () => cancelAnimationFrame(frame)
  }, [profileEditing])
  const change = (key, value) => setDraft(previous => ({ ...previous, [key]: value }))
  const submit = event => {
    event.preventDefault()
    try {
      updateSchemeProfile(parseProfileDraft(draft))
      setProfileEditing(false)
      setError('')
    } catch (problem) { setError(problem.message) }
  }
  const numberField = field => <div key={field.key} className="space-y-1.5">
    {field.key !== 'disability_percent' && <label className="block text-[11px] text-slate-600">{field.label} format
      <select aria-label={`${field.label} format`} value={draft[`${field.key}_mode`] || 'exact'} onChange={e => change(`${field.key}_mode`, e.target.value)}>
        <option value="exact">Exact value (optional)</option><option value="range">Range (optional)</option>
      </select>
    </label>}
    {draft[`${field.key}_mode`] === 'range' ? <div className="grid grid-cols-2 gap-2">
      {['min', 'max'].map(edge => <label key={edge} className="block text-[11px]">{edge === 'min' ? 'Minimum' : 'Maximum'} {field.label}
        <input type="number" min="0" max={field.max} step={field.integer ? '1' : 'any'} value={draft[`${field.key}_${edge}`] || ''}
          onChange={e => change(`${field.key}_${edge}`, e.target.value)} />
      </label>)}
    </div> : <label className="block text-[11px]">{field.label}
      <input type="number" min="0" max={field.max} step={field.integer ? '1' : 'any'} value={draft[field.key] || ''}
        onChange={e => change(field.key, e.target.value)} placeholder="Unknown / not supplied" />
    </label>}
  </div>
  return <section id="scheme-profile" className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm space-y-3 min-w-0">
    <div className="flex items-center justify-between gap-2">
      <h2 className="text-sm font-bold text-slate-900">Profile for scheme checks</h2>
      {!profileEditing && <button ref={editRef} className="text-xs font-semibold text-violet-700 underline" onClick={() => setProfileEditing(true)}>Edit profile</button>}
    </div>
    <p className="text-xs text-slate-600">{currentUser.name}</p>
    <p className="text-[11px] text-slate-500">Kept only in this tab. Cleared on reload or account change; not saved to Supabase.</p>
    {!profileEditing ? <div data-testid="scheme-profile-summary" className="text-xs space-y-1 break-words">
      {Object.keys(schemeProfile).length === 0 ? <p>No information supplied. Unknown values stay unknown.</p> : Object.entries(schemeProfile).map(([key, value]) =>
        <p key={key}><b>{fieldName(key.replace('_range', ''))}:</b> {typeof value === 'object' ? `${value.min}–${value.max}` : typeof value === 'boolean' ? (value ? 'Yes' : 'No') : value}</p>)}
    </div> : <form ref={formRef} aria-label="Scheme profile" onSubmit={submit} className="scheme-profile-form space-y-3">
      {numberField(profileNumbers[0])}
      {['state', 'occupation'].map(key => <label key={key} className="block text-[11px]">{fieldName(key)}
        <input value={draft[key] || ''} minLength={2} maxLength={100} placeholder="Unknown / not supplied" onChange={e => change(key, e.target.value)} />
      </label>)}
      <p className="text-[11px] text-slate-500">For child or marriage schemes, enter the child's or bride's age. Income periods are separate; no conversion is assumed.</p>
      {numberField(profileNumbers[1])}
      {numberField(profileNumbers[2])}
      <details className="text-xs space-y-2">
        <summary className="cursor-pointer font-semibold text-violet-700">Additional conditions</summary>
        <p className="text-[11px] text-slate-500">Optional and used only where the source documents the condition. Leave unconfirmed information as Unknown.</p>
        {profileConditions.map(([key, label]) => <label key={key} className="block text-[11px]">{label}
          <select aria-label={label} value={draft[key] || ''} onChange={e => change(key, e.target.value)}>
            <option value="">Unknown</option><option value="true">Yes</option><option value="false">No</option>
          </select>
        </label>)}
        {numberField(profileNumbers[3])}
      </details>
      {error && <p role="alert" className="text-xs text-rose-700">{error}</p>}
      <div className="flex flex-wrap gap-2">
        <button type="submit" className="rounded-xl bg-violet-600 text-white px-3 py-2 text-xs font-semibold">Use profile for checks</button>
        <button type="button" className="text-xs underline" onClick={() => { setDraft(profileDraft(schemeProfile)); setError(''); setProfileEditing(false) }}>Cancel</button>
      </div>
    </form>}
  </section>
}
