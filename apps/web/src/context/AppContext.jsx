import { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react'
import {
  SCHEMES_DATA,
  NOTIFICATIONS_DATA,
} from '../data/mockData'
import { supabase } from '../lib/supabase'
import { apiRequest } from '../lib/api'
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
  const listVersion = useRef(0)
  const sessionUser = useRef(null)
  const sessionToken = useRef(undefined)
  const [selectedState, setSelectedState] = useState('Punjab')
  
  // Schemes state
  const [schemes, setSchemes] = useState(SCHEMES_DATA)
  const [savedSchemeIds, setSavedSchemeIds] = useState(['S001', 'S002'])
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
  const [complaintSaveError, setComplaintSaveError] = useState('')
  const [reviewModalComplaint, setReviewModalComplaint] = useState(null)
  const [packageModalComplaint, setPackageModalComplaint] = useState(null)
  const [officerTicketModal, setOfficerTicketModal] = useState(null)
  const [routingItems] = useState([])

  // Notifications state
  const [notifications, setNotifications] = useState(NOTIFICATIONS_DATA)
  
  // Toast notifications
  const [toasts, setToasts] = useState([])

  // AI Chat Assistant state (for Scheme Discovery)
  const [chatMessages, setChatMessages] = useState([
    {
      id: 'm1',
      sender: 'user',
      text: 'I am a small farmer. What government schemes can I apply for?',
      time: '10:24 AM'
    },
    {
      id: 'm2',
      sender: 'assistant',
      text: 'Here are the most relevant schemes for you as a small farmer with 2.5 acres of land:',
      bullets: [
        'PM Kisan Samman Nidhi — ₹6,000/year direct financial support',
        'Kisan Credit Card (KCC) — Concessional crop loans up to ₹3 Lakh',
        'Pradhan Mantri Fasal Bima Yojana (PMFBY) — Crop loss insurance'
      ],
      footnote: "I've matched your profile and updated eligibility, benefits and required documents on the right. You can filter or compare them directly.",
      citations: [
        { title: 'pmkisan.gov.in', url: 'https://pmkisan.gov.in' },
        { title: 'agriculture.gov.in', url: 'https://agriculture.gov.in' }
      ],
      time: '10:24 AM'
    }
  ])
  const [isAiTyping, setIsAiTyping] = useState(false)

  // Add toast notification
  const addToast = (message, type = 'success') => {
    const id = Date.now() + Math.random()
    setToasts(prev => [...prev, { id, message, type }])
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id))
    }, 4000)
  }

  const removeToast = (id) => {
    setToasts(prev => prev.filter(t => t.id !== id))
  }

  // Toggle bookmark scheme
  const toggleSaveScheme = (schemeId) => {
    setSavedSchemeIds(prev => {
      const exists = prev.includes(schemeId)
      if (exists) {
        addToast('Removed scheme from saved list', 'info')
        return prev.filter(id => id !== schemeId)
      } else {
        addToast('Scheme saved to your profile!', 'success')
        return [...prev, schemeId]
      }
    })
  }

  // The auth subscription only updates React state; API calls run outside its lock.
  useEffect(() => {
    if (!supabase) return
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      const token = nextSession?.access_token || null
      if (sessionToken.current === token) return
      sessionToken.current = token
      accountVersion.current += 1
      if (sessionUser.current !== nextSession?.user.id) {
        sessionUser.current = nextSession?.user.id || null
        setCurrentUser(GUEST)
        setComplaints([])
        setActiveComplaint(null)
        setOfficerTicketModal(null)
        setPackageModalComplaint(null)
        setComplaintSaveError('')
      }
      setSession(nextSession)
      setAuthLoading(Boolean(nextSession))
      setComplaintsError('')
      if (!nextSession) setComplaintsLoading(false)
    })
    return () => subscription.unsubscribe()
  }, [])

  const applyComplaint = saved => {
    const ticket = complaintView(saved)
    setComplaints(prev => [ticket, ...prev.filter(c => c.id !== ticket.id)])
    setActiveComplaint(prev => !prev || prev.id === ticket.id ? ticket : prev)
    setOfficerTicketModal(prev => prev?.id === ticket.id ? ticket : prev)
    setPackageModalComplaint(prev => prev?.id === ticket.id ? ticket : prev)
    return ticket
  }

  const refreshComplaints = useCallback(async () => {
    if (!session) return
    const version = accountVersion.current
    const request = ++listVersion.current
    const isCurrent = () => version === accountVersion.current && request === listVersion.current
    setComplaintsLoading(true)
    setComplaintsError('')
    try {
      const [profile, records] = await Promise.all([
        apiRequest('/me', session.access_token),
        apiRequest('/complaints', session.access_token),
      ])
      if (!isCurrent()) return
      setCurrentUser({ ...profile, avatar: profile.name.split(' ').map(n => n[0]).join(''), completeness: 0 })
      setAuthError('')
      const tickets = records.map(complaintView)
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

  const loadComplaint = async id => {
    const version = accountVersion.current
    const saved = await apiRequest(`/complaints/${encodeURIComponent(id)}`, session?.access_token)
    if (version !== accountVersion.current) throw new Error('The account changed. Please try again.')
    return applyComplaint(saved)
  }

  const addComplaint = async draft => {
    if (complaintSaving) return null
    const version = accountVersion.current
    setComplaintSaving(true)
    setComplaintSaveError('')
    try {
      const saved = await apiRequest('/complaints', session?.access_token, {
        method: 'POST', body: JSON.stringify(complaintInput(draft)),
      })
      if (version !== accountVersion.current) return null
      const ticket = applyComplaint(saved)
      setActiveComplaint(ticket)
      addToast(`Internal ticket saved: ${ticket.id}`, 'success')
      await refreshComplaints()
      return ticket
    } catch (error) {
      if (version === accountVersion.current) setComplaintSaveError(error.message)
      return null
    } finally { setComplaintSaving(false) }
  }

  const updateComplaintStatus = async (ticketId, status, note = '') => {
    const version = accountVersion.current
    const saved = await apiRequest(`/officer/complaints/${ticketId}`, session?.access_token, {
      method: 'PATCH', body: JSON.stringify({ status, ...(note.trim() ? { note: note.trim() } : {}) }),
    })
    if (version !== accountVersion.current) throw new Error('The account changed. Please reopen the ticket.')
    const ticket = applyComplaint(saved)
    addToast(`Internal status updated to ${ticket.status}`, 'success')
    await refreshComplaints()
    return ticket
  }

  const saveOfficialReference = async (id, officialRef) => {
    const version = accountVersion.current
    const saved = await apiRequest(`/complaints/${id}/official-ref`, session?.access_token, {
      method: 'PATCH', body: JSON.stringify({ official_ref: officialRef }),
    })
    if (version !== accountVersion.current) throw new Error('The account changed. Please reopen the ticket.')
    applyComplaint(saved)
    addToast('Saved your unverified filing reference.', 'success')
    await refreshComplaints()
  }

  const handleRouteAction = () => addToast('Department routing is not available in this phase.', 'info')

  // Send AI Chat Message on Schemes page
  const sendChatMessage = (userText) => {
    if (!userText.trim()) return

    const now = new Date()
    const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })

    const newMsg = {
      id: `u-${Date.now()}`,
      sender: 'user',
      text: userText,
      time: timeStr
    }

    setChatMessages(prev => [...prev, newMsg])
    setIsAiTyping(true)

    // Simulate realistic AI thought and grounded response
    setTimeout(() => {
      let reply = {}
      const lower = userText.toLowerCase()

      if (lower.includes('document') || lower.includes('aadhaar') || lower.includes('apply')) {
        reply = {
          text: 'Here are the essential documents verified against official government guidelines:',
          bullets: [
            'Aadhaar Card with linked active mobile number',
            'Land ownership records (Khasra / Khatauni) certified by local Patwari',
            'Active bank account with Direct Benefit Transfer (DBT) enabled'
          ],
          footnote: 'You can check your document readiness in the Profile sidebar on the right.',
          citations: [{ title: 'myscheme.gov.in', url: 'https://myscheme.gov.in' }]
        }
      } else if (lower.includes('complaint') || lower.includes('water') || lower.includes('road') || lower.includes('street')) {
        reply = {
          text: 'For civic issues like road damage, water disruption, or broken streetlights, you can draft an official complaint right away:',
          bullets: [
            'Go to Raise Complaint in the sidebar',
            'Our AI classifies the category and suggests the municipal department automatically',
            'We provide an official copyable complaint package for your local portal'
          ],
          footnote: 'Note: JanSeva provides internal tracking. Official filing is completed by you on the government portal.',
          citations: [{ title: 'pgportal.gov.in', url: 'https://pgportal.gov.in' }]
        }
      } else if (lower.includes('fertilizer') || lower.includes('subsidy') || lower.includes('punjab')) {
        reply = {
          text: 'In Punjab, multiple agricultural subsidies and debt relief schemes are active:',
          bullets: [
            'Punjab Crop Diversification & Machinery Subsidy (up to 50%)',
            'Subsidized canal water and electricity for registered farmers',
            'Punjab Agricultural Debt Relief Scheme for small holdings'
          ],
          footnote: 'All Punjab state schemes are filtered and viewable in the central list.',
          citations: [{ title: 'punjab.gov.in', url: 'https://punjab.gov.in' }]
        }
      } else {
        reply = {
          text: `Based on your profile as a ${currentUser.occupation} in ${selectedState}:`,
          bullets: [
            'PM Kisan Samman Nidhi (Next installment due: ₹2,000)',
            'Kisan Credit Card (Concessional credit limit up to ₹3 Lakh)',
            'PM Fasal Bima Yojana (Subsidized premium at 1.5% - 2%)'
          ],
          footnote: 'Every recommended scheme links directly to the official government portal.',
          citations: [
            { title: 'pmkisan.gov.in', url: 'https://pmkisan.gov.in' },
            { title: 'agriculture.gov.in', url: 'https://agriculture.gov.in' }
          ]
        }
      }

      setChatMessages(prev => [
        ...prev,
        {
          id: `a-${Date.now()}`,
          sender: 'assistant',
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          ...reply
        }
      ])
      setIsAiTyping(false)
    }, 1100)
  }

  // Selecting a persona opens sign-in. Only /api/me establishes its role.
  const switchUserRole = newRole => { setAuthError(''); setLoginRole(newRole) }
  const signIn = async (email, password) => {
    setAuthBusy(true)
    setAuthError('')
    try {
      if (!supabase) throw new Error('Sign-in is not configured. Set the public Supabase URL and key.')
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) throw error
      return true
    } catch (error) { setAuthError(error.message); return false }
    finally { setAuthBusy(false) }
  }
  const signOut = async () => {
    if (!supabase) return
    const { error } = await supabase.auth.signOut({ scope: 'local' })
    if (error) addToast(error.message, 'warning')
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
        schemes,
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

