"""Bounded public-web adapter following Agent Reach's upstream-tool design.

Pinned optional package integration is installed separately by
scripts/setup_agent_reach.py. No personal browser cookies or account sessions
are imported. The edge app uses the same Exa MCP route directly.
"""
from datetime import datetime, timezone
import json
import re
from urllib.parse import urlparse
import httpx
from .domain import Problem
from .research import CampaignBrief

PIN = '94f06c1969dfc1834001269d79d3ad0972d9dee6'


def search_public(brief: CampaignBrief, client=None):
    query = f"{brief.product} {'Pakistan' if brief.region == 'PK' else 'global'} {brief.platform} advertising product examples {brief.query}"[:500]
    payload = {'jsonrpc': '2.0', 'id': 1, 'method': 'tools/call', 'params': {
        'name': 'web_search_exa', 'arguments': {'query': query, 'numResults': 6,
        'objective': 'Find public official product pages and accessible advertising references with source URLs. Separate listings and organic posts from verified paid ads; do not infer regional ad delivery.'}}}
    own = client is None
    client = client or httpx.Client(timeout=25, trust_env=False)
    try:
        with client.stream('POST', 'https://mcp.exa.ai/mcp', json=payload,
                           headers={'Accept': 'application/json, text/event-stream'}) as response:
            if response.status_code == 429:
                raise Problem('research_quota', 'Exa public search quota is exhausted. Use catalogue references or connect an Exa key in the hosted account settings.', 429)
            response.raise_for_status()
            parts, size = [], 0
            for chunk in response.iter_bytes():
                size += len(chunk)
                if size > 200000:
                    raise ValueError('Provider response too large')
                parts.append(chunk)
        raw = b''.join(parts).decode('utf-8')
        if raw.lstrip().startswith('{'):
            data = json.loads(raw)
        else:
            data = next(json.loads(line[6:]) for line in raw.splitlines()
                        if line.startswith('data: ') and json.loads(line[6:]).get('id') == 1)
        result = data.get('result', {})
        if result.get('_meta', {}).get('ai.exa/rateLimited'):
            raise Problem('research_quota', 'Exa public search quota is exhausted. Use catalogue references or connect an Exa key in the hosted account settings.', 429)
        if data.get('error') or result.get('isError'):
            raise ValueError('Provider tool failed')
        text = '\n'.join(c.get('text', '') for c in result.get('content', []) if c.get('type') == 'text')[:30000]
        sources, seen = [], set()

        def add(value, title=''):
            parsed = urlparse(value)
            host = parsed.hostname or ''
            if (parsed.scheme != 'https' or parsed.username or parsed.password or parsed.port
                    or '.' not in host or ':' in host or re.fullmatch(r'[\d.]+', host)
                    or host.endswith(('.local', '.internal', '.localhost')) or value in seen):
                return
            seen.add(value)
            sources.append({'id': f'reach:{len(sources)}', 'title': (title or host)[:250],
                            'url': value, 'kind': 'public_web_result', 'verification': 'Paid-ad delivery unverified'})
        structured = result.get('structuredContent')
        if structured is None:
            try:
                structured = json.loads(text)
            except ValueError:
                structured = {}
        rows = structured if isinstance(structured, list) else structured.get('results', [])
        for item in rows:
            add(item.get('url', ''), item.get('title', ''))
        for match in re.finditer(r'(?:URL:|url:)\s*(https://[^\s<>"\']+)', text):
            titles = re.findall(r'(?:Title:|title:)\s*([^\n]+)', text[max(0, match.start()-500):match.start()])
            add(match.group(1), titles[-1] if titles else '')
        if not text.strip() or not sources:
            raise ValueError('No source-linked results')
        return {'text': text, 'sources': sources[:12], 'queries': [query], 'supports': [],
                'search_suggestions': '', 'method': 'Agent Reach / Exa MCP',
                'retrieved_at': datetime.now(timezone.utc).isoformat()}
    except Problem:
        raise
    except Exception:
        raise Problem('research_unavailable', 'Public web search is unavailable or returned no usable sources. Catalogue references remain available.', 503) from None
    finally:
        if own:
            client.close()
