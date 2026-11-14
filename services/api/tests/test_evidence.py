"""Real HTTP/auth/SQLite; remote object storage is an explicit isolated double."""
from io import BytesIO
from types import SimpleNamespace
from time import time
from uuid import uuid4

import httpx
from PIL import Image
import pytest
from sqlalchemy import select

from app.evidence_storage import MAX_BYTES, PrivateStorage, fail, storage_access_guard
from app.models import Complaint, ComplaintCategory, ComplaintEvidence, InternalStatus
from app.routers import evidence


def image_bytes(fmt='PNG'):
    out = BytesIO()
    Image.new('RGB', (8, 8), 'purple').save(out, format=fmt)
    return out.getvalue()


class MemoryStorage:
    def __init__(self):
        self.objects = {}
        self.fail_put = self.fail_delete = False

    def put(self, path, data, mime):
        self.objects[path] = data
        if self.fail_put:
            raise fail()  # Simulate timeout AFTER provider may have stored bytes.

    def read(self, path):
        return self.objects[path]

    def delete(self, path):
        if self.fail_delete:
            raise fail()
        self.objects.pop(path, None)


@pytest.fixture
def attachments(client, db_session, profiles, tokens, monkeypatch):
    row = Complaint(title='Synthetic image ticket', description='Synthetic evidence integration test only.',
        category=ComplaintCategory.ROAD, locality='Test Ward', user_id=profiles['citizen'].user_id,
        assigned_officer_id=profiles['officer'].user_id, status=InternalStatus.LOCAL_SUBMITTED)
    db_session.add(row)
    db_session.commit()
    storage = MemoryStorage()
    monkeypatch.setattr(evidence, 'get_storage', lambda: storage)
    monkeypatch.setattr(evidence, 'storage_access_guard', lambda db: None)  # SQLite is not RLS evidence.
    headers = {name: {'Authorization': 'Bearer ' + tokens(p.user_id)} for name, p in profiles.items()}
    return f'/api/complaints/{row.id}/evidence', storage, headers


def upload(client, url, headers, data=None, mime='image/png', key=None):
    return client.post(url, content=image_bytes() if data is None else data,
        headers={**headers, 'Content-Type': mime, 'Idempotency-Key': str(key or uuid4())})


@pytest.mark.parametrize('fmt,mime', [('JPEG', 'image/jpeg'), ('PNG', 'image/png'), ('WEBP', 'image/webp')])
def test_supported_images_persist_and_authorized_officer_reads(client, db_session, attachments, fmt, mime):
    url, storage, headers = attachments
    result = upload(client, url, headers['citizen'], image_bytes(fmt), mime)
    assert result.status_code == 201, result.text
    saved = result.json()
    assert saved['state'] == 'READY' and 'object_path' not in saved
    assert client.get(url, headers=headers['citizen']).json()[0]['id'] == saved['id']
    content = f"{url}/{saved['id']}/content"
    for who in ('citizen', 'officer'):
        response = client.get(content, headers=headers[who])
        assert response.status_code == 200
        assert response.headers['content-type'] == mime
        assert response.headers['cache-control'] == 'private, no-store'
    row = db_session.scalar(select(ComplaintEvidence))
    assert row.object_path in storage.objects
    assert str(row.uploaded_by) in row.object_path and '..' not in row.object_path


@pytest.mark.parametrize('data,mime,status', [
    (b'<svg onload="alert(1)"/>', 'image/svg+xml', 415),
    (b'not an image', 'image/png', 422),
    (b'x' * (MAX_BYTES + 1), 'image/jpeg', 413),
    (image_bytes(), 'image/jpeg', 422),
    (b'', 'image/png', 413),
], ids=['unsupported', 'malformed', 'oversized', 'mime-mismatch', 'empty'])
def test_invalid_images_create_no_record_or_object(client, db_session, attachments, data, mime, status):
    url, storage, headers = attachments
    assert upload(client, url, headers['citizen'], data, mime).status_code == status
    assert db_session.scalar(select(ComplaintEvidence)) is None
    assert storage.objects == {}


def test_owner_assignment_anonymous_expired_and_path_boundaries(client, attachments, profiles, tokens):
    url, _, headers = attachments
    saved = upload(client, url, headers['citizen']).json()
    content = f"{url}/{saved['id']}/content"
    for who in ('other_citizen', 'other_officer'):
        assert client.get(url, headers=headers[who]).status_code == 404
        assert client.get(content, headers=headers[who]).status_code == 404
    for h, status in [({}, 401), (headers['other_citizen'], 404), (headers['officer'], 403)]:
        assert upload(client, url, h).status_code == status
        assert client.delete(f"{url}/{saved['id']}", headers=h).status_code == status
    assert client.get(content).status_code == 401
    expired = {'Authorization': 'Bearer ' + tokens(profiles['citizen'].user_id, exp=int(time())-60)}
    assert client.get(content, headers=expired).status_code == 401  # Authenticated proxy; no signed URLs issued.
    assert upload(client, f'/api/complaints/{uuid4()}/evidence', headers['citizen']).status_code == 404
    assert client.get(f"/api/complaints/{uuid4()}/evidence/{saved['id']}/content", headers=headers['citizen']).status_code == 404
    assert upload(client, url, headers['citizen'], key='../other-user').status_code == 422


def test_upload_retry_limit_and_partial_failure_leave_tracked_pending_record(client, db_session, attachments):
    url, storage, headers = attachments
    key = uuid4()
    storage.fail_put = True
    assert upload(client, url, headers['citizen'], key=key).status_code == 503
    pending = client.get(url, headers=headers['citizen']).json()[0]
    assert pending['state'] == 'PENDING'
    assert client.get(f"{url}/{pending['id']}/content", headers=headers['citizen']).status_code == 409
    storage.fail_put = False
    result = upload(client, url, headers['citizen'], key=key)
    assert result.status_code == 201 and result.json()['id'] == pending['id']
    assert upload(client, url, headers['citizen'], key=key).json()['id'] == pending['id']
    assert upload(client, url, headers['citizen'], image_bytes('JPEG'), 'image/jpeg', key).status_code == 409
    assert upload(client, url, headers['citizen']).status_code == 201
    assert upload(client, url, headers['citizen']).status_code == 201
    assert upload(client, url, headers['citizen']).status_code == 409
    assert len(storage.objects) == 3


def test_failed_delete_is_hidden_and_retry_removes_object_then_metadata(client, attachments):
    url, storage, headers = attachments
    saved = upload(client, url, headers['citizen']).json()
    item = f"{url}/{saved['id']}"
    storage.fail_delete = True
    assert client.delete(item, headers=headers['citizen']).status_code == 503
    assert client.get(url, headers=headers['citizen']).json()[0]['state'] == 'DELETE_PENDING'
    assert client.get(item+'/content', headers=headers['citizen']).status_code == 409
    storage.fail_delete = False
    assert client.delete(item, headers=headers['citizen']).status_code == 204
    assert client.get(url, headers=headers['citizen']).json() == []
    assert storage.objects == {}


@pytest.mark.parametrize('bucket_info', [{'id': 'private-evidence', 'public': True}, {}, []])
def test_storage_rejects_public_or_unverifiable_bucket(monkeypatch, bucket_info):
    storage = object.__new__(PrivateStorage)
    storage.bucket = 'private-evidence'
    monkeypatch.setattr(storage, 'request', lambda *a, **k: httpx.Response(200, json=bucket_info))
    with pytest.raises(Exception) as exc:
        storage.private_bucket()
    assert exc.value.status_code == 503


def test_storage_rest_contracts_are_private_and_errors_are_sanitized(monkeypatch):
    storage = object.__new__(PrivateStorage)
    storage.base = 'https://storage.example.test/storage/v1'
    storage.bucket = 'private-evidence'
    storage.headers = {'apikey': 'synthetic-private-marker'}
    calls = []
    data = image_bytes()
    def handler(request):
        calls.append(request)
        if '/bucket/' in request.url.path:
            return httpx.Response(200, json={'id': storage.bucket, 'public': False})
        if request.method == 'GET':
            return httpx.Response(200, content=data)
        return httpx.Response(200, json={})
    client = httpx.Client
    monkeypatch.setattr(httpx, 'Client', lambda **kwargs: client(transport=httpx.MockTransport(handler), **kwargs))
    storage.put('server/path.png', data, 'image/png')
    assert storage.read('server/path.png') == data
    storage.delete('server/path.png')
    assert any('/object/authenticated/' in c.url.path for c in calls)
    assert not any('/public/' in c.url.path or '/sign/' in c.url.path for c in calls)
    assert next(c for c in calls if c.method == 'POST').headers['x-upsert'] == 'true'
    monkeypatch.setattr(httpx, 'Client', lambda **kwargs: client(transport=httpx.MockTransport(lambda request: httpx.Response(500, text='synthetic-private-marker')), **kwargs))
    with pytest.raises(Exception) as error:
        storage.put('server/path.png', data, 'image/png')
    assert error.value.status_code == 503 and 'synthetic-private-marker' not in str(error.value.detail)


def test_disabled_storage_fails_without_remote_calls(client, monkeypatch):
    monkeypatch.delenv('EVIDENCE_UPLOAD_ENABLED', raising=False)
    monkeypatch.setattr(httpx, 'Client', lambda **kwargs: pytest.fail('Disabled storage used network'))
    assert client.get('/api/evidence/config').json()['enabled'] is False


def test_pixels_are_reencoded_and_trailing_payload_is_removed(client, attachments):
    url, storage, headers = attachments
    raw = image_bytes() + b'<script>untrusted payload</script>'
    assert upload(client, url, headers['citizen'], raw).status_code == 201
    assert all(b'<script>' not in data for data in storage.objects.values())


@pytest.mark.parametrize('patch', [{}, {'relrowsecurity': False}, {'polpermissive': True}, {'polcmd': 'r'},
    {'applies_public': False}, {'using_expression': 'true'}, {'check_expression': 'true'}])
def test_restrictive_policy_catalog_gate_does_not_accept_permissive_browser_access(patch):
    expression = "(bucket_id <> 'janseva-complaint-evidence'::text)"
    row = {'relrowsecurity': True, 'polpermissive': False, 'polcmd': '*', 'applies_public': True,
           'using_expression': expression, 'check_expression': expression, **patch}
    db = SimpleNamespace(bind=SimpleNamespace(dialect=SimpleNamespace(name='postgresql')),
        execute=lambda *_: SimpleNamespace(mappings=lambda: SimpleNamespace(first=lambda: row)))
    if not patch:
        storage_access_guard(db)
    else:
        with pytest.raises(Exception) as error:
            storage_access_guard(db)
        assert error.value.status_code == 503
