import { useEffect, useRef, useState } from 'react'
import { useApp } from '../../context/AppContext'
import { apiRequest, publicApiRequest } from '../../lib/api'
import { selectEvidence } from '../../lib/evidence'

export function useEvidenceConfiguration() {
  const [enabled, setEnabled] = useState(false)
  useEffect(() => {
    let cancelled = false
    publicApiRequest('/evidence/config').then(result => { if (!cancelled) setEnabled(result.enabled === true) }).catch(() => {})
    return () => { cancelled = true }
  }, [])
  return enabled
}

function ImagePreview({ file, complaintId, record, token }) {
  const [url, setUrl] = useState('')
  const [error, setError] = useState('')
  const [retry, setRetry] = useState(0)
  useEffect(() => {
    let cancelled = false, objectUrl
    const controller = new AbortController()
    setUrl(''); setError('')
    const source = file ? Promise.resolve(file) : apiRequest(`/complaints/${complaintId}/evidence/${record.id}/content`, token, { responseType: 'blob', signal: controller.signal, timeoutMs: 45000 })
    source.then(blob => {
      if (!cancelled) { objectUrl = URL.createObjectURL(blob); setUrl(objectUrl) }
    }).catch(error => { if (!cancelled) setError(error.message) })
    return () => { cancelled = true; controller.abort(); if (objectUrl) URL.revokeObjectURL(objectUrl) }
  }, [file, complaintId, record?.id, token, retry])
  return <div className="space-y-1">
    {url ? <img src={url} alt={file ? `Selected evidence: ${file.name}` : 'Saved complaint evidence'} className="h-28 w-36 max-w-full object-contain rounded-lg border border-slate-200" /> : <p role="status" className="text-xs">{error || 'Loading image...'}</p>}
    {error && <button type="button" onClick={() => setRetry(n => n + 1)} className="text-xs text-violet-700">Retry image</button>}
  </div>
}

export function EvidencePicker({ selection, onChange, disabled = false, existingCount = 0 }) {
  const [error, setError] = useState('')
  return <div className="space-y-2">
    <label className="block text-xs font-semibold">Evidence images (optional)
      <input type="file" accept="image/jpeg,image/png,image/webp" multiple disabled={disabled}
        className="block mt-2 max-w-full text-xs" onChange={event => {
          try { onChange(selectEvidence(event.target.files, selection, existingCount)); setError('') }
          catch (error) { setError(error.message) }
          event.target.value = ''
        }} />
    </label>
    <p className="text-[11px] text-slate-500">Up to three JPEG, PNG or WebP images, 5 MiB each. Images are checked and saved privately after ticket confirmation.</p>
    {error && <p role="alert" className="text-xs text-rose-700">{error}</p>}
    <div className="flex flex-wrap gap-3">
      {selection.map(item => <div key={item.key} className="space-y-1 max-w-full">
        <ImagePreview file={item.file} />
        <button type="button" disabled={disabled} aria-label={`Remove selected ${item.file.name}`} onClick={() => onChange(selection.filter(f => f.key !== item.key))} className="text-xs text-rose-700">Remove selected image</button>
      </div>)}
    </div>
  </div>
}

export function ComplaintEvidence({ complaintId, initialFiles = [], onUploaded }) {
  const { session, currentUser } = useApp()
  const enabled = useEvidenceConfiguration()
  const [rows, setRows] = useState([])
  const [selection, setSelection] = useState(initialFiles)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [busy, setBusy] = useState(false)
  const pending = useRef(false)
  const scope = `${session?.user.id}:${complaintId}`
  const scopeRef = useRef(scope)
  scopeRef.current = scope
  useEffect(() => {
    scopeRef.current = scope
    return () => { scopeRef.current = null }
  }, [scope])
  const autoStarted = useRef(false)
  const base = `/complaints/${complaintId}/evidence`
  const load = async () => {
    setLoading(true)
    try {
      const data = await apiRequest(base, session?.access_token)
      if (scopeRef.current === scope) setRows(data)
    } catch (error) { if (scopeRef.current === scope) setError(error.message) }
    finally { if (scopeRef.current === scope) setLoading(false) }
  }
  useEffect(() => { load() }, [scope, session?.access_token])

  const upload = async () => {
    if (pending.current || !selection.length) return
    pending.current = true; setBusy(true); setError('')
    let success = true
    for (const item of selection) {
      if (scopeRef.current !== scope) break
      try {
        await apiRequest(base, session?.access_token, { method: 'POST', body: item.file,
          headers: { 'Idempotency-Key': item.key }, timeoutMs: 45000 })
        if (scopeRef.current === scope) setSelection(items => items.filter(f => f.key !== item.key))
      } catch (error) { success = false; if (scopeRef.current === scope) setError(`Ticket already saved. ${error.message} Retry the images; do not submit another ticket.`); break }
    }
    if (scopeRef.current === scope) {
      await load()
      if (scopeRef.current !== scope) { pending.current = false; return }
      if (success) onUploaded?.()
      setBusy(false)
    }
    pending.current = false
  }
  useEffect(() => {
    if (initialFiles.length && enabled && !autoStarted.current) { autoStarted.current = true; upload() }
  }, [enabled])
  const remove = async id => {
    if (pending.current) return
    pending.current = true; setBusy(true); setError('')
    try {
      await apiRequest(`${base}/${id}`, session?.access_token, { method: 'DELETE', timeoutMs: 45000 })
      await load()
    } catch (error) { if (scopeRef.current === scope) setError(error.message) }
    finally { pending.current = false; if (scopeRef.current === scope) setBusy(false) }
  }
  return <section aria-label="Complaint evidence" className="space-y-3 p-3 rounded-xl border border-slate-200 bg-white">
    <h3 className="text-xs font-bold text-slate-800">Private complaint evidence</h3>
    {loading && <p role="status" className="text-xs">Loading evidence...</p>}
    {busy && <p role="status" className="text-xs">Saving evidence...</p>}
    {error && <p role="alert" className="text-xs text-rose-700">{error}</p>}
    <div className="flex flex-wrap gap-3">{rows.map(row => <div key={row.id} className="space-y-1 max-w-full">
      {row.state === 'READY' ? <ImagePreview complaintId={complaintId} record={row} token={session?.access_token} /> : <p className="text-xs">{row.state === 'PENDING' ? 'Upload pending: retry with the original image or remove.' : 'Removal pending: retry removal.'}</p>}
      {currentUser.role === 'citizen' && <button type="button" disabled={busy} aria-label={`Remove evidence ${row.id}`} onClick={() => remove(row.id)} className="text-xs text-rose-700">Remove evidence</button>}
    </div>)}</div>
    {!loading && rows.length === 0 && <p className="text-xs text-slate-500">No saved evidence.</p>}
    {currentUser.role === 'citizen' && <>
      <EvidencePicker selection={selection} onChange={items => { setSelection(items); if (!items.length && initialFiles.length) onUploaded?.() }} disabled={!enabled || busy} existingCount={rows.length} />
      {!enabled && <p className="text-xs text-slate-500">Image uploads are disabled until private storage is configured.</p>}
      <button type="button" disabled={!enabled || busy || !selection.length} onClick={upload} className="px-3 py-2 rounded-lg bg-violet-600 text-white text-xs disabled:opacity-50">{error ? 'Retry image uploads' : 'Upload selected images'}</button>
    </>}
    <button type="button" disabled={busy} onClick={() => { setError(''); load() }} className="text-xs text-violet-700">Refresh evidence</button>
  </section>
}
