import { ShieldCheck } from 'lucide-react'

export function Officer() {
  return <div className="page-stack"><div className="eyebrow">INTERNAL DEMO VIEW</div><div className="page-title-row"><div><h1>Officer dashboard</h1><p>Review synthetic demo tickets and manage internal JanSeva status.</p></div><span className="demo-role"><ShieldCheck size={15} /> Simulated officer</span></div><section className="surface-card request-empty"><span className="request-empty-icon"><ShieldCheck size={22} /></span><h2>Officer queue is not connected yet</h2><p>This view will use role-verified API data. Dashboard counts and charts will come from synthetic platform records, not government statistics.</p><span className="status-outline">Internal demo only</span></section></div>
}
