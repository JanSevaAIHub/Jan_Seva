import { Bell, ChevronDown, MapPin } from 'lucide-react'

export function Topbar() {
  return (
    <header className="topbar">
      <div className="topbar-location"><MapPin size={15} /><span>Punjab</span><span className="location-tag">Primary state</span></div>
      <div className="topbar-actions">
        <button className="icon-button" type="button" disabled aria-label="Notifications available later"><Bell size={18} /></button>
        <button className="profile-button" type="button" disabled aria-label="Sign in available later"><span className="profile-avatar">JS</span><span>Guest</span><ChevronDown size={15} /></button>
      </div>
    </header>
  )
}
