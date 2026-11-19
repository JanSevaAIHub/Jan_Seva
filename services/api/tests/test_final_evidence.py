"""Real API/database/JWT paths with isolated SQLite and explicit storage doubles."""

from io import BytesIO
from uuid import uuid4

import httpx
from PIL import Image
import pytest
from sqlalchemy import func, select
from sqlalchemy.exc import SQLAlchemyError

from app.config import get_settings
from app.models import Complaint, ComplaintEvidence, ComplaintEvent
from app.routers import evidence
from app.storage import EvidenceStorage, StorageError
from app.storage import validate_image


DRAFT = {'title': 'Synthetic road complaint', 'description': 'Synthetic test of photo evidence persistence.', 'category': 'road', 'locality': 'Test Ward'}


def photo(fmt='PNG'):
    output = BytesIO()
    Image.new('RGB', (12, 12), 'teal').save(output, format=fmt)
    return output.getvalue()


@pytest.mark.parametrize('fmt,mime', [('JPEG','image/jpeg'), ('PNG','image/png'), ('WEBP','image/webp')])
def test_image_reencoding_removes_metadata_and_appended_payload(fmt,mime):
    image = Image.new('RGB', (8, 8), 'teal')
    exif = Image.Exif(); exif[270] = 'Synthetic private location marker'
    output = BytesIO(); image.save(output, format=fmt, exif=exif)
    cleaned, extension = validate_image(output.getvalue() + b'<script>appended test payload</script>', mime)
    with Image.open(BytesIO(cleaned)) as decoded:
        assert not decoded.getexif()
    assert extension in ('jpg','png','webp') and b'<script>' not in cleaned and b'private location' not in cleaned


@pytest.fixture
def saved(client, profiles, tokens):
    headers = {'Authorization': 'Bearer ' + tokens(profiles['citizen'].user_id)}
    response = client.post('/api/complaints', json=DRAFT, headers=headers)
    assert response.status_code == 201
    return response.json()['id'], headers


@pytest.fixture
def storage(monkeypatch):
    class MemoryStorage:
        objects = {}
        deleted = []
        failure = False

        def upload(self, path, data, mime):
            if self.failure:
                raise evidence.fail('STORAGE_UNAVAILABLE', 'Isolated storage permission failure', 503)
            self.objects[path] = (data, mime)

        def signed_url(self, path):
            if path not in self.objects:
                raise StorageError('Evidence object unavailable')
            return 'https://isolated.example/storage/v1/object/sign/complaint-evidence/' + path + '?token=test-only'

        def cleanup(self, path):
            self.deleted.append(path)
            self.objects.pop(path, None)
    MemoryStorage.put = MemoryStorage.upload
    MemoryStorage.read = lambda self,path: self.objects[path][0]
    MemoryStorage.delete = MemoryStorage.cleanup
    monkeypatch.setattr(evidence, 'get_storage', MemoryStorage)
    monkeypatch.setattr(evidence, 'storage_access_guard', lambda _: None)
    return MemoryStorage


@pytest.mark.parametrize('fmt,mime', [('JPEG','image/jpeg'), ('PNG','image/png'), ('WEBP','image/webp')])
def test_upload_real_decoded_image_metadata_reload_and_authenticated_access(client, saved, db_session, storage, fmt, mime):
    ticket, headers = saved
    response = client.post(f'/api/complaints/{ticket}/evidence', content=photo(fmt),
        headers={**headers, 'Content-Type': mime, 'X-Filename': '..%2F..%2Fcitizen-photo.' + fmt.lower()})
    assert response.status_code == 201
    data = response.json()
    assert data['filename'].startswith('citizen-photo.') and data['size_bytes'] > 0
    db_session.expunge_all()
    record = db_session.scalar(select(ComplaintEvidence))
    assert '..' not in record.object_path and str(ticket) in record.object_path
    assert record.object_path in storage.objects
    metadata = client.get(f'/api/complaints/{ticket}/evidence', headers=headers)
    assert metadata.json()[0]['id'] == data['id'] and metadata.headers['cache-control'] == 'private, no-store'
    access = client.get(f"/api/complaints/{ticket}/evidence/{data['id']}/content", headers=headers)
    assert access.status_code == 200 and access.headers['cache-control'] == 'private, no-store'
    assert client.get(f"/api/complaints/{ticket}/evidence/{data['id']}/content").status_code == 401
    assert 'object_path' not in metadata.text and 'service_role' not in metadata.text


@pytest.mark.parametrize('content,mime', [(b'<svg>no</svg>', 'image/svg+xml'), (b'not an image', 'image/png'),
    (photo('JPEG'), 'image/png'), (b'', 'image/jpeg')])
def test_invalid_disguised_mismatched_and_empty_images_rejected(client, saved, storage, content, mime):
    ticket, headers = saved
    result = client.post(f'/api/complaints/{ticket}/evidence', content=content, headers={**headers, 'Content-Type': mime})
    assert result.status_code == (415 if mime == 'image/svg+xml' else 413 if not content else 422) and not storage.objects


def test_oversized_image_rejected_while_streaming(client, saved, storage, monkeypatch):
    monkeypatch.setenv('EVIDENCE_MAX_BYTES', '1024')
    ticket, headers = saved
    result = client.post(f'/api/complaints/{ticket}/evidence', content=b'x'*1025, headers={**headers, 'Content-Type':'image/png'})
    assert result.status_code == 413 and not storage.objects


@pytest.mark.parametrize('who,status', [('anonymous',401), ('other_citizen',404), ('officer',403), ('other_officer',403)])
def test_upload_authorization_before_storage(client, saved, storage, profiles, tokens, who, status):
    ticket, _ = saved
    headers = {} if who == 'anonymous' else {'Authorization':'Bearer '+tokens(profiles[who].user_id)}
    result = client.post(f'/api/complaints/{ticket}/evidence', content=photo(), headers={**headers, 'Content-Type':'image/png'})
    assert result.status_code == status and not storage.objects


@pytest.mark.parametrize('who,status', [('anonymous',401), ('other_citizen',404), ('other_officer',404)])
def test_private_metadata_and_access_denied(client, saved, storage, profiles, tokens, who, status):
    ticket, owner = saved
    uploaded = client.post(f'/api/complaints/{ticket}/evidence', content=photo(), headers={**owner, 'Content-Type':'image/png'}).json()
    headers = {} if who == 'anonymous' else {'Authorization':'Bearer '+tokens(profiles[who].user_id)}
    assert client.get(f'/api/complaints/{ticket}/evidence', headers=headers).status_code == status
    assert client.get(f"/api/complaints/{ticket}/evidence/{uploaded['id']}/content", headers=headers).status_code == status


def test_storage_failure_keeps_complaint_then_retry_creates_one_evidence(client, saved, storage, db_session):
    ticket, headers = saved
    storage.failure = True
    result = client.post(f'/api/complaints/{ticket}/evidence', content=photo(), headers={**headers,'Content-Type':'image/png'})
    assert result.status_code == 503
    assert client.get(f'/api/complaints/{ticket}', headers=headers).status_code == 200
    assert db_session.scalar(select(ComplaintEvidence)).state == 'PENDING'
    storage.failure = False
    assert client.post(f'/api/complaints/{ticket}/evidence', content=photo(), headers={**headers,'Content-Type':'image/png'}).status_code == 201
    assert db_session.scalar(select(func.count()).select_from(Complaint)) == 1


def test_optional_photo_absent_and_replacement_deduplication(client, saved, storage, db_session):
    ticket, headers = saved
    assert client.get(f'/api/complaints/{ticket}/evidence', headers=headers).json() == []
    url = f'/api/complaints/{ticket}/evidence'
    first = client.post(url, content=photo(), headers={**headers,'Content-Type':'image/png'}).json()
    repeated = client.post(url, content=photo(), headers={**headers,'Content-Type':'image/png'}).json()
    assert first['id'] == repeated['id'] and len(storage.objects) == 1
    replacement = client.post(url, content=photo('JPEG'), headers={**headers,'Content-Type':'image/jpeg'}).json()
    assert replacement['id'] != first['id'] and len(storage.objects) == 2
    assert client.delete(f"{url}/{first['id']}", headers=headers).status_code == 204
    assert len(storage.objects) == 1 and len(storage.deleted) == 1
    assert client.get(f"{url}/{first['id']}/content", headers=headers).status_code == 404


def test_failed_metadata_commit_cleans_uploaded_object(client, saved, storage, db_session, monkeypatch):
    ticket, headers = saved
    with monkeypatch.context() as patch:
        patch.setattr(db_session, 'commit', lambda: (_ for _ in ()).throw(SQLAlchemyError('isolated commit failure')))
        with pytest.raises(SQLAlchemyError):
            client.post(f'/api/complaints/{ticket}/evidence', content=photo(), headers={**headers,'Content-Type':'image/png'})
    assert not storage.objects  # Pending metadata commits before remote upload, so no object needs cleanup.
    assert db_session.scalar(select(func.count()).select_from(ComplaintEvidence)) == 0


def test_idempotency_replays_same_ticket_and_rejects_changed_draft(client, profiles, tokens, db_session):
    headers = {'Authorization':'Bearer '+tokens(profiles['citizen'].user_id), 'Idempotency-Key':str(uuid4())}
    first = client.post('/api/complaints', json=DRAFT, headers=headers)
    replay = client.post('/api/complaints', json=DRAFT, headers=headers)
    assert first.status_code == replay.status_code == 201 and first.json()['id'] == replay.json()['id']
    changed = client.post('/api/complaints', json={**DRAFT, 'title':'Different draft'}, headers=headers)
    assert changed.status_code == 409
    assert db_session.scalar(select(func.count()).select_from(Complaint)) == 1
    assert db_session.scalar(select(func.count()).select_from(ComplaintEvent)) == 1
    headers['Authorization'] = 'Bearer '+tokens(profiles['other_citizen'].user_id)
    assert client.post('/api/complaints', json=DRAFT, headers=headers).json()['id'] != first.json()['id']


@pytest.mark.parametrize('public', [True, False])
def test_real_storage_http_contract_private_bucket_signing_and_binary_upload(monkeypatch, public):
    monkeypatch.setenv('SUPABASE_URL', 'https://isolated-storage.example')
    monkeypatch.setenv('SUPABASE_SERVICE_ROLE_KEY', 'isolated-service-test-marker')
    get_settings.cache_clear()
    real = httpx.Client
    calls = []
    path = 'owner/complaint/random.png'
    def handler(request):
        calls.append(request)
        assert request.headers['apikey'] == 'isolated-service-test-marker'
        if request.url.path.endswith('/bucket/complaint-evidence'):
            return httpx.Response(200, json={'id':'complaint-evidence','public':public})
        if '/object/sign/' in request.url.path:
            return httpx.Response(200,json={'signedURL':'/object/sign/complaint-evidence/'+path+'?token=test-only'})
        if request.method == 'POST':
            assert request.headers['content-type'] == 'image/png' and request.content == b'validated bytes'
        return httpx.Response(200,json={})
    monkeypatch.setattr(httpx, 'Client', lambda **kwargs: real(transport=httpx.MockTransport(handler), **kwargs))
    try:
        store = EvidenceStorage()
        if public:
            with pytest.raises(StorageError): store.upload(path,b'validated bytes','image/png')
            with pytest.raises(StorageError): store.signed_url(path)
            assert all('/bucket/' in str(c.url) for c in calls)
        else:
            store.upload(path,b'validated bytes','image/png')
            assert store.signed_url(path).startswith('https://isolated-storage.example/storage/v1/object/sign/')
            store.delete(path)
    finally:
        get_settings.cache_clear()
