import {safeLink,validateBrief,researchLinks,parseIdeas,boardContext,groundedSegments,SYSTEM,ideaPrompt} from './research-core.mjs';
import {listModels,generationConfig,providerError,checkGrounding} from './gemini-client.mjs';
import {studioView} from './studio-view.mjs';

const $=id=>document.getElementById(id);
const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const emptyBrief=()=>({product:'',region:'PK',platform:'Instagram',audience:'',goal:'Get people to visit the product page',language:'English + Roman Urdu',claims:'',query:''});
let stage='brief';
let host,sessionKey='',model='',availableModels=[],groundingEnabled=false,scope='',saved=[],active=null,working=false,step='',error='',chatOpen=false,messages=[],chatWorking=false;
const storageKey=()=>`prism-studio-v1:${scope}`;
let syncTimer,pendingSync=new Map();
const account=()=>window.prismCloud?.user();
function accountPayload(s){
 const ctx=host.board()?.id===s.board_id?boardContext(host.board()):s.board_snapshot||null;
 return {...s,board_snapshot:ctx,local_device:undefined,checking:undefined};
}
function persist(){
 try{localStorage.setItem(storageKey(),JSON.stringify(saved));}catch{error='Your browser could not save this research. Export it before closing.';}
 if(account()&&active){pendingSync.set(active.id,JSON.parse(JSON.stringify(accountPayload(active))));clearTimeout(syncTimer);syncTimer=setTimeout(()=>{const tasks=[...pendingSync.values()];pendingSync.clear();for(const s of tasks)window.prismCloud.syncCampaign(s).catch(e=>{error=e.message;render();});},700);}
}
function initScope(){
  const user=host.user();if(!user)return;
  const next=user.id||user.name;
  if(scope!==next){
   stage='brief';scope=next;sessionKey='';model='';availableModels=[];groundingEnabled=false;messages=[];active=null;saved=[];clearTimeout(syncTimer);pendingSync.clear();
   try{const data=account()?window.prismCloud.cached():JSON.parse(localStorage.getItem(storageKey())||'[]');if(Array.isArray(data))saved=JSON.parse(JSON.stringify(data.slice(0,account()?50:20)));for(const r of saved){if(r.ideas?.board_revision&&!account())r.ideas.needs_check=true;delete r.checking;if(account()){r.board_id=null;r.imports=[];}}}catch{}
   active=saved[0]||null;const connection=account()?.providers?.gemini;
   if(connection){sessionKey='account-vault';model=connection.model;availableModels=[{id:model,label:model}];}
  }
}
function session(){if(!active){active={id:crypto.randomUUID(),brief:emptyBrief(),references:[],selected:[],board_id:null,imports:[],ideas:null,web:null,created_at:new Date().toISOString()};saved.unshift(active);}return active;}
function render(){host.render();}
function displayError(e){error=e.name==='AbortError'||e.name==='TimeoutError'?'The request timed out. Your previous results are saved; try again.':e.message;render();}
function readBrief(){return validateBrief(Object.fromEntries(new FormData($('campaign-form'))));}
function collectBrief(){if($('campaign-form'))session().brief=readBrief();return session().brief;}
function imageEndpoint(url){return '/api/reference-image?url='+encodeURIComponent(url);}
function link(url,label){const safe=safeLink(url);return safe?`<a href="${esc(safe)}" target="_blank" rel="noopener noreferrer">${esc(label)}</a>`:'';}
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
  return studioView({s:{...s,saved},ideas,stage,working,step,error,connected:!!sessionKey},{esc,link,imageEndpoint,searchSuggestions,field,select});
}
function saveVisibleBrief(){
  if(!$('campaign-form'))return;
  const s=session(),draft={...s.brief,...Object.fromEntries(new FormData($('campaign-form')))};
  if(JSON.stringify(draft)!==JSON.stringify(s.brief)){s.brief=draft;s.ideas=null;persist();}
}
function changeStage(next,{focus=false}={}){
  if(working||!['brief','references','concepts'].includes(next))return;
  saveVisibleBrief();stage=next;render();
  if(focus)$('campaign-tab-'+next)?.focus();
}

let controller;
async function job(label,fn){if(working)return;working=true;error='';step=label;controller=new AbortController();render();try{await fn(controller.signal);}catch(e){displayError(e);}finally{working=false;step='';controller=null;persist();render();}}
async function jsonRequest(path,body,signal){
  const response=await host.api(path,{method:'POST',body,signal});return response;
}
async function gemini(text,{grounded=false,structured=false,signal}={}){
  if(account())return window.prismCloud.call('/gemini/generate',{method:'POST',body:{text,structured,grounded,groundingEnabled},signal});
  if(!sessionKey)throw Error('Open AI connection and connect a Gemini API key first.');
  if(sessionKey.length<20)throw Error('This API key appears incomplete. Reconnect Gemini.');
  const requestModel=model;
  if(grounded)checkGrounding(requestModel,groundingEnabled);
  const body={systemInstruction:{parts:[{text:SYSTEM}]},contents:[{role:'user',parts:[{text}]}],generationConfig:generationConfig(requestModel,structured)};
  if(grounded)body.tools=[{google_search:{}}];
  if(structured)body.generationConfig.responseMimeType='application/json';
  const timeout=AbortSignal.timeout(90000),combined=signal?AbortSignal.any([signal,timeout]):timeout;
  const r=await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${requestModel}:generateContent`,{method:'POST',headers:{'Content-Type':'application/json','x-goog-api-key':sessionKey},body:JSON.stringify(body),signal:combined});
  if(!r.ok)throw await providerError(r,{grounded});
  const data=await r.json(),candidate=data.candidates?.[0];
  if(candidate?.finishReason!=='STOP')throw Error('Gemini did not finish a complete response. Try again; no draft was saved.');
  const answer=candidate.content?.parts?.filter(p=>!p.thought&&p.text).map(p=>p.text).join('\n');
  if(!answer)throw Error('Gemini returned no usable answer.');
  return {text:answer,metadata:candidate.groundingMetadata||{},model:requestModel};
}
async function context(boardId=session().board_id){
  const s=session();let board=null;
  if(boardId){try{board=await host.api('/collections/'+boardId);}catch(e){if(e.status===404&&boardId===s.board_id){s.board_id=null;s.imports=[];s.ideas=null;persist();}throw e;}}
  const liveIds=new Set(board?.ads.map(a=>a.id)||[]);
  const removed=new Set(s.imports.filter(x=>!liveIds.has(x.ad_id)).map(x=>x.ref_id));
  const references=s.references.filter(r=>s.selected.includes(r.id)&&!removed.has(r.id)).map(({id,title,brand,region,url,kind,verification})=>({id,title,brand,region,url,kind,verification}));
  return {brief:{...s.brief},references,board:boardContext(board),saved_board_snapshot:!board&&s.board_snapshot?{...s.board_snapshot,analysis_current:false,note:'Saved text snapshot, not a current analysis on this device.'}:null,web:s.web?{text:s.web.text,sources:s.web.sources}:null};
}
function settings(){
  host.openModal(`<div class="modal-header"><h2>Connect your creative assistant</h2><button data-action="close" aria-label="Close dialog">×</button></div><form id="ai-settings"><p>${account()?'Your saved Gemini key is encrypted in your Google-linked Prism account. Leave the field blank to keep it, or enter a new key privately to replace it. Model calls use the saved key server-side.':"Enter your Gemini key privately, load Google?s model list, then choose a model. In device mode your key stays in memory and clears on refresh."}</p><label for="gemini-key">Gemini API key</label><input id="gemini-key" type="password" autocomplete="off" ${account()?'':'required'} placeholder="${account()?'Leave blank to keep saved key':'Paste privately here'}"><button type="button" data-studio="load-models">Load available models</button><p id="model-status" class="hint" role="status"></p><label for="gemini-model">Flash text model</label><select id="gemini-model" required></select><p class="hint">Models shown are reported by Google for this key; generation access and free quota still depend on your project. Flash-Lite is suitable for short copy and chat.</p><label class="ai-grounding-option"><input id="gemini-grounding" type="checkbox"> Enable Gemini web search for this session</label><p class="hint">Google Search is separate from text generation and is unavailable on the newer models' API free tier. A billed project may incur search and text charges. Leave this off for the free route: product references, regional search links, CLIP, chat and concept drafts.</p><p class="hint">${link('https://aistudio.google.com/api-keys','Get a key in Google AI Studio')} · ${link('https://ai.google.dev/gemini-api/docs/pricing','Check current pricing')}<br>Use a project without paid billing for free-tier limits. Prism cannot read your billing status. Google controls quotas and may use free-tier inputs to improve its products. Reconnect after refreshing.</p><div class="modal-actions"><button type="button" data-studio="disconnect">${account()?'Remove saved Gemini key':'Disconnect'}</button><button id="connect-gemini" class="primary" type="submit">${account()?'Save connection':'Connect selected model'}</button></div></form>`);
  const form=$('ai-settings');form.loadedKey=account()?'':sessionKey;form.models=availableModels;form.loading=false;
  $('gemini-key').value=account()?'':sessionKey;$('gemini-grounding').checked=groundingEnabled;
  populateModels(form.models,model);
  $('model-status').textContent=form.models.length?'Models loaded. Choose one and connect.':'Load the model list using your key. No AI generation is run during discovery.';
}
function populateModels(models,selected=''){
  $('gemini-model').innerHTML='<option value="">Choose a listed model</option>'+models.map(m=>`<option value="${esc(m.id)}">${esc(m.label)} (${esc(m.id)})</option>`).join('');
  $('gemini-model').value=selected;$('gemini-model').disabled=!models.length;
}
function clearConnectionForm(){
  const form=$('ai-settings');if(!form)return;
  form.loadedKey='';form.models=[];$('gemini-key').value='';
}
async function loadConnectionModels(){
  const form=$('ai-settings');if(!form||form.loading)return;
  const key=$('gemini-key').value.trim(),connectionScope=scope;
  form.loading=true;form.loadedKey='';form.models=[];populateModels([]);
  const status=$('model-status'),load=form.querySelector('[data-studio="load-models"]');
  load.disabled=true;$('connect-gemini').disabled=true;status.textContent='Checking models with Google...';
  try{
    const models=account()?(await window.prismCloud.call('/gemini/models',{method:'POST',body:{key}})).models:await listModels(key);
    if($('ai-settings')!==form||$('gemini-key').value.trim()!==key||scope!==connectionScope)return;
    form.loadedKey=key;form.models=models;populateModels(models,key===sessionKey?model:'');
    status.textContent=`Google listed ${models.length} compatible models. Choose one, then connect. Listing a model does not guarantee free quota.`;
  }catch(e){if($('ai-settings')===form&&scope===connectionScope)status.textContent=e.name==='TimeoutError'?'Model discovery timed out. Try loading again.':e.message;}
  finally{form.loading=false;if($('ai-settings')===form){load.disabled=false;$('connect-gemini').disabled=false;}}
}

function mount(){
  if(!host?.user()){document.getElementById('prism-chat-root')?.remove();clearConnectionForm();sessionKey='';model='';availableModels=[];groundingEnabled=false;scope='';active=null;messages=[];return;}
  initScope();
  if(active?.ideas?.needs_check&&!active.checking){const target=active;target.checking=true;host.api('/collections/'+target.board_id).then(board=>{if(board.revision!==target.ideas?.board_revision)target.ideas=null;else target.ideas.needs_check=false;}).catch(()=>{target.ideas=null;}).finally(()=>{target.checking=false;persist();render();});}
  let root=$('prism-chat-root');if(!root){root=document.createElement('aside');root.id='prism-chat-root';document.body.append(root);}
  root.innerHTML=`<button class="chat-launcher" data-studio="chat-toggle" aria-label="${chatOpen?'Close':'Open'} creative assistant" aria-expanded="${chatOpen}">${chatOpen?'Close':'Ask Prism'}</button>${chatOpen?`<section class="chat-panel" aria-label="Creative assistant"><div class="assistant-label">CAMPAIGN ASSISTANT</div><header><div><b>Prism creative assistant</b><span>${sessionKey?'Gemini connected':'Connect Gemini to chat'}</span></div><button data-studio="chat-toggle" aria-label="Close assistant">×</button></header><div class="chat-messages" aria-live="polite">${!messages.length?'<div class="chat-message assistant">Ask about your image groups, draft a headline in Roman Urdu, or refine a concept. I use your campaign brief and selected board; I do not run ads.</div>':messages.map(m=>`<div class="chat-message ${m.role}">${esc(m.text)}</div>`).join('')}${chatWorking?'<div class="chat-message assistant"><span class="loading-mark" aria-hidden="true"></span> Thinking...</div>':''}</div><div class="chat-quick"><button data-studio="chat-prompt" data-prompt="Explain what the connected board tells us in simple language.">Explain my board</button><button data-studio="chat-prompt" data-prompt="Suggest three headline drafts in Roman Urdu for this brief, without inventing product benefits.">Roman Urdu hooks</button><button data-studio="settings">AI connection</button></div><form id="prism-chat-form"><label class="sr-only" for="chat-message">Message the creative assistant</label><textarea id="chat-message" rows="2" maxlength="2000" placeholder="Ask about your campaign..." required></textarea><button class="primary" ${chatWorking?'disabled':''}>Send </button></form><p class="hint">Your message, brief and board text go to Google. Images stay here. Chat history clears on reload.</p></section>`:''}`;
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
async function designPrompts(index){
 const idea=currentIdeas()?.ideas[index];if(!idea)throw Error('Draft a current concept first.');
 let completed=false;await job('Writing two image-generation prompts…',async signal=>{
  const s=session(),result=await gemini(`Create exactly two distinct product-ad image prompts based on this approved creative idea and brief. Return JSON {"prompts":["...","..."]}, each 10–3000 characters. Brief: ${JSON.stringify(s.brief)}. Idea: ${JSON.stringify(idea)}. Describe composition, product placement, backdrop, lighting and room for the headline in 4:5 format. These are conceptual mockups, not packaging-accurate renders: no product reference pixels are sent to this call. Never invent product benefits, discounts, certification marks or readable packaging details. Avoid fake before/after proof. Explain that the user must replace placeholder packaging with their real product before publishing.`,{structured:true,signal});
  let data;try{data=JSON.parse(result.text);}catch{throw Error('Gemini returned invalid prompt JSON. Nothing was saved.');}
  if(!Array.isArray(data.prompts)||data.prompts.length!==2||data.prompts.some(p=>typeof p!=='string'||p.length<10||p.length>3000))throw Error('Gemini did not return two usable image prompts.');
  if(currentIdeas()?.ideas[index]!==idea)throw Error('This concept changed while prompts were generated. Draft current prompts again.');s.design_prompts={idea_index:index,idea_title:idea.title,prompts:data.prompts,created_at:new Date().toISOString()};completed=true;persist();
 });
 if(completed)showDesignPrompts();
}
function showDesignPrompts(){
 const p=session().design_prompts;if(!p)return;
 host.openModal(`<div class="modal-header"><h2>Review product-design prompts</h2><button data-action="close" aria-label="Close dialog">×</button></div><p>Two visual directions for ${esc(p.idea_title)}. Edit the prompts before generating. These create conceptual mockups; accurate product packaging needs your real product artwork.</p><form id="design-form">${p.prompts.map((text,i)=>`<label for="design-prompt-${i}">Design ${i+1}</label><textarea id="design-prompt-${i}" maxlength="3000" rows="5">${esc(text)}</textarea>`).join('')}<label for="design-count">How many designs?</label><select id="design-count"><option value="1">One design</option><option value="2">Two designs</option></select><label class="ai-grounding-option"><input type="checkbox" id="confirm-design-usage" required>I want to generate using my image-provider credits.</label><p class="hint">${account()?'Uses the Muapi model saved in account connections. Each image is a separate generation request. No automatic submission retry.':'Google sign-in and an image-provider connection are needed for in-app generation. You can copy these prompts and use them in Open-Higgsfield separately.'}</p><div class="modal-actions"><button type="button" data-studio="copy-prompts">Copy prompts</button><button class="primary" ${account()?'':'disabled'}>Generate selected designs</button></div><div id="design-status" class="hint" role="status"></div></form>`);
}
window.addEventListener('beforeunload',event=>{if(pendingSync.size||window.prismCloud?.busy()){event.preventDefault();event.returnValue='';}});
document.addEventListener('keydown',event=>{
  const tab=event.target.closest('[role="tab"][data-stage]');if(!tab)return;
  const stages=['brief','references','concepts'],index=stages.indexOf(tab.dataset.stage);
  let next;if(event.key==='ArrowRight')next=stages[(index+1)%3];if(event.key==='ArrowLeft')next=stages[(index+2)%3];if(event.key==='Home')next=stages[0];if(event.key==='End')next=stages[2];
  if(next){event.preventDefault();changeStage(next,{focus:true});}
});
document.addEventListener('submit',async event=>{
  if(event.target.id==='design-form'){
   event.preventDefault();const status=$('design-status'),button=event.target.querySelector('button.primary');button.disabled=true;
   try{
    if(!account())throw Error('Sign in with Google and save an image-provider connection first.');
    const s=session(),count=Number($('design-count').value),prompts=[0,1].map(i=>$('design-prompt-'+i).value.trim());
    if(![1,2].includes(count)||prompts.slice(0,count).some(p=>p.length<10||p.length>3000))throw Error('Review one or two usable prompts first.');
    if(!$('confirm-design-usage').checked)throw Error('Confirm image-provider usage first.');
    s.design_prompts={...s.design_prompts,prompts};persist();await window.prismCloud.syncCampaign(accountPayload(s));const requests=[];
    for(let i=0;i<count;i++){
     // Keep idempotency keys with the form; retrying an uncertain call reuses it.
     const key=event.target['requestKey'+i] ||= crypto.randomUUID();
     const job=await window.prismCloud.call('/designs',{method:'POST',headers:{'Idempotency-Key':key},body:{campaign_id:s.id,prompt:prompts[i],confirm_provider_usage:true}});requests.push(job);
     if(['needs_attention','submitting'].includes(job.status))throw Error('Generation submission is uncertain. Check provider history; this request will not be resubmitted.');
    }
    host.closeModal();await window.prismCloud.listDesigns(s.id);
   }catch(e){status.textContent=e.message;if(button.isConnected)button.disabled=false;}
  }
  if(event.target.id==='campaign-form'){event.preventDefault();try{collectBrief();persist();stage='references';await job('Finding live product photographs…',async signal=>{const s=session(),result=await jsonRequest('/discover',s.brief,signal);s.references=result.references;s.discovery=result;s.selected=[];s.ideas=null;s.web=null;});}catch(e){displayError(e);}}
  if(event.target.id==='ai-settings'){
    event.preventDefault();const form=event.target,key=$('gemini-key').value.trim(),selected=$('gemini-model').value;
    if(form.loading)return;
    if(form.loadedKey!==key||!form.models?.length){await loadConnectionModels();return;}
    if(!form.models.some(m=>m.id===selected)){$('model-status').textContent='Choose a listed model before connecting.';return;}
    if(account()){if(key)await window.prismCloud.call('/keys/gemini',{method:'PUT',body:{key,model:selected}});else await window.prismCloud.call('/gemini/model',{method:'PUT',body:{model:selected}});await window.prismCloud.refresh();}
    sessionKey=account()?'account-vault':key;model=selected;availableModels=form.models;groundingEnabled=$('gemini-grounding').checked;error='';clearConnectionForm();host.closeModal();render();
  }
  if(event.target.id==='prism-chat-form'){event.preventDefault();const text=$('chat-message').value.trim();if(text)await chat(text);}
});
document.addEventListener('close',event=>{if(event.target.id==='modal'&&!event.target.open)clearConnectionForm();},true);
document.addEventListener('input',event=>{
  if(event.target.id==='gemini-key'){const form=$('ai-settings');form.loadedKey='';form.models=[];populateModels([]);$('model-status').textContent='Key changed. Load its model list before connecting.';}
});
document.addEventListener('change',event=>{
  if(event.target.dataset.ref){const s=session(),id=event.target.dataset.ref;s.selected=event.target.checked?[...new Set([...s.selected,id])]:s.selected.filter(x=>x!==id);s.ideas=null;persist();render();[...document.querySelectorAll('[data-ref]')].find(node=>node.dataset.ref===id)?.focus();}
  if(event.target.id==='research-session'){if(working)return;saveVisibleBrief();stage='brief';active=saved.find(r=>r.id===event.target.value);error='';messages=[];render();}
  if(event.target.closest('#campaign-form')){try{collectBrief();session().ideas=null;persist();}catch{} }
});
document.addEventListener('click',async event=>{
  const button=event.target.closest('[data-studio]');if(!button)return;const action=button.dataset.studio;
  if(action==='cancel'){controller?.abort();return;}
  if(action==='stage'){changeStage(button.dataset.stage,{focus:true});return;}
  if(action==='settings'){settings();return;}
  if(action==='load-models'){await loadConnectionModels();return;}
  if(action==='disconnect'){if(account()){try{await window.prismCloud.call('/keys/gemini',{method:'DELETE'});await window.prismCloud.refresh();}catch(e){displayError(e);return;}}sessionKey='';model='';availableModels=[];groundingEnabled=false;clearConnectionForm();host.closeModal();render();return;}
  if(action==='chat-toggle'){chatOpen=!chatOpen;mount();return;}
  if(action==='chat-prompt'){await chat(button.dataset.prompt);return;}
  if(working)return;
  try{
    if(action==='reach'){collectBrief();persist();stage='references';await job('Finding public web sources with Agent Reach…',async signal=>{const s=session();const result=account()?await window.prismCloud.call('/research',{method:'POST',body:{brief:s.brief},signal}):await jsonRequest('/research/search',s.brief,signal);s.web=result;s.ideas=null;});}
    if(action==='save-idea'){const idea=currentIdeas()?.ideas[Number(button.dataset.index)];if(!idea)throw Error('Draft a current concept first.');if(!account())throw Error('Sign in with Google to save individual ideas to your account. The campaign draft is already kept on this device.');await window.prismCloud.saveIdea(accountPayload(session()),idea);host.toast('Idea saved to your account.');}
    if(action==='design-prompts')await designPrompts(Number(button.dataset.index));
    if(action==='copy-prompts'){await navigator.clipboard.writeText([0,1].map(i=>$('design-prompt-'+i).value).join('\n\n'));host.toast('Design prompts copied.');}
    if(action==='example'){session().brief={...emptyBrief(),product:'Anti-frizz shampoo',query:'shampoo'};session().ideas=null;persist();render();return;}
    if(action==='fresh'){stage='brief';active=null;session();saved=saved.slice(0,account()?50:20);messages=[];error='';persist();render();}
    if(action==='delete'){host.openModal('<div class="modal-header"><h2>Delete this research?</h2></div><p>Your saved brief, source list and drafts will be removed. Its visual board stays available separately.</p><div class="modal-actions"><button data-action="close">Cancel</button><button class="danger" data-studio="confirm-delete">Delete research</button></div>');}
    if(action==='confirm-delete'){if(account()){clearTimeout(syncTimer);pendingSync.delete(active.id);await window.prismCloud.removeCampaign(active.id);}saved=saved.filter(r=>r.id!==active.id);active=saved[0]||null;session();persist();host.closeModal();render();}
    if(action==='links'){const brief=collectBrief();host.openModal(`<div class="modal-header"><h2>Find regional advertising examples</h2><button data-action="close" aria-label="Close dialog">×</button></div><p>These searches use your product, market and platform. In Meta Ad Library, check the country and platform filters before choosing examples. Search results do not prove an ad is running.</p><div class="external-searches">${researchLinks(brief).map(r=>link(r.url,r.title)).join('')}</div><p class="hint">Save an ad screenshot and its actual copy, then upload it to your board. Prism does not bypass login or scrape restricted Instagram pages.</p>`);}
    if(action==='select-all'){session().selected=session().references.map(r=>r.id);session().ideas=null;persist();render();}
    if(action==='open-board')await host.openBoard(session().board_id);
    if(action==='use-board'){const boards=host.boards();if(!boards.length)throw Error('Create a board first, then connect it here.');host.openModal(`<div class="modal-header"><h2>Connect a visual board</h2><button data-action="close" aria-label="Close dialog">×</button></div><div class="external-searches">${boards.map(b=>`<button data-studio="connect-board" data-board="${esc(b.id)}">${esc(b.name)} · ${b.count} images</button>`).join('')}</div>`);}
    if(action==='connect-board'){session().board_id=button.dataset.board;session().imports=[];session().ideas=null;persist();host.closeModal();render();}
    if(action==='web'){collectBrief();persist();stage='references';await job('Searching public web sources with Gemini…',async signal=>{const s=session();const result=await gemini(`Use Google Search to research public examples and product positioning for this brief: ${JSON.stringify(s.brief)}. Prioritize official brand pages, accessible Instagram posts and Meta Ad Library entries. Separate verified ad entries from organic posts and product listings. Never claim a Pakistan Instagram campaign from a brand's location. Provide a concise summary of useful references, observed messaging and gaps, with citations. Do not invent example images or engagement metrics.`,{grounded:true,signal});const md=result.metadata;const sources=(md.groundingChunks||[]).flatMap(c=>safeLink(c.web?.uri)?[{id:s.id+':web:'+(c.web.uri),title:String(c.web.title||'Web source').slice(0,300),url:safeLink(c.web.uri)}]:[]);if(!sources.length||!md.searchEntryPoint?.renderedContent)throw Error('Gemini supplied no search sources or search suggestions. This response was not saved as web research; try again.');s.web={text:result.text,sources,queries:(md.webSearchQueries||[]).slice(0,10),search_suggestions:String(md.searchEntryPoint?.renderedContent||"").slice(0,64000),supports:groundedSegments(result.text,md),retrieved_at:new Date().toISOString()};s.ideas=null;});}
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
    if(action==='ideas'){collectBrief();persist();stage='concepts';await job('Turning your brief and CLIP evidence into three concepts…',async signal=>{const s=session(),ctx=await context();if(ctx.board&&!ctx.board.analysis_current)throw Error('The connected board has not finished its current analysis. Open the board and complete analysis before drafting from it.');const result=await gemini(ideaPrompt(ctx),{structured:true,signal});const allowed=[...ctx.references.map(r=>r.id),...(ctx.web?.sources.map(r=>r.id)||[]),...(ctx.board?.creatives.map(a=>a.id)||[])];const parsed=parseIdeas(result.text,allowed);const after=await context();if(JSON.stringify(after)!==JSON.stringify(ctx))throw Error('Your research or board changed during drafting. Try again with the current evidence.');s.ideas={...parsed,brief:{...s.brief},board_revision:ctx.board?.revision||null,method:result.model,created_at:new Date().toISOString()};});}
    if(action==='copy'){const idea=currentIdeas()?.ideas[Number(button.dataset.index)];if(idea)await navigator.clipboard.writeText(Object.entries(idea).filter(([k])=>k!=='source_ids').map(([k,v])=>`${k.replaceAll('_',' ')}: ${v}`).join('\n\n'));host.toast('Concept copied.');}
    if(action==='export'){if($('campaign-form'))collectBrief();persist();const data={schema:'prism/research-export/1',...session(),note:'Contains briefs, source URLs, provenance and AI drafts. No API keys or original images. Product references are not verified paid ads.'};const url=URL.createObjectURL(new Blob([JSON.stringify(data,null,2)],{type:'application/json'}));const a=document.createElement('a');a.href=url;a.download='prism-campaign-research.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
  }catch(e){displayError(e);}
});
window.prismStudio={html,mount,campaigns:()=>{initScope();return saved;},newCampaign(){if(working)return;stage='brief';active=null;session();saved=saved.slice(0,account()?50:20);persist();host.openStudio();},openCampaign(id,payload){if(working)return;saveVisibleBrief();if(payload){const item={...payload,board_id:null,imports:[]};saved=[item,...saved.filter(r=>r.id!==id)];active=item;}else active=saved.find(r=>r.id===id)||null;stage='brief';messages=[];error='';host.openStudio();},connectionLabel:()=>{initScope();return sessionKey?'AI connected':'Connect Gemini';},openForBoard(id){stage='references';session().board_id=id;session().imports=[];session().ideas=null;persist();},forgetBoard(id){for(const s of saved)if(s.board_id===id){s.board_id=null;s.imports=[];s.ideas=null;}persist();}};
function connect(){host=window.prismStudioHost;if(host){render();}else document.addEventListener('prism-host-ready',()=>{host=window.prismStudioHost;render();},{once:true});}
connect();
