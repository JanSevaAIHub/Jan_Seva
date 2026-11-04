export type EligibilityStatus = 'POTENTIAL' | 'NOT_MATCHED' | 'NEEDS_INFO'
export type ComplaintCategory = 'road' | 'water' | 'sanitation' | 'streetlight' | 'other'
export type InternalStatus =
  | 'DRAFT'
  | 'LOCAL_SUBMITTED'
  | 'UNDER_REVIEW'
  | 'IN_PROGRESS'
  | 'RESOLVED'
  | 'CANCELLED'
  | 'REJECTED'
  | 'REOPENED'
export type OfficialFilingStatus = 'NOT_FILED' | 'USER_REPORTED_FILED' | 'ACKNOWLEDGED'

export interface ProfileInput {
  state?: string
  occupation?: string
  age_range?: string
}

export interface Citation {
  title: string
  url: string
  excerpt?: string
  reviewed_at?: string
}

export interface SchemeCard {
  id: string
  title: string
  category: string
  state: string
  summary: string
  source_url: string
  reviewed_at: string
  eligibility: EligibilityStatus
  reasons: string[]
  documents: string[]
}

export interface ComplaintSummary {
  id: string
  title: string
  category: ComplaintCategory
  locality: string
  status: InternalStatus
  official_filing_status: OfficialFilingStatus
  created_at: string
}

export interface ToolTrace {
  tool: string
  status: 'ok' | 'skipped' | 'error'
}

export interface ApiError {
  detail: { code: string; message: string }
}
