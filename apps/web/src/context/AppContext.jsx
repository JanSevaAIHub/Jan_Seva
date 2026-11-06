import { createContext, useContext, useState, useEffect } from 'react'
import {
  INITIAL_USER_PROFILE,
  SCHEMES_DATA,
  INITIAL_COMPLAINTS,
  NOTIFICATIONS_DATA,
  OFFICER_ROUTING_RECOMMENDATIONS,
} from '../data/mockData'

const AppContext = createContext(null)

export function AppProvider({ children }) {
  // Current user state (can be switched between Citizen and Officer)
  const [currentUser, setCurrentUser] = useState(INITIAL_USER_PROFILE)
  const [selectedState, setSelectedState] = useState('Punjab')
  
  // Schemes state
  const [schemes, setSchemes] = useState(SCHEMES_DATA)
  const [savedSchemeIds, setSavedSchemeIds] = useState(['S001', 'S002'])
  const [activeSchemeModal, setActiveSchemeModal] = useState(null)
  const [schemeSearchQuery, setSchemeSearchQuery] = useState('')
  const [selectedSectorFilter, setSelectedSectorFilter] = useState('All')
  const [selectedTargetFilter, setSelectedTargetFilter] = useState('All')
  
  // Complaints state
  const [complaints, setComplaints] = useState(INITIAL_COMPLAINTS)
  const [activeComplaint, setActiveComplaint] = useState(INITIAL_COMPLAINTS[0])
  const [reviewModalComplaint, setReviewModalComplaint] = useState(null)
  const [packageModalComplaint, setPackageModalComplaint] = useState(null)
  const [officerTicketModal, setOfficerTicketModal] = useState(null)
  const [routingItems, setRoutingItems] = useState(OFFICER_ROUTING_RECOMMENDATIONS)

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

  // Add new complaint
  const addComplaint = (newComplaintData) => {
    const randomNum = Math.floor(1000 + Math.random() * 9000)
    const newId = `REQ-2025-${randomNum}`
    const createdComplaint = {
      ...newComplaintData,
      id: newId,
      status: 'LOCAL_SUBMITTED',
      officialStatus: 'NOT_FILED',
      submittedAt: 'Just now',
      expectedResolution: 'In 3-5 days',
      officialRef: null,
      timeline: [
        { step: 'Complaint Submitted', time: 'Just now', done: true, active: true, desc: 'Logged into JanSeva internal system' },
        { step: 'Assigned to Department', time: 'Pending', done: false, desc: 'Pending officer triage' },
        { step: 'Work In Progress', time: 'Pending', done: false, desc: 'Technician dispatch scheduled' },
        { step: 'Resolution & Closure', time: 'Pending', done: false, desc: 'Field verification' }
      ]
    }
    setComplaints(prev => [createdComplaint, ...prev])
    setActiveComplaint(createdComplaint)
    addToast(`Complaint ${newId} created successfully!`, 'success')
    return createdComplaint
  }

  // Officer updates a complaint status
  const updateComplaintStatus = (ticketId, newStatus, note = '') => {
    setComplaints(prev => prev.map(c => {
      if (c.id === ticketId) {
        const updatedTimeline = c.timeline.map((step, idx) => {
          if (newStatus === 'IN_PROGRESS' && idx <= 2) return { ...step, done: true, active: idx === 2 }
          if (newStatus === 'RESOLVED') return { ...step, done: true, active: false }
          return step
        })
        return {
          ...c,
          status: newStatus,
          officerNotes: note || c.officerNotes,
          timeline: updatedTimeline
        }
      }
      return c
    }))
    addToast(`Ticket ${ticketId} status updated to ${newStatus}`, 'info')
  }

  // Officer route action
  const handleRouteAction = (routeId, targetDept) => {
    setRoutingItems(prev => prev.filter(r => r.id !== routeId))
    addToast(`Successfully routed request to ${targetDept}`, 'success')
  }

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

  // Toggle user role
  const switchUserRole = (newRole) => {
    if (newRole === 'officer') {
      setCurrentUser({
        name: 'R. Singh',
        role: 'officer',
        department: 'Urban Development Dept',
        designation: 'Nodal Review Officer',
        avatar: 'RS'
      })
      addToast('Switched to Demo Officer account (R. Singh)', 'info')
    } else {
      setCurrentUser(INITIAL_USER_PROFILE)
      addToast('Switched to Citizen account (Arjun Mishra)', 'info')
    }
  }

  // Mark all notifications as read
  const markNotificationsRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })))
  }

  return (
    <AppContext.Provider
      value={{
        currentUser,
        setCurrentUser,
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

