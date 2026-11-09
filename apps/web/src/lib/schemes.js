export function officialSourceUrl(value) {
  try {
    const url = new URL(value)
    return url.protocol === 'https:' && !url.username && !url.password &&
      !url.hash && (!url.port || url.port === '443') && (url.hostname.endsWith('.gov.in') || url.hostname.endsWith('.nic.in') || url.hostname === 'sansad.in')
  } catch { return false }
}

export function schemeView(record) {
  if (!record || typeof record.id !== 'string' || typeof record.title !== 'string' || typeof record.description !== 'string' ||
    typeof record.category !== 'string' || typeof record.eligibility !== 'string' || typeof record.evidence_text !== 'string' ||
    !Array.isArray(record.required_documents) || !record.required_documents.every(doc => typeof doc === 'string') ||
    typeof record.document_note !== 'string' || typeof record.reviewed_at !== 'string' ||
    !officialSourceUrl(record.source_url) || !Number.isFinite(Date.parse(record.reviewed_at))) {
    throw new Error('The scheme service returned an invalid record. Please retry.')
  }
  const applicationUrl = record.rules_json?.application_url
  if (applicationUrl && !officialSourceUrl(applicationUrl) && applicationUrl !== 'https://maandhan.in/') throw new Error('The scheme service returned an invalid application link.')
  return {
    ...record, department: record.rules_json?.department || '', applicationUrl: applicationUrl || null,
    type: record.state === 'National' ? 'National scheme' : `${record.state} · reviewed coverage`,
    target: 'Check source conditions', benefit: record.description, benefitShort: record.category,
    eligibilityStatus: 'NEEDS_INFO', matchedRules: [record.eligibility], missingInfo: [],
    requiredDocuments: record.required_documents,
    documentNote: record.document_note, sourceTitle: new URL(record.source_url).hostname,
    sourceUrl: record.source_url, excerpt: record.evidence_text,
    lastReviewed: new Date(record.reviewed_at).toLocaleDateString(),
    iconType: record.category === 'Insurance' ? 'shield' : record.category === 'Savings' ? 'credit-card' : 'sparkles',
  }
}

export function schemeAnswer(reply) {
  if (!reply || typeof reply.answer !== 'string' || !Array.isArray(reply.citations) ||
    !['grounded_extracts', 'extractive_fallback', 'insufficient_evidence'].includes(reply.mode)) {
    throw new Error('The scheme service returned an invalid answer. Please retry.')
  }
  const valid = reply.citations.every(validCitation)
  if (!valid || (reply.mode !== 'insufficient_evidence' && reply.citations.length === 0) || (reply.mode === 'insufficient_evidence' && reply.citations.length > 0)) {
    throw new Error('The scheme service returned an invalid answer. Please retry.')
  }
  return reply
}

export function validCitation(citation) {
  return Boolean(citation && typeof citation.title === 'string' && citation.title.trim() &&
    typeof citation.excerpt === 'string' && citation.excerpt.trim() && officialSourceUrl(citation.url) &&
    typeof citation.reviewed_at === 'string' && Number.isFinite(Date.parse(citation.reviewed_at)))
}

export function eligibilityResult(reply, scheme) {
  const strings = value => Array.isArray(value) && value.every(v => typeof v === 'string' && v.trim())
  if (!reply || reply.scheme_id !== scheme.id || !['POTENTIAL', 'NOT_MATCHED', 'NEEDS_INFO'].includes(reply.status) ||
      !strings(reply.matched_rules) || !strings(reply.missing_fields) || !strings(reply.reasons) || !reply.reasons.length ||
      !Array.isArray(reply.citations) || !reply.citations.every(c => validCitation(c) && c.scheme_id === scheme.id &&
        c.title === scheme.title && c.url === scheme.sourceUrl && scheme.evidence_text.includes(c.excerpt) &&
        Date.parse(c.reviewed_at) === Date.parse(scheme.reviewed_at)) ||
      (reply.status !== 'NEEDS_INFO' && reply.citations.length === 0) ||
      (reply.citations.length === 0 && reply.matched_rules.length > 0) ||
      (reply.status === 'POTENTIAL' && (reply.missing_fields.length > 0 || reply.matched_rules.length === 0))) {
    throw new Error('The eligibility service returned an invalid or unsupported assessment. Please retry.')
  }
  return reply
}

export const eligibilityLabels = { POTENTIAL: 'Potential match', NOT_MATCHED: 'Conditions not matched', NEEDS_INFO: 'More information needed' }
