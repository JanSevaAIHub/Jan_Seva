"""Independent API integration checks; SQLite/JWKS/provider doubles are explicit."""

from uuid import uuid4

import pytest
from sqlalchemy import select

from app.ai.budget import ModelBudget
from app.ai.corpus import read_corpus
from app.ai.screening import IDS
from app.config import ConfigurationError, get_settings
from app.db import get_engine
from app.models import Complaint, Scheme
from app.routers import complaints, schemes


@pytest.fixture(autouse=True)
def independent_budget(monkeypatch):
    monkeypatch.setattr(schemes, 'model_budget', ModelBudget())


@pytest.fixture
def stored_corpus(db_session):
    records, failures = read_corpus()
    assert not failures
    for r in records:
        db_session.add(Scheme(id=r.id, title=r.title, category=r.category, state=r.state,
            description=r.description, source_url=r.source_url, rules_json=r.rules(), reviewed_at=r.reviewed_at))
    db_session.commit()


def test_keyword_search_filters_and_eligibility_are_real_database_features_without_models(client, stored_corpus, monkeypatch):
    monkeypatch.setenv('OPENAI_API_KEY', '')
    result = client.get('/api/schemes', params={'query':'Suraksha','search_mode':'keyword','category':'Insurance','state':'Punjab'})
    assert result.status_code == 200 and [s['id'] for s in result.json()] == [IDS['pmsby']]
    assert client.get('/api/schemes', params={'query':'%', 'search_mode':'keyword'}).status_code == 422
    assert len(client.get('/api/schemes?limit=50').json()) == 12
    result = client.post('/api/schemes/screen', json={'scheme_id':IDS['pmsby'], 'profile':{'age':71}})
    assert result.status_code == 200 and result.json()['status'] == 'NOT_MATCHED'
    assert result.json()['source_url'].startswith('https://')


@pytest.mark.parametrize('profile', [{'age':True}, {'age':-1}, {'bank_account':'yes'}, {'annual_income':-5}, {'role':'officer'}])
def test_eligibility_invalid_profile_is_rejected(client, profile):
    assert client.post('/api/schemes/screen', json={'scheme_id':IDS['pmsby'],'profile':profile}).status_code == 422


@pytest.mark.parametrize('who,status', [('anonymous',401),('officer',403),('other_officer',403)])
def test_complaint_analysis_role_controls(client, profiles, tokens, who, status):
    headers = {} if who == 'anonymous' else {'Authorization':'Bearer '+tokens(profiles[who].user_id)}
    assert client.post('/api/complaints/analyze', json={'title':'Road issue','description':'Synthetic road description.','locality':'Test Ward'}, headers=headers).status_code == status


def test_analysis_related_tickets_only_include_authenticated_owners_records(client, profiles, tokens, monkeypatch):
    draft = {'title':'Pothole near school','description':'Synthetic road description.','locality':'Test Ward','category':'road'}
    owner = {'Authorization':'Bearer '+tokens(profiles['citizen'].user_id)}
    other = {'Authorization':'Bearer '+tokens(profiles['other_citizen'].user_id)}
    own_id = client.post('/api/complaints',json=draft,headers=owner).json()['id']
    other_id = client.post('/api/complaints',json=draft,headers=other).json()['id']
    monkeypatch.setattr(complaints,'analyze_complaint',lambda *_: {'category':'road','draft':draft['description'], 'department':'Roads Dept','next_action':'Review first','notice':'Not submitted','mode':'ai_suggestion'})
    result = client.post('/api/complaints/analyze',json={k:v for k,v in draft.items() if k!='category'},headers=owner)
    assert result.status_code == 200
    assert [c['id'] for c in result.json()['similar_complaints']] == [own_id]
    assert other_id not in result.text


def test_list_pagination_is_bounded_and_negative_offsets_are_invalid(client, profiles, tokens):
    headers={'Authorization':'Bearer '+tokens(profiles['citizen'].user_id)}
    for title in ['First synthetic ticket','Second synthetic ticket']:
        assert client.post('/api/complaints',json={'title':title,'description':'Synthetic pagination test.','category':'road','locality':'Test Ward'},headers=headers).status_code==201
    first=client.get('/api/complaints?limit=1',headers=headers).json()
    second=client.get('/api/complaints?limit=1&offset=1',headers=headers).json()
    assert len(first)==len(second)==1 and first[0]['id']!=second[0]['id']
    assert client.get('/api/complaints?limit=101',headers=headers).status_code==422
    assert client.get('/api/complaints?offset=-1',headers=headers).status_code==422


def test_different_direct_supabase_project_is_rejected_before_connecting(monkeypatch):
    monkeypatch.setenv('SUPABASE_URL','https://expected-project.supabase.co')
    monkeypatch.setenv('DATABASE_URL','postgresql://postgres:isolated-test-only@db.other-project.supabase.co/postgres')
    get_settings.cache_clear(); get_engine.cache_clear()
    try:
        with pytest.raises(ConfigurationError,match='different Supabase projects'):
            get_engine()
    finally:
        get_settings.cache_clear(); get_engine.cache_clear()


@pytest.mark.parametrize('who,status', [('anonymous',401), ('citizen',403), ('other_citizen',403), ('other_officer',404)])
def test_internal_routing_is_officer_and_assignment_scoped(client, profiles, tokens, who, status):
    owner={'Authorization':'Bearer '+tokens(profiles['citizen'].user_id)}
    ticket=client.post('/api/complaints',json={'title':'Synthetic routing test','description':'Synthetic test facts only.','category':'road','locality':'Test Ward'},headers=owner).json()
    headers={} if who=='anonymous' else {'Authorization':'Bearer '+tokens(profiles[who].user_id)}
    assert client.patch(f"/api/officer/complaints/{ticket['id']}/routing", json={'category':'water'}, headers=headers).status_code == status


def test_assigned_officer_routing_persists_an_event_visible_to_owner(client, profiles, tokens, db_session):
    owner={'Authorization':'Bearer '+tokens(profiles['citizen'].user_id)}
    officer={'Authorization':'Bearer '+tokens(profiles['officer'].user_id)}
    ticket=client.post('/api/complaints',json={'title':'Synthetic routing event','description':'Synthetic test facts only.','category':'road','locality':'Test Ward'},headers=owner).json()
    from uuid import UUID
    record=db_session.get(Complaint,UUID(ticket['id']))
    record.assigned_officer_id=profiles['officer'].user_id
    db_session.commit()
    result=client.patch(f"/api/officer/complaints/{ticket['id']}/routing",json={'category':'water'},headers=officer)
    assert result.status_code==200 and result.json()['category']=='water'
    assert result.json()['status']==ticket['status']
    owner_view=client.get(f"/api/complaints/{ticket['id']}",headers=owner).json()
    assert len(owner_view['events'])==2 and 'No government referral' in owner_view['events'][-1]['note']
    repeated=client.patch(f"/api/officer/complaints/{ticket['id']}/routing",json={'category':'water'},headers=officer).json()
    assert len(repeated['events'])==2


def test_navigator_uses_integrated_complaint_ai_without_writing(monkeypatch, db_session):
    from app.ai import agent_tools
    from app.ai.agent_schemas import AgentMessage
    monkeypatch.setattr(agent_tools, 'analyze_civic_problem', lambda *_: {
        'category':'road', 'draft':'Synthetic AI-assisted facts for review.', 'notice':'Editable AI suggestion only. Nothing submitted.'})
    request=AgentMessage(message='Help prepare a road complaint')
    capability=agent_tools.analyze_complaint(db_session,request)
    assert capability['available'] is True
    draft=agent_tools.draft_complaint(request,capability['advice'])
    assert draft.category=='road' and draft.description=='Synthetic AI-assisted facts for review.'
    assert list(db_session.scalars(select(Complaint)))==[]


def test_navigator_reports_missing_complaint_provider_truthfully(monkeypatch, db_session):
    from app.ai import agent_tools
    from app.ai.agent_schemas import AgentMessage
    monkeypatch.setattr(agent_tools, 'analyze_civic_problem', lambda *_: (_ for _ in ()).throw(ConfigurationError('OPENAI_API_KEY is absent')))
    request=AgentMessage(message='Help prepare a road complaint')
    capability=agent_tools.analyze_complaint(db_session,request)
    assert capability['available'] is False and 'unavailable' in capability['detail']
    assert 'not implemented' not in capability['detail']
    assert agent_tools.draft_complaint(request).description==request.message
