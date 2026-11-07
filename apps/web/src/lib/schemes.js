export function officialSourceUrl(value) {
  try {
    const url = new URL(value)
    return url.protocol === 'https:' && !url.username && !url.password &&
      (!url.port || url.port === '443') && (url.hostname.endsWith('.gov.in') || url.hostname.endsWith('.nic.in') || url.hostname === 'sansad.in')
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
  return {
    ...record, type: record.state === 'National' ? 'National scheme' : `${record.state} scheme`,
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
  const valid = reply.citations.every(c => c && typeof c.title === 'string' && typeof c.excerpt === 'string' &&
    officialSourceUrl(c.url) && Number.isFinite(Date.parse(c.reviewed_at)))
  if (!valid || (reply.mode !== 'insufficient_evidence' && reply.citations.length === 0)) {
    throw new Error('The scheme service returned an invalid answer. Please retry.')
  }
  return reply
}
