// Actual SQLite + WebCrypto contracts; Google/Muapi/Exa responses are fixtures.
import test from 'node:test';
import assert from 'node:assert/strict';
import {generateKeyPair,SignJWT} from 'jose';
import {handleCloud} from '../server/cloud.mjs';
import {admitGoogleUser,startOAuth,finishOAuth,validateGoogleToken} from '../server/oauth.mjs';
import {b64,decryptKey,encryptKey,hash,now,random} from '../server/security.mjs';
import {reachSearch,pollDesign} from '../server/providers.mjs';

import {database} from './helpers/d1.mjs';

test('optional image storage checks ownership, file bytes, quota and deletion',async()=>{
 const f=await fixture(),objects=new Map();f.env.MEDIA={async put(k,b){objects.set(k,b);},async get(k){return objects.has(k)?{body:objects.get(k)}:null;},async delete(k){objects.delete(k);}};
 try{
  await create(f,f.alice);const png=new Uint8Array([137,80,78,71,13,10,26,10,0,0,0,0,0]);
  const upload=(who,bytes)=>handleCloud(new Request('https://prism.test/api/cloud/media?campaign=c1',{method:'POST',headers:{Cookie:'__Host-prism-session='+who.token,Origin:'https://prism.test','X-CSRF-Token':who.csrf,'Content-Type':'image/png'},body:bytes}),f.env);
  assert.equal((await upload(f.bob,png)).status,404);assert.equal((await upload(f.alice,new Uint8Array(14))).status,400);
  const created=await upload(f.alice,png);assert.equal(created.status,201);const image=await created.json();
  assert.equal((await route(f,f.bob,'/media/'+image.id)).status,404);const owned=await route(f,f.alice,'/media/'+image.id);assert.equal(owned.headers.get('cache-control'),'private, no-store');assert.deepEqual(new Uint8Array(await owned.arrayBuffer()),png);
  assert.equal((await (await route(f,f.alice,'/media?campaign=c1')).json()).images.length,1);
  f.env.DB.sql.prepare('UPDATE media SET bytes=104857600 WHERE user_id=?').run(f.alice.id);assert.equal((await upload(f.alice,png)).status,409);
  f.env.DB.sql.prepare('UPDATE media SET bytes=13 WHERE user_id=?').run(f.alice.id);
  for(let i=0;i<29;i++)f.env.DB.sql.prepare('INSERT INTO media(id,user_id,campaign_id,object_key,mime,bytes,created_at) VALUES(?,?,?,?,?,?,?)').run('cap'+i,f.alice.id,'c1','cap-object'+i,'image/png',13,now());
  assert.equal((await upload(f.alice,png)).status,409);
  await route(f,f.alice,'/campaigns/c1','DELETE');assert.equal(objects.size,0);assert.equal(f.env.DB.sql.prepare('SELECT COUNT(*) AS n FROM media').get().n,0);
 }finally{f.close();}
});

async function fixture(){
 const DB=database(),env={DB,GOOGLE_CLIENT_ID:'fixture-client',GOOGLE_CLIENT_SECRET:'fixture-secret',VAULT_KEY:b64(crypto.getRandomValues(new Uint8Array(32)))};
 const users=[];for(const label of ['alice','bob']){
  const user=await admitGoogleUser(env,{sub:'fixture-'+label,email:label+'@example.test',name:label}),token=random(),csrf=random();
  await DB.prepare('INSERT INTO sessions(token_hash,user_id,csrf,expires_at) VALUES(?,?,?,?)').bind(await hash(token),user.id,csrf,now()+3600).run();users.push({...user,token,csrf});
 }
 return {env,alice:users[0],bob:users[1],close:()=>DB.sql.close()};
}
const payload=id=>({id,brief:{product:'Anti-frizz shampoo',audience:'',goal:'Visits',claims:'',query:'shampoo',region:'PK',platform:'Instagram',language:'English'},references:[],selected:[],imports:[],board_id:null});
function request(user,path,method='GET',data,headers={}){return new Request('https://prism.test/api/cloud'+path,{method,headers:{Cookie:'__Host-prism-session='+user.token,Origin:'https://prism.test','X-CSRF-Token':user.csrf,...headers},...(data!==undefined?{body:JSON.stringify(data)}:{})});}
const route=(f,u,p,m='GET',d,fetcher)=>handleCloud(request(u,p,m,d),f.env,fetcher);
async function create(f,u,id='c1'){const r=await route(f,u,'/campaigns/'+id,'PUT',{payload:payload(id),version:0});assert.equal(r.status,200);return r.json();}

test('cloud accounts fail closed when deployment bindings are absent',async()=>{
 const config=await handleCloud(new Request('https://prism.test/api/cloud/config'),{});assert.equal((await config.json()).accounts_ready,false);
 const denied=await handleCloud(new Request('https://prism.test/api/cloud/campaigns'),{});assert.equal(denied.status,503);
 const start=await handleCloud(new Request('https://prism.test/api/cloud/auth/google'),{});assert.equal(start.status,503);assert.match((await start.json()).detail,/awaiting/);
 const callback=await handleCloud(new Request('https://prism.test/api/cloud/auth/callback'),{});assert.equal(callback.status,503);
});
test('Google tokens require valid signature, audience, issuer, nonce, expiry and verified email',async()=>{
 const {privateKey,publicKey}=await generateKeyPair('RS256');
 const token=async(p={},issuer='https://accounts.google.com',aud='fixture-client')=>new SignJWT({sub:'fixture-sub',email:'alice@example.test',email_verified:true,nonce:'nonce',...p}).setProtectedHeader({alg:'RS256'}).setIssuer(issuer).setAudience(aud).setIssuedAt().setExpirationTime('5m').sign(privateKey);
 assert.equal((await validateGoogleToken(await token(),'fixture-client','nonce',publicKey)).sub,'fixture-sub');
 await assert.rejects(validateGoogleToken(await token(),'wrong','nonce',publicKey));
 await assert.rejects(validateGoogleToken(await token(),'fixture-client','wrong',publicKey));
 await assert.rejects(validateGoogleToken(await token({email_verified:false}),'fixture-client','nonce',publicKey));
 await assert.rejects(validateGoogleToken(await token({},'https://attacker.test'),'fixture-client','nonce',publicKey));
 const expired=await new SignJWT({sub:'fixture-sub',email:'alice@example.test',email_verified:true,nonce:'nonce'}).setProtectedHeader({alg:'RS256'}).setIssuer('https://accounts.google.com').setAudience('fixture-client').setIssuedAt(now()-1000).setExpirationTime(now()-1).sign(privateKey);
 await assert.rejects(validateGoogleToken(expired,'fixture-client','nonce',publicKey));
});
test('OAuth uses PKCE and browser-bound state; invalid callback never exchanges a code',async()=>{
 const f=await fixture();try{
  const start=await startOAuth(new Request('https://prism.test/api/cloud/auth/google'),f.env);const url=new URL(start.headers.get('location'));
  assert.equal(url.searchParams.get('code_challenge_method'),'S256');assert.equal(url.searchParams.get('scope'),'openid email profile');
  const cookie=start.headers.get('set-cookie');assert.match(cookie,/Secure; HttpOnly; SameSite=Lax/);
  const state=url.searchParams.get('state'),row=await f.env.DB.prepare('SELECT * FROM oauth_states WHERE state_hash=?').bind(await hash(state)).first();assert.equal(await hash(row.verifier),url.searchParams.get('code_challenge'));assert.equal(row.nonce,url.searchParams.get('nonce'));
  let calls=0;await assert.rejects(finishOAuth(new Request('https://prism.test/api/cloud/auth/callback?state='+state+'&code=fixture'),f.env,async()=>{calls++;}),/expired|cancelled/);assert.equal(calls,0);
 }finally{f.close();}
});
test('pilot admission caps 30 unique Google identities and keeps existing users eligible',async()=>{
 const DB=database(),env={DB,MAX_USERS:30};try{
  for(let i=0;i<30;i++)await admitGoogleUser(env,{sub:'u'+i,email:'u'+i+'@example.test',name:'u'+i});
  await assert.rejects(admitGoogleUser(env,{sub:'new',email:'new@example.test',name:'new'}),/full/);
  await admitGoogleUser(env,{sub:'u1',email:'changed@example.test',name:'Changed'});
  assert.equal(DB.sql.prepare('SELECT COUNT(*) AS n FROM users').get().n,30);
  await assert.rejects(admitGoogleUser({...env,ALLOWED_EMAILS:'owner@example.test'},{sub:'u1',email:'changed@example.test',name:'Changed'}),/invitation/);
 }finally{DB.sql.close();}
});
test('campaigns are account scoped, revision checked and protected from CSRF',async()=>{
 const f=await fixture();try{
  await create(f,f.alice);assert.equal((await route(f,f.bob,'/campaigns/c1')).status,404);
  assert.equal((await route(f,f.bob,'/campaigns/c1','DELETE')).status,404);
  assert.equal((await route(f,f.alice,'/campaigns/c1','PUT',{payload:payload('c1'),version:0})).status,409);
  const changed={...payload('c1'),brief:{...payload('c1').brief,product:'New brief'}};
  assert.equal((await route(f,f.alice,'/campaigns/c1','PUT',{payload:changed,version:1})).status,200);
  assert.equal((await route(f,f.alice,'/campaigns/c1','PUT',{payload:payload('c1'),version:1})).status,409);
  const noCsrf=await handleCloud(request(f.alice,'/campaigns/c1','DELETE',undefined,{'X-CSRF-Token':'wrong'}),f.env);assert.equal(noCsrf.status,403);
  const otherOrigin=await handleCloud(request(f.alice,'/campaigns/c1','DELETE',undefined,{Origin:'https://attacker.test'}),f.env);assert.equal(otherOrigin.status,403);
  assert.equal((await (await route(f,f.alice,'/campaigns/c1')).json()).payload.brief.product,'New brief');
  const bad={...payload('c2'),ideas:{api_key:'fixture-secret'}};assert.equal((await route(f,f.alice,'/campaigns/c2','PUT',{payload:bad,version:0})).status,400);
 }finally{f.close();}
});
test('provider keys persist encrypted, bind to user/provider and never appear in API/export responses',async()=>{
 const f=await fixture(),secret='fixture-not-a-real-provider-secret';try{
  const save=await route(f,f.alice,'/keys/muapi','PUT',{key:secret,model:'flux-dev-image'});assert.equal(save.status,200);
  const stored=f.env.DB.sql.prepare('SELECT encrypted FROM provider_keys WHERE user_id=?').get(f.alice.id);assert.equal(stored.encrypted.includes(secret),false);
  assert.equal(await decryptKey({...f.env},f.alice.id,'muapi',stored.encrypted),secret);
  await assert.rejects(decryptKey(f.env,f.bob.id,'muapi',stored.encrypted));await assert.rejects(decryptKey(f.env,f.alice.id,'gemini',stored.encrypted));
  const info=await (await route(f,f.alice,'/keys')).json();assert.equal(info.muapi.model,'flux-dev-image');assert.equal(JSON.stringify(info).includes(secret),false);assert.equal(info.muapi.encrypted,undefined);
  assert.equal((await (await route(f,f.bob,'/keys')).json()).muapi,null);
  const exported=await route(f,f.alice,'/account/export');assert.equal((await exported.text()).includes(secret),false);
 }finally{f.close();}
});
test('saved ideas survive campaign reload and stay private to the owner',async()=>{
 const f=await fixture();try{
  await create(f,f.alice);const idea={title:'Show application',headline:'A simple routine',visual:'Bottle in use'};
  assert.equal((await route(f,f.alice,'/campaigns/c1/ideas','POST',{idea})).status,201);
  assert.equal((await (await route(f,f.alice,'/campaigns/c1/ideas')).json()).ideas[0].payload.headline,idea.headline);
  assert.equal((await route(f,f.bob,'/campaigns/c1/ideas')).status,404);
  await route(f,f.alice,'/campaigns/c1','DELETE');assert.equal(f.env.DB.sql.prepare('SELECT COUNT(*) AS n FROM saved_ideas').get().n,0);
 }finally{f.close();}
});
test('image dispatch is opt-in, idempotent, account scoped and never auto-retries an uncertain submission',async()=>{
 const f=await fixture();try{
  await create(f,f.alice);await route(f,f.alice,'/keys/muapi','PUT',{key:'fixture-not-a-real-image-key',model:'flux-dev-image'});
  const data={campaign_id:'c1',prompt:'A product bottle on a clean gray background',confirm_provider_usage:true},headers={'Idempotency-Key':'request1'};let calls=0;
  const provider=async(url,opts)=>{calls++;assert.equal(url,'https://api.muapi.ai/api/v1/flux-dev-image');assert.equal(JSON.parse(opts.body).num_images,1);return Response.json({request_id:'prediction1'});};
  const start=await handleCloud(request(f.alice,'/designs','POST',{...data,confirm_provider_usage:false},headers),f.env,provider);assert.equal(start.status,400);assert.equal(calls,0);
  const response=await handleCloud(request(f.alice,'/designs','POST',data,headers),f.env,provider);assert.equal(response.status,201);const job=await response.json();assert.equal(job.status,'processing');
  const again=await handleCloud(request(f.alice,'/designs','POST',data,headers),f.env,provider);assert.equal(again.status,200);assert.equal(calls,1);
  const changed=await handleCloud(request(f.alice,'/designs','POST',{...data,prompt:'A different visual prompt'},headers),f.env,provider);assert.equal(changed.status,409);assert.equal(calls,1);
  assert.equal((await route(f,f.bob,'/designs/'+job.id)).status,404);
  const uncertain=async()=>{calls++;throw Error('fixture timeout that might have submitted');};const h2={'Idempotency-Key':'request2'};
  const failed=await handleCloud(request(f.alice,'/designs','POST',data,h2),f.env,uncertain);assert.equal((await failed.json()).status,'needs_attention');
  await handleCloud(request(f.alice,'/designs','POST',data,h2),f.env,uncertain);assert.equal(calls,2);
 }finally{f.close();}
});
test('research uses source-linked Exa MCP output and reports its free quota honestly',async()=>{
 const brief=payload('c').brief;
 const provider=async(url,opts)=>{assert.equal(url,'https://mcp.exa.ai/mcp');const p=JSON.parse(opts.body);assert.equal(p.params.name,'web_search_exa');assert.ok(p.params.arguments.objective);return Response.json({result:{content:[{type:'text',text:'Title: Official shampoo\nURL: https://example.com/shampoo\nText: Product catalogue reference.'}]}});};
 const result=await reachSearch(brief,provider);assert.equal(result.sources[0].url,'https://example.com/shampoo');assert.match(result.method,/Agent Reach/);
 await assert.rejects(reachSearch(brief,async()=>Response.json({result:{_meta:{'ai.exa/rateLimited':true},content:[{type:'text',text:'Quota exceeded'}]}})),e=>e.status===429);
 await assert.rejects(reachSearch(brief,async()=>Response.json({result:{content:[{type:'text',text:'No source URLs'}]}})),/no source-linked/);
});
test('image output rejects arbitrary URLs and never exposes raw provider errors',async()=>{
 await assert.rejects(pollDesign('fixture-key','valid-id',async()=>Response.json({status:'completed',outputs:['http://127.0.0.1/private']})),/not supported/);
 const r=await pollDesign('fixture-key','valid-id',async()=>Response.json({status:'completed',outputs:['https://storage.googleapis.com/fixture/image.jpg']}));assert.equal(r.urls.length,1);
 const f=await fixture();try{
  const encrypted=await encryptKey(f.env,f.alice.id,'gemini','fixture-private-key');await f.env.DB.prepare('INSERT INTO provider_keys(user_id,provider,encrypted,model,updated_at) VALUES(?,?,?,?,?)').bind(f.alice.id,'gemini',encrypted,'gemini-3.5-flash-lite',now()).run();
  const response=await route(f,f.alice,'/gemini/generate','POST',{text:'Explain the board'},async()=>Response.json({error:{message:'Echo fixture-private-key'}},{status:401}));assert.equal(response.status,502);assert.equal((await response.text()).includes('fixture-private-key'),false);
 }finally{f.close();}
});
test('account deletion removes synced records and encrypted keys without exposing another user',async()=>{
 const f=await fixture();try{
  await create(f,f.alice);await create(f,f.bob,'c2');await route(f,f.alice,'/keys/exa','PUT',{key:'fixture-not-a-real-exa-key'});
  assert.equal((await route(f,f.alice,'/account','DELETE',{confirm:'DELETE MY ACCOUNT'})).status,200);
  assert.equal((await route(f,f.alice,'/campaigns')).status,401);assert.equal((await route(f,f.bob,'/campaigns/c2')).status,200);
  assert.equal(f.env.DB.sql.prepare('SELECT COUNT(*) AS n FROM provider_keys WHERE user_id=?').get(f.alice.id).n,0);
 }finally{f.close();}
});
