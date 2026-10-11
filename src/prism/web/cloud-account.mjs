// No provider key is returned by the account API or stored in browser storage.
const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let user=null,config={},campaigns=[],cache=[],versions=new Map(),queues=new Map(),syncStatus='On this device',dashboardError='',pending=0;
export async function call(path,options={}){
 const headers={...(options.headers||{})};if(user?.csrf)headers['X-CSRF-Token']=user.csrf;
 let data=options.body;if(data!==undefined&&!(data instanceof Blob)){headers['Content-Type']='application/json';data=JSON.stringify(data);}
 const response=await fetch('/api/cloud'+path,{...options,headers,body:data,credentials:'same-origin'});
 const result=await response.json();if(!response.ok){const error=Error(result.detail||'Account request failed.');error.status=response.status;throw error;}return result;
}
const changed=()=>document.dispatchEvent(new Event('prism-cloud-change'));
async function refresh(){if(!user)return;const [list,providers]=await Promise.all([call('/campaigns'),call('/keys')]);campaigns=list.campaigns;user.providers=providers;changed();}
async function init(){
 try{config=await call('/config');if(config.accounts_ready){try{user=await call('/auth/me');await refresh();cache=await loadCampaigns(false);}catch(e){if(e.status!==401)dashboardError=e.message;}}}catch{}
 return {user,config};
}
function syncCampaign(payload){
 if(!user)return Promise.resolve(null);const id=payload.id,snapshot=JSON.parse(JSON.stringify(payload)),owner=user.id;
 const previous=queues.get(id)||Promise.resolve();pending++;syncStatus='Saving campaign…';changed();
 const task=previous.catch(()=>{}).then(async()=>{
  if(user?.id!==owner)throw Error('The signed-in account changed. Save again in the current account.');
  const result=await call('/campaigns/'+encodeURIComponent(id),{method:'PUT',body:{payload:snapshot,version:versions.get(id)||0}});
  versions.set(id,result.version);syncStatus='Saved to your account';
  const item={id,title:snapshot.brief?.product||'Untitled campaign',version:result.version,updated_at:result.updated_at};campaigns=[item,...campaigns.filter(c=>c.id!==id)];changed();return result;
 }).catch(e=>{syncStatus='Local draft retained; account save needs attention';dashboardError=e.message;changed();throw e;}).finally(()=>{pending--;});
 queues.set(id,task);return task;
}
async function getCampaign(id){const result=await call('/campaigns/'+encodeURIComponent(id));versions.set(id,result.version);return result.payload;}
async function loadCampaigns(reload=true){if(!user)return [];if(reload)await refresh();const result=[];for(let i=0;i<campaigns.length;i+=5)result.push(...await Promise.all(campaigns.slice(i,i+5).map(item=>getCampaign(item.id))));return result;}
async function removeCampaign(id){if(!user)return;await queues.get(id)?.catch(()=>{});if(!versions.has(id)&&!campaigns.some(c=>c.id===id))return;await call('/campaigns/'+encodeURIComponent(id),{method:'DELETE'});versions.delete(id);campaigns=campaigns.filter(c=>c.id!==id);changed();}
async function saveIdea(campaign,idea){await syncCampaign(campaign);return call('/campaigns/'+campaign.id+'/ideas',{method:'POST',body:{idea}});}
function dashboard(local=[]){
 const items=user?campaigns:local.map(r=>({id:r.id,title:r.brief?.product||'Untitled campaign',updated_at:Date.parse(r.created_at)/1000||Date.now()/1000}));
 return `<section class="dashboard"><span class="section-number">YOUR WORKSPACE</span><div class="section-heading"><div><h1>A place for your next campaign.</h1><p>${user?`Signed in as ${esc(user.email)}. Campaigns and saved ideas belong to this account.`:'Plan locally now, or sign in with Google to keep campaigns and ideas across devices.'}</p></div><button class="primary" data-cloud="new">New campaign</button></div>${dashboardError?`<div class="studio-error" role="alert">${esc(dashboardError)}<button data-cloud="refresh">Refresh account</button></div>`:''}<div class="account-overview"><div><b>${user?'Google account':'Device workspace'}</b><p>${user?'Campaigns sync automatically while you work. Uploaded CLIP boards remain device-side. Optional account image uploads are saved separately.':config.accounts_ready?'Sign in to enable account saving. Your existing device workspace is kept separate.':'Account sync is awaiting setup. Your local campaigns remain available.'}</p></div><div class="account-actions">${user?'<button data-cloud="settings">Provider connections</button><button data-cloud="export">Export account</button><button data-cloud="logout">Sign out</button>':`<button data-cloud="signin" ${config.accounts_ready?'':'disabled'}>Continue with Google</button>`}</div></div><div class="dashboard-list-heading"><h2>${user?'Your campaigns':'Campaigns on this device'}</h2><span>${items.length} saved</span></div>${items.length?`<div class="campaign-list">${items.map((r,i)=>`<article><span>${String(i+1).padStart(2,'0')}</span><div><h3>${esc(r.title)}</h3><p>${esc(new Date(r.updated_at*1000).toLocaleDateString())}${user?' / Account saved':' / Device only'}</p></div><button data-cloud="open" data-id="${esc(r.id)}">Open campaign</button>${user?`<button data-cloud="saved-ideas" data-id="${esc(r.id)}">Saved ideas</button><button data-cloud="design-history" data-id="${esc(r.id)}">Designs</button><button data-cloud="images" data-id="${esc(r.id)}" ${config.media_ready?'':'disabled'} title="${config.media_ready?'Upload private originals':'Account image storage awaits setup'}">Product images</button>`:''}</article>`).join('')}</div>`:'<div class="empty"><h2>Start with a product and a question.</h2><p>Describe your market, find references and turn the evidence into ideas.</p><button data-cloud="new">Create your first campaign</button></div>'}${user?'<details class="account-danger"><summary>Account controls</summary><p>Deleting your account removes synced campaigns, saved ideas and provider keys. Device boards remain separate.</p><button class="danger" data-cloud="delete-account">Delete account</button></details>':''}</section>`;
}
function settings(){
 const host=window.prismStudioHost;host.openModal(`<div class="modal-header"><h2>Account connections</h2><button data-action="close" aria-label="Close dialog">×</button></div><div class="information-sheet"><p>Keys are encrypted in your account and stay saved until you replace or remove them. They are used server-side and are never returned to the browser.</p><button data-studio="settings">Gemini connection</button><form id="provider-settings"><label for="account-provider">Provider</label><select id="account-provider"><option value="muapi">Muapi / Open-Higgsfield image generation</option><option value="exa">Exa / Agent Reach web search</option></select><label for="account-provider-key">Provider API key</label><input id="account-provider-key" type="password" autocomplete="off" minlength="20" maxlength="500" required placeholder="Enter privately to save or replace"><label for="account-image-model">Image model</label><select id="account-image-model">${(config.image_models||[]).map(m=>`<option value="${esc(m.id)}">${esc(m.label)}</option>`).join('')}</select><p class="hint">The open-source image interface still uses provider credits. Prism does not buy credits or enable billing. Exa keyless search can be rate limited; an Exa key has its own provider quotas.</p><div id="provider-status" class="hint" role="status">${['muapi','exa'].map(p=>`${p}: ${user?.providers?.[p]?'saved':'not connected'}`).join(' / ')}</div><div class="modal-actions"><button type="button" data-cloud="remove-provider">Remove selected saved key</button><button class="primary">Save encrypted connection</button></div></form></div>`);
}
async function listIdeas(id){const result=await call('/campaigns/'+id+'/ideas');window.prismStudioHost.openModal(`<div class="modal-header"><h2>Saved creative ideas</h2><button data-action="close" aria-label="Close dialog">×</button></div>${result.ideas.length?result.ideas.map(r=>`<article class="saved-idea"><h3>${esc(r.title)}</h3><p class="plain-text">${esc(r.payload.headline||r.payload.angle||'')}</p><details><summary>Production notes</summary><p class="plain-text">${esc(JSON.stringify(r.payload,null,2))}</p></details><button class="danger" data-cloud="delete-idea" data-id="${esc(r.id)}" data-campaign="${esc(id)}">Remove saved idea</button></article>`).join(''):'<p>No saved ideas yet. Open a campaign, draft concepts and choose Save idea.</p>'}`);}
async function listImages(id){
 const result=await call('/media?campaign='+encodeURIComponent(id));window.prismStudioHost.openModal(`<div class="modal-header"><h2>Account product images</h2><button data-action="close" aria-label="Close dialog">×</button></div><p>Explicitly save originals to this campaign. JPEG, PNG or WebP; 10 MiB per file and 100 MiB per account. These files stay separate from device CLIP boards.</p><form id="account-image-form" data-campaign="${esc(id)}"><label for="account-image-file">Choose product images</label><input id="account-image-file" type="file" accept="image/jpeg,image/png,image/webp" multiple required><button class="primary">Save images to account</button><p id="account-image-status" role="status"></p></form>${result.images.map(r=>`<article class="saved-design"><a href="${esc(r.url)}" target="_blank" rel="noopener"><img src="${esc(r.url)}" alt="Saved campaign product image"></a><p>${Math.ceil(r.bytes/1024)} KB</p><button class="danger" data-cloud="delete-image" data-id="${esc(r.id)}" data-campaign="${esc(id)}">Remove account image</button></article>`).join('')}`);
}
async function listDesigns(id){const result=await call('/designs?campaign='+encodeURIComponent(id));window.prismStudioHost.openModal(`<div class="modal-header"><h2>Campaign designs</h2><button data-action="close" aria-label="Close dialog">×</button></div><p class="hint">Generated mockups are proposed visuals. Provider links can expire; download completed images to retain originals.</p>${result.jobs.length?result.jobs.map(job=>`<article class="saved-design"><b>${esc(job.model)} / ${esc(job.status)}</b><p class="plain-text">${esc(job.prompt)}</p>${job.images.map(src=>`<a href="${esc(src)}" target="_blank" rel="noopener"><img src="${esc(src)}" alt="Generated product concept"></a>`).join('')}${job.status==='processing'?`<button data-cloud="poll-design" data-id="${esc(job.id)}" data-campaign="${esc(id)}">Check generation</button>`:''}${['needs_attention','submitting'].includes(job.status)?'<p class="hint">Submission state is uncertain. Check provider history before creating another request; Prism will not resubmit automatically.</p>':''}</article>`).join(''):'<p>No designs yet. Open a concept and choose Create design prompts.</p>'}`);}
document.addEventListener('submit',async event=>{
 if(event.target.id==='account-image-form'){
  event.preventDefault();const form=event.target,status=document.getElementById('account-image-status'),button=form.querySelector('button');button.disabled=true;
  try{for(const file of document.getElementById('account-image-file').files){if(file.size>10*1024*1024)throw Error('Each image must be at most 10 MiB.');await call('/media?campaign='+encodeURIComponent(form.dataset.campaign),{method:'POST',body:file,headers:{'Content-Type':file.type}});}await listImages(form.dataset.campaign);}catch(e){status.textContent=e.message;}finally{button.disabled=false;}return;
 }
 if(event.target.id!=='provider-settings')return;event.preventDefault();const status=document.getElementById('provider-status'),button=event.target.querySelector('button.primary');button.disabled=true;
 try{await call('/keys/'+document.getElementById('account-provider').value,{method:'PUT',body:{key:document.getElementById('account-provider-key').value.trim(),model:document.getElementById('account-image-model').value}});document.getElementById('account-provider-key').value='';await refresh();status.textContent='Connection saved encrypted to your account.';}catch(e){status.textContent=e.message;}finally{button.disabled=false;}
});
document.addEventListener('click',async event=>{
 const button=event.target.closest('[data-cloud]');if(!button)return;const action=button.dataset.cloud,host=window.prismStudioHost;
 try{
  if(action==='signin'){location.assign('/api/cloud/auth/google');return;}
  if(action==='dashboard')host.openDashboard();
  if(action==='new')window.prismStudio?.newCampaign();
  if(action==='open'){const payload=user?await getCampaign(button.dataset.id):null;window.prismStudio?.openCampaign(button.dataset.id,payload);}
  if(action==='refresh'){dashboardError='';await refresh();}
  if(action==='settings')settings();
  if(action==='remove-provider'){await call('/keys/'+document.getElementById('account-provider').value,{method:'DELETE'});await refresh();settings();}
  if(action==='saved-ideas')await listIdeas(button.dataset.id);
  if(action==='images')await listImages(button.dataset.id);
  if(action==='delete-image'){await call('/media/'+button.dataset.id,{method:'DELETE'});await listImages(button.dataset.campaign);}
  if(action==='delete-idea'){await call('/ideas/'+button.dataset.id,{method:'DELETE'});await listIdeas(button.dataset.campaign);}
  if(action==='design-history')await listDesigns(button.dataset.id);
  if(action==='poll-design'){button.disabled=true;await call('/designs/'+button.dataset.id,{method:'POST',body:{}});await listDesigns(button.dataset.campaign);}
  if(action==='logout'){await call('/auth/logout',{method:'POST',body:{}});location.reload();}
  if(action==='export'){const result=await call('/account/export'),url=URL.createObjectURL(new Blob([JSON.stringify(result,null,2)],{type:'application/json'})),a=document.createElement('a');a.href=url;a.download='prism-account.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
  if(action==='delete-account')host.openModal('<div class="modal-header"><h2>Delete your Prism account?</h2></div><p>Synced campaigns, ideas, design records and saved keys will be removed. This cannot be undone.</p><label for="delete-account-confirm">Type DELETE MY ACCOUNT</label><input id="delete-account-confirm"><div class="modal-actions"><button data-action="close">Cancel</button><button class="danger" data-cloud="confirm-delete-account">Delete account</button></div>');
  if(action==='confirm-delete-account'){await call('/account',{method:'DELETE',body:{confirm:document.getElementById('delete-account-confirm').value}});location.reload();}
 }catch(e){host?.toast(e.message);if(button.isConnected)button.disabled=false;}
});
const ready=init();
window.prismCloud={ready,call,refresh,syncCampaign,getCampaign,loadCampaigns,removeCampaign,saveIdea,dashboard,settings,listDesigns,user:()=>user,config:()=>config,cached:()=>cache,syncStatus:()=>syncStatus,busy:()=>pending>0};
