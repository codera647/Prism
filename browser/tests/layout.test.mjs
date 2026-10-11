// UI contracts use explicit fixtures. They are not live browser screenshots or
// evidence of image retrieval accuracy / advertising performance.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {JSDOM} from 'jsdom';
import {setTimeout as delay} from 'node:timers/promises';

test('redesigned board retains combined groups, scoped search, copy editing and safe deletion',{timeout:15000},async()=>{
  const dom=new JSDOM('<div id="app"></div><dialog id="modal"><div id="modal-content"></div></dialog><div id="toast"></div>',{url:'https://prism.test',runScripts:'outside-only'}),w=dom.window;
  w.document.querySelector('dialog').showModal=function(){this.open=true;};w.document.querySelector('dialog').close=function(){this.open=false;};
  const originals={};for(const [name,value] of Object.entries({window:w,document:w.document,localStorage:w.localStorage,FormData:w.FormData,File:w.File})){originals[name]=globalThis[name];globalThis[name]=value;}
  const ads=[1,2,3].map(i=>({id:'a'+i,filename:`real-file-${i}.jpg`,copy:'',image:`https://prism.test/private/${i}`,tags:[],width:400,height:600}));
  const board={id:'b1',name:'Uploaded references',revision:1,count:3,copy_count:0,status:'ready',model:'fixture-only-clip',stale:false,ads,groups:[{id:'g1',name:'Product close-ups',members:['a1']},{id:'g2',name:'Product close-ups',members:['a2']},{id:'g3',name:'Product collections',members:['a3']}],patterns:[{kind:'visual',label:'Product close-ups',count:2,denominator:3,ad_ids:['a1','a2']}],jobs:[],report:null};
  const calls=[];w.prismBrowserApi=async(path,opts={})=>{
    calls.push({path,...opts});if(path==='/health')return {clip_ready:true};if(path==='/auth/me')return {name:'Fixture user'};if(path==='/collections')return [board];if(path==='/collections/b1')return board;
    if(path==='/collections/b1/search')return {results:[{id:'a2'},{id:'a1'}],no_match:false};
    if(path==='/collections/b1/ads/a2'&&opts.method==='PATCH'){assert.equal(opts.body.expected_revision,1);board.ads[1].copy=opts.body.copy;board.copy_count=1;board.revision++;board.stale=true;board.groups=[];board.patterns=[];board.model=null;return {};}
    throw Error('Unexpected fixture route '+path);
  };
  const click=async selector=>{const button=w.document.querySelector(selector);assert.ok(button,selector);const menu=button.closest('details');if(menu)menu.open=true;button.click();await delay(15);};
  try{
    w.eval(await readFile('../src/prism/web/app.js','utf8'));await import('../../src/prism/web/studio.mjs?layout-test');await delay(20);
    await click('[data-action="board"]');assert.equal(w.document.querySelectorAll('.creative-card').length,3);
    const closeups=[...w.document.querySelectorAll('[data-action="filter"]')].filter(b=>b.textContent.startsWith('Product close-ups'));assert.equal(closeups.length,1);assert.match(closeups[0].textContent,/2/);
    closeups[0].click();await delay(10);assert.equal(w.document.querySelectorAll('.creative-card').length,2);
    w.document.querySelector('#search-input').value='bottle on a plain background';w.document.querySelector('#search-form').dispatchEvent(new w.Event('submit',{bubbles:true,cancelable:true}));await delay(15);
    const search=calls.find(c=>c.path.endsWith('/search'));assert.equal(search.body.group,null);assert.equal(search.body.query,'bottle on a plain background');assert.deepEqual([...w.document.querySelectorAll('.creative-card')].map(c=>c.dataset.id),['a2','a1']);
    await click('.creative-card');assert.equal(w.document.querySelector('#detail-copy').value,'');
    w.document.querySelector('#detail-copy').value='Real supplied copy';w.document.querySelector('#copy-form').dispatchEvent(new w.Event('submit',{bubbles:true,cancelable:true}));await delay(20);assert.equal(board.copy_count,1);assert.match(w.document.querySelector('.notice').textContent,/board changed/);
    await click('[data-action="upload"]');assert.equal(w.document.querySelector('#file-input').accept,'image/jpeg,image/png,image/webp');assert.ok(w.document.querySelector('#csv-file'));await click('[data-action="close"]');
    await click('[data-action="delete-board"]');assert.ok(w.document.querySelector('[data-action="confirm-delete-board"]'));assert.equal(calls.some(c=>c.method==='DELETE'),false);await click('[data-action="close"]');
    await click('[data-action="studio-board"]');assert.equal(w.document.querySelector('#campaign-panel-references').hidden,false);assert.ok(w.document.querySelector('[data-studio="open-board"]'));
  }finally{for(const [name,value] of Object.entries(originals)){if(value===undefined)delete globalThis[name];else globalThis[name]=value;}dom.window.close();}
});

test('neutral text and primary controls have readable colour contrast',async()=>{
  const css=await readFile('../src/prism/web/style.css','utf8');
  const token=name=>{const hex=css.match(new RegExp('--'+name+':(#[a-f0-9]{6})'))[1];return [1,3,5].map(i=>parseInt(hex.slice(i,i+2),16)/255);};
  const luminance=rgb=>rgb.map(c=>c<=.04045?c/12.92:((c+.055)/1.055)**2.4).reduce((s,c,i)=>s+c*[.2126,.7152,.0722][i],0);
  const ratio=(a,b)=>{const values=[luminance(a),luminance(b)].sort((a,b)=>b-a);return (values[0]+.05)/(values[1]+.05);};
  for(const name of ['ink','muted','accent'])assert.ok(ratio(token(name),token('paper'))>=4.5,name+' on paper');
  assert.ok(ratio(token('accent'),token('surface'))>=4.5,'primary control text');
});
