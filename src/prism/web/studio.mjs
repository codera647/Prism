import {safeLink,validateBrief,researchLinks,parseIdeas,boardContext,groundedSegments,SYSTEM,ideaPrompt} from './research-core.mjs';

const $=id=>document.getElementById(id);
const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const emptyBrief=()=>({product:'',region:'PK',platform:'Instagram',audience:'',goal:'Get people to visit the product page',language:'English + Roman Urdu',claims:'',query:''});
let host,sessionKey='',model='gemini-2.5-flash',scope='',saved=[],active=null,working=false,step='',error='',chatOpen=false,messages=[],chatWorking=false;
const storageKey=()=>`prism-studio-v1:${scope}`;
function persist(){try{localStorage.setItem(storageKey(),JSON.stringify(saved));}catch{error='Your browser could not save this research. Export it before closing.';}}
function initScope(){
  const user=host.user();if(!user)return;
  const next=user.name;
  if(scope!==next){scope=next;sessionKey='';messages=[];active=null;saved=[];try{const data=JSON.parse(localStorage.getItem(storageKey())||'[]');if(Array.isArray(data))saved=data.slice(0,20);for(const r of saved){if(r.ideas?.board_revision)r.ideas.needs_check=true;delete r.checking;}}catch{}active=saved[0]||null;}
}
function session(){if(!active){active={id:crypto.randomUUID(),brief:emptyBrief(),references:[],selected:[],board_id:null,imports:[],ideas:null,web:null,created_at:new Date().toISOString()};saved.unshift(active);}return active;}
function render(){host.render();}
function displayError(e){error=e.name==='AbortError'||e.name==='TimeoutError'?'The request timed out. Your previous results are saved; try again.':e.message;render();}
function readBrief(){return validateBrief(Object.fromEntries(new FormData($('campaign-form'))));}
function collectBrief(){if($('campaign-form'))session().brief=readBrief();return session().brief;}
function imageEndpoint(url){return '/api/reference-image?url='+encodeURIComponent(url);}
function link(url,label){const safe=safeLink(url);return safe?`<a href="${esc(safe)}" target="_blank" rel="noopener noreferrer">${esc(label)} ↗</a>`:'';}
function currentIdeas(){const ideas=active?.ideas;if(!ideas||ideas.needs_check)return null;const board=host.board();if(board?.id===active.board_id&&ideas.board_revision!==board.revision){active.ideas=null;persist();return null;}return JSON.stringify(ideas.brief)===JSON.stringify(active.brief)?ideas:null;}
function searchSuggestions(html){
  if(!html)return '';
  // Google's supplied suggestions live in an opaque sandbox, with no scripts,
  // forms, same-origin access or access to Prism's in-memory provider key.
  const policy="default-src 'none'; style-src 'unsafe-inline'; img-src data:; script-src 'none'; base-uri 'none'; form-action 'none'";
  const doc=`<!doctype html><html><head><meta http-equiv="Content-Security-Policy" content="${policy}"></head><body>${html}</body></html>`;
  return `<iframe class="google-suggestions" title="Google Search suggestions" sandbox="allow-popups allow-popups-to-escape-sandbox" referrerpolicy="no-referrer" srcdoc="${esc(doc)}"></iframe>`;
}
function field(name,label,placeholder,max=300){return `<label for="brief-${name}">${label}</label><input id="brief-${name}" name="${name}" maxlength="${max}" value="${esc(session().brief[name])}" placeholder="${esc(placeholder)}" ${['product','query'].includes(name)?'required':''}>`;}
function select(name,label,options){return `<label for="brief-${name}">${label}</label><select id="brief-${name}" name="${name}">${options.map(([value,text])=>`<option value="${value}" ${session().brief[name]===value?'selected':''}>${text}</option>`).join('')}</select>`;}
function html(){
  initScope();const s=session(),ideas=currentIdeas();
  const sources=s.web?.sources||[];
  return `<section class="studio"><div class="studio-hero"><div><span class="studio-pill">✦ YOUR CREATIVE COPILOT</span><h1>Start with a product.<br><span>Leave with a direction.</span></h1><p>Tell Prism what you want to advertise. Find references, explore their visual patterns, and shape ideas for your market.</p><div class="hero-steps"><span>01 / Brief</span><i>→</i><span>02 / Research</span><i>→</i><span>03 / Create</span></div></div><div class="orbit-art" aria-hidden="true"><div class="orbit one"></div><div class="orbit two"></div><div class="prism-gem">✦</div><span class="floating-label fl-one">Pakistan · Instagram</span><span class="floating-label fl-two">Your next idea ↗</span></div></div>
  <div class="studio-toolbar"><button data-studio="fresh">＋ New campaign</button><select id="research-session" aria-label="Saved campaigns" ${working?"disabled":""}>${saved.map(r=>`<option value="${esc(r.id)}" ${s.id===r.id?'selected':''}>${esc(r.brief.product||'Untitled campaign')}</option>`).join('')}</select><button data-studio="settings" class="connection">${sessionKey?'● Gemini connected':'○ Connect Gemini'}</button><button data-studio="export">↓ Export research</button><button class="subtle danger" data-studio="delete">Delete research</button></div>
  ${error?`<div class="studio-error" role="alert">${esc(error)}</div>`:''}
  ${working?`<div class="research-progress" role="status"><span class="spinner"></span><div><b>${esc(step)}</b><p>Keep this page open. Your existing boards are safe.</p></div><button data-studio="cancel">Cancel</button></div>`:''}
  <div class="studio-columns"><section class="brief-panel"><span class="eyebrow muted">01 / YOUR CAMPAIGN</span><h2>What are we making?</h2><form id="campaign-form"><fieldset ${working?"disabled":""}>
  ${field('product','Product / idea','e.g. Anti-frizz shampoo',180)}
  <div class="field-pair">${select('region','Market',[['PK','Pakistan'],['GLOBAL','Global inspiration']])}${select('platform','Platform',[['Instagram','Instagram'],['Facebook','Facebook'],['TikTok','TikTok']])}</div>
  ${field('audience','Who is it for?','e.g. People looking for an everyday hair-care routine')}
  ${field('goal','Campaign goal','e.g. Visits to my product page')}
  ${select('language','Copy language',[['English','English'],['Urdu','Urdu'],['Roman Urdu','Roman Urdu'],['English + Roman Urdu','English + Roman Urdu']])}
  <label for="brief-claims">What can your product actually promise?</label><textarea id="brief-claims" name="claims" maxlength="1500" rows="3" placeholder="Add only benefits you can support. Include your real price or offer if you have one.">${esc(s.brief.claims)}</textarea>
  ${field('query','Reference search term','e.g. shampoo (keep this broad)',120)}
  <button class="primary research-submit" type="submit" ${working?'disabled':''}>Find product references ↗</button><p class="hint">Live catalogue photographs from ${s.brief.region==='PK'?'Pakistani brands':'selected local and global brands'}. Availability varies. These are inspiration, not verified paid ads.</p></fieldset></form></section>
  <section class="research-panel"><div class="panel-heading"><div><span class="eyebrow muted">02 / RESEARCH & REFERENCES</span><h2>See what’s out there.</h2></div><span class="count-pill">${s.references.length} references</span></div>
  <div class="research-actions"><button data-studio="web" ${working?'disabled':''}>✦ Research the web with Gemini</button><button data-studio="links">Open regional ad searches ↗</button></div><p class="hint">Web research searches public sources. Check Ad Library for actual placement and country delivery. Product catalogues alone cannot establish either.</p>
  ${s.discovery?`<p class="catalogue-status">${s.discovery.catalogues.map(c=>`${esc(c.store)}: ${c.status==='ok'?c.count+' photos':'unavailable'}`).join(' · ')}<br>Retrieved ${esc(new Date(s.discovery.retrieved_at).toLocaleString())}</p>`:''}
  ${s.web?`<article class="web-notes"><b>Web research · Gemini + Google Search</b><p class="plain-text">${esc(s.web.text)}</p>${searchSuggestions(s.web.search_suggestions)}${(s.web.supports||[]).length?`<details class="citation-details"><summary>Check source-linked statements</summary>${s.web.supports.map(x=>`<p>?${esc(x.quote)}? ${x.sources.map(c=>link(c.url,c.title)).join(" ? ")}</p>`).join("")}</details>`:""}<div class="source-links">${sources.map((r,i)=>link(r.url,`[${i+1}] ${r.title}`)).join('')}</div>${(s.web.queries||[]).length?`<p class="hint">Searches: ${s.web.queries.map(esc).join(' · ')}</p>`:''}<p class="hint">Source links show what was retrieved. AI summaries and paid-ad claims still need checking.</p></article>`:''}
  ${s.references.length?`<div class="reference-grid">${s.references.map(r=>`<article class="reference-card"><label class="reference-select"><input type="checkbox" data-ref="${esc(r.id)}" ${s.selected.includes(r.id)?'checked':''} ${working?'disabled':''}><span>Select reference</span></label><img src="${esc(imageEndpoint(r.image))}" alt="${esc(r.title)}" loading="lazy"><div class="reference-info"><span class="reference-kind">Product photo · ${r.region==='PK'?'Pakistani brand':'Global brand'}</span><h3>${esc(r.title)}</h3><p>${esc(r.brand)}</p>${link(r.url,'View original product')}<p class="hint">Paid-ad / Instagram delivery unverified.</p></div></article>`).join('')}</div><div class="selection-bar"><span>${s.selected.length} selected</span><button data-studio="select-all" ${working?'disabled':''}>Select all</button><button class="primary" data-studio="import" ${working||!s.selected.length?'disabled':''}>Add selected to a CLIP board →</button></div>`:`<div class="research-empty"><div class="sparkle">✧</div><h3>Your inspiration starts here.</h3><p>Try “anti-frizz shampoo”, Pakistan, Instagram, and the search term “shampoo”. You can also upload your own ad screenshots to a board.</p><button data-action="new">Upload my own references</button></div>`}
  ${s.board_id?`<div class="board-connection"><span>▧ Reference board connected. CLIP groups its images on your device.</span><button data-studio="open-board">Open visual board →</button></div>`:''}
  <button class="subtle" data-studio="use-board">Use an existing board for this campaign</button></section></div>
  <section class="concept-panel"><div class="panel-heading"><div><span class="eyebrow muted">03 / MAKE IT YOUR OWN</span><h2>Three directions. One next move.</h2><p>Draft copy, a visual brief, and a comparison you can actually run.</p></div><button class="primary" data-studio="ideas" ${working?'disabled':''}>✦ Draft three concepts</button></div><p class="hint">Gemini receives your brief, selected reference titles and source links, and the connected board’s supplied copy / CLIP descriptions. Image files and embedding vectors stay on your device.</p>
  ${ideas?`<p class="plain-text concept-summary">${esc(ideas.summary)}</p><span class="draft-label">AI proposals · ${esc(ideas.method)} · ${esc(ideas.board_revision?'board revision '+ideas.board_revision:'brief-led; no current CLIP board')} · not tested</span><div class="concept-grid">${ideas.ideas.map((i,n)=>`<article class="concept-card"><span class="concept-number">0${n+1}</span><h3>${esc(i.title)}</h3><p>${esc(i.angle)}</p><div class="concept-headline" dir="auto">“${esc(i.headline)}”</div><dl><dt>The visual</dt><dd>${esc(i.visual)}</dd><dt>Draft caption</dt><dd dir="auto">${esc(i.caption)}</dd><dt>Call to action</dt><dd>${esc(i.cta)}</dd><dt>What to compare</dt><dd>${esc(i.test)}</dd><dt>Keep the same</dt><dd>${esc(i.keep_constant)}</dd></dl><div class="concept-sources">${i.source_ids.map(id=>{const ref=s.references.find(r=>r.id===id)||s.web?.sources.find(r=>r.id===id);return ref?link(ref.url,ref.brand||ref.title):`<span class="hint">Board creative: ${esc(s.imports.find(x=>x.ad_id===id)?.title||id)}</span>`;}).join('')}</div><button data-studio="copy" data-index="${n}">Copy concept</button></article>`).join('')}</div>`:`<div class="concept-placeholder"><span>✦</span><p>Connect Gemini to turn your brief and references into specific concepts. Without references, Prism can draft ideas from your brief and will label them accordingly.</p></div>`}</section></section>`;
}
let controller;
async function job(label,fn){if(working)return;working=true;error='';step=label;controller=new AbortController();render();try{await fn(controller.signal);}catch(e){displayError(e);}finally{working=false;step='';controller=null;persist();render();}}
async function jsonRequest(path,body,signal){
  const response=await host.api(path,{method:'POST',body,signal});return response;
}
async function gemini(text,{grounded=false,structured=false,signal}={}){
  if(!sessionKey)throw Error('Connect a Gemini API key first using “Connect Gemini”.');
  if(sessionKey.length<20)throw Error('This API key appears incomplete. Reconnect Gemini.');
  const body={systemInstruction:{parts:[{text:SYSTEM}]},contents:[{role:'user',parts:[{text}]}],generationConfig:{temperature:.6,maxOutputTokens:6000,thinkingConfig:{thinkingBudget:0}}};
  if(grounded)body.tools=[{google_search:{}}];
  if(structured)body.generationConfig.responseMimeType='application/json';
  const timeout=AbortSignal.timeout(90000),combined=signal?AbortSignal.any([signal,timeout]):timeout;
  const r=await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,{method:'POST',headers:{'Content-Type':'application/json','x-goog-api-key':sessionKey},body:JSON.stringify(body),signal:combined});
  if(!r.ok){if(r.status===429)throw Error('Gemini quota is exhausted or requests are too frequent. Check your free-tier quota in AI Studio; Prism will not switch to another paid model.');if([401,403].includes(r.status))throw Error('Gemini rejected this key or its permissions. Check it in Google AI Studio.');if(r.status===404)throw Error('This Gemini model is unavailable. Choose the other model in AI connection.');throw Error(`Gemini could not complete the request (${r.status}). No draft was saved.`);}
  const data=await r.json(),candidate=data.candidates?.[0];
  if(candidate?.finishReason!=='STOP')throw Error('Gemini did not finish a complete response. Try again; no draft was saved.');
  const answer=candidate.content?.parts?.filter(p=>!p.thought&&p.text).map(p=>p.text).join('\n');
  if(!answer)throw Error('Gemini returned no usable answer.');
  return {text:answer,metadata:candidate.groundingMetadata||{}};
}
async function context(boardId=session().board_id){
  const s=session();let board=null;
  if(boardId){try{board=await host.api('/collections/'+boardId);}catch(e){if(e.status===404&&boardId===s.board_id){s.board_id=null;s.imports=[];s.ideas=null;persist();}throw e;}}
  const liveIds=new Set(board?.ads.map(a=>a.id)||[]);
  const removed=new Set(s.imports.filter(x=>!liveIds.has(x.ad_id)).map(x=>x.ref_id));
  const references=s.references.filter(r=>s.selected.includes(r.id)&&!removed.has(r.id)).map(({id,title,brand,region,url,kind,verification})=>({id,title,brand,region,url,kind,verification}));
  return {brief:{...s.brief},references,board:boardContext(board),web:s.web?{text:s.web.text,sources:s.web.sources}:null};
}
function settings(){host.openModal(`<div class="modal-header"><h2>Connect your creative assistant</h2><button data-action="close" aria-label="Close dialog">×</button></div><form id="ai-settings"><p>Use your own Gemini key. It stays in this page’s memory and goes directly to Google; Prism does not save it or send it to Cloudflare.</p><label for="gemini-key">Gemini API key</label><input id="gemini-key" type="password" autocomplete="off" required placeholder="Paste privately here"><label for="gemini-model">Model</label><select id="gemini-model"><option value="gemini-2.5-flash">Gemini 2.5 Flash</option><option value="gemini-2.5-flash-lite">Gemini 2.5 Flash-Lite</option></select><p class="hint">${link('https://aistudio.google.com/api-keys','Get a key in Google AI Studio')} · ${link('https://ai.google.dev/gemini-api/docs/pricing','Check current pricing')}<br>Use a project without paid billing for free-tier limits. Google controls quotas and may use free-tier inputs to improve its products. Do not send confidential copy unless appropriate. Reconnect after refreshing.</p><div class="modal-actions"><button type="button" data-studio="disconnect">Disconnect</button><button class="primary" type="submit">Connect Gemini</button></div></form>`);$('gemini-model').value=model;}
function mount(){
  if(!host?.user()){document.getElementById('prism-chat-root')?.remove();sessionKey='';scope='';active=null;messages=[];return;}
  initScope();
  if(active?.ideas?.needs_check&&!active.checking){const target=active;target.checking=true;host.api('/collections/'+target.board_id).then(board=>{if(board.revision!==target.ideas?.board_revision)target.ideas=null;else target.ideas.needs_check=false;}).catch(()=>{target.ideas=null;}).finally(()=>{target.checking=false;persist();render();});}
  let root=$('prism-chat-root');if(!root){root=document.createElement('aside');root.id='prism-chat-root';document.body.append(root);}
  root.innerHTML=`<button class="chat-launcher" data-studio="chat-toggle" aria-label="${chatOpen?'Close':'Open'} creative assistant" aria-expanded="${chatOpen}">✦ ${chatOpen?'Close':'Ask Prism'}</button>${chatOpen?`<section class="chat-panel" aria-label="Creative assistant"><header><div><b>Prism creative assistant</b><span>${sessionKey?'Gemini connected':'Connect Gemini to chat'}</span></div><button data-studio="chat-toggle" aria-label="Close assistant">×</button></header><div class="chat-messages" aria-live="polite">${!messages.length?'<div class="chat-message assistant">Tell me what you want to make. Try “Explain my visual groups”, “Make these ideas suitable for Pakistan”, or “Rewrite the headlines in Roman Urdu”. I use your campaign brief and connected board.</div>':messages.map(m=>`<div class="chat-message ${m.role}">${esc(m.text)}</div>`).join('')}${chatWorking?'<div class="chat-message assistant"><span class="spinner"></span> Thinking…</div>':''}</div><div class="chat-quick"><button data-studio="chat-prompt" data-prompt="Explain what the connected board tells us in simple language.">Explain my board</button><button data-studio="chat-prompt" data-prompt="Suggest three headline drafts in Roman Urdu for this brief, without inventing product benefits.">Roman Urdu hooks</button><button data-studio="settings">AI connection</button></div><form id="prism-chat-form"><label class="sr-only" for="chat-message">Message the creative assistant</label><textarea id="chat-message" rows="2" maxlength="2000" placeholder="Ask about your campaign…" required></textarea><button class="primary" ${chatWorking?'disabled':''}>Send →</button></form><p class="hint">Your message, brief and board text go to Google. Images stay here. Chat history clears on reload.</p></section>`:''}`;
  const list=root.querySelector('.chat-messages');if(list)list.scrollTop=list.scrollHeight;
}
async function chat(text){
  if(chatWorking)return;chatOpen=true;
  if(!sessionKey){messages.push({role:'assistant',text:'Connect Gemini using AI connection, then send your question. Your key is entered privately in Prism.'});mount();return;}
  const chatScope=scope,chatSession=active?.id;
  messages.push({role:'user',text});messages=messages.slice(-16);chatWorking=true;mount();
  try{const ctx=await context(host.view()==='board'?host.board()?.id:session().board_id);const result=await gemini(`Answer the latest user question using this context. Explain missing evidence. Do not claim to search the web on this call. Context: ${JSON.stringify(ctx)}\nRecent conversation: ${JSON.stringify(messages.slice(-8))}`);if(scope===chatScope&&active?.id===chatSession)messages.push({role:'assistant',text:result.text});}
  catch(e){if(scope===chatScope&&active?.id===chatSession)messages.push({role:'assistant',text:e.message});}finally{chatWorking=false;mount();}
}
document.addEventListener('submit',async event=>{
  if(event.target.id==='campaign-form'){event.preventDefault();try{collectBrief();persist();await job('Finding live product photographs…',async signal=>{const s=session(),result=await jsonRequest('/discover',s.brief,signal);s.references=result.references;s.discovery=result;s.selected=[];s.ideas=null;s.web=null;});}catch(e){displayError(e);}}
  if(event.target.id==='ai-settings'){event.preventDefault();sessionKey=$('gemini-key').value.trim();model=$('gemini-model').value;host.closeModal();render();}
  if(event.target.id==='prism-chat-form'){event.preventDefault();const text=$('chat-message').value.trim();if(text)await chat(text);}
});
document.addEventListener('change',event=>{
  if(event.target.dataset.ref){const s=session(),id=event.target.dataset.ref;s.selected=event.target.checked?[...new Set([...s.selected,id])]:s.selected.filter(x=>x!==id);s.ideas=null;persist();render();}
  if(event.target.id==='research-session'){if(working)return;active=saved.find(r=>r.id===event.target.value);error='';messages=[];render();}
  if(event.target.closest('#campaign-form')){try{collectBrief();session().ideas=null;persist();}catch{} }
});
document.addEventListener('click',async event=>{
  const button=event.target.closest('[data-studio]');if(!button)return;const action=button.dataset.studio;
  if(action==='cancel'){controller?.abort();return;}
  if(action==='settings'){settings();return;}
  if(action==='disconnect'){sessionKey='';host.closeModal();render();return;}
  if(action==='chat-toggle'){chatOpen=!chatOpen;mount();return;}
  if(action==='chat-prompt'){await chat(button.dataset.prompt);return;}
  if(working)return;
  try{
    if(action==='fresh'){active=null;session();saved=saved.slice(0,20);messages=[];error='';persist();render();}
    if(action==='delete'){host.openModal('<div class="modal-header"><h2>Delete this research?</h2></div><p>Your saved brief, source list and drafts will be removed. Its visual board stays available separately.</p><div class="modal-actions"><button data-action="close">Cancel</button><button class="danger" data-studio="confirm-delete">Delete research</button></div>');}
    if(action==='confirm-delete'){saved=saved.filter(r=>r.id!==active.id);active=saved[0]||null;session();persist();host.closeModal();render();}
    if(action==='links'){const brief=collectBrief();host.openModal(`<div class="modal-header"><h2>Find regional advertising examples</h2><button data-action="close" aria-label="Close dialog">×</button></div><p>These searches use your product, market and platform. In Meta Ad Library, check the country and platform filters before choosing examples. Search results do not prove an ad is running.</p><div class="external-searches">${researchLinks(brief).map(r=>link(r.url,r.title)).join('')}</div><p class="hint">Save an ad screenshot and its actual copy, then upload it to your board. Prism does not bypass login or scrape restricted Instagram pages.</p>`);}
    if(action==='select-all'){session().selected=session().references.map(r=>r.id);session().ideas=null;persist();render();}
    if(action==='open-board')await host.openBoard(session().board_id);
    if(action==='use-board'){const boards=host.boards();if(!boards.length)throw Error('Create a board first, then connect it here.');host.openModal(`<div class="modal-header"><h2>Connect a visual board</h2><button data-action="close" aria-label="Close dialog">×</button></div><div class="external-searches">${boards.map(b=>`<button data-studio="connect-board" data-board="${esc(b.id)}">${esc(b.name)} · ${b.count} images</button>`).join('')}</div>`);}
    if(action==='connect-board'){session().board_id=button.dataset.board;session().imports=[];session().ideas=null;persist();host.closeModal();render();}
    if(action==='web'){collectBrief();persist();await job('Searching public web sources with Gemini…',async signal=>{const s=session();const result=await gemini(`Use Google Search to research public examples and product positioning for this brief: ${JSON.stringify(s.brief)}. Prioritize official brand pages, accessible Instagram posts and Meta Ad Library entries. Separate verified ad entries from organic posts and product listings. Never claim a Pakistan Instagram campaign from a brand's location. Provide a concise summary of useful references, observed messaging and gaps, with citations. Do not invent example images or engagement metrics.`,{grounded:true,signal});const md=result.metadata;const sources=(md.groundingChunks||[]).flatMap(c=>safeLink(c.web?.uri)?[{id:s.id+':web:'+(c.web.uri),title:String(c.web.title||'Web source').slice(0,300),url:safeLink(c.web.uri)}]:[]);if(!sources.length||!md.searchEntryPoint?.renderedContent)throw Error('Gemini supplied no search sources or search suggestions. This response was not saved as web research; try again.');s.web={text:result.text,sources,queries:(md.webSearchQueries||[]).slice(0,10),search_suggestions:String(md.searchEntryPoint?.renderedContent||"").slice(0,64000),supports:groundedSegments(result.text,md),retrieved_at:new Date().toISOString()};s.ideas=null;});}
    if(action==='import'){collectBrief();persist();await job('Importing selected photographs for local CLIP analysis…',async signal=>{
      const s=session(),refs=s.references.filter(r=>s.selected.includes(r.id));if(!refs.length)throw Error('Select at least one reference.');
      const board=s.board_id?await host.api('/collections/'+s.board_id):await host.api('/collections',{method:'POST',body:{name:`${s.brief.product} · ${s.brief.region==='PK'?'Pakistan':'Global'} references`.slice(0,100)}});s.board_id=board.id;persist();
      const liveIds=new Set(board.ads.map(a=>a.id)),existing=new Set(s.imports.filter(i=>liveIds.has(i.ad_id)).map(i=>i.ref_id));const pending=refs.filter(r=>!existing.has(r.id));
      if(!pending.length)throw Error('These references are already on the connected board. Open it to inspect the groups.');
      if(board.count+pending.length>100)throw Error('The connected board would exceed 100 images. Select fewer references.');
      const data=new FormData(),names=[];
      for(const r of pending){if(signal.aborted)throw new DOMException('Cancelled','AbortError');const response=await fetch(imageEndpoint(r.image),{signal});if(!response.ok)throw Error(`Could not download ${r.brand}'s image. Existing boards are retained.`);const blob=await response.blob();const ext={'image/jpeg':'jpg','image/png':'png','image/webp':'webp'}[blob.type];if(!ext||blob.size>10*1024*1024)throw Error('The source image is not supported.');const filename=`reference-${crypto.randomUUID().slice(0,8)}.${ext}`;names.push({ref:r,filename});data.append('files',new File([blob],filename,{type:blob.type}));}
      data.append('copy_json','{}'); // Product titles are deliberately not invented ad copy.
      const result=await host.api(`/collections/${board.id}/upload`,{method:'POST',body:data,headers:{'Idempotency-Key':crypto.randomUUID()}});
      const updated=await host.api('/collections/'+board.id);for(const item of names){const ad=updated.ads.find(a=>a.filename===item.filename);if(ad)s.imports.push({ref_id:item.ref.id,ad_id:ad.id,filename:item.filename,title:item.ref.title,url:item.ref.url,kind:'product_reference'});}
      s.ideas=null;persist();await host.refreshBoards();if(result.rejected.length)throw Error(`${result.accepted.length} images saved; ${result.rejected.length} rejected. Open the board to inspect.`);
    });}
    if(action==='ideas'){collectBrief();persist();await job('Turning your brief and CLIP evidence into three concepts…',async signal=>{const s=session(),ctx=await context();if(ctx.board&&!ctx.board.analysis_current)throw Error('The connected board has not finished its current analysis. Open the board and complete analysis before drafting from it.');const result=await gemini(ideaPrompt(ctx),{structured:true,signal});const allowed=[...ctx.references.map(r=>r.id),...(ctx.web?.sources.map(r=>r.id)||[]),...(ctx.board?.creatives.map(a=>a.id)||[])];const parsed=parseIdeas(result.text,allowed);const after=await context();if(JSON.stringify(after)!==JSON.stringify(ctx))throw Error('Your research or board changed during drafting. Try again with the current evidence.');s.ideas={...parsed,brief:{...s.brief},board_revision:ctx.board?.revision||null,method:model,created_at:new Date().toISOString()};});}
    if(action==='copy'){const idea=currentIdeas()?.ideas[Number(button.dataset.index)];if(idea)await navigator.clipboard.writeText(Object.entries(idea).filter(([k])=>k!=='source_ids').map(([k,v])=>`${k.replaceAll('_',' ')}: ${v}`).join('\n\n'));host.toast('Concept copied.');}
    if(action==='export'){if($('campaign-form'))collectBrief();persist();const data={schema:'prism/research-export/1',...session(),note:'Contains briefs, source URLs, provenance and AI drafts. No API keys or original images. Product references are not verified paid ads.'};const url=URL.createObjectURL(new Blob([JSON.stringify(data,null,2)],{type:'application/json'}));const a=document.createElement('a');a.href=url;a.download='prism-campaign-research.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
  }catch(e){displayError(e);}
});
window.prismStudio={html,mount,openForBoard(id){session().board_id=id;session().imports=[];session().ideas=null;persist();},forgetBoard(id){for(const s of saved)if(s.board_id===id){s.board_id=null;s.imports=[];s.ideas=null;}persist();}};
function connect(){host=window.prismStudioHost;if(host){render();}else document.addEventListener('prism-host-ready',()=>{host=window.prismStudioHost;render();},{once:true});}
connect();
