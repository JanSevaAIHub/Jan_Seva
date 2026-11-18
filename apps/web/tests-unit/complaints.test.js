import { test } from 'node:test'
import assert from 'node:assert/strict'
import { complaintView, ticketNotifications } from '../src/lib/complaints.js'

test('a user filing reference event cannot replace the displayed officer status note', () => {
  const record = { id: 'isolated-ticket', title: 'Synthetic test', description: 'Test only',
    category: 'road', status: 'UNDER_REVIEW', locality: 'Test Ward', created_at: '2026-11-07T10:00:00Z',
    events: [
      { actor_id: 'citizen', old_status: null, new_status: 'LOCAL_SUBMITTED', note: 'Created', event_time: '2026-11-07T10:00:00Z' },
      { actor_id: 'officer', old_status: 'LOCAL_SUBMITTED', new_status: 'UNDER_REVIEW', note: 'Officer is reviewing this report.', event_time: '2026-11-07T10:01:00Z' },
      { actor_id: 'citizen', old_status: 'UNDER_REVIEW', new_status: 'UNDER_REVIEW', note: 'Citizen recorded an unverified reference.', event_time: '2026-11-07T10:02:00Z' },
    ] }
  const ticket = complaintView(record)
  assert.equal(ticket.officerNotes, 'Officer is reviewing this report.')
  assert.equal(ticket.timeline.length, 3)
  assert.equal(ticket.timeline.at(-1).step, 'Filing reference recorded (user reported)')
})

test('routing events remain internal updates and cannot replace the last officer status note', () => {
  const ticket = complaintView({ id: 'test-ticket', title: 'Test issue', description: 'Test facts.', category: 'water',
    status: 'UNDER_REVIEW', locality: 'Test Ward', created_at: '2026-11-07T10:00:00Z', events: [
      { id: 'status-event', actor_id: 'officer', old_status: 'LOCAL_SUBMITTED', new_status: 'UNDER_REVIEW', note: 'Review started.', event_time: '2026-11-07T10:00:00Z' },
      { id: 'routing-event', actor_id: 'officer', old_status: 'UNDER_REVIEW', new_status: 'UNDER_REVIEW', note: 'Officer changed internal category from road to water.', event_time: '2026-11-07T10:01:00Z' },
    ] })
  assert.equal(ticket.timeline.at(-1).step, 'Internal ticket update')
  assert.equal(ticket.officerNotes, 'Review started.')
  const notifications = ticketNotifications([ticket])
  assert.equal(notifications[0].id, 'routing-event')
  assert.equal(notifications[0].complaintId, 'test-ticket')
  assert.equal(notifications.length, 2)
  assert.deepEqual(ticketNotifications([]), [])
})
