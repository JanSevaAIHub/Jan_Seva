import { NavLink } from 'react-router-dom'
import { House, Search, ClipboardList, AlertTriangle, Compass, Bell, ShieldCheck, LifeBuoy, Settings } from 'lucide-react'
import { useApp } from '../../context/AppContext'
import { JanSevaLogo } from '../common/JanSevaLogo'

export function Sidebar() {
  const { currentUser, notifications, addToast } = useApp()
  const unreadCount = notifications.filter(n => !n.read).length

  return (
    <aside className="sidebar" aria-label="Main navigation">
      {/* Brand Logo */}
      <NavLink to="/" className="brand" aria-label="JanSeva AI home">
        <JanSevaLogo size={34} showText={true} />
      </NavLink>

      {/* Navigation Links with UNIQUE routes */}
      <nav className="sidebar-nav">
        <NavLink
          to="/"
          end
          className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}
        >
          <House size={18} strokeWidth={2} />
          <span>Home</span>
        </NavLink>

        <NavLink
          to="/schemes"
          className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}
        >
          <Search size={18} strokeWidth={2} />
          <span>Find Schemes</span>
        </NavLink>

        <NavLink
          to="/requests"
          className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}
        >
          <ClipboardList size={18} strokeWidth={2} />
          <span>My Complaints</span>
        </NavLink>

        <NavLink
          to="/complaints/new"
          className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}
        >
          <AlertTriangle size={18} strokeWidth={2} />
          <span>Raise Complaint</span>
        </NavLink>

        <NavLink
          to="/track"
          className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}
        >
          <Compass size={18} strokeWidth={2} />
          <span>Track Status</span>
        </NavLink>

        <NavLink
          to="/notifications"
          className={({ isActive }) => `nav-link${isActive ? ' active' : ''} justify-between`}
        >
          <div className="flex items-center gap-3">
            <Bell size={18} strokeWidth={2} />
            <span>Notifications</span>
          </div>
          {unreadCount > 0 && (
            <span className="w-5 h-5 rounded-full bg-rose-500 text-white text-[10px] font-bold flex items-center justify-center shadow-xs">
              {unreadCount}
            </span>
          )}
        </NavLink>

        <div className="sidebar-divider" />

        {/* Officer Console */}
        <NavLink
          to="/officer"
          className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}
        >
          <ShieldCheck size={18} strokeWidth={2} />
          <span>Officer demo</span>
        </NavLink>
      </nav>

      {/* Bottom utilities */}
      <div className="sidebar-bottom">
        <div className="sidebar-divider" />
        <button
          className="nav-link nav-utility"
          type="button"
          onClick={() => addToast('Need help? Explore verified scheme guides or raise a civic complaint.', 'info')}
        >
          <LifeBuoy size={18} />
          <span>Help &amp; Support</span>
        </button>
        <button
          className="nav-link nav-utility"
          type="button"
          onClick={() => addToast('Platform settings: Running JanSeva AI Citizen Services Prototype.', 'info')}
        >
          <Settings size={18} />
          <span>Settings</span>
        </button>
      </div>
    </aside>
  )
}
