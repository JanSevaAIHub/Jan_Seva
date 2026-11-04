import { ArrowRight, ClipboardCheck, FilePlus2, Search, Sparkles, CircleHelp } from 'lucide-react'
import { Link } from 'react-router-dom'

const actions = [
  { to: '/schemes', title: 'Find Schemes', text: 'Explore verified schemes for your needs.', Icon: Search, tone: 'mint' },
  { to: '/schemes', title: 'Check Eligibility', text: 'See what information you may need.', Icon: ClipboardCheck, tone: 'violet' },
  { to: '/complaints/new', title: 'Raise a Complaint', text: 'Prepare a civic complaint for review.', Icon: FilePlus2, tone: 'orange' },
  { to: '/requests', title: 'Track Requests', text: 'Follow your JanSeva internal requests.', Icon: CircleHelp, tone: 'blue' },
]

export function Home() {
  return (
    <div className="home-page">
      <section className="welcome-banner">
        <div className="welcome-copy">
          <div className="eyebrow"><span className="eyebrow-dot" /> CITIZEN SERVICES, MADE CLEARER</div>
          <h1>Your AI-powered<br /><span>citizen services</span> assistant</h1>
          <p>Discover schemes, understand eligibility, and prepare civic complaints — all in one place.</p>
          <div className="assistant-box">
            <div className="assistant-heading"><span className="assistant-spark"><Sparkles size={15} /></span><strong>Ask JanSeva AI</strong><span className="coming-tag">Coming in Day 4</span></div>
            <div className="assistant-input-row">
              <input aria-label="Ask JanSeva AI" disabled placeholder="Scheme search and complaint help are being connected" />
              <button type="button" disabled aria-label="Assistant unavailable"><ArrowRight size={18} /></button>
            </div>
          </div>
          <div className="prompt-chips"><span>Explore Punjab schemes</span><span>What documents might I need?</span><span>Prepare a civic complaint</span></div>
        </div>
        <div className="welcome-art" aria-hidden="true"><div className="art-sun" /><div className="art-dome"><span /></div><div className="art-building"><i /><i /><i /><i /><b /></div><div className="art-ground" /></div>
      </section>

      <section className="section-block">
        <div className="section-heading"><div><h2>How can we help?</h2><p>Choose a service to get started.</p></div></div>
        <div className="action-grid">
          {actions.map(({ to, title, text, Icon, tone }) => (
            <Link className="action-card" to={to} key={title}>
              <span className={`action-icon ${tone}`}><Icon size={21} /></span>
              <h3>{title}</h3><p>{text}</p><span className="action-arrow"><ArrowRight size={17} /></span>
            </Link>
          ))}
        </div>
      </section>

      <section className="lower-grid">
        <article className="surface-card trust-card"><div className="card-heading"><div><h2>Built around reliable information</h2><p>Sources and status should always be clear.</p></div><span className="trust-icon"><Sparkles size={18} /></span></div><div className="trust-points"><div><span className="trust-check">✓</span><span>Scheme answers will link to verified official sources.</span></div><div><span className="trust-check">✓</span><span>Eligibility checks will explain missing information.</span></div><div><span className="trust-check">✓</span><span>Government filing stays in your hands.</span></div></div></article>
        <article className="surface-card activity-card"><div className="card-heading"><div><h2>Recent activity</h2><p>Your saved schemes and requests will appear here.</p></div></div><div className="empty-activity"><span><ClipboardCheck size={19} /></span><p>No activity yet</p><small>Sign in and start a service to see updates here.</small></div></article>
      </section>
      <p className="prototype-note">JanSeva AI is an independent citizen-assistance prototype, not a government portal.</p>
    </div>
  )
}
