"""Private Supabase objects. Credentials and signed URL tokens never enter logs."""

from io import BytesIO
import logging
from os import environ
import warnings

import httpx
from PIL import Image, UnidentifiedImageError, ImageOps

from app.config import ConfigurationError, get_settings

BUCKET = "complaint-evidence"
MIMES = {"JPEG": "image/jpeg", "PNG": "image/png", "WEBP": "image/webp"}
logger = logging.getLogger(__name__)


class StorageError(RuntimeError):
    pass


def max_evidence_bytes():
    try:
        size = int(environ.get("EVIDENCE_MAX_BYTES", "5242880"))
        if not 1024 <= size <= 20 * 1024 * 1024:
            raise ValueError
        return size
    except ValueError:
        raise ConfigurationError("EVIDENCE_MAX_BYTES must be between 1024 and 20971520.") from None


def validate_image(data: bytes, mime: str) -> tuple[bytes, str]:
    if mime not in MIMES.values():
        raise ValueError("Choose a JPEG, PNG or WebP image.")
    try:
        with warnings.catch_warnings():
            warnings.simplefilter("error", Image.DecompressionBombWarning)
            with Image.open(BytesIO(data)) as image:
                fmt = image.format
                if fmt not in MIMES or MIMES[fmt] != mime or image.width * image.height > 20000000:
                    raise ValueError("Image contents must match the selected JPEG, PNG or WebP type (maximum 20 megapixels).")
                if getattr(image, "n_frames", 1) != 1:
                    raise ValueError("Choose a still photograph, not an animated image.")
                image.verify()
            # Decode and re-encode to remove EXIF/location and appended payloads.
            with Image.open(BytesIO(data)) as image:
                clean = ImageOps.exif_transpose(image).convert("RGB" if fmt == "JPEG" else "RGBA")
                clean.info.clear()
                output = BytesIO()
                clean.save(output, format=fmt)
                result = output.getvalue()
                if len(result) > max_evidence_bytes():
                    raise ValueError("The decoded image exceeds the upload size limit.")
                return result, {"JPEG": "jpg", "PNG": "png", "WEBP": "webp"}[fmt]
    except (UnidentifiedImageError, OSError, SyntaxError, Image.DecompressionBombError, Image.DecompressionBombWarning):
        raise ValueError("This file is not a valid supported photograph.") from None


class EvidenceStorage:
    def __init__(self):
        settings = get_settings()
        settings.auth_issuer  # Validate trusted project before transmitting server credentials.
        if not settings.supabase_service_role_key:
            raise ConfigurationError("SUPABASE_SERVICE_ROLE_KEY is required for private evidence storage.")
        self.base = settings.supabase_url.rstrip("/") + "/storage/v1"
        self.headers = {"apikey": settings.supabase_service_role_key}
        # Modern secret keys are API keys, not JWTs. Only legacy service-role
        # JWTs belong on Authorization (Supabase API keys documentation).
        if not settings.supabase_service_role_key.startswith('sb_secret_'):
            self.headers['Authorization'] = 'Bearer ' + settings.supabase_service_role_key

    def request(self, method, path, **kwargs):
        try:
            with httpx.Client(timeout=httpx.Timeout(20, connect=5), follow_redirects=False) as client:
                response = client.request(method, self.base + path, headers=self.headers, **kwargs)
                response.raise_for_status()
                return response
        except (httpx.HTTPError, ValueError):
            raise StorageError("Private evidence storage is unavailable. Please retry.") from None

    def require_private(self):
        try:
            data = self.request("GET", "/bucket/" + BUCKET).json()
            if data.get("id") != BUCKET or data.get("public") is not False:
                raise StorageError("The complaint-evidence bucket must exist and be private.")
        except (ValueError, AttributeError):
            raise StorageError("Storage returned invalid bucket configuration.") from None

    def upload(self, path, data, mime):
        self.require_private()
        # Never upsert user-selected paths. Each upload has a fresh server UUID.
        self._upload(path, data, mime)

    def _upload(self, path, data, mime):
        try:
            with httpx.Client(timeout=httpx.Timeout(30, connect=5), follow_redirects=False) as client:
                result = client.post(self.base + "/object/" + BUCKET + "/" + path,
                    headers={**self.headers, "Content-Type": mime, "x-upsert": "false"}, content=data)
                result.raise_for_status()
        except httpx.HTTPError:
            raise StorageError("Evidence upload failed. The internal ticket is retained; retry the photo.") from None

    def delete(self, path):
        self.request("DELETE", "/object/" + BUCKET, json={"prefixes": [path]})

    def signed_url(self, path):
        self.require_private()
        try:
            data = self.request("POST", "/object/sign/" + BUCKET + "/" + path, json={"expiresIn": 300}).json()
            value = data["signedURL"]
            expected = "/object/sign/" + BUCKET + "/" + path + "?"
            if not isinstance(value, str) or not value.startswith(expected):
                raise ValueError
            return self.base + value
        except (KeyError, TypeError, ValueError):
            raise StorageError("Evidence is temporarily unavailable. Refresh its access link.") from None

    def cleanup(self, path):
        try:
            self.delete(path)
        except StorageError:
            # A crash/lost response can leave an orphan. Log only a safe operational code.
            logger.warning("EVIDENCE_ORPHAN_CLEANUP_REQUIRED")
