import { validCitation } from './schemes.js'
import { CATEGORY_LABELS } from './complaints.js'

const uuid = value => typeof value === 'string' && /^[\da-f]{8}-(?:[\da-f]{4}-){3}[\da-f]{12}$/i.test(value)
const text = value => typeof value === 'string' && value.trim().length > 0
const trace = value => value && text(value.tool) && ['ok', 'skipped', 'error'].includes(value.status) && text(value.detail)
const draft = value => value && ['title', 'description', 'locality'].every(k => typeof value[k] === 'string') &&
  value.title.length <= 250 && value.description.length > 0 && value.description.length <= 5000 && value.locality.length <= 250 &&
  (value.category == null || Object.hasOwn(CATEGORY_LABELS, value.category))

export function agentReply(reply) {
  if (!reply || !uuid(reply.session_id) || !['scheme', 'complaint', 'mixed', 'clarify'].includes(reply.intent) ||
    !['ok', 'partial', 'needs_info', 'unavailable'].includes(reply.status) || !text(reply.response) ||
    !Array.isArray(reply.citations) || !reply.citations.every(c => validCitation(c) && uuid(c.scheme_id) && (c.chunk_id == null || uuid(c.chunk_id))) ||
    !Array.isArray(reply.tool_trace) || !reply.tool_trace.every(trace) || !Array.isArray(reply.actions) ||
    !reply.actions.every(a => trace(a) && text(a.label) && ['/schemes', '/complaints/new', '/requests'].includes(a.path) &&
      typeof a.requires_confirmation === 'boolean' && (a.path !== '/complaints/new' || (a.requires_confirmation && draft(a.draft)))) ||
    !Array.isArray(reply.eligibility) || !reply.eligibility.every(e => e && uuid(e.scheme_id) &&
      ['POTENTIAL', 'NOT_MATCHED', 'NEEDS_INFO'].includes(e.status) && Array.isArray(e.reasons) && e.reasons.every(text) &&
      Array.isArray(e.missing_fields) && (e.status !== 'POTENTIAL' || e.missing_fields.length === 0))) {
    throw new Error('The assistant returned an invalid or unsafe response. Please retry.')
  }
  return reply
}
