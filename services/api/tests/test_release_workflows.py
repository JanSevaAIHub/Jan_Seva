from uuid import uuid4, UUID
import pytest
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.config import get_settings
from app.models import Complaint, ComplaintEvent, Profile

DRAFT = {'title': 'Synthetic release test', 'description': 'Synthetic complaint for release verification only.', 'category': 'road', 'locality': 'Test Ward'}


def test_allowed_signup_fields_persist_and_identity_and_role_are_server_owned(client, db_session, profiles, tokens):
    headers = {'Authorization': 'Bearer ' + tokens(profiles['citizen'].user_id)}
    result = client.patch('/api/me', headers=headers, json={'name': 'New Citizen', 'state': 'Punjab', 'occupation': 'Farmer'})
    assert result.status_code == 200
    with Session(db_session.bind) as separate:
        profile = separate.get(Profile, profiles['citizen'].user_id)
        assert (profile.name, profile.state, profile.occupation, profile.role) == ('New Citizen', 'Punjab', 'Farmer', 'citizen')
    for payload in ({'name': 'Attacker', 'role': 'officer'}, {'name': 'Attacker', 'user_id': str(profiles['other_citizen'].user_id)}, {'name': ' '}):
        assert client.patch('/api/me', headers=headers, json=payload).status_code == 422
    assert client.get('/api/me', headers=headers).json()['name'] == 'New Citizen'
    assert client.patch('/api/me', json={'name': 'Anonymous'}).status_code == 401


def test_retry_after_lost_create_response_reuses_one_ticket_and_initial_event(client, db_session, profiles, tokens):
    headers = {'Authorization': 'Bearer ' + tokens(profiles['citizen'].user_id), 'Idempotency-Key': str(uuid4())}
    first = client.post('/api/complaints', headers=headers, json=DRAFT)
    assert first.status_code == 201
    second = client.post('/api/complaints', headers=headers, json=DRAFT)
    assert second.status_code == 201 and second.json()['id'] == first.json()['id']
    assert len(second.json()['events']) == 1
    assert db_session.scalar(select(func.count()).select_from(Complaint)) == 1
    assert db_session.scalar(select(func.count()).select_from(ComplaintEvent)) == 1
    assert client.post('/api/complaints', headers=headers, json={**DRAFT, 'title': 'Different details'}).status_code == 409
    other = {**headers, 'Authorization': 'Bearer ' + tokens(profiles['other_citizen'].user_id)}
    assert client.post('/api/complaints', headers=other, json=DRAFT).json()['id'] != first.json()['id']


def test_explicit_demo_routing_serves_new_citizens_without_widening_officer_scope(client, db_session, profiles, tokens, monkeypatch):
    monkeypatch.setenv('DEMO_ASSIGNMENT_ENABLED', 'true')
    monkeypatch.setenv('DEMO_DEFAULT_OFFICER_USER_ID', str(profiles['officer'].user_id))
    get_settings.cache_clear()
    headers = {name: {'Authorization': 'Bearer ' + tokens(p.user_id)} for name, p in profiles.items()}
    first = client.post('/api/complaints', headers=headers['citizen'], json=DRAFT).json()
    assert first['assigned_officer_id'] == str(profiles['officer'].user_id)
    assert client.get('/api/officer/complaints', headers=headers['other_officer']).json() == []
    assert client.get(f"/api/complaints/{first['id']}", headers=headers['other_citizen']).status_code == 404
    updated = client.patch(f"/api/officer/complaints/{first['id']}", headers=headers['officer'], json={'status': 'UNDER_REVIEW', 'note': 'Synthetic assigned review.'})
    assert updated.status_code == 200
    fetched = client.get(f"/api/complaints/{first['id']}", headers=headers['citizen']).json()
    assert fetched['status'] == 'UNDER_REVIEW' and fetched['events'][-1]['note'] == 'Synthetic assigned review.'
    assert client.post('/api/complaints', headers=headers['citizen'], json={**DRAFT, 'assigned_officer_id': str(profiles['other_officer'].user_id)}).status_code == 422


@pytest.mark.parametrize('officer', ['invalid', 'citizen', 'missing'])
def test_demo_routing_configuration_fails_closed(client, profiles, tokens, monkeypatch, officer):
    monkeypatch.setenv('DEMO_ASSIGNMENT_ENABLED', 'true')
    value = 'not-uuid' if officer == 'invalid' else str(profiles['citizen'].user_id) if officer == 'citizen' else str(uuid4())
    monkeypatch.setenv('DEMO_DEFAULT_OFFICER_USER_ID', value)
    get_settings.cache_clear()
    headers = {'Authorization': 'Bearer ' + tokens(profiles['other_citizen'].user_id)}
    assert client.post('/api/complaints', headers=headers, json=DRAFT).status_code == 503
