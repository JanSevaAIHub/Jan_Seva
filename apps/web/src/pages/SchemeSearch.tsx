import { ArrowLeft, Search, ShieldCheck } from 'lucide-react'
import { Link } from 'react-router-dom'

export function SchemeSearch() {
  return (
    <div className="page-stack">
      <div className="breadcrumb"><Link to="/">Home</Link><span>/</span><span>Find Schemes</span></div>
      <div className="page-title-row"><div><div className="eyebrow">SCHEME DISCOVERY</div><h1>Find government schemes</h1><p>Search verified Punjab schemes and selected national programmes.</p></div></div>
      <div className="surface-card scheme-search-card"><div className="search-field"><Search size={19} /><input placeholder="Describe what you are looking for" aria-label="Search schemes" disabled /><button disabled>Search</button></div><div className="search-context"><ShieldCheck size={16} /><span>Scheme results will be grounded in official source documents.</span></div></div>
      <div className="surface-card phase-card"><div className="phase-icon"><Search size={20} /></div><div><h2>Verified scheme data is being prepared</h2><p>The first release will prioritize reviewed Punjab schemes, followed by selected national and Uttar Pradesh schemes. No scheme names, benefits, or eligibility details will appear until their sources are verified.</p><Link to="/" className="text-link"><ArrowLeft size={15} /> Back to home</Link></div></div>
    </div>
  )
}
