import test from 'node:test';
import assert from 'node:assert/strict';
import {usableModels,listModels,generationConfig,providerError,checkGrounding} from '../../src/prism/web/gemini-client.mjs';
const key='fixture-key-not-a-real-secret';
const model=id=>({name:'models/'+id,displayName:id,supportedGenerationMethods:['generateContent']});

test('discovery offers new Flash text models and excludes incompatible modalities and unsafe names',()=>{
  const ids=usableModels([model('gemini-3.8-flash'),model('gemini-3.5-flash-lite'),model('gemini-3.1-flash-image'),model('gemini-3.1-flash-tts-preview'),model('gemini-3.8-live'),model('gemini-3.1-pro'),model('gemini-2.5-flash'),model('gemini-3.5-flash-lite'),model('gemini-3.5-flash/../../x'),{...model('gemini-3-flash-preview'),supportedGenerationMethods:['embedContent']}]).map(m=>m.id);
  assert.deepEqual(ids,['gemini-3.5-flash-lite','gemini-3.8-flash','gemini-2.5-flash']);
});
test('list pagination keeps keys in headers and does not run generation',async()=>{
  const requests=[];
  const models=await listModels(key,{fetcher:async(url,opts)=>{requests.push({url,opts});return Response.json(requests.length===1?{models:[model('gemini-3.1-flash-image')],nextPageToken:'second page'}:{models:[model('gemini-3.5-flash-lite')]});}});
  assert.equal(models.length,1);assert.equal(requests.length,2);
  for(const r of requests){assert.equal(r.opts.headers['x-goog-api-key'],key);assert.equal(r.url.includes(key),false);assert.equal(r.opts.method,undefined);assert.equal(r.opts.body,undefined);}
  assert.equal(new URL(requests[1].url).searchParams.get('pageToken'),'second page');
});
test('discovery reports no compatible models and bounds pagination',async()=>{
  await assert.rejects(listModels(key,{fetcher:async()=>Response.json({models:[model('gemini-3.1-flash-image')]})}),/no compatible/);
  let calls=0;await assert.rejects(listModels(key,{fetcher:async()=>{calls++;return Response.json({models:[],nextPageToken:'again'});}}),/discovery limit/);assert.equal(calls,5);
});
test('new models do not receive deprecated sampling or old thinking overrides',()=>{
  for(const id of ['gemini-3.1-flash-lite','gemini-3.5-flash-lite','gemini-3.8-flash'])assert.deepEqual(generationConfig(id,true),{maxOutputTokens:8192,responseMimeType:'application/json'});
  assert.deepEqual(generationConfig('gemini-2.5-flash').thinkingConfig,{thinkingBudget:0});
  assert.throws(()=>generationConfig('gemini-3.1-flash-image'),/compatible/);
});
test('provider failures give actionable errors without echoing provider secrets',async()=>{
  for(const [status,match] of [[404,/Load available models/],[429,/quota/],[403,/permissions/],[503,/temporarily/]]){
    const e=await providerError(Response.json({error:{message:key}},{status}));assert.match(e.message,match);assert.equal(e.message.includes(key),false);
  }
  const e=await providerError(Response.json({error:{details:[{reason:'API_KEY_INVALID'}],message:key}},{status:400}));assert.match(e.message,/API key/);assert.equal(e.message.includes(key),false);
});
test('model discovery failures make one request and never switch or retry',async()=>{
  let calls=0;await assert.rejects(listModels(key,{fetcher:async()=>{calls++;return Response.json({error:{message:key}},{status:403});}}),/permissions/);assert.equal(calls,1);
});
test('Google Search requires explicit session opt-in and never silently falls back',()=>{
  assert.throws(()=>checkGrounding('gemini-3.5-flash-lite',false),/API free tier/);
  assert.doesNotThrow(()=>checkGrounding('gemini-3.5-flash-lite',true));
});
