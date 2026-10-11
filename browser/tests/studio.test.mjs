// DOM integration tests; provider outputs are explicitly mocked, not live AI evidence.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {JSDOM} from 'jsdom';
import {setTimeout as delay} from 'node:timers/promises';

test('campaign flow imports missing-copy references, drafts with current CLIP context, and never stores the key',{timeout:15000},async()=>{
  const dom=new JSDOM('<div id="app"></div><dialog id="modal"><div id="modal-content"></div></dialog><div id="toast"></div>',{url:'https://prism.test',runScripts:'outside-only'});
  const w=dom.window;w.document.querySelector('dialog').showModal=function(){this.open=true;};w.document.querySelector('dialog').close=function(){this.open=false;};
  const originals={};for(const [name,value] of Object.entries({window:w,document:w.document,localStorage:w.localStorage,FormData:w.FormData,File:w.File})){originals[name]=globalThis[name];globalThis[name]=value;}
  const ref={id:'r-1',title:'Shampoo <script>alert(1)</script>',brand:'Example',region:'PK',image:'https://cdn.shopify.com/s/files/1/1/a.jpg',url:'https://saeedghani.pk/products/example',kind:'product_reference',verification:'Paid-ad status not verified.'};
  const board={id:'b-1',name:'References',revision:1,count:0,copy_count:0,ads:[],groups:[],patterns:[],jobs:[],stale:false,model:null,report:null};
  const calls=[],requests=[];let collections=[];
  w.prismBrowserApi=async(path,opts={})=>{
    calls.push({path,body:opts.body});
    if(path==='/health')return {clip_ready:true};if(path==='/auth/me')return {name:'On this device'};
    if(path==='/collections'&&opts.method==='POST'){collections=[board];return board;}
    if(path==='/collections')return collections;
    if(path==='/discover')return {references:[ref],catalogues:[{store:'Example',status:'ok',count:1}],retrieved_at:new Date().toISOString()};
    if(path==='/collections/b-1/upload'){
      assert.equal(opts.body.get('copy_json'),'{}');const file=opts.body.getAll('files')[0];board.ads.push({id:'a-1',filename:file.name,image:'https://prism.test/private.jpg',copy:'',width:100,height:100,tags:[]});board.count=1;board.revision++;return {accepted:[{id:'a-1'}],rejected:[]};
    }
    if(path==='/collections/b-1')return board;
    throw Error('Unexpected route '+path);
  };
  const fetchOriginal=globalThis.fetch;
  globalThis.fetch=async(url,options)=>{
    if(url.startsWith('/api/reference-image'))return {ok:true,blob:async()=>new w.Blob(['fixture'],{type:'image/jpeg'})};
    requests.push({url,body:JSON.parse(options.body),headers:options.headers});
    if(requests.at(-1).body.tools)return Response.json({candidates:[{finishReason:'STOP',content:{parts:[{text:'A product catalogue is available; paid delivery is unverified.'}]},groundingMetadata:{groundingChunks:[{web:{uri:'https://saeedghani.pk/products/example',title:'Example source'}}],groundingSupports:[{segment:{text:'A product catalogue is available'},groundingChunkIndices:[0]}],webSearchQueries:['shampoo Pakistan Instagram'],searchEntryPoint:{renderedContent:'<style>.chip{color:blue}</style><a href="https://www.google.com/search?q=shampoo" target="_blank">Search shampoo</a>'}}}]});
    if(requests.at(-1).body.contents[0].parts[0].text.startsWith('Answer the latest'))return Response.json({candidates:[{finishReason:'STOP',content:{parts:[{text:'These are tentative product close-up groups, not proof of successful ads.'}]}}]});
    const ideas=[1,2,3].map(i=>({title:`Direction ${i}`,angle:'Proposal',visual:'Bottle with a different background',headline:`Draft ${i}`,caption:'New copy',cta:'Learn more',test:'Change one visual variable',keep_constant:'Audience and headline',source_ids:['a-1']}));
    return Response.json({candidates:[{finishReason:'STOP',content:{parts:[{text:JSON.stringify({summary:'Tentative visual evidence, not campaign results.',ideas})}]}}]});
  };
  try{
    w.eval(await readFile('../src/prism/web/app.js','utf8'));
    await import('../../src/prism/web/studio.mjs?dom-test');await delay(15);
    const fill=(name,value)=>{w.document.querySelector(`[name="${name}"]`).value=value;};
    const click=async action=>{const button=w.document.querySelector(`[data-studio="${action}"]`);assert.ok(button,action+' button missing');button.click();await delay(20);};
    assert.match(w.document.querySelector('h1').textContent,/Start with a product/);
    fill('product','Anti-frizz shampoo');fill('query','shampoo');
    w.document.querySelector('#campaign-form').dispatchEvent(new w.Event('submit',{bubbles:true,cancelable:true}));await delay(25);
    assert.equal(w.document.querySelectorAll('.reference-card').length,1);assert.equal(w.document.querySelector('.reference-info script'),null);
    await click('select-all');await click('import');assert.equal(board.ads.length,1);assert.equal(board.ads[0].copy,'');
    await click('settings');w.document.querySelector('#gemini-key').value='test-only-gemini-key-not-a-real-secret';w.document.querySelector('#ai-settings').dispatchEvent(new w.Event('submit',{bubbles:true,cancelable:true}));await delay(10);
    await click('ideas');assert.match(w.document.querySelector('.studio-error').textContent,/not finished/);assert.equal(requests.length,0);
    board.model='fixture-only-clip';board.groups=[{id:'g1',name:'Product close-ups',members:['a-1']}];
    await click('ideas');assert.equal(w.document.querySelectorAll('.concept-card').length,3);assert.equal(requests.length,1);
    assert.match(requests[0].body.contents[0].parts[0].text,/Product close-ups/);assert.equal(requests[0].url.includes('test-only-gemini'),false);assert.equal(w.localStorage.getItem('prism-studio-v1:On this device').includes('test-only-gemini'),false);
    assert.equal(requests[0].body.contents[0].parts[0].text.includes('private.jpg'),false);
    await click('web');assert.ok(w.document.querySelector('.google-suggestions'));
    assert.equal(w.document.querySelector('.google-suggestions').getAttribute('sandbox').includes('allow-scripts'),false);
    assert.match(w.document.querySelector('.citation-details').textContent,/product catalogue/);
    assert.equal(w.document.querySelectorAll('.concept-card').length,0);
    await click('ideas');assert.equal(w.document.querySelectorAll('.concept-card').length,3);
    await w.prismStudioHost.openBoard(board.id);board.revision++;w.document.querySelector('[data-action="studio"]').click();await delay(10);assert.equal(w.document.querySelectorAll('.concept-card').length,0);
    await click('chat-toggle');assert.ok(w.document.querySelector('#prism-chat-form'));
    w.document.querySelector('#chat-message').value='What does this board tell me?';w.document.querySelector('#prism-chat-form').dispatchEvent(new w.Event('submit',{bubbles:true,cancelable:true}));await delay(20);
    assert.match(w.document.querySelector('.chat-messages').textContent,/not proof/);
    await click('settings');await click('disconnect');
    assert.equal(w.document.querySelector('.connection').textContent.includes('Connect Gemini'),true);
  }finally{globalThis.fetch=fetchOriginal;for(const [name,value] of Object.entries(originals)){if(value===undefined)delete globalThis[name];else globalThis[name]=value;}dom.window.close();}
});
