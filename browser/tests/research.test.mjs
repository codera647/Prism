import test from 'node:test';
import assert from 'node:assert/strict';
import {STORES,validateBrief,researchLinks,catalogueResults,parseIdeas,boardContext,imageLink} from '../../src/prism/web/research-core.mjs';
import {discover,onRequestPost,limitedBody} from '../functions/api/discover.js';
import {referenceImage} from '../functions/api/reference-image.js';
const brief={product:'Anti-frizz shampoo',audience:'Adults',goal:'Product visits',claims:'',query:'shampoo',region:'PK',platform:'Instagram',language:'Roman Urdu'};
const image='https://cdn.shopify.com/s/files/1/1/test.jpg';
const product={id:1,title:'Shampoo',url:'/products/shampoo',image};
const json=products=>Response.json({resources:{results:{products}}});

test('research links carry market/platform; invalid brief is rejected',()=>{
  assert.equal(validateBrief(brief).region,'PK');
  const meta=new URL(researchLinks(brief)[0].url);
  assert.equal(meta.searchParams.get('country'),'PK');assert.equal(meta.searchParams.get('publisher_platforms'),'instagram');
  assert.throws(()=>validateBrief({...brief,region:'unknown'}));assert.throws(()=>validateBrief({...brief,claims:'a'.repeat(1501)}));
});
test('catalogue discovery retains source, leaves copy missing and restricts request hosts',async()=>{
  const requested=[];const result=await discover(brief,async url=>{requested.push(new URL(url).hostname);return json([product]);});
  assert.deepEqual(requested,STORES.filter(s=>s.region==='PK').map(s=>s.host));
  assert.equal(result.references.length,2);for(const r of result.references){assert.equal(r.kind,'product_reference');assert.equal(r.copy,'');assert.match(r.verification,/not verified/);}
});
test('one unavailable catalogue does not masquerade as an empty successful search',async()=>{
  const result=await discover(brief,async url=>{if(url.includes('saeedghani'))throw Error('timeout');return json([product]);});
  assert.equal(result.references.length,1);assert.equal(result.catalogues[0].status,'unavailable');
});
test('discovery endpoint rejects other origins and oversized briefs',async()=>{
  const r=await onRequestPost({request:new Request('https://prism.test/api/discover',{method:'POST',headers:{Origin:'https://evil.test'},body:'{}'})});assert.equal(r.status,403);
  const large=await onRequestPost({request:new Request('https://prism.test/api/discover',{method:'POST',headers:{Origin:'https://prism.test'},body:'a'.repeat(6001)})});assert.equal(large.status,413);
});
test('image import rejects private hosts, credentials, non-images and redirect destinations',async()=>{
  for(const url of ['http://cdn.shopify.com/s/files/a.jpg','https://127.0.0.1/x.jpg','https://cdn.shopify.com.evil.test/s/files/a.jpg','https://u:p@cdn.shopify.com/s/files/a.jpg','https://cdn.shopify.com/s/files/a.svg','https://cdn.shopify.com:8443/s/files/a.jpg'])assert.equal(imageLink(url),'');
  let called=false;await assert.rejects(referenceImage('https://localhost/a.jpg',async()=>{called=true;}));assert.equal(called,false);
  await assert.rejects(referenceImage(image,async()=>new Response('',{status:302,headers:{Location:'http://127.0.0.1/', 'Content-Type':'image/jpeg'}})));
  assert.equal(catalogueResults({resources:{results:{products:[{...product,url:'https://evil.test/products/x'}]}}},STORES[0]).length,0);
});
test('streaming body cap covers responses with no Content-Length',async()=>{
  await assert.rejects(limitedBody(new Response(new Uint8Array(11)),10),/too large/);
  const response=await referenceImage(image,async()=>new Response(new Uint8Array([1,2,3]),{headers:{'Content-Type':'image/jpeg'}}));assert.equal((await response.arrayBuffer()).byteLength,3);
});
const idea=(title,source_ids=['source-1'])=>({title,angle:'An untested direction',visual:'Bottle on plain background',headline:'Your daily routine',caption:'A new draft',cta:'Learn more',test:'Change background',keep_constant:'Product and headline',source_ids});
test('creative validation rejects invented evidence, repeated ideas and truncated output',()=>{
  const good={summary:'Brief-led proposals',ideas:[idea('One'),idea('Two'),idea('Three')]};assert.equal(parseIdeas(JSON.stringify(good),['source-1']).ideas.length,3);
  assert.throws(()=>parseIdeas(JSON.stringify(good),[]),/outside/);
  assert.throws(()=>parseIdeas(JSON.stringify({...good,ideas:[idea('One'),idea('One'),idea('Three')]}),['source-1']),/repeat/);
  assert.throws(()=>parseIdeas('{"ideas": [',[]),/incomplete/);
});
test('LLM board context excludes image URLs/vectors and drops stale CLIP assertions',()=>{
  const ctx=boardContext({id:'b',name:'Hair',revision:2,model:'clip',stale:true,groups:[{id:'g',name:'Discount',members:['a']}],patterns:[{label:'Offer'}],ads:[{id:'a',filename:'a.jpg',copy:'',vector:[.1],image:'private-path'}]});
  assert.deepEqual(ctx.groups,[]);assert.deepEqual(ctx.patterns,[]);assert.equal(ctx.analysis_current,false);assert.equal(JSON.stringify(ctx).includes('private-path'),false);assert.equal(JSON.stringify(ctx).includes('vector'),false);
});
