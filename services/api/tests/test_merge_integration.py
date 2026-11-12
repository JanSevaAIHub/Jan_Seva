from uuid import uuid4
import pytest
from app.ai.complaint_classifier import find_duplicates
from app.models import Complaint, ComplaintCategory, InternalStatus
from app.scripts.evaluate_complaints import CLASSIFICATION_CASES, DUPLICATE_PAIRS
from app.ai.complaint_classifier import classify_text


def test_one_authenticated_analysis_route_preserves_both_contracts(client, db_session, profiles, tokens):
    ids = {}
    for persona in ('citizen', 'other_citizen'):
        row = Complaint(title='Broken street light near central park', description='Lamp is fused and pole is completely dark at central park.',
            category=ComplaintCategory.STREETLIGHT, locality='Central Park Phase 2', user_id=profiles[persona].user_id,
            status=InternalStatus.LOCAL_SUBMITTED)
        db_session.add(row); db_session.flush(); ids[persona] = str(row.id)
    db_session.commit()
    payload = {'title': 'Street light broken near central park', 'description': 'Lamp is fused and pole is completely dark at central park.', 'locality': 'Central Park Phase 2'}
    assert client.post('/api/complaints/analyze', json=payload).status_code == 401
    for persona in ('citizen', 'other_citizen'):
        result = client.post('/api/complaints/analyze', json=payload, headers={'Authorization': 'Bearer '+tokens(profiles[persona].user_id)})
        assert result.status_code == 200
        body = result.json()
        assert {'category', 'department', 'confidence', 'urgency_level', 'duplicates', 'mode', 'description', 'suggested_department', 'method', 'related_complaints', 'notice'} <= body.keys()
        assert body['description'] == payload['description']
        assert [d['id'] for d in body['duplicates']] == [ids[persona]]
        assert [d['id'] for d in body['related_complaints']] == [ids[persona]]
    assert find_duplicates(db_session, **payload, category=ComplaintCategory.STREETLIGHT) == []
    from app.routers.complaints import router
    assert len([r for r in router.routes if r.path == '/complaints/analyze' and 'POST' in r.methods]) == 1


@pytest.mark.parametrize('case', CLASSIFICATION_CASES, ids=lambda c: c['id'])
def test_retained_developer_b_classification_cases(case):
    category, department, _, _, mode = classify_text(case['title']+' '+case['description'])
    assert category == case['expected_category']
    assert department == case['expected_dept']
    assert mode == 'keyword_classifier'


@pytest.mark.parametrize('pair', DUPLICATE_PAIRS, ids=lambda p: p['id'])
def test_retained_duplicate_benchmark_is_owner_scoped(db_session, profiles, pair):
    b = pair['b']
    row = Complaint(id=uuid4(), **b, user_id=profiles['citizen'].user_id, status=InternalStatus.LOCAL_SUBMITTED)
    db_session.add(row); db_session.commit()
    matches = find_duplicates(db_session, **pair['a'], verified_user_id=profiles['citizen'].user_id)
    assert any(m.id == row.id for m in matches) == pair['expected']
    assert find_duplicates(db_session, **pair['a'], verified_user_id=profiles['other_citizen'].user_id) == []


def test_connected_evaluation_requires_explicit_operator_configuration(monkeypatch):
    from app.scripts import evaluate_complaints
    for name in ('JANSEVA_COMPLAINT_EVALUATION', 'EVALUATION_USER_ID', 'EVALUATION_ACCESS_TOKEN'):
        monkeypatch.delenv(name, raising=False)
    monkeypatch.setattr(evaluate_complaints, 'get_engine', lambda: pytest.fail('Unconfigured evaluation must not access the database'))
    with pytest.raises(RuntimeError, match='explicitly authorized development'):
        evaluate_complaints.run_evaluation()
