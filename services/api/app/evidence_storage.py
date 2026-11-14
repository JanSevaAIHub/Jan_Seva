"""Server-only access to an existing PRIVATE Supabase evidence bucket.

No bucket creation, browser storage credentials, public URLs or signed links.
Every image read goes through the application's authenticated scope checks.
"""
from io import BytesIO
from os import environ
import re
import warnings

from fastapi import HTTPException
import httpx
from PIL import Image, ImageOps, UnidentifiedImageError
from sqlalchemy import text

from app.config import ConfigurationError, get_settings

MAX_BYTES = 5 * 1024 * 1024
MAX_PIXELS = 20_000_000
EVIDENCE_BUCKET = 'janseva-complaint-evidence'
TYPES = {'JPEG': ('image/jpeg', 'jpg'), 'PNG': ('image/png', 'png'), 'WEBP': ('image/webp', 'webp')}


def fail(code='STORAGE_UNAVAILABLE', message='Evidence storage is temporarily unavailable. Retry or remove the pending attachment.', status=503):
    return HTTPException(status, detail={'code': code, 'message': message})


def storage_access_guard(db):
    """Require the reviewed restrictive policy, even alongside permissive policies.

    service_role bypasses RLS; browser roles must not bypass the API through
    direct Supabase Storage requests. The fixed dedicated bucket keeps this
    catalog check exact instead of guessing at arbitrary policy expressions.
    """
    if db.bind.dialect.name != 'postgresql':
        raise fail('STORAGE_POLICY_NOT_VERIFIED', 'Private evidence access policy is not verified.')
    row = db.execute(text("""SELECT c.relrowsecurity, p.polpermissive, p.polcmd::text AS polcmd,
        0 = ANY(p.polroles) AS applies_public,
        pg_get_expr(p.polqual, p.polrelid) AS using_expression,
        pg_get_expr(p.polwithcheck, p.polrelid) AS check_expression
        FROM pg_policy p JOIN pg_class c ON c.oid=p.polrelid
        WHERE p.polrelid=to_regclass('storage.objects')
          AND p.polname='janseva_evidence_server_only'""")).mappings().first()
    expected = f"bucket_id<>'{EVIDENCE_BUCKET}'::text"
    def exact(expression):
        return isinstance(expression, str) and re.sub(r'[\s()]', '', expression) == expected
    if not row or not row['relrowsecurity'] or row['polpermissive'] or row['polcmd'] != '*' or not row['applies_public'] or not exact(row['using_expression']) or not exact(row['check_expression']):
        raise fail('STORAGE_POLICY_NOT_VERIFIED', 'Apply and review the restrictive private evidence policy before enabling images.')


def validated_image(raw, content_type):
    if not raw or len(raw) > MAX_BYTES:
        raise fail('IMAGE_SIZE', 'Choose an image of at most 5 MiB.', 413)
    if content_type not in {item[0] for item in TYPES.values()}:
        raise fail('IMAGE_TYPE', 'Choose a JPEG, PNG or WebP image.', 415)
    try:
        with warnings.catch_warnings():
            warnings.simplefilter('error', Image.DecompressionBombWarning)
            with Image.open(BytesIO(raw)) as source:
                fmt = source.format
                if fmt not in TYPES or TYPES[fmt][0] != content_type or source.width * source.height > MAX_PIXELS or getattr(source, 'n_frames', 1) != 1:
                    raise ValueError
                source.verify()
            with Image.open(BytesIO(raw)) as source:
                source.load()
                # Fresh pixels strip EXIF/GPS, trailing payloads and arbitrary metadata.
                oriented = ImageOps.exif_transpose(source)
                mode = 'RGBA' if fmt != 'JPEG' and 'A' in oriented.getbands() else 'RGB'
                pixels = oriented.convert(mode)
                clean = Image.new(mode, pixels.size)
                clean.paste(pixels)
                output = BytesIO()
                clean.save(output, format=fmt)
                data = output.getvalue()
        if len(data) > MAX_BYTES:
            raise ValueError
        return data, TYPES[fmt][1]
    except (UnidentifiedImageError, OSError, ValueError, SyntaxError, Image.DecompressionBombError, Image.DecompressionBombWarning):
        raise fail('INVALID_IMAGE', 'The image is malformed, animated, too large in pixels, or does not match its type.', 422) from None


class PrivateStorage:
    def __init__(self):
        settings = get_settings()
        bucket = environ.get('SUPABASE_EVIDENCE_BUCKET', '').strip()
        if environ.get('EVIDENCE_UPLOAD_ENABLED', '').lower() != 'true' or bucket != EVIDENCE_BUCKET or not settings.supabase_service_role_key:
            raise fail('EVIDENCE_NOT_CONFIGURED', 'Evidence uploads are disabled until private storage is configured.')
        try:
            self.base = settings.auth_issuer.removesuffix('/auth/v1') + '/storage/v1'
        except ConfigurationError:
            raise fail('EVIDENCE_NOT_CONFIGURED', 'Evidence uploads are disabled until private storage is configured.') from None
        self.bucket = bucket
        self.headers = {'apikey': settings.supabase_service_role_key, 'Authorization': 'Bearer ' + settings.supabase_service_role_key}

    def request(self, method, path, **kwargs):
        try:
            with httpx.Client(timeout=httpx.Timeout(20, connect=5), follow_redirects=False) as client:
                response = client.request(method, self.base + path, headers={**self.headers, **kwargs.pop('headers', {})}, **kwargs)
                response.raise_for_status()
                return response
        except (httpx.HTTPError, ValueError):
            raise fail() from None

    def private_bucket(self):
        try:
            info = self.request('GET', '/bucket/' + self.bucket).json()
            if not isinstance(info, dict) or info.get('public') is not False or info.get('id') != self.bucket:
                raise ValueError
        except (ValueError, TypeError):
            raise fail('UNSAFE_STORAGE_BUCKET', 'Evidence storage must be a verified private bucket.') from None

    def put(self, path, data, mime):
        self.private_bucket()
        self.request('POST', f'/object/{self.bucket}/{path}', content=data,
                     headers={'Content-Type': mime, 'x-upsert': 'true'})

    def read(self, path):
        self.private_bucket()
        # Stream and bound reads even if an operator replaced a stored object.
        try:
            with httpx.Client(timeout=httpx.Timeout(20, connect=5), follow_redirects=False) as client:
                with client.stream('GET', f'{self.base}/object/authenticated/{self.bucket}/{path}', headers=self.headers) as response:
                    response.raise_for_status()
                    body = bytearray()
                    for block in response.iter_bytes():
                        body.extend(block)
                        if len(body) > MAX_BYTES:
                            raise ValueError
                    return bytes(body)
        except (httpx.HTTPError, ValueError):
            raise fail() from None

    def delete(self, path):
        self.private_bucket()
        self.request('DELETE', '/object/' + self.bucket, json={'prefixes': [path]})


def get_storage():
    return PrivateStorage()
