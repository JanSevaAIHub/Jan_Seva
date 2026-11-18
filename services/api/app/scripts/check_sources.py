"""Read-only URL reachability check; does not certify current scheme terms."""

import argparse
import asyncio
from datetime import datetime, timezone
import json
from pathlib import Path

import httpx

from app.ai.corpus import official_url, read_corpus


async def check():
    records, failures = read_corpus()
    if failures:
        raise ValueError('Curated corpus validation failed.')
    semaphore = asyncio.Semaphore(3)
    async with httpx.AsyncClient(timeout=20, follow_redirects=True) as client:
        async def probe(record):
            async with semaphore:
                result = {'scheme': record.slug, 'source_url': record.source_url}
                try:
                    response = await client.get(record.source_url)
                    result.update(http_status=response.status_code, final_url=str(response.url),
                        official_destination=official_url(str(response.url)), content_type=response.headers.get('content-type', ''))
                except httpx.HTTPError as error:
                    result['error_type'] = type(error).__name__
                return result
        return {'checked_at_utc': datetime.now(timezone.utc).isoformat(),
            'scope': 'Reachability and official destination only, not a fresh verification of every scheme condition.',
            'results': await asyncio.gather(*(probe(record) for record in records))}


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--output', type=Path)
    args = parser.parse_args()
    result = asyncio.run(check())
    data = json.dumps(result, indent=2)
    if args.output:
        args.output.write_text(data + '\n', encoding='utf-8')
    print(data)
    raise SystemExit(0 if all(row.get('http_status') == 200 and row.get('official_destination') for row in result['results']) else 1)
