"""Read-only check of the configured existing PRIVATE bucket. Never creates one."""
from fastapi import HTTPException
from sqlalchemy.orm import Session
from sqlalchemy.exc import SQLAlchemyError
from app.config import ConfigurationError
from app.db import get_engine
from app.evidence_storage import get_storage, storage_access_guard


def main():
    try:
        storage = get_storage()
        with Session(get_engine()) as db:
            storage_access_guard(db)
        storage.private_bucket()
    except HTTPException as error:
        print(f"BLOCKED: {error.detail['code']}. No storage changes were made.")
        return 1
    except (ConfigurationError, SQLAlchemyError):
        print('BLOCKED: evidence database/policy check unavailable. No changes were made.')
        return 1
    print('PASS: configured private bucket is readable by the server credential. Upload/read/delete still require approved live integration tests.')
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
