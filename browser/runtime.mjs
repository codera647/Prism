import {policy,normalize,dot,clusters,copyTags,patterns,draftReport,parseCsv} from './core.mjs';

const dbReady=new Promise((resolve,reject)=>{
  const request=indexedDB.open('prism-browser-v1',1);
  request.onupgradeneeded=()=>request.result.createObjectStore('boards',{keyPath:'id'});
  request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(request.error);
});
async function transaction(mode,fn){const db=await dbReady;return new Promise((resolve,reject)=>{const tx=db.transaction('boards',mode),store=tx.objectStore('boards');let value;try{const req=fn(store);if(req)req.onsuccess=()=>{value=req.result;};}catch(e){reject(e);tx.abort();return;}tx.oncomplete=()=>resolve(value);tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error||Error('Storage could not be saved.'));});}
const get=id=>transaction('readonly',s=>s.get(id)),all=()=>transaction('readonly',s=>s.getAll()),put=board=>transaction('readwrite',s=>s.put(board));
async function locked(fn){if(!navigator.locks)throw Error('This browser lacks safe local storage locking. Use current Chrome/Edge or the desktop app.');return navigator.locks.request('prism-browser-mutations',fn);}
function fail(message,status=400){const e=Error(message);e.status=status;throw e;}
const urls=new Map();
function imageUrl(ad){if(!urls.has(ad.id))urls.set(ad.id,URL.createObjectURL(ad.blob));return urls.get(ad.id);}
function forget(ad){if(urls.has(ad.id)){URL.revokeObjectURL(urls.get(ad.id));urls.delete(ad.id);}}
function view(board){
  const current=board.analysisRevision===board.revision;
  return {id:board.id,name:board.name,revision:board.revision,created:board.created,
    count:board.ads.length,copy_count:board.ads.filter(a=>a.copy.trim()).length,
    stale:!!board.analysisRevision&&!current,status:current?'ready':board.analysisRevision?'stale':board.ads.length?'pending':'empty',
    ads:board.ads.map(a=>({id:a.id,filename:a.filename,copy:a.copy,width:a.width,height:a.height,image:imageUrl(a),tags:current?a.tags:[]})),
    groups:current?board.groups:[],patterns:current?board.patterns:[],model:current?board.model:null,
    coverage:current?board.coverage:{images:0,copy:board.ads.filter(a=>a.copy.trim()).length,ad_variants:board.ads.length},
    report:current?board.report:null,jobs:board.jobs||[]};
}
let mlWorker,pending=new Map();
function worker(){if(!mlWorker){mlWorker=new Worker('/static/clip-worker.js',{type:'module'});mlWorker.onmessage=event=>{
  const data=event.data;if(data.progress){document.dispatchEvent(new CustomEvent('prism-progress',{detail:data.progress}));return;}
  const task=pending.get(data.id);if(task){clearTimeout(task.timeout);pending.delete(data.id);data.error?task.reject(Error(data.error)):task.resolve(data.result);}
};mlWorker.onerror=()=>resetWorker('Browser CLIP could not start. Reload or try the desktop app.');}return mlWorker;}
function resetWorker(reason){mlWorker?.terminate();mlWorker=null;for(const task of pending.values()){clearTimeout(task.timeout);task.reject(Error(reason));}pending.clear();}
function infer(kind,values){return new Promise((resolve,reject)=>{const id=crypto.randomUUID(),w=worker();const timeout=setTimeout(()=>resetWorker('Browser inference timed out. Your saved images are retained; retry analysis.'),600000);pending.set(id,{resolve,reject,timeout});w.postMessage({id,kind,values});});}
function decode(file){return new Promise((resolve,reject)=>{const w=new Worker('/static/decode-worker.js',{type:'module'}),timeout=setTimeout(()=>{w.terminate();reject(Error('Image decoding exceeded 20 seconds.'));},20000);w.onmessage=e=>{clearTimeout(timeout);w.terminate();e.data.error?reject(Error(e.data.error)):resolve(e.data);};w.onerror=()=>{clearTimeout(timeout);w.terminate();reject(Error('Image decoder failed.'));};w.postMessage(file);});}
async function analyze(id,jobId){
  const before=await get(id);if(!before)return;
  const revision=before.revision;
  try{
    if(!before.ads.length)throw Error('Add at least one image first.');
    const vectors=await infer('images',before.ads.map(a=>a.blob));
    const labels=await infer('texts',policy.VISUAL_LABELS.map(p=>p[1]));
    const groups=clusters(vectors).map((indices,i)=>{
      const centroid=normalize(vectors[0].map((_,j)=>indices.reduce((s,k)=>s+vectors[k][j],0)));
      const scores=labels.map(l=>dot(l,centroid)),label=policy.VISUAL_LABELS[scores.indexOf(Math.max(...scores))][0];
      return {id:`g-${jobId}-${i}`,name:label,members:indices.map(k=>before.ads[k].id),tentative:true};
    });
    await locked(async()=>{
      const board=await get(id),job=board?.jobs.find(j=>j.id===jobId);
      if(!board||board.revision!==revision||job?.status!=='processing')return;
      board.ads=before.ads.map((a,i)=>({...a,vector:vectors[i],tags:copyTags(a.copy,a.corrections)}));
      board.groups=groups;board.patterns=patterns(board.ads,groups);
      board.coverage={images:board.ads.length,copy:board.ads.filter(a=>a.copy.trim()).length,ad_variants:board.ads.length,unique_images:new Set(board.ads.map(a=>a.hash)).size};
      board.model=policy.model;board.analysisRevision=revision;
      board.report=draftReport(board.ads,board.patterns,board.coverage);
      job.status='completed';job.error=null;await put(board);
    });
  }catch(error){await locked(async()=>{const board=await get(id),job=board?.jobs.find(j=>j.id===jobId);if(board&&job&&job.status==='processing'){job.status='needs_attention';job.error=error.message;await put(board);}});}
}
function queue(board){
  for(const j of board.jobs)if(['queued','processing'].includes(j.status))j.status='cancelled';
  const job={id:crypto.randomUUID(),kind:'analysis',status:'processing',revision:board.revision,error:null};
  board.jobs.unshift(job);board.jobs=board.jobs.slice(0,8);return job;
}
function changed(board){board.revision++;for(const j of board.jobs)if(['queued','processing'].includes(j.status))j.status='cancelled';}
function expected(board,value){if(board.revision!==Number(value))fail('This board changed. Refresh before saving.',409);}
function name(value,max){if(typeof value!=='string'||!value.trim()||value.length>max)fail('Enter a valid name.');return value.trim();}
function fileName(value){if(typeof value!=='string'||!value||value.length>240||/[\/\\\u0000-\u001f]/.test(value))fail('Use a simple filename without a folder path.');return value;}

async function route(path,options={}){
  const url=new URL(path,'https://prism.invalid'),parts=url.pathname.split('/').filter(Boolean),method=options.method||'GET',body=options.body||{};
  if(parts[0]==='health')return {status:'ok',version:'0.2.0',mode:'browser',clip_ready:true,model:policy.model,harness:null};
  if(parts[0]==='auth'&&parts[1]==='me')return {name:'On this device'};
  if(parts[0]==='auth')fail('The browser app uses one device workspace, without accounts.');
  if(parts[0]==='demo'){
    const board=await route('/collections',{method:'POST',body:{name:'Synthetic demo — browser CLIP'}}),data=new FormData(),mapping={};
    for(let i=0;i<30;i++){
      const canvas=document.createElement('canvas');canvas.width=480;canvas.height=600;const c=canvas.getContext('2d');
      c.fillStyle=['#ece5d9','#ebe3f3','#f0dccb'][i%3];c.fillRect(0,0,480,600);c.fillStyle='#332b3c';c.font='bold 25px Arial';c.fillText('SYNTHETIC DEMO',28,45);
      if(i%3===0){c.fillStyle='#8d785e';c.fillRect(176,180,130,270);c.fillStyle='#313034';c.fillRect(195,138,92,50);c.fillStyle='#fff';c.fillRect(186,280,110,110);c.fillStyle='#493e30';c.font='20px Arial';c.fillText('DAILY',204,324);c.fillText('SERUM',204,354);}
      if(i%3===1){c.fillStyle='#a486b7';c.beginPath();c.arc(240,230,100,0,Math.PI*2);c.fill();c.fillStyle='#4c3e5d';c.font='bold 27px Arial';c.fillText('★★★★★',139,387);c.font='23px Arial';c.fillText('Customers love their routine',80,440);}
      if(i%3===2){c.fillStyle='#6d4636';c.font='bold 98px Arial';c.fillText('20% OFF',38,310);c.font='25px Arial';c.fillText('Free shipping · Today only',70,410);}
      c.fillStyle='#493e50';c.font='18px Arial';c.fillText(`Fixture ${i+1} · No performance claim`,30,559);
      const blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/png'));const filename=`demo-${String(i+1).padStart(2,'0')}.png`;data.append('files',new File([blob],filename,{type:'image/png'}));mapping[filename]=['Discover a simple daily routine.','Verified review: customers love their routine.','Today only. 20% off. Free shipping.'][i%3];
    }
    data.append('copy_json',JSON.stringify(mapping));await route(`/collections/${board.id}/upload`,{method:'POST',body:data});return {id:board.id};
  }
  if(parts[0]==='jobs'){
    const boards=await all(),board=boards.find(b=>b.jobs.some(j=>j.id===parts[1])),job=board?.jobs.find(j=>j.id===parts[1]);if(!job)fail('Job not found.',404);
    if(method==='GET')return {...job,tasks:[{id:'browser-clip',status:job.status,attempts:job.attempts||1}],run_id:'Browser worker (no Trailforge server)',units:0};
    return locked(async()=>{const current=await get(board.id),j=current.jobs.find(j=>j.id===job.id);if(parts[2]==='cancel'){j.status='cancelled';resetWorker('Analysis cancelled by you.');}else if(parts[2]==='retry'){j.status='processing';j.error=null;j.attempts=(j.attempts||1)+1;setTimeout(()=>analyze(current.id,j.id),0);}else fail('Unknown job action.');await put(current);return j;});
  }
  if(parts[0]!=='collections')fail('Unsupported browser operation.',404);
  if(parts.length===1){
    if(method==='GET')return (await all()).map(view).sort((a,b)=>b.created-a.created);
    return locked(async()=>{const board={id:crypto.randomUUID(),name:name(body.name,100),revision:1,created:Date.now()/1000,ads:[],groups:[],patterns:[],report:null,analysisRevision:null,jobs:[]};await put(board);return view(board);});
  }
  const id=parts[1];let board=await get(id);if(!board)fail('Board not found.',404);
  if(method==='GET'){
    if(parts[2]==='export'){
      const result=view(board);for(const ad of result.ads)delete ad.image;
      return {schema:'prism/browser-export/1',...result,model:policy.model,note:'JSON contains copy and analysis; keep your original images separately. No server execution receipts are present.'};
    }
    return view(board);
  }
  if(parts[2]==='search'){
    if(board.analysisRevision!==board.revision)fail('Refresh analysis before searching.',409);
    if(typeof body.query!=='string'||!body.query.trim()||body.query.length>500)fail('Search must contain 1–500 characters.');
    const [vector]=await infer('texts',[body.query]);
    const live=await get(id);if(!live||live.revision!==board.revision||live.analysisRevision!==live.revision)fail('Board changed during search. Refresh and try again.',409);
    const group=body.group?board.groups.find(g=>g.id===body.group):null;if(body.group&&!group)fail('Group no longer exists.',409);
    const words=body.query.toLowerCase().match(/[a-z0-9]+/g)||[];
    const results=board.ads.filter(a=>(!group||group.members.includes(a.id))&&(!body.tag||a.tags.some(t=>t.label===body.tag))).map(a=>{const cosine=dot(a.vector,vector),copy=a.copy.toLowerCase(),bonus=words.length?.08*words.filter(w=>copy.includes(w)).length/words.length:0;return {id:a.id,cosine,score:cosine+bonus};}).filter(r=>r.cosine>=.23).sort((a,b)=>b.score-a.score);
    return {results,no_match:results.length===0};
  }
  let nextJob;
  const result=await locked(async()=>{
    board=await get(id);if(!board)fail('Board not found.',404);
    if(parts.length===2&&method==='DELETE'){expected(board,url.searchParams.get('expected_revision'));board.ads.forEach(forget);await transaction('readwrite',s=>s.delete(id));return {deleted:true};}
    if(parts[2]==='upload'){
      const files=body.getAll('files');if(!files.length||files.length+board.ads.length>100)fail('Boards support 1–100 images.');
      const names=files.map(f=>fileName(f.name));if(new Set(names).size!==names.length)fail('Rename duplicate filenames before importing copy.');
      let mapping;try{mapping=JSON.parse(body.get('copy_json')||'{}');}catch{fail('Copy mapping must be valid JSON.');}
      if(!mapping||Array.isArray(mapping)||typeof mapping!=='object')fail('Copy mapping must map filenames to text.');
      if(body.get('copy_csv')){for(const [n,c] of Object.entries(parseCsv(body.get('copy_csv')))){if(Object.hasOwn(mapping,n))fail('A filename appears more than once in the copy mapping.');mapping[n]=c;}}
      for(const [n,c] of Object.entries(mapping))if(!names.includes(n)||typeof c!=='string'||c.length>10000)fail('Copy must match uploaded filenames and contain at most 10,000 characters each.');
      if(files.reduce((s,f)=>s+f.size,0)+board.ads.reduce((s,a)=>s+a.bytes,0)>1024**3)fail('This board exceeds the 1 GiB original-image limit.');
      const accepted=[],rejected=[];
      for(const file of files){try{
        if(!file.size||file.size>10*1024*1024)throw Error('Each image must be nonempty and at most 10 MiB.');
        const decoded=await decode(file),ad={...decoded,id:crypto.randomUUID(),filename:file.name,copy:mapping[file.name]||'',bytes:file.size,tags:[],corrections:[]};board.ads.push(ad);accepted.push(ad.id);
      }catch(e){rejected.push({filename:file.name,reason:e.message});}}
      if(accepted.length){changed(board);nextJob=queue(board);await put(board);}
      return {accepted,rejected,job:nextJob};
    }
    if(parts[2]==='analyze'||parts[2]==='report'){if(!board.ads.length)fail('Add images first.');nextJob=queue(board);await put(board);return nextJob;}
    if(parts[2]==='review'){expected(board,body.expected_revision);if(board.analysisRevision!==board.revision||board.report?.id!==body.report_id)fail('Report changed. Refresh before review.',409);board.report.reviewed_at=Date.now()/1000;board.report.status='reviewed';await put(board);return view(board);}
    if(parts[2]==='groups'){expected(board,body.expected_revision);const group=board.groups.find(g=>g.id===parts[3]);if(!group||board.analysisRevision!==board.revision)fail('Refresh analysis before renaming.',409);group.name=name(body.name,80);await put(board);return view(board);}
    if(parts[2]==='ads'){
      const ad=board.ads.find(a=>a.id===parts[3]);if(!ad)fail('Creative not found.',404);
      expected(board,method==='DELETE'?url.searchParams.get('expected_revision'):body.expected_revision);
      if(method==='DELETE'){forget(ad);board.ads=board.ads.filter(a=>a.id!==ad.id);}
      else if(parts[4]==='tags'){if(!['hook','offer'].includes(body.kind)||!['add','remove'].includes(body.operation))fail('Invalid tag.');const label=name(body.label,40);if(body.operation==='add'&&(!body.quote||body.quote.length>500||!ad.copy.includes(body.quote)))fail('Quote an exact phrase from the supplied copy.');ad.corrections.push({...body,label});}
      else {if(typeof body.copy!=='string'||body.copy.length>10000)fail('Copy must contain at most 10,000 characters.');ad.copy=body.copy;ad.corrections=[];}
      changed(board);await put(board);return view(board);
    }
    fail('Unsupported browser operation.',404);
  });
  if(nextJob)setTimeout(()=>analyze(id,nextJob.id),0);
  return result;
}
window.prismBrowserApi=route;
const activeTab=new Promise(resolve=>navigator.locks.request('prism-browser-active-tab',{ifAvailable:true},async lock=>{
  resolve(!!lock);
  if(lock)await new Promise(()=>{});
}));
if(!await activeTab){
  document.getElementById('app').textContent='Prism is already open in another tab. Close that tab, then reload here to continue safely.';
  throw Error('Another tab owns the browser workspace.');
}
// A refreshed/closed tab cannot own an in-flight worker from the preceding page.
await locked(async()=>{for(const b of await all()){let dirty=false;for(const j of b.jobs)if(['queued','processing'].includes(j.status)){j.status='needs_attention';j.error='This tab closed during analysis. Your images are saved; inspect and retry.';dirty=true;}if(dirty)await put(b);}});
const script=document.createElement('script');script.src='/static/app.js';document.head.append(script);
let lastProgress='';
document.addEventListener('prism-progress',e=>{lastProgress=e.detail;const node=document.getElementById('browser-progress');if(node)node.textContent=lastProgress;});
const observer=new MutationObserver(()=>{
  const local=document.querySelector('.local');if(local&&!local.textContent.includes('Stored in this browser'))local.innerHTML='<span class="dot"></span>Stored in this browser';
  const footer=document.querySelector('.sidebar .footer-note');if(footer&&!footer.textContent.startsWith('Browser CLIP'))footer.textContent='Browser CLIP · Your images stay on this device. Export before clearing site data.';
  document.querySelector('[data-action="logout"]')?.remove();
  const diagnostic=document.querySelector('.diagnostics');if(diagnostic){const hints=diagnostic.querySelectorAll('.hint');if(hints[0]&&!hints[0].textContent.startsWith('This job runs'))hints[0].textContent='This job runs in a browser worker. Trailforge execution receipts are available in the desktop app.';}
  if(!document.getElementById('browser-progress')&&document.querySelector('.workspace')){const notice=document.createElement('div');notice.className='notice';notice.id='browser-progress';notice.textContent=lastProgress||'Private browser workspace. First analysis downloads CLIP weights (~150 MB); keep this tab open. Boards are saved on this device, without accounts or cloud sync.';document.querySelector('.workspace').prepend(notice);}
  // Blob image URLs cannot carry HTTP query parameters.
  for(const image of document.querySelectorAll('img[src^="blob:"]'))if(image.getAttribute('src').endsWith('?full=true'))image.src=image.getAttribute('src').slice(0,-10);
});
observer.observe(document.getElementById('app'),{childList:true,subtree:true});
observer.observe(document.getElementById('modal'),{childList:true,subtree:true});
