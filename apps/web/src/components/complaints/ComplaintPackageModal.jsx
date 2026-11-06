import { useEffect, useState } from 'react'
import { X, Copy, Check, ExternalLink, ShieldCheck, FileCheck, Share2 } from 'lucide-react'
import { useApp } from '../../context/AppContext'

export function ComplaintPackageModal() {
  const { packageModalComplaint, setPackageModalComplaint, addToast, saveOfficialReference, currentUser } = useApp()
  const [copied, setCopied] = useState(false)
  const [officialRefInput, setOfficialRefInput] = useState('')

  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  useEffect(() => {
    setOfficialRefInput(packageModalComplaint?.officialRef || '')
    setCopied(false)
    setError('')
  }, [packageModalComplaint?.id])
  if (!packageModalComplaint) return null

  const formattedPackage = `OFFICIAL CIVIC GRIEVANCE PACKAGE (Generated via JanSeva AI)
-----------------------------------------------------------
INTERNAL TRACKING ID: ${packageModalComplaint.id}
DATE GENERATED: ${new Date().toLocaleDateString()}
CATEGORY: ${packageModalComplaint.category}
TARGET DEPARTMENT: ${packageModalComplaint.department || 'Urban Infrastructure Dept'}
LOCATION: ${packageModalComplaint.locality}

SUBJECT:
${packageModalComplaint.title}

GRIEVANCE DESCRIPTION:
${packageModalComplaint.description}

EVIDENCE ATTACHED:
- No attachments or location verification are provided by this ticket.
- Internal status: ${packageModalComplaint.status}
- Government filing: ${packageModalComplaint.officialStatus} (user reported if provided)

OFFICIAL FILING CHANNELS:
• National Grievance Portal (CPGRAMS): https://pgportal.gov.in
• State Portal (Connect Punjab): https://connect.punjab.gov.in
-----------------------------------------------------------`

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(formattedPackage)
      setCopied(true)
      addToast('Complaint package copied to clipboard!', 'success')
    } catch { setError('Clipboard unavailable. Select and copy the package text manually.') }
  }

  const handleSaveOfficialRef = async () => {
    if (!officialRefInput.trim() || saving) return
    setSaving(true)
    setError('')
    try {
      await saveOfficialReference(packageModalComplaint.id, officialRefInput.trim())
      setPackageModalComplaint(null)
    } catch (error) { setError(error.message) }
    finally { setSaving(false) }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-fade-in">
      <div 
        className="bg-white rounded-2xl shadow-2xl max-w-xl w-full max-h-[90vh] overflow-y-auto border border-slate-200 flex flex-col"
        role="dialog"
        aria-modal="true"
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-teal-100 text-teal-700">
              <FileCheck size={18} />
            </span>
            <div>
              <h2 className="text-base font-bold text-slate-900">Official Complaint Package</h2>
              <p className="text-xs text-slate-500">Ready for CPGRAMS or State Grievance submission</p>
            </div>
          </div>
          <button
            onClick={() => setPackageModalComplaint(null)}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-4">
          {error && <p role="alert" className="text-xs text-rose-700">{error}</p>}
          <div className="flex items-center justify-between bg-violet-50 p-3 rounded-xl border border-violet-100">
            <div className="text-xs text-violet-800">
              Copy this structured package and paste it into the official government grievance portal.
            </div>
            <button
              onClick={handleCopy}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-violet-600 hover:bg-violet-700 text-white text-xs font-semibold shadow-sm transition-all"
            >
              {copied ? <Check size={14} /> : <Copy size={14} />}
              {copied ? 'Copied' : 'Copy Package'}
            </button>
          </div>

          <pre className="p-4 bg-slate-900 text-slate-200 rounded-xl text-xs font-mono whitespace-pre-wrap leading-relaxed overflow-x-auto max-h-56">
            {formattedPackage}
          </pre>

          {/* Official Channel Links */}
          <div className="space-y-2 pt-2">
            <div className="text-xs font-bold text-slate-700 uppercase tracking-wider">Verified Official Portals</div>
            <div className="grid grid-cols-2 gap-2">
              <a
                href="https://pgportal.gov.in"
                target="_blank"
                rel="noreferrer"
                className="flex items-center justify-between p-3 rounded-xl border border-slate-200 hover:border-violet-300 hover:bg-violet-50/50 transition-all text-xs font-semibold text-slate-800"
              >
                <span>CPGRAMS National Portal</span>
                <ExternalLink size={14} className="text-slate-400" />
              </a>
              <a
                href="https://connect.punjab.gov.in"
                target="_blank"
                rel="noreferrer"
                className="flex items-center justify-between p-3 rounded-xl border border-slate-200 hover:border-violet-300 hover:bg-violet-50/50 transition-all text-xs font-semibold text-slate-800"
              >
                <span>Connect Punjab Portal</span>
                <ExternalLink size={14} className="text-slate-400" />
              </a>
            </div>
          </div>

          {/* Optional Official Reference Input */}
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2">
            <label className="text-xs font-bold text-slate-700 block">
              Already filed officially? Record Government Reference ID
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={officialRefInput}
                maxLength={250}
                disabled={currentUser.role !== 'citizen' || saving}
                onChange={e => setOfficialRefInput(e.target.value)}
                placeholder="e.g. CPGRAMS-2026-98124"
                className="flex-1 px-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:border-violet-500 bg-white"
              />
              <button
                onClick={handleSaveOfficialRef}
                disabled={!officialRefInput.trim() || saving || currentUser.role !== 'citizen'}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-900 disabled:opacity-50 text-white text-xs font-semibold rounded-lg"
              >
                {saving ? 'Saving?' : 'Save'}
              </button>
            </div>
            <p className="text-[11px] text-slate-500">
              This stores your reference as user reported. JanSeva does not verify government filing or resolution.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex justify-end">
          <button
            onClick={() => setPackageModalComplaint(null)}
            className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}

