import { useEffect, useState } from 'react'
import { useApp } from '../../context/AppContext'

export function EvidencePicker({ file, onChange, disabled = false }) {
  const { evidenceMaxBytes } = useApp()
  const [preview, setPreview] = useState('')
  const [error, setError] = useState('')
  useEffect(() => {
    if (!file) { setPreview(''); return }
    const url = URL.createObjectURL(file)
    setPreview(url)
    return () => URL.revokeObjectURL(url)
  }, [file])
  const select = event => {
    const selected = event.target.files?.[0]
    event.target.value = ''
    if (!selected) return
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(selected.type)) { setError('Choose a JPEG, PNG or WebP image.'); return }
    if (selected.size > evidenceMaxBytes || !selected.size) { setError(`Choose a nonempty image of at most ${evidenceMaxBytes / 1048576} MB.`); return }
    setError('')
    onChange(selected)
  }
  return <div className="space-y-2">
    <label className="text-xs font-bold text-slate-800 block">Upload Evidence (Optional)
      <input aria-label="Select complaint photo" type="file" accept="image/jpeg,image/png,image/webp" disabled={disabled} onChange={select} className="block w-full mt-2 text-xs border-2 border-dashed border-slate-300 rounded-xl p-3 file:mr-3 file:rounded-lg file:border-0 file:bg-violet-50 file:p-2 file:text-violet-700" />
    </label>
    <p className="text-[11px] text-slate-500">JPEG, PNG or WebP · maximum {evidenceMaxBytes / 1048576} MB. Private photo; uploaded after you confirm the ticket. Location metadata is removed.</p>
    {error && <p role="alert" className="text-xs text-rose-700">{error}</p>}
    {file && <div className="flex flex-wrap gap-3 items-center text-xs">
      {preview && <img src={preview} alt="Selected evidence preview" className="h-24 w-24 rounded-xl object-cover" />}
      <div className="min-w-0 break-all"><p>{file.name}</p><p>{(file.size / 1024).toFixed(1)} KB · ready for review</p></div>
      <button type="button" disabled={disabled} className="text-rose-700 underline" onClick={() => { onChange(null); setError('') }}>Remove photo</button>
    </div>}
  </div>
}
