"""Public model endpoints must reject excess work before invoking a provider."""

import pytest
from fastapi import HTTPException

from app.ai.budget import ModelBudget
from app.routers import schemes


@pytest.fixture(autouse=True)
def isolated_budget(monkeypatch):
    monkeypatch.setattr(schemes, "model_budget", ModelBudget())


def test_public_ai_has_a_per_client_request_budget(client, monkeypatch):
    calls = []

    def answer(*_):
        calls.append(True)
        return {"answer": "No qualifying stored evidence.", "citations": [],
                "tool_trace": [], "mode": "insufficient_evidence"}

    monkeypatch.setattr(schemes, "answer_question", answer)
    for _ in range(10):
        assert client.post("/api/schemes/ask", json={"message": "Synthetic budget probe"}).status_code == 200
    response = client.post("/api/schemes/ask", json={"message": "Synthetic budget probe"})
    assert response.status_code == 429
    assert response.headers["Retry-After"]
    assert len(calls) == 10


def test_list_without_query_does_not_consume_model_budget(client):
    for _ in range(15):
        assert client.get("/api/schemes").status_code == 200
    assert not schemes.model_budget.events


def test_query_and_chat_share_the_budget_and_do_not_trust_forwarded_header(client, monkeypatch):
    monkeypatch.setattr(schemes, "model_budget", ModelBudget(per_client=1))
    monkeypatch.setattr(schemes, "retrieve", lambda *_args, **_kwargs: [])
    assert client.get("/api/schemes?query=Synthetic").status_code == 200
    response = client.post("/api/schemes/ask", json={"message": "Synthetic question"},
                           headers={"X-Forwarded-For": "different-test-client"})
    assert response.status_code == 429


def test_slots_release_after_failure_and_limits_expire():
    now = [0]
    budget = ModelBudget(per_client=1, total=2, concurrent=1, clock=lambda: now[0])
    with pytest.raises(RuntimeError):
        with budget.reserve("a"):
            with pytest.raises(HTTPException) as busy:
                with budget.reserve("b"):
                    pytest.fail("Concurrent budget bypass")
            assert busy.value.detail["code"] == "MODEL_BUSY"
            raise RuntimeError("isolated provider failure")
    assert budget.active == 0
    with pytest.raises(HTTPException) as rate:
        with budget.reserve("a"):
            pytest.fail("Per-client budget bypass")
    assert rate.value.status_code == 429
    with budget.reserve("b"):
        pass
    with pytest.raises(HTTPException):
        with budget.reserve("c"):
            pytest.fail("Global budget bypass")
    assert len(budget.events) == 2
    now[0] = 60
    with budget.reserve("a"):
        pass
    assert budget.active == 0 and len(budget.events) == 1
