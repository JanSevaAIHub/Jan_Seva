import { useState } from 'react'
import { Bell, ChevronDown, User, ShieldCheck, Globe, Check } from 'lucide-react'
import { useApp } from '../../context/AppContext'

const ARJUN_PORTRAIT = 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=120&h=120&q=80'

export function Topbar() {
  const {
    currentUser,
    switchUserRole,
    session,
    signOut,
    authBusy,
    notifications,
    markNotificationsRead
  } = useApp()

  const [showProfileMenu, setShowProfileMenu] = useState(false)
  const [portraitFailed, setPortraitFailed] = useState(false)
  const [showNotifications, setShowNotifications] = useState(false)
  const [showLangMenu, setShowLangMenu] = useState(false)
  const [selectedLang, setSelectedLang] = useState('English')

  const unreadCount = notifications.filter(n => !n.read).length

  return (
    <header className="topbar">
      {/* Empty Left Side matching the reference screenshot */}
      <div />

      {/* Right Controls */}
      <div className="flex items-center gap-4">
        {/* Language Selector */}
        <div className="relative">
          <button
            onClick={() => setShowLangMenu(!showLangMenu)}
            className="flex items-center gap-1.5 text-xs font-medium text-slate-700 hover:text-slate-900 px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 transition-colors shadow-2xs"
          >
            <span>{selectedLang}</span>
            <ChevronDown size={14} className="text-slate-400" />
          </button>

          {showLangMenu && (
            <div className="absolute left-0 sm:left-auto sm:right-0 mt-1.5 w-36 bg-white rounded-xl shadow-xl border border-slate-200 py-1 z-50 animate-fade-in">
              {['English', 'हिंदी', 'ਪੰਜਾਬੀ'].map(lang => (
                <button
                  key={lang}
                  disabled={lang !== 'English'}
                  title={lang === 'English' ? 'Current interface language' : 'Translation is not available'}
                  onClick={() => {
                    setSelectedLang(lang)
                    setShowLangMenu(false)
                  }}
                  className="w-full px-3 py-2 text-left text-xs hover:bg-slate-50 text-slate-700 font-medium flex items-center justify-between"
                >
                  <span>{lang}</span>
                  {selectedLang === lang && <Check size={13} className="text-violet-600" />}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Notifications Bell */}
        <div className="relative">
          <button
            onClick={() => {
              setShowNotifications(!showNotifications)
              if (!showNotifications) markNotificationsRead()
            }}
            className="relative p-2 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors"
            aria-label="View notifications"
          >
            <Bell size={18} />
            {unreadCount > 0 && (
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-rose-500 rounded-full ring-2 ring-white" />
            )}
          </button>

          {showNotifications && (
            <div className="fixed left-3 right-3 top-[62px] sm:absolute sm:left-auto sm:right-0 sm:top-auto sm:mt-2 sm:w-80 bg-white rounded-2xl shadow-2xl border border-slate-200 p-2 z-50 animate-fade-in">
              <div className="px-3 py-2 border-b border-slate-100 flex items-center justify-between">
                <span className="text-xs font-bold text-slate-800">Notifications</span>
                <button disabled={notifications.length === 0} className="text-[10px] text-violet-600 font-medium disabled:opacity-50" onClick={markNotificationsRead}>
                  Mark all read
                </button>
              </div>
              <div className="divide-y divide-slate-100 max-h-72 overflow-y-auto">
                {notifications.length === 0 && <p className="p-3 text-xs text-slate-500">Notifications are not connected. Use My Requests for saved updates.</p>}
                {notifications.map(n => (
                  <div key={n.id} className="p-3 hover:bg-slate-50 transition-colors rounded-xl text-xs space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-slate-800">{n.title}</span>
                      <span className="text-[10px] text-slate-400">{n.time}</span>
                    </div>
                    <p className="text-slate-600 text-[11px] leading-relaxed">{n.message}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* User Account / Role Switcher */}
        <div className="relative">
          <button
            onClick={() => setShowProfileMenu(!showProfileMenu)}
            className="flex items-center gap-2 py-1 px-1.5 rounded-full hover:bg-slate-100 transition-all text-xs font-semibold text-slate-800"
          >
            {portraitFailed ? <span aria-hidden="true" className="w-7 h-7 rounded-full bg-violet-100 text-violet-700 flex items-center justify-center text-[10px] font-bold flex-none">{currentUser.avatar}</span> : <img
              src={ARJUN_PORTRAIT}
              alt=""
              onError={() => setPortraitFailed(true)}
              className="w-7 h-7 rounded-full object-cover ring-1 ring-slate-200 shadow-2xs"
            />}
            <span className="text-xs font-bold text-slate-800 max-w-[8rem] truncate">{currentUser.name}</span>
            <ChevronDown size={14} className="text-slate-400" />
          </button>

          {showProfileMenu && (
            <div className="absolute right-0 mt-2 w-56 bg-white rounded-2xl shadow-2xl border border-slate-200 p-2 z-50 animate-fade-in">
              <div className="p-2.5 bg-slate-50 rounded-xl mb-1 text-xs">
                <div className="font-bold text-slate-900">{currentUser.name}</div>
                <div className="text-[11px] text-slate-500">{currentUser.occupation || currentUser.department}</div>
                <span className="inline-block mt-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-violet-100 text-violet-800 uppercase tracking-wider">
                  Role: {currentUser.role}
                </span>
              </div>

              <div className="px-2 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                Sign in to an account
              </div>

              <button
                aria-label="Citizen Sign In"
                onClick={() => {
                  switchUserRole('citizen')
                  setShowProfileMenu(false)
                }}
                className={`w-full p-2 rounded-xl text-left text-xs flex items-center gap-2 hover:bg-slate-50 ${
                  currentUser.role === 'citizen' ? 'bg-violet-50 text-violet-700 font-bold' : 'text-slate-700'
                }`}
              >
                <User size={15} />
                <div>
                  <div>Citizen Sign In</div>
                  <div className="text-[10px] font-normal text-slate-400">Arjun Mishra (demo account)</div>
                </div>
              </button>

              <button
                aria-label="Officer Sign In"
                onClick={() => {
                  switchUserRole('officer')
                  setShowProfileMenu(false)
                }}
                className={`w-full p-2 rounded-xl text-left text-xs flex items-center gap-2 hover:bg-slate-50 ${
                  currentUser.role === 'officer' ? 'bg-indigo-50 text-indigo-700 font-bold' : 'text-slate-700'
                }`}
              >
                <ShieldCheck size={15} />
                <div>
                  <div>Officer Sign In</div>
                  <div className="text-[10px] font-normal text-slate-400">R. Singh (demo account)</div>
                </div>
              </button>
              {session && <button disabled={authBusy} onClick={() => { signOut(); setShowProfileMenu(false) }} className="w-full p-2 text-left text-xs text-rose-700">Sign out</button>}
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
