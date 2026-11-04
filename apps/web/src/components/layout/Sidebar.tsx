import { NavLink } from 'react-router-dom'
import { ClipboardList, House, Landmark, LifeBuoy, Search, Settings, ShieldCheck, Siren } from 'lucide-react'

const links = [
  { to: '/', label: 'Home', Icon: House, end: true },
  { to: '/schemes', label: 'Find Schemes', Icon: Search },
  { to: '/requests', label: 'My Requests', Icon: ClipboardList },
  { to: '/complaints/new', label: 'Raise Complaint', Icon: Siren },
]

export function Sidebar() {
  return (
    <aside className="sidebar" aria-label="Main navigation">
      <NavLink to="/" className="brand" aria-label="JanSeva AI home">
        <span className="brand-mark"><Landmark size={18} /></span>
        <span>JanSeva <b>AI</b></span>
      </NavLink>
      <div className="sidebar-section-label">CITIZEN SERVICES</div>
      <nav className="sidebar-nav">
        {links.map(({ to, label, Icon, end }) => (
          <NavLink key={to} to={to} end={end} className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}>
            <Icon size={18} strokeWidth={1.8} /><span>{label}</span>
          </NavLink>
        ))}
        <div className="sidebar-divider" />
        <NavLink to="/officer" className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}>
          <ShieldCheck size={18} strokeWidth={1.8} /><span>Officer demo</span>
        </NavLink>
      </nav>
      <div className="sidebar-bottom">
        <div className="sidebar-divider" />
        <button className="nav-link nav-utility" type="button" disabled title="Available in a later phase"><LifeBuoy size={18} /><span>Help &amp; Support</span></button>
        <button className="nav-link nav-utility" type="button" disabled title="Available in a later phase"><Settings size={18} /><span>Settings</span></button>
        <p className="sidebar-note">Independent citizen assistance prototype</p>
      </div>
    </aside>
  )
}
