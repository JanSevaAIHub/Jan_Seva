import { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react'
import { supabase, authConfigurationError } from '../lib/supabase'
import { apiRequest, publicApiRequest, onUnauthorized } from '../lib/api'
import { schemeView, schemeAnswer } from '../lib/schemes'
import { complaintInput, complaintView } from '../lib/complaints'

const AppContext = createContext(null)
const GUEST = { name: 'Guest', role: 'guest', avatar: '?', completeness: 0 }

export function AppProvider({ children }) {
  // Only the authenticated API profile establishes the current account role.
  const [currentUser, setCurrentUser] = useState(GUEST)
  const [session, setSession] = useState(null)
  const [authLoading, setAuthLoading] = useState(Boolean(supabase))
  const [authBusy, setAuthBusy] = useState(false)
  const [authError, setAuthError] = useState('')
  const [loginRole, setLoginRole] = useState(null)
  const accountVersion = useRef(0)
  const identityVersion = useRef(0)
  const listVersion = useRef(0)
  const complaintRevision = useRef(0)
  const sessionUser = useRef(null)
  const sessionToken = useRef(undefined)
  const [selectedState, setSelectedState] = useState('Punjab')
  
  // Schemes state
  const [schemes, setSchemes] = useState([])
  const [savedSchemeIds, setSavedSchemeIds] = useState([])
  const [activeSchemeModal, setActiveSchemeModal] = useState(null)
  const [schemeSearchQuery, setSchemeSearchQuery] = useState('')
  const [selectedSectorFilter, setSelectedSectorFilter] = useState('All')
  const [selectedTargetFilter, setSelectedTargetFilter] = useState('All')
  
  // Complaints state
  const [complaints, setComplaints] = useState([])
  const [activeComplaint, setActiveComplaint] = useState(null)
  const [complaintsLoading, setComplaintsLoading] = useState(false)
  const [complaintsError, setComplaintsError] = useState('')
  const [complaintSaving, setComplaintSaving] = useState(false)
  const complaintSaveBusy = useRef(false)
  const [complaintSaveError, setComplaintSaveError] = useState('')
  const [reviewModalComplaint, setReviewModalComplaint] = useState(null)
  const [packageModalComplaint, setPackageModalComplaint] = useState(null)
  const [officerTicketModal, setOfficerTicketModal] = useState(null)
  const [routingItems] = useState([])

  // Notifications state
  const [notifications, setNotifications] = useState([])
  
  // Toast notifications
  const toastIds = useRef(0)
  const [toasts, setToasts] = useState([])

  // AI Chat Assistant state (for Scheme Discovery)
  const [chatMessages, setChatMessages] = useState([])
  const [schemesLoading, setSchemesLoading] = useState(false)
  const [schemesError, setSchemesError] = useState('')
  const [schemeChatError, setSchemeChatError] = useState('')
  const schemeChatBusy = useRef(false)
  const schemeChatVersion = useRef(0)
  const schemeRequest = useRef(0)
  const [isAiTyping, setIsAiTyping] = useState(false)

  const clearSchemeChat = useCallback(() => {
    schemeChatVersion.current += 1
    schemeChatBusy.current = false
    setChatMessages([])
    setSchemeChatError('')
    setIsAiTyping(false)
  }, [])

  // Add toast notification
  const addToast = (message, type = 'success') => {
    const id = ++toastIds.current
    setToasts(prev => [...prev, { id, message, type }])
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id))
    }, 4000)
  }

  const removeToast = (id) => {
    setToasts(prev => prev.filter(t => t.id !== id))
  }

  // Bookmarks are session-local; state updater functions stay free of side effects.
  const toggleSaveScheme = schemeId => {
    const exists = savedSchemeIds.includes(schemeId)
    setSavedSchemeIds(prev => exists ? prev.filter(id => id !== schemeId) : [...prev, schemeId])
    addToast(exists ? 'Removed scheme from saved list.' : 'Scheme saved for this browsing session.', 'info')
  }

  const clearAccount = useCallback(() => {
    clearSchemeChat()
    accountVersion.current += 1
    identityVersion.current += 1
    sessionUser.current = null
    sessionToken.current = null
    setSession(null)
    setCurrentUser(GUEST)
    setComplaints([])
    setActiveComplaint(null)
    setOfficerTicketModal(null)
    setPackageModalComplaint(null)
    setReviewModalComplaint(null)
    setComplaintSaveError('')
    setSavedSchemeIds([])
    setNotifications([])
    setToasts([])
    setAuthLoading(false)
    setComplaintsLoading(false)
  }, [clearSchemeChat])

  useEffect(() => onUnauthorized(failedToken => {
    if (failedToken !== sessionToken.current) return
    clearAccount()
    setAuthError('Your session expired. Please sign in again. Unsaved form values are kept.')
    setComplaintsError('')
    setAuthBusy(true)
    // SDK local sign-out also removes persisted tokens; do not replay failed writes.
    Promise.resolve(supabase?.auth.signOut({ scope: 'local' }))
      .then(result => { if (result?.error) throw result.error })
      .catch(() => { setAuthError('Your session expired. Sign in again; the previous session could not be cleared from the provider.') })
      .finally(() => setAuthBusy(false))
  }), [clearAccount])

  // The auth subscription only updates React state; API calls run outside its lock.
  useEffect(() => {
    if (!supabase) return
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      const token = nextSession?.access_token || null
      if (sessionToken.current === token) return
      sessionToken.current = token
      accountVersion.current += 1
      if (sessionUser.current !== nextSession?.user.id) {
        identityVersion.current += 1
        clearSchemeChat()
        sessionUser.current = nextSession?.user.id || null
        setCurrentUser(GUEST)
        setComplaints([])
        setActiveComplaint(null)
        setOfficerTicketModal(null)
        setPackageModalComplaint(null)
        setReviewModalComplaint(null)
        setComplaintSaveError('')
        setSavedSchemeIds([])
        setNotifications([])
        setToasts([])
      }
      setSession(nextSession)
      setAuthLoading(Boolean(nextSession))
      setComplaintsError('')
      if (!nextSession) setComplaintsLoading(false)
    })
    return () => subscription.unsubscribe()
  }, [clearSchemeChat])

  const applyComplaint = saved => {
    const ticket = complaintView(saved)
    complaintRevision.current += 1
    setComplaints(prev => [ticket, ...prev.filter(c => c.id !== ticket.id)])
    setActiveComplaint(prev => !prev || prev.id === ticket.id ? ticket : prev)
    setOfficerTicketModal(prev => prev?.id === ticket.id ? ticket : prev)
    setPackageModalComplaint(prev => prev?.id === ticket.id ? ticket : prev)
    return ticket
  }

  const refreshComplaints = useCallback(async () => {
    if (!session || session.access_token !== sessionToken.current) return
    const version = accountVersion.current
    const request = ++listVersion.current
    const revision = complaintRevision.current
    const isCurrent = () => version === accountVersion.current && request === listVersion.current
    setComplaintsLoading(true)
    setComplaintsError('')
    try {
      const profile = await apiRequest('/me', session.access_token)
      if (!isCurrent()) return
      if (!profile || typeof profile.name !== 'string' || typeof profile.user_id !== 'string' ||
        (profile.occupation != null && typeof profile.occupation !== 'string') ||
        !['citizen', 'officer'].includes(profile.role)) throw new Error('The API returned an invalid profile. Please retry.')
      setCurrentUser({ ...profile, avatar: profile.name.split(' ').map(n => n[0]).join(''), completeness: 0 })
      setAuthError('')
      // A queue failure must not discard a successfully verified account role.
      const records = await apiRequest('/complaints', session.access_token)
      if (!isCurrent()) return
      if (!Array.isArray(records)) throw new Error('The API returned an invalid complaint list. Please retry.')
      const tickets = records.map(complaintView)
      // A detail or write completed after this list began. Its newer record
      // must survive an older database snapshot returned by this request.
      if (revision !== complaintRevision.current) return
      setComplaints(tickets)
      setActiveComplaint(prev => tickets.find(t => t.id === prev?.id) || tickets[0] || null)
      setOfficerTicketModal(prev => prev ? tickets.find(t => t.id === prev.id) || null : null)
      setPackageModalComplaint(prev => prev ? tickets.find(t => t.id === prev.id) || null : null)
    } catch (error) {
      if (isCurrent()) {
        setComplaintsError(error.message)
        if (error.status === 401 || error.status === 403) {
          setCurrentUser(GUEST)
          setComplaints([])
          setActiveComplaint(null)
          setOfficerTicketModal(null)
          setPackageModalComplaint(null)
        }
      }
    } finally {
      if (isCurrent()) { setComplaintsLoading(false); setAuthLoading(false) }
    }
  }, [session])

  useEffect(() => { refreshComplaints() }, [refreshComplaints])

  // Fetch when returning from another tab; browser refresh restores the Supabase
  // session and then reloads complaints from the API, never from fixture state.
  useEffect(() => {
    const onFocus = () => { refreshComplaints() }
    window.addEventListener('focus', onFocus)
    return () => window.removeEventListener('focus', onFocus)
  }, [refreshComplaints])

  const loadComplaint = useCallback(async id => {
    const version = identityVersion.current
    const saved = await apiRequest(`/complaints/${encodeURIComponent(id)}`, session?.access_token)
    if (version !== identityVersion.current) throw new Error('The account changed. Please try again.')
    return applyComplaint(saved)
  }, [session])

  const addComplaint = async draft => {
    if (complaintSaveBusy.current) return null
    complaintSaveBusy.current = true
    const version = identityVersion.current
    setComplaintSaving(true)
    setComplaintSaveError('')
    try {
      const saved = await apiRequest('/complaints', session?.access_token, {
        method: 'POST', body: JSON.stringify(complaintInput(draft)),
      })
      if (version !== identityVersion.current) return null
      const ticket = applyComplaint(saved)
      setActiveComplaint(ticket)
      addToast(`Internal ticket saved: ${ticket.id}`, 'success')
      await refreshComplaints()
      return version === identityVersion.current ? ticket : null
    } catch (error) {
      if (version === identityVersion.current) setComplaintSaveError(error.message)
      return null
    } finally { complaintSaveBusy.current = false; setComplaintSaving(false) }
  }

  const updateComplaintStatus = async (ticketId, status, note = '') => {
    const version = identityVersion.current
    const saved = await apiRequest(`/officer/complaints/${ticketId}`, session?.access_token, {
      method: 'PATCH', body: JSON.stringify({ status, ...(note.trim() ? { note: note.trim() } : {}) }),
    })
    if (version !== identityVersion.current) throw new Error('The account changed. Please reopen the ticket.')
    const ticket = applyComplaint(saved)
    addToast(`Internal status updated to ${ticket.status}`, 'success')
    await refreshComplaints()
    return ticket
  }

  const saveOfficialReference = async (id, officialRef) => {
    const version = identityVersion.current
    const saved = await apiRequest(`/complaints/${id}/official-ref`, session?.access_token, {
      method: 'PATCH', body: JSON.stringify({ official_ref: officialRef }),
    })
    if (version !== identityVersion.current) throw new Error('The account changed. Please reopen the ticket.')
    applyComplaint(saved)
    addToast('Saved your unverified filing reference.', 'success')
    await refreshComplaints()
  }

  const handleRouteAction = () => addToast('Department routing is not available in this phase.', 'info')

  const loadSchemes = useCallback(async ({ query = '', state = '', category = '' } = {}) => {
    const request = ++schemeRequest.current
    setSchemesLoading(true)
    setSchemesError('')
    try {
      const params = new URLSearchParams({ limit: '10' })
      if (query.trim()) params.set('query', query.trim())
      if (state && state !== 'All') params.set('state', state)
      if (category && category !== 'All') params.set('category', category)
      const records = await publicApiRequest(`/schemes?${params}`)
      if (!Array.isArray(records)) throw new Error('The scheme service returned an invalid list. Please retry.')
      if (request === schemeRequest.current) setSchemes(records.map(schemeView))
    } catch (error) {
      if (request === schemeRequest.current) { setSchemes([]); setSchemesError(error.message) }
    } finally {
      if (request === schemeRequest.current) setSchemesLoading(false)
    }
  }, [])

  const sendChatMessage = async (userText, category = '') => {
    if (!userText.trim() || schemeChatBusy.current) return false
    schemeChatBusy.current = true
    setIsAiTyping(true)
    setSchemeChatError('')
    const now = Date.now()
    const version = schemeChatVersion.current
    setChatMessages(prev => [...prev, { id: `u-${now}`, sender: 'user', text: userText,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }])
    try {
      const profile = { ...(selectedState !== 'All' ? { state: selectedState } : {}), ...(currentUser.occupation ? { occupation: currentUser.occupation } : {}) }
      const reply = schemeAnswer(await publicApiRequest('/schemes/ask', {
        method: 'POST', body: JSON.stringify({ message: userText, profile,
          ...(category && category !== 'All' ? { category } : {}) }),
      }))
      if (version !== schemeChatVersion.current) return false
      setChatMessages(prev => [...prev, { id: `a-${now}`, sender: 'assistant', text: reply.answer,
        citations: reply.citations, mode: reply.mode, tool_trace: reply.tool_trace,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }])
      return true
    } catch (error) {
      if (version === schemeChatVersion.current) setSchemeChatError(error.message)
      return false
    } finally {
      if (version === schemeChatVersion.current) { schemeChatBusy.current = false; setIsAiTyping(false) }
    }
  }

  // Selecting a persona opens sign-in. Only /api/me establishes its role.
  const switchUserRole = newRole => { setAuthError(''); setLoginRole(newRole) }
  const signIn = async (email, password) => {
    setAuthBusy(true)
    setAuthError('')
    try {
      if (!supabase) throw new Error(authConfigurationError)
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) throw error
      return true
    } catch (error) { setAuthError(error.message); return false }
    finally { setAuthBusy(false) }
  }
  const signOut = async () => {
    if (!supabase || authBusy) return
    setAuthBusy(true)
    try {
      const { error } = await supabase.auth.signOut({ scope: 'local' })
      if (error) throw error
      clearAccount()
      setAuthError('')
      setComplaintsError('')
    } catch { setAuthError('Sign-out failed. Check your connection and try again.'); addToast('Sign-out failed. Please retry.', 'warning') }
    finally { setAuthBusy(false) }
  }

  // Mark all notifications as read
  const markNotificationsRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })))
  }

  return (
    <AppContext.Provider
      value={{
        currentUser,
        session, authLoading, authBusy, authError, loginRole, setLoginRole, signIn, signOut,
        complaintsLoading, complaintsError, refreshComplaints, loadComplaint,
        complaintSaving, complaintSaveError, saveOfficialReference,
        switchUserRole,
        selectedState,
        setSelectedState,
        schemes, schemesLoading, schemesError, schemeChatError, loadSchemes,
        savedSchemeIds,
        toggleSaveScheme,
        activeSchemeModal,
        setActiveSchemeModal,
        schemeSearchQuery,
        setSchemeSearchQuery,
        selectedSectorFilter,
        setSelectedSectorFilter,
        selectedTargetFilter,
        setSelectedTargetFilter,
        complaints,
        activeComplaint,
        setActiveComplaint,
        addComplaint,
        updateComplaintStatus,
        reviewModalComplaint,
        setReviewModalComplaint,
        packageModalComplaint,
        setPackageModalComplaint,
        officerTicketModal,
        setOfficerTicketModal,
        routingItems,
        handleRouteAction,
        notifications,
        markNotificationsRead,
        toasts,
        addToast,
        removeToast,
        chatMessages,
        sendChatMessage,
        isAiTyping
      }}
    >
      {children}
    </AppContext.Provider>
  )
}

export function useApp() {
  const context = useContext(AppContext)
  if (!context) {
    throw new Error('useApp must be used within an AppProvider')
  }
  return context
}

