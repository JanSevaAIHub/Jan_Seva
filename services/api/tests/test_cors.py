"""Release checks for the actual FastAPI CORS middleware."""

from fastapi.testclient import TestClient
import pytest

from app.main import app


@pytest.mark.parametrize("origin,expected", [
    ("http://127.0.0.1:5173", 200),
    ("http://localhost:5173", 200),
    ("https://unrelated.invalid", 400),
    ("null", 400),
])
def test_only_configured_local_origins_receive_cors_permission(origin, expected):
    with TestClient(app) as client:
        response = client.options("/api/complaints", headers={
            "Origin": origin, "Access-Control-Request-Method": "POST",
            "Access-Control-Request-Headers": "authorization,content-type",
        })
    assert response.status_code == expected
    if expected == 200:
        assert response.headers["access-control-allow-origin"] == origin
        assert response.headers["access-control-allow-credentials"] == "true"
    else:
        assert "access-control-allow-origin" not in response.headers
