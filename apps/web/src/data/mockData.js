// Mock data matching the JanSeva AI PDF specification exactly

export const INITIAL_USER_PROFILE = {
  name: 'Arjun Mishra',
  role: 'citizen', // 'citizen' | 'officer'
  occupation: 'Farmer',
  state: 'Punjab',
  district: 'Ludhiana',
  age: 38,
  incomeBand: 'Below ₹2.5 Lakh',
  landholding: '2.5 Acres (Small Farmer)',
  completeness: 80,
  avatar: 'AM',
  documents: [
    { id: 'd1', name: 'Aadhaar Card', verified: true, required: true },
    { id: 'd2', name: 'Land ownership (Khasra/Khatauni)', verified: true, required: true },
    { id: 'd3', name: 'Bank account (DBT enabled)', verified: true, required: true },
    { id: 'd4', name: 'Farmer registration certificate', verified: false, required: false },
    { id: 'd5', name: 'Income Certificate', verified: false, required: false },
  ]
}

export const OFFICIAL_SOURCES = [
  { name: 'agriculture.gov.in', url: 'https://agriculture.gov.in', dept: 'Ministry of Agriculture & Farmers Welfare' },
  { name: 'pmkisan.gov.in', url: 'https://pmkisan.gov.in', dept: 'PM Kisan Samman Nidhi Portal' },
  { name: 'myscheme.gov.in', url: 'https://www.myscheme.gov.in', dept: 'National Platform for Govt Schemes' },
  { name: 'pgportal.gov.in', url: 'https://pgportal.gov.in', dept: 'CPGRAMS Central Grievance Portal' },
  { name: 'connect.punjab.gov.in', url: 'https://connect.punjab.gov.in', dept: 'Punjab Citizen Grievance Portal' }
]

export const SCHEMES_DATA = [
  {
    id: 'S001',
    title: 'PM Kisan Samman Nidhi',
    category: 'Agriculture',
    type: 'Central Scheme',
    target: 'For Farmers',
    state: 'All India',
    benefit: '₹6,000 / year',
    benefitShort: '₹6,000 per year',
    description: 'Direct income support of ₹6,000 per year in three equal installments to all landholding eligible farmer families.',
    eligibilityStatus: 'POTENTIAL',
    matchPercentage: 95,
    matchedRules: [
      'Small & marginal farmer landholder',
      'Valid DBT-linked bank account',
      'Aadhaar verified'
    ],
    missingInfo: ['Latest land record verification for current financial year'],
    requiredDocuments: [
      'Aadhaar Card',
      'Citizenship Certificate / Domicile',
      'Landholding documents (Khasra/Khatauni)',
      'Bank Account details linked with Aadhaar'
    ],
    sourceUrl: 'https://pmkisan.gov.in',
    sourceTitle: 'pmkisan.gov.in (PM Kisan Portal)',
    lastReviewed: '2026-09-15',
    excerpt: 'Under PM-KISAN, a financial benefit of Rs. 6000/- per year is provided to all landholding farmer families, subject to certain exclusion criteria related to higher income status.',
    iconType: 'leaf',
    isRecommended: true,
  },
  {
    id: 'S002',
    title: 'Kisan Credit Card (KCC)',
    category: 'Agriculture',
    type: 'Central Scheme',
    target: 'For Farmers',
    state: 'All India',
    benefit: 'Up to ₹3 Lakh credit',
    benefitShort: 'Up to ₹3 Lakh',
    description: 'Provides timely and adequate credit to farmers for agricultural needs and post-harvest expenses at concessional interest rates.',
    eligibilityStatus: 'POTENTIAL',
    matchPercentage: 100,
    matchedRules: [
      'Owner cultivators and tenant farmers',
      'Farming activity verified in region',
      'No past default on agricultural credit'
    ],
    missingInfo: [],
    requiredDocuments: [
      'Duly filled application form',
      'Identity & Address Proof (Aadhaar / Voter ID)',
      'Land title documents verified by Patwari',
      'Passport size photographs'
    ],
    sourceUrl: 'https://agriculture.gov.in',
    sourceTitle: 'Ministry of Agriculture & Farmers Welfare',
    lastReviewed: '2026-10-01',
    excerpt: 'The Kisan Credit Card scheme aims at providing adequate and timely credit support from the banking system under a single window with flexible and simplified procedures for agriculture.',
    iconType: 'credit-card',
    isRecommended: true,
  },
  {
    id: 'S003',
    title: 'Pradhan Mantri Fasal Bima Yojana (PMFBY)',
    category: 'Agriculture',
    type: 'Central Scheme',
    target: 'For Farmers',
    state: 'All India',
    benefit: 'Up to 90% crop cover',
    benefitShort: 'Up to 90% Cover',
    description: 'Comprehensive crop insurance against unavoidable non-preventable natural risks from pre-sowing to post-harvest stages.',
    eligibilityStatus: 'POTENTIAL',
    matchPercentage: 88,
    matchedRules: [
      'Cultivating notified crops in notified area',
      'Farmer owns insurable interest in the crop'
    ],
    missingInfo: ['Sowing certificate for current crop season'],
    requiredDocuments: [
      'Proof of land ownership / tenancy agreement',
      'Sowing certificate issued by village officer',
      'Bank passbook photocopy',
      'Aadhaar card'
    ],
    sourceUrl: 'https://pmfby.gov.in',
    sourceTitle: 'pmfby.gov.in',
    lastReviewed: '2026-08-20',
    excerpt: 'PMFBY provides comprehensive insurance cover against failure of the crop thus helping in stabilising the income of the farmers and encouraging them to adopt innovative practices.',
    iconType: 'shield',
    isRecommended: true,
  },
  {
    id: 'S004',
    title: 'Ayushman Bharat (PM-JAY)',
    category: 'Healthcare',
    type: 'Central Scheme',
    target: 'Low Income Families',
    state: 'All India',
    benefit: '₹5 Lakh / family / year',
    benefitShort: '₹5 Lakh Cover',
    description: 'Provides health insurance cover of up to ₹5 lakh per family per year for secondary and tertiary care hospitalization.',
    eligibilityStatus: 'POTENTIAL',
    matchPercentage: 92,
    matchedRules: [
      'Household in SECC 2011 deprivation category',
      'Rural / low income profile match'
    ],
    missingInfo: ['Ration card family roster match verification'],
    requiredDocuments: [
      'Aadhaar Card',
      'Ration Card / Family ID',
      'Mobile number linked to Aadhaar'
    ],
    sourceUrl: 'https://pmjay.gov.in',
    sourceTitle: 'National Health Authority',
    lastReviewed: '2026-10-10',
    excerpt: 'PM-JAY is the world’s largest health insurance/assurance scheme fully financed by the government providing a cover of Rs. 5 lakhs per family per year.',
    iconType: 'heart',
    isRecommended: false,
  },
  {
    id: 'S005',
    title: 'Punjab Agricultural Debt Relief Scheme',
    category: 'Agriculture',
    type: 'State Scheme',
    target: 'For Farmers',
    state: 'Punjab',
    benefit: 'Debt waiver up to ₹2 Lakh',
    benefitShort: 'Up to ₹2 Lakh waiver',
    description: 'Punjab State scheme providing targeted debt relief to small and marginal farmers having crop loans with cooperative banks.',
    eligibilityStatus: 'NEEDS_INFO',
    matchPercentage: 75,
    matchedRules: [
      'Punjab domicile verified',
      'Small farmer (< 5 acres landholding)'
    ],
    missingInfo: ['Cooperative bank loan account passbook'],
    requiredDocuments: [
      'Punjab Residence Certificate',
      'Cooperative bank loan statement',
      'Khasra Girdawari verification'
    ],
    sourceUrl: 'https://punjab.gov.in',
    sourceTitle: 'Department of Agriculture, Govt. of Punjab',
    lastReviewed: '2026-09-01',
    excerpt: 'The Government of Punjab implements targeted farmer debt relief for eligible small and marginal farmers owning agricultural land up to 5 acres.',
    iconType: 'leaf',
    isRecommended: false,
  },
  {
    id: 'S006',
    title: 'PM Awas Yojana (Gramin)',
    category: 'Social Welfare',
    type: 'Central Scheme',
    target: 'Rural Households',
    state: 'All India',
    benefit: '₹1.20 Lakh assistance',
    benefitShort: '₹1.2 Lakh for Housing',
    description: 'Financial assistance to rural houseless households and those living in kutcha or dilapidated houses for construction of pucca houses.',
    eligibilityStatus: 'NEEDS_INFO',
    matchPercentage: 70,
    matchedRules: [
      'Rural resident without a pucca house'
    ],
    missingInfo: ['SECC Gram Sabha priority list inclusion'],
    requiredDocuments: [
      'Aadhaar Card',
      'Bank Account passbook',
      'MGNREGA job card number',
      'Consent letter to use Aadhaar'
    ],
    sourceUrl: 'https://pmayg.nic.in',
    sourceTitle: 'Ministry of Rural Development',
    lastReviewed: '2026-07-15',
    excerpt: 'PMAY-G aims to provide a pucca house with basic amenities to all rural families who are houseless or living in kutcha houses.',
    iconType: 'home',
    isRecommended: false,
  }
]

export const INITIAL_COMPLAINTS = [
  {
    id: 'REQ-2025-11428',
    title: 'Streetlight not working near City Park',
    category: 'Streetlight & Public Lighting',
    locality: 'City Park, Ward 12, Civil Lines, Lucknow, UP',
    description: 'The streetlight on Ward 12, near City Park main gate, has not been working for the last 5 days, causing severe safety issues at night for pedestrians.',
    priority: 'Medium',
    status: 'IN_PROGRESS', // DRAFT | LOCAL_SUBMITTED | UNDER_REVIEW | IN_PROGRESS | RESOLVED | REJECTED
    department: 'Urban Infrastructure Dept',
    officerNotes: 'Inspected by junior engineer; replacement LED luminaire scheduled.',
    submittedAt: '18 Jan 2026, 10:24 AM',
    expectedResolution: '21 Jan 2026',
    officialRef: null,
    officialStatus: 'NOT_FILED', // NOT_FILED | USER_REPORTED_FILED | ACKNOWLEDGED
    evidenceCount: 1,
    evidenceImage: 'https://images.unsplash.com/photo-1517486808906-6ca8b3f04846?auto=format&fit=crop&w=400&q=80',
    timeline: [
      { step: 'Complaint Submitted', time: '18 Jan, 10:24 AM', done: true, desc: 'Logged into JanSeva internal system' },
      { step: 'Assigned to Department', time: '18 Jan, 10:37 AM', done: true, desc: 'Auto-routed to Urban Infrastructure Dept (Confidence: 95%)' },
      { step: 'Work In Progress', time: '19 Jan, 02:15 PM', done: true, active: true, desc: 'Field technician dispatched for wiring check' },
      { step: 'Resolution & Closure', time: 'Expected by 21 Jan', done: false, desc: 'Pending physical completion verification' }
    ]
  },
  {
    id: 'REQ-2025-11587',
    title: 'Garbage not cleared for over 4 days',
    category: 'Sanitation & Garbage',
    locality: 'Ward 8, Civil Lines, Near Community Center',
    description: 'Municipal garbage bin overflowing at the corner of street 4. Stench is spreading and stray animals are scattering waste on the main road.',
    priority: 'High',
    status: 'UNDER_REVIEW',
    department: 'Sanitation Dept',
    officerNotes: 'Assigned to Ward sanitation supervisor.',
    submittedAt: '19 Jan 2026, 08:15 AM',
    expectedResolution: '20 Jan 2026',
    officialRef: null,
    officialStatus: 'NOT_FILED',
    evidenceCount: 1,
    evidenceImage: null,
    timeline: [
      { step: 'Complaint Submitted', time: '19 Jan, 08:15 AM', done: true, desc: 'Ticket logged' },
      { step: 'Under Officer Review', time: '19 Jan, 09:30 AM', done: true, active: true, desc: 'Officer evaluating duplicate report' },
      { step: 'Work In Progress', time: 'Pending', done: false, desc: 'Awaiting truck dispatch' },
      { step: 'Resolution & Closure', time: 'Pending', done: false, desc: 'Awaiting clearance photo' }
    ]
  },
  {
    id: 'REQ-2025-11562',
    title: 'Pothole cluster on Main Market Road',
    category: 'Roads & Potholes',
    locality: 'Ward 12, Main Market Road, opposite State Bank',
    description: 'Multiple deep potholes opened after rainfall. Two two-wheelers skidded yesterday. Urgent patching required.',
    priority: 'High',
    status: 'LOCAL_SUBMITTED',
    department: 'Roads & Transport Dept',
    officerNotes: 'Possible duplicate with REQ-2025-11540.',
    submittedAt: '19 Jan 2026, 11:45 AM',
    expectedResolution: '22 Jan 2026',
    officialRef: null,
    officialStatus: 'NOT_FILED',
    evidenceCount: 2,
    evidenceImage: null,
    timeline: [
      { step: 'Complaint Submitted', time: '19 Jan, 11:45 AM', done: true, active: true, desc: 'Internal draft confirmed by citizen' },
      { step: 'Assigned to Department', time: 'Pending', done: false, desc: 'Awaiting officer queue triage' },
      { step: 'Work In Progress', time: 'Pending', done: false, desc: 'Road repair team assignment' },
      { step: 'Resolution & Closure', time: 'Pending', done: false, desc: 'Surface inspection' }
    ]
  },
  {
    id: 'REQ-2025-11350',
    title: 'Contaminated tap water supply in Block B',
    category: 'Water Supply & Drainage',
    locality: 'Block B, Indira Nagar, Ward 5',
    description: 'Muddy and foul-smelling tap water received during morning supply hours for consecutive days.',
    priority: 'High',
    status: 'RESOLVED',
    department: 'Water Supply Dept',
    officerNotes: 'Pipeline leak near sub-station repaired and flushing completed.',
    submittedAt: '14 Jan 2026, 09:00 AM',
    expectedResolution: '16 Jan 2026',
    officialRef: 'CPGRAMS-UP-2026-09821',
    officialStatus: 'ACKNOWLEDGED',
    evidenceCount: 1,
    evidenceImage: null,
    timeline: [
      { step: 'Complaint Submitted', time: '14 Jan, 09:00 AM', done: true, desc: 'Submitted' },
      { step: 'Assigned to Department', time: '14 Jan, 10:15 AM', done: true, desc: 'Assigned to Water Supply' },
      { step: 'Work In Progress', time: '15 Jan, 11:30 AM', done: true, desc: 'Pipeline replacement' },
      { step: 'Resolution & Closure', time: '16 Jan, 04:00 PM', done: true, desc: 'Resolved and verified by citizen' }
    ]
  }
]

export const OFFICER_KPIS = {
  totalRequests: 1248,
  totalChange: '+12%',
  pendingReview: 317,
  pendingChange: '-8%',
  inProgress: 768,
  inProgressChange: '+18%',
  resolved: 163,
  resolvedChange: '+26%',
  slaCompliance: 94,
  slaChange: '+4 pp'
}

export const OFFICER_ROUTING_RECOMMENDATIONS = [
  {
    id: 'r1',
    issue: 'Streetlight - Ward 12',
    targetDept: 'Urban Infrastructure Dept',
    confidence: 95,
    locality: 'Ward 12, City Park'
  },
  {
    id: 'r2',
    issue: 'Road damage - Civil Lines',
    targetDept: 'Roads & Transport Dept',
    confidence: 92,
    locality: 'Civil Lines Road 4'
  },
  {
    id: 'r3',
    issue: 'Drainage overflow - Market Sector',
    targetDept: 'Sanitation & Drainage',
    confidence: 89,
    locality: 'Sector 3 Commercial'
  }
]

export const NOTIFICATIONS_DATA = [
  {
    id: 'n1',
    title: 'Grievance Update',
    message: 'Your streetlight request REQ-2025-11428 is now In Progress by Urban Infrastructure Dept.',
    time: '2 hours ago',
    read: false,
    type: 'status'
  },
  {
    id: 'n2',
    title: 'New Scheme Matched',
    message: 'You are 95% likely eligible for PM Kisan Samman Nidhi installment.',
    time: 'Yesterday',
    read: false,
    type: 'scheme'
  },
  {
    id: 'n3',
    title: 'Document Reminder',
    message: 'Verify your Land Ownership (Khasra) document to unlock state agriculture subsidies.',
    time: '3 days ago',
    read: true,
    type: 'document'
  }
]

