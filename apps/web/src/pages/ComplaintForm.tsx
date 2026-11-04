import { ArrowLeft, ShieldCheck } from 'lucide-react'
import { Link } from 'react-router-dom'

export function ComplaintForm() {
  return (
    <div className="page-stack">
      <div className="breadcrumb"><Link to="/">Home</Link><span>/</span><span>Raise Complaint</span></div>
      <div className="page-title-row"><div><div className="eyebrow">CIVIC ASSISTANCE</div><h1>Raise a civic complaint</h1><p>Describe a local issue and review your draft before saving it.</p></div></div>
      <div className="complaint-layout"><section className="surface-card form-placeholder"><h2>New complaint</h2><p className="form-intro">The complaint form will collect only the details needed to prepare your request.</p><label>Issue title<input disabled placeholder="For example, a streetlight is not working" /></label><label>Approximate locality<input disabled placeholder="Area, ward, or nearby landmark" /></label><label>Category<select disabled defaultValue=""><option value="">Select a category</option></select></label><label>Description<textarea disabled placeholder="Describe what happened and where" rows={5} /></label><button className="primary-button" disabled>Review complaint draft</button></section>
        <aside className="surface-card filing-note"><span className="filing-icon"><ShieldCheck size={20} /></span><h2>Your complaint, your choice</h2><p>Submitting here will create an internal JanSeva tracking record. It does not file a grievance with a government department.</p><div className="filing-separator" /><p>Official filing guidance and a copyable complaint package will be provided separately. You will complete filing on the verified government channel.</p><span className="status-outline">Internal tracking ≠ official filing</span></aside></div>
      <Link to="/" className="text-link"><ArrowLeft size={15} /> Back to home</Link>
    </div>
  )
}
