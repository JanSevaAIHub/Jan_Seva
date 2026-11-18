import { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react'
import { supabase, authConfigurationError } from '../lib/supabase'
import { apiRequest, publicApiRequest, onUnauthorized } from '../lib/api'
import { schemeView, schemeAnswer } from '../lib/schemes'
import { complaintInput, complaintView, ticketNotifications, DEPARTMENTS } from '../lib/complaints'

const AppContext = createContext(null)
const GUEST = { name: 'Guest', role: 'guest', avatar: '?', completeness: 0 }
const EMPTY_DRAFT = { title: '', category: 'Streetlight & Public Lighting', description: '', locality: '', priority: 'Medium', photo: null }

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
  const [eligibilityProfile, setEligibilityProfile] = useState({})
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
  const [complaintDraft, setComplaintDraft] = useState(EMPTY_DRAFT)
  const draftOwner = useRef(null)
  const submissionKey = useRef(null)
  const [pendingEvidence, setPendingEvidence] = useState(null)
  const evidenceBusy = useRef(false)
  const [evidenceMaxBytes, setEvidenceMaxBytes] = useState(5242880)
  useEffect(() => { publicApiRequest('/complaints/evidence-config').then(c => {
    if (Number.isInteger(c.max_bytes) && c.max_bytes > 0) setEvidenceMaxBytes(c.max_bytes)
  }).catch(() => { /* Server validates uploads even when limits could not be fetched. */ }) }, [])
  const [packageModalComplaint, setPackageModalComplaint] = useState(null)
  const [officerTicketModal, setOfficerTicketModal] = useState(null)
  const routingItems = currentUser.role === 'officer' ? complaints.filter(c => c.status !== 'RESOLVED').slice(0, 5).map(c => ({ id: c.id, issue: c.title, targetDept: DEPARTMENTS[c.categoryCode] })) : []
  const [complaintsTruncated, setComplaintsTruncated] = useState(false)

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
  const [schemeChatDraft, setSchemeChatDraft] = useState('')
  const [agentMessages, setAgentMessages] = useState([])
  const [agentDraft, setAgentDraft] = useState('')
  const [agentError, setAgentError] = useState('')
  const [agentTyping, setAgentTyping] = useState(false)
  const agentBusy = useRef(false)

  const clearSchemeChat = useCallback(() => {
    schemeChatVersion.current += 1
    schemeChatBusy.current = false
    setChatMessages([])
    setSchemeChatError('')
    setIsAiTyping(false)
    setSchemeChatDraft('')
    setAgentMessages([])
    setAgentDraft('')
    setAgentError('')
    setAgentTyping(false)
    agentBusy.current = false
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
    setComplaintsTruncated(false)
    setActiveComplaint(null)
    setOfficerTicketModal(null)
    setPackageModalComplaint(null)
    setReviewModalComplaint(null)
    setPendingEvidence(null)
    submissionKey.current = null
    setComplaintSaveError('')
    setSavedSchemeIds([])
    setEligibilityProfile({})
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
        if (nextSession?.user.id) {
          if (draftOwner.current && draftOwner.current !== nextSession.user.id) setComplaintDraft(EMPTY_DRAFT)
          draftOwner.current = nextSession.user.id
        }
        identityVersion.current += 1
        clearSchemeChat()
        sessionUser.current = nextSession?.user.id || null
        setCurrentUser(GUEST)
        setComplaints([])
        setActiveComplaint(null)
        setOfficerTicketModal(null)
        setPackageModalComplaint(null)
        setReviewModalComplaint(null)
        setPendingEvidence(null)
        submissionKey.current = null
        setComplaintSaveError('')
        setSavedSchemeIds([])
        setEligibilityProfile({})
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
      const records = []
      for (let offset = 0; offset < 1000; offset += 100) {
        const batch = await apiRequest(offset ? `/complaints?limit=100&offset=${offset}` : '/complaints', session.access_token)
        if (!Array.isArray(batch)) throw new Error('The API returned an invalid complaint list. Please retry.')
        records.push(...batch)
        if (batch.length < 100) break
      }
      if (!isCurrent()) return
      if (!Array.isArray(records)) throw new Error('The API returned an invalid complaint list. Please retry.')
      const tickets = records.map(complaintView)
      // A detail or write completed after this list began. Its newer record
      // must survive an older database snapshot returned by this request.
      if (revision !== complaintRevision.current) return
      setComplaints(tickets)
      setComplaintsTruncated(tickets.length >= 1000)
      setNotifications(previous => {
        const readIds = new Set(previous.filter(n => n.read).map(n => n.id))
        return ticketNotifications(tickets).map(n => ({ ...n, read: readIds.has(n.id) }))
      })
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
      const payload = complaintInput(draft)
      const fingerprint = JSON.stringify(payload)
      if (submissionKey.current?.fingerprint !== fingerprint) submissionKey.current = { fingerprint, key: crypto.randomUUID() }
      const saved = await apiRequest('/complaints', session?.access_token, {
        method: 'POST', body: JSON.stringify(payload), headers: { 'Idempotency-Key': submissionKey.current.key },
      })
      if (version !== identityVersion.current) return null
      const ticket = applyComplaint(saved)
      setActiveComplaint(ticket)
      addToast(`Internal ticket saved: ${ticket.id}`, 'success')
      submissionKey.current = null
      if (draft.photo) await uploadEvidence(ticket.id, draft.photo)
      await refreshComplaints()
      return version === identityVersion.current ? ticket : null
    } catch (error) {
      if (version === identityVersion.current) setComplaintSaveError(error.message)
      return null
    } finally { complaintSaveBusy.current = false; setComplaintSaving(false) }
  }

  const uploadEvidence = async (ticketId, file) => {
    if (evidenceBusy.current) return false
    evidenceBusy.current = true
    const version = identityVersion.current
    setPendingEvidence({ ticketId, file, state: 'uploading', error: '' })
    try {
      await apiRequest(`/complaints/${ticketId}/evidence`, session?.access_token, {
        method: 'POST', body: file, headers: { 'Content-Type': file.type, 'X-Filename': encodeURIComponent(file.name) },
      })
      if (version !== identityVersion.current) return false
      setPendingEvidence({ ticketId, file: null, state: 'uploaded', error: '' })
      return true
    } catch (error) {
      if (version === identityVersion.current) setPendingEvidence({ ticketId, file, state: 'failed', error: error.message })
      return false
    } finally { evidenceBusy.current = false }
  }

  const sendAgentMessage = async () => {
    const message = agentDraft.trim()
    if (message.length < 3 || agentBusy.current) return false
    const version = schemeChatVersion.current
    const history = agentMessages.slice(-10).map(m => ({ role: m.sender, content: m.text.slice(0, 5000) }))
    agentBusy.current = true
    setAgentTyping(true)
    setAgentError('')
    const id = crypto.randomUUID()
    setAgentMessages(previous => [...previous, { id, sender: 'user', text: message }])
    try {
      const reply = await publicApiRequest('/agent/message', { method: 'POST', body: { message, history, profile: { state: selectedState === 'All' ? null : selectedState } } })
      if (version !== schemeChatVersion.current) return false
      if (typeof reply.answer !== 'string' || !Array.isArray(reply.citations) || !Array.isArray(reply.tool_trace) ||
        !['scheme', 'complaint', 'mixed', 'unknown'].includes(reply.intent)) throw new Error('The assistant returned an invalid answer. Please retry.')
      if (['grounded_extracts', 'extractive_fallback', 'insufficient_evidence'].includes(reply.mode)) schemeAnswer(reply)
      else if (reply.citations.length || !['clarification', 'ai_suggestion'].includes(reply.mode)) throw new Error('The assistant returned invalid sources. Please retry.')
      setAgentMessages(previous => [...previous, { id: crypto.randomUUID(), sender: 'assistant', text: reply.answer, citations: reply.citations, mode: reply.mode }])
      setAgentDraft(current => current.trim() === message ? '' : current)
      return true
    } catch (error) {
      if (version === schemeChatVersion.current) {
        setAgentError(error.message)
        setAgentMessages(previous => previous.filter(m => m.id !== id))
      }
      return false
    } finally { if (version === schemeChatVersion.current) { agentBusy.current = false; setAgentTyping(false) } }
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

  const handleRouteAction = async id => {
    try { setOfficerTicketModal(await loadComplaint(id)) }
    catch (error) { addToast(error.message, 'warning') }
  }
  const updateComplaintRouting = async (id, category) => {
    const version = identityVersion.current
    const saved = await apiRequest(`/officer/complaints/${id}/routing`, session?.access_token, { method: 'PATCH', body: { category } })
    if (version !== identityVersion.current) throw new Error('The account changed. Please reopen the ticket.')
    applyComplaint(saved)
    await refreshComplaints()
  }

  const loadSchemes = useCallback(async ({ query = '', state = '', category = '' } = {}) => {
    const request = ++schemeRequest.current
    setSchemesLoading(true)
    setSchemesError('')
    try {
      const params = new URLSearchParams({ limit: '10' })
      if (query.trim()) { params.set('query', query.trim()); params.set('search_mode', 'keyword') }
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
          history: chatMessages.filter(m => m.sender === 'user').slice(-5).map(m => m.text.slice(0, 1000)),
          ...(category && category !== 'All' ? { category } : {}) }),
      }))
      if (version !== schemeChatVersion.current) return false
      setChatMessages(prev => [...prev, { id: `a-${now}`, sender: 'assistant', text: reply.answer,
        citations: reply.citations, mode: reply.mode, tool_trace: reply.tool_trace,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }])
      return true
    } catch (error) {
      if (version === schemeChatVersion.current) {
        setSchemeChatError(error.message)
        setChatMessages(prev => prev.filter(m => m.id !== `u-${now}`))
      }
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
      setComplaintDraft(EMPTY_DRAFT)
      draftOwner.current = null
      setAuthError('')
      setComplaintsError('')
    } catch { setAuthError('Sign-out failed. Check your connection and try again.'); addToast('Sign-out failed. Please retry.', 'warning') }
    finally { setAuthBusy(false) }
  }

  const signUp = async (email, password) => {
    setAuthBusy(true)
    setAuthError('')
    try {
      if (!supabase) throw new Error(authConfigurationError)
      const { data, error } = await supabase.auth.signUp({ email, password })
      if (error) throw error
      return { ok: true, confirmationRequired: !data.session }
    } catch (error) { setAuthError(error.message); return { ok: false } }
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
        session, authLoading, authBusy, authError, loginRole, setLoginRole, signIn, signOut, signUp,
        complaintDraft, setComplaintDraft, pendingEvidence, uploadEvidence, evidenceMaxBytes,
        agentMessages, agentDraft, setAgentDraft, agentError, agentTyping, sendAgentMessage,
        schemeChatDraft, setSchemeChatDraft,
        complaintsLoading, complaintsError, complaintsTruncated, refreshComplaints, loadComplaint, updateComplaintRouting,
        complaintSaving, complaintSaveError, saveOfficialReference,
        switchUserRole,
        selectedState,
        eligibilityProfile, setEligibilityProfile,
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

