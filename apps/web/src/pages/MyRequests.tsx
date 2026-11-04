import { ClipboardList } from 'lucide-react'

export function MyRequests() {
  return <div className="page-stack"><div className="eyebrow">YOUR ACTIVITY</div><div className="page-title-row"><div><h1>My requests</h1><p>Follow JanSeva internal tracking updates and saved scheme information.</p></div></div><section className="surface-card request-empty"><span className="request-empty-icon"><ClipboardList size={22} /></span><h2>Your requests will show here</h2><p>Sign-in and request history will be connected after the authentication and complaint APIs are ready.</p><span className="status-outline">No requests loaded</span></section><p className="prototype-note">JanSeva internal status is separate from official government filing status.</p></div>
}
