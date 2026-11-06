export const CATEGORY_LABELS = {
  road: 'Roads & Potholes', water: 'Water Supply & Drainage',
  sanitation: 'Sanitation & Garbage', streetlight: 'Streetlight & Public Lighting', other: 'Other',
}
export const NEXT_STATUS = { LOCAL_SUBMITTED: 'UNDER_REVIEW', UNDER_REVIEW: 'IN_PROGRESS', IN_PROGRESS: 'RESOLVED' }

export function complaintInput(draft) {
  const category = Object.entries(CATEGORY_LABELS).find(([key, label]) => key === draft.category || label === draft.category)?.[0]
  return { title: draft.title, description: draft.description,
    category: category || 'other', locality: draft.locality }
}

export function complaintView(record) {
  const events = record.events || []
  return {
    ...record, categoryCode: record.category, category: CATEGORY_LABELS[record.category] || record.category,
    officialRef: record.official_ref, officialStatus: record.official_status,
    submittedAt: new Date(record.created_at).toLocaleString(),
    priority: 'Not assessed', department: record.assigned_officer_id ? 'Assigned officer' : 'Awaiting assignment',
    expectedResolution: 'Not estimated', officerNotes: events.filter(e => e.old_status !== null).at(-1)?.note,
    timeline: events.map((event, index) => ({
      step: event.old_status === event.new_status ? 'Filing reference recorded (user reported)' : event.new_status.replaceAll('_', ' '),
      time: new Date(event.event_time).toLocaleString(),
      desc: `${event.note} (Actor: ${event.actor_id})`, done: true, active: index === events.length - 1,
    })),
  }
}
