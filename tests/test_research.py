import httpx
import pytest
from prism.domain import Problem
from prism.research import image_link, bounded_get, CampaignBrief


@pytest.mark.parametrize('value', ['http://cdn.shopify.com/s/files/a.jpg','https://localhost/a.jpg','https://127.0.0.1/a.jpg','https://cdn.shopify.com.evil.test/s/files/a.jpg','https://u:p@cdn.shopify.com/s/files/a.jpg','https://cdn.shopify.com/s/files/a.svg','https://cdn.shopify.com:8443/s/files/a.jpg'])
def test_reference_image_never_accepts_arbitrary_targets(value):
    with pytest.raises(Problem):
        image_link(value)


def test_reference_read_rejects_redirects_and_large_bodies():
    for response in [httpx.Response(302, headers={'location':'http://localhost/'}), httpx.Response(200, content=b'x'*11)]:
        with httpx.Client(transport=httpx.MockTransport(lambda request: response)) as client:
            with pytest.raises((httpx.HTTPStatusError, ValueError)):
                bounded_get(client, 'https://cdn.shopify.com/s/files/a.jpg', 10)


def test_campaign_validation_does_not_allow_arbitrary_provider_hosts():
    data=dict(product='Shampoo',audience='',goal='',claims='',query='shampoo',region='PK',platform='Instagram',language='English')
    assert CampaignBrief(**data).region == 'PK'
    with pytest.raises(ValueError):
        CampaignBrief(**(data | {'region':'https://localhost'}))


def test_research_routes_require_identity_csrf_and_supported_image_hosts(system, monkeypatch):
    app, client, _, _ = system
    data=dict(product='Shampoo',audience='',goal='',claims='',query='shampoo',region='PK',platform='Instagram',language='English')
    monkeypatch.setattr('prism.api.discover', lambda brief: {'references':[], 'scope':'Test-only catalogue'})
    assert client.post('/api/discover', json=data).status_code == 200
    assert client.get('/api/reference-image', params={'url':'https://127.0.0.1/a.jpg'}).status_code == 400
    saved=client.headers.pop('X-CSRF-Token')
    assert client.post('/api/discover', json=data).status_code == 403
    client.headers['X-CSRF-Token']=saved
    client.post('/api/auth/logout')
    assert client.post('/api/discover', json=data).status_code == 401
    assert client.get('/api/reference-image', params={'url':'https://cdn.shopify.com/s/files/a.jpg'}).status_code == 401
