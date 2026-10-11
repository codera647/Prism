import test from 'node:test';
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
import {readFile} from 'node:fs/promises';
import {setTimeout as delay} from 'node:timers/promises';
import {database} from './helpers/d1.mjs';
import {handleCloud} from '../server/cloud.mjs';
import {admitGoogleUser} from '../server/oauth.mjs';
import {b64,encryptKey,hash,now,random} from '../server/security.mjs';

test('Google-linked UI restores campaigns, autosaves, retains encrypted keys and saves generated ideas',{timeout:20000},async()=>{
 const DB=database(),env={DB,GOOGLE_CLIENT_ID:'fixture-client',GOOGLE_CLIENT_SECRET:'fixture-secret',VAULT_KEY:b64(crypto.getRandomValues(new Uint8Array(32)))};
 const user=await admitGoogleUser(env,{sub:'fixture-alice',email:'alice@example.test',name:'Alice'}),token=random(),csrf=random();
 await DB.prepare('INSERT INTO sessions(token_hash,user_id,csrf,expires_at) VALUES(?,?,?,?)').bind(await hash(token),user.id,csrf,now()+3600).run();
 const secret='fixture-gemini-key-never-saved-plainly',model='gemini-3.5-flash-lite';
 await DB.prepare('INSERT INTO provider_keys(user_id,provider,encrypted,model,updated_at) VALUES(?,?,?,?,?)').bind(user.id,'gemini',await encryptKey(env,user.id,'gemini',secret),model,now()).run();
 await DB.prepare('INSERT INTO provider_keys(user_id,provider,encrypted,model,updated_at) VALUES(?,?,?,?,?)').bind(user.id,'muapi',await encryptKey(env,user.id,'muapi','fixture-private-muapi-key'),'flux-dev-image',now()).run();
 const campaign={id:'fixture-campaign',brief:{product:'Shampoo',region:'PK',platform:'Instagram',audience:'',goal:'Visits',language:'English',claims:'',query:'shampoo'},references:[],selected:[],board_id:null,imports:[],created_at:new Date().toISOString()};
 await DB.prepare('INSERT INTO campaigns(id,user_id,title,payload,version,created_at,updated_at) VALUES(?,?,?,?,?,?,?)').bind(campaign.id,user.id,'Shampoo',JSON.stringify(campaign),1,now(),now()).run();
 const dom=new JSDOM('<div id="app"></div><dialog id="modal"><div id="modal-content"></div></dialog><div id="toast"></div>',{url:'https://prism.test',runScripts:'outside-only'}),w=dom.window;
 w.document.querySelector('dialog').showModal=function(){this.open=true;};w.document.querySelector('dialog').close=function(){this.open=false;};
 const originals={};for(const [name,value] of Object.entries({window:w,document:w.document,localStorage:w.localStorage,FormData:w.FormData,File:w.File,location:w.location,Event:w.Event})){originals[name]=globalThis[name];globalThis[name]=value;}
 const fetchOriginal=globalThis.fetch;let generationCalls=0,imageCalls=0;
 const idea=n=>({title:'Fixture concept '+n,angle:'Contrast composition',visual:'Bottle in use',headline:'A daily routine',caption:'Consider your routine',cta:'Learn more',test:'Compare product-only and in-use images',keep_constant:'Audience and copy',source_ids:[]});
 const provider=async(url,opts)=>{
  if(url.startsWith('https://api.muapi.ai/')){imageCalls++;assert.equal(JSON.parse(opts.body).num_images,1);return Response.json({request_id:'fixture-prediction-'+imageCalls});}
  assert.equal(opts.headers['x-goog-api-key'],secret);assert.equal(url.includes(secret),false);
  generationCalls++;const data=JSON.parse(opts.body).contents[0].parts[0].text.includes('Create exactly two')?{prompts:['A fictional bottle with muted green lighting on a gray background','A fictional bottle in use with soft daylight and room for copy']}:{summary:'Fixture concepts, not actual provider evidence',ideas:[1,2,3].map(idea)};
  return Response.json({candidates:[{finishReason:'STOP',content:{parts:[{text:JSON.stringify(data)}]}}]});
 };
 globalThis.fetch=async(path,opts={})=>{
  assert.ok(path.startsWith('/api/cloud'),path);
  const headers=new Headers(opts.headers);headers.set('Cookie','__Host-prism-session='+token);if(opts.method&&opts.method!=='GET')headers.set('Origin','https://prism.test');
  return handleCloud(new Request('https://prism.test'+path,{...opts,headers}),env,provider);
 };
 w.prismBrowserApi=async(path)=>{if(path==='/health')return {clip_ready:true};if(path==='/auth/me')return w.prismCloud.user();if(path==='/collections')return [];throw Error('Unexpected fixture board route '+path);};
 const click=async selector=>{const b=w.document.querySelector(selector);assert.ok(b,selector);const panel=b.closest('[role="tabpanel"]');if(panel?.hidden){w.document.querySelector('[aria-controls="'+panel.id+'"]').click();await delay(10);}w.document.querySelector(selector).click();await delay(60);};
 try{
  await import('../../src/prism/web/cloud-account.mjs?cloud-ui');await w.prismCloud.ready;
  assert.equal(w.prismCloud.cached().length,1);
  w.eval(await readFile('../src/prism/web/app.js','utf8'));await import('../../src/prism/web/studio.mjs?cloud-ui');await delay(60);
  assert.equal(w.document.querySelector('#brief-product').value,'Shampoo');assert.equal(w.document.querySelector('.connection').textContent,'AI connected');
  w.document.querySelector('#brief-audience').value='Busy parents';w.document.querySelector('#brief-audience').dispatchEvent(new w.Event('change',{bubbles:true}));await delay(1000);
  const saved=JSON.parse(DB.sql.prepare('SELECT payload FROM campaigns WHERE user_id=? AND id=?').get(user.id,campaign.id).payload);assert.equal(saved.brief.audience,'Busy parents');
  await click('[data-studio="ideas"]');assert.equal(w.document.querySelectorAll('.concept-card').length,3);assert.equal(generationCalls,1);
  await click('[data-studio="save-idea"]');assert.equal(DB.sql.prepare('SELECT COUNT(*) AS n FROM saved_ideas WHERE user_id=?').get(user.id).n,1);
  await click('[data-studio="design-prompts"]');assert.equal(w.document.querySelectorAll('#design-form textarea').length,2);assert.equal(imageCalls,0);
  w.document.querySelector('#design-count').value='2';w.document.querySelector('#confirm-design-usage').checked=true;
  w.document.querySelector('#design-form').dispatchEvent(new w.Event('submit',{bubbles:true,cancelable:true}));await delay(100);
  assert.equal(imageCalls,2);assert.equal(DB.sql.prepare('SELECT COUNT(*) AS n FROM design_jobs WHERE user_id=?').get(user.id).n,2);assert.equal(w.document.querySelectorAll('.saved-design').length,2);
  await click('[data-action="close"]');
  await click('[data-action="dashboard"]');assert.match(w.document.querySelector('.dashboard').textContent,/alice@example.test/);assert.ok(w.document.querySelector('[data-cloud="saved-ideas"]'));
  await click('[data-cloud="saved-ideas"]');assert.match(w.document.querySelector('.saved-idea').textContent,/Fixture concept 1/);
  await click('[data-action="close"]');await click('.connection');assert.equal(w.document.querySelector('#gemini-key').value,'');assert.match(w.document.querySelector('#ai-settings').textContent,/encrypted/);
  const storage=Array.from({length:w.localStorage.length},(_,i)=>w.localStorage.getItem(w.localStorage.key(i))).join('');assert.equal(storage.includes(secret),false);assert.equal(w.document.body.textContent.includes(secret),false);
 }finally{await delay(850);globalThis.fetch=fetchOriginal;for(const [name,value] of Object.entries(originals)){if(value===undefined)delete globalThis[name];else globalThis[name]=value;}dom.window.close();DB.sql.close();}
});
