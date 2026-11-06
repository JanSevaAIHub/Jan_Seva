export function schemeView(record) {
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
