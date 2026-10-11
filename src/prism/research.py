"""Read-only public catalogue discovery. No unrestricted URL fetch or provider key storage."""
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timezone
from urllib.parse import urljoin, urlparse, parse_qsl, urlencode

import httpx
from pydantic import BaseModel, Field
from typing import Literal

from .domain import Problem

STORES = [
    ('saeedghani.pk', 'Saeed Ghani', 'PK'),
    ('conaturalintl.com', 'Conatural', 'PK'),
    ('colorwowhair.com', 'Color Wow', 'GLOBAL'),
    ('theouai.com', 'OUAI', 'GLOBAL'),
]


class CampaignBrief(BaseModel):
    product: str = Field(min_length=1, max_length=180)
    audience: str = Field(max_length=300)
    goal: str = Field(max_length=300)
    claims: str = Field(max_length=1500)
    query: str = Field(min_length=1, max_length=120)
    region: Literal['PK', 'GLOBAL']
    platform: Literal['Instagram', 'Facebook', 'TikTok']
    language: Literal['English', 'Urdu', 'Roman Urdu', 'English + Roman Urdu']


def image_link(value):
    if not isinstance(value, str):
        raise Problem('invalid_reference', 'Only supported catalogue images can be imported.', 400)
    url = urlparse(value)
    if (url.scheme != 'https' or url.netloc != 'cdn.shopify.com'
            or not url.path.startswith('/s/files/')
            or not url.path.lower().endswith(('.png', '.jpg', '.jpeg', '.webp'))):
        raise Problem('invalid_reference', 'Only supported catalogue images can be imported.', 400)
    query = dict(parse_qsl(url.query))
    query['width'] = '900'
    return url._replace(query=urlencode(query)).geturl()


def bounded_get(client, url, limit):
    with client.stream('GET', url, follow_redirects=False) as response:
        response.raise_for_status()
        if 300 <= response.status_code < 400:
            raise ValueError('Redirects are not followed.')
        if int(response.headers.get('content-length', '0')) > limit:
            raise ValueError('Response too large.')
        chunks, size = [], 0
        for chunk in response.iter_bytes():
            size += len(chunk)
            if size > limit:
                raise ValueError('Response too large.')
            chunks.append(chunk)
        return b''.join(chunks), response.headers.get('content-type', '').split(';')[0]


def discover(brief: CampaignBrief):
    if not brief.product.strip() or not brief.query.strip():
        raise Problem('invalid_brief', 'Enter a product and a reference search term.', 400)
    def catalogue(store):
        host, brand, region = store
        try:
            import json
            query = urlencode({'q': brief.query, 'resources[type]': 'product', 'resources[limit]': '6'})
            with httpx.Client(timeout=12, trust_env=False) as client:
                raw, content_type = bounded_get(client, f'https://{host}/search/suggest.json?{query}', 512000)
            if content_type != 'application/json':
                raise ValueError('Catalogue unavailable.')
            products = json.loads(raw)['resources']['results']['products']
            items = []
            for product in products[:6]:
                try:
                    image = image_link(product.get('image') or product.get('featured_image', {}).get('url', ''))
                    url = urljoin(f'https://{host}', product.get('url', '/'))
                    parsed = urlparse(url)
                    if parsed.scheme != 'https' or parsed.netloc != host or not parsed.path.startswith('/products/'):
                        continue
                    items.append({'id': host+':'+str(product.get('id') or product.get('handle') or url)[:180],
                                  'title': str(product.get('title') or 'Product reference')[:250],
                                  'brand': brand, 'region': region, 'url': url, 'image': image,
                                  'kind': 'product_reference', 'copy': '',
                                  'retrieved_at': datetime.now(timezone.utc).isoformat(),
                                  'verification': 'Catalogue photograph. Paid-ad status, Instagram placement and regional delivery are not verified.'})
                except (Problem, ValueError, TypeError):
                    continue
            return {'store': brand, 'status': 'ok', 'items': items}
        except (httpx.HTTPError, ValueError, KeyError, TypeError):
            return {'store': brand, 'status': 'unavailable', 'items': []}
    stores = [s for s in STORES if brief.region == 'GLOBAL' or s[2] == 'PK']
    with ThreadPoolExecutor(max_workers=5) as pool:
        results = list(pool.map(catalogue, stores))
    return {'references': [r for result in results for r in result['items']],
            'catalogues': [{'store': r['store'], 'status': r['status'], 'count': len(r['items'])} for r in results],
            'scope': 'Public product catalogues. These are not verified paid Instagram ads.',
            'retrieved_at': datetime.now(timezone.utc).isoformat()}


def reference_image(value):
    url = image_link(value)
    try:
        with httpx.Client(timeout=15, trust_env=False) as client:
            body, content_type = bounded_get(client, url, 10*1024*1024)
        if content_type not in ('image/jpeg', 'image/png', 'image/webp'):
            raise ValueError('Unsupported image.')
        return body, content_type
    except (httpx.HTTPError, ValueError):
        raise Problem('reference_unavailable', 'Image unavailable. Upload a saved image instead.', 400) from None
