from fastapi.testclient import TestClient

from app.db import get_db
from app.main import app


def test_application_starts_and_health_returns_ok() -> None:
    # Entering TestClient as a context manager runs the ASGI startup and shutdown hooks.
    with TestClient(app) as client:
        response = client.get("/api/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


def test_invalid_query_returns_sanitized_422(db_session) -> None:
    def override_db():
        yield db_session

    app.dependency_overrides[get_db] = override_db
    try:
        with TestClient(app) as client:
            response = client.get("/api/schemes?limit=not-an-integer")
    finally:
        app.dependency_overrides.pop(get_db, None)

    assert response.status_code == 422
    assert response.json() == {
        "detail": {
            "code": "VALIDATION_ERROR",
            "message": "The request did not match the required format.",
        }
    }
    assert "not-an-integer" not in response.text


def test_unexpected_errors_return_no_exception_details() -> None:
    def fail_with_private_detail():
        raise RuntimeError("private-test-secret")

    app.add_api_route("/__test__/unexpected-error", fail_with_private_detail)
    try:
        with TestClient(app, raise_server_exceptions=False) as client:
            response = client.get("/__test__/unexpected-error")
    finally:
        app.router.routes[:] = [
            route
            for route in app.router.routes
            if getattr(route, "endpoint", None) is not fail_with_private_detail
        ]

    assert response.status_code == 500
    assert "private-test-secret" not in response.text
    assert "Traceback" not in response.text

