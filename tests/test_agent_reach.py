import json
import httpx
import pytest
from prism.agent_reach import search_public
from prism.research import CampaignBrief
from prism.domain import Problem


def brief():
    return CampaignBrief(product='Shampoo',audience='',goal='Visits',claims='',query='shampoo',
                         region='PK',platform='Instagram',language='English')


def test_reach_search_only_calls_public_tool_and_retains_source_urls():
    def upstream(request):
        assert str(request.url) == 'https://mcp.exa.ai/mcp'
        data=json.loads(request.content)
        assert data['params']['name']=='web_search_exa'
        assert 'Pakistan' in data['params']['arguments']['query']
        assert data['params']['arguments']['objective']
        return httpx.Response(200,json={'result':{'content':[{'type':'text','text':'Title: Shampoo\nURL: https://example.com/shampoo\nText: Catalogue listing, not an ad.'}]}})
    with httpx.Client(transport=httpx.MockTransport(upstream)) as client:
        result=search_public(brief(),client)
    assert result['sources'][0]['url']=='https://example.com/shampoo'
    assert result['method']=='Agent Reach / Exa MCP'


def test_reach_quota_is_not_misreported_as_success():
    def upstream(request):
        return httpx.Response(200,json={'result':{'_meta':{'ai.exa/rateLimited':True},'content':[]}})
    with httpx.Client(transport=httpx.MockTransport(upstream)) as client:
        with pytest.raises(Problem) as result:
            search_public(brief(),client)
    assert result.value.status==429


def test_reach_does_not_save_unlinked_or_private_source_results():
    with httpx.Client(transport=httpx.MockTransport(lambda request:httpx.Response(200,json={'result':{'content':[{'type':'text','text':'URL: https://127.0.0.1/private'}]}}))) as client:
        with pytest.raises(Problem):
            search_public(brief(),client)
