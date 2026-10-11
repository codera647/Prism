// Agent Reach explicitly calls upstream tools directly. This edge adapter uses
// its Exa MCP route. No browser sessions or social-account cookies are imported.
import {check,HttpError,publicHttps} from './security.mjs';
import {listModels,generationConfig,providerError,checkGrounding} from '../../src/prism/web/gemini-client.mjs';
import {SYSTEM} from '../../src/prism/web/research-core.mjs';
export const IMAGE_MODELS=[{id:'flux-dev-image',label:'Flux Dev',source_model:'flux-dev'},{id:'nano-banana',label:'Nano Banana',source_model:'nano-banana'}];
export async function limited(response,max=750000){
 const reader=response.body.getReader();let length=0,parts=[];
 try{while(true){const {done,value}=await reader.read();if(done)break;length+=value.length;check(length<=max,502,'Provider response exceeded the limit.');parts.push(value);}}finally{await reader.cancel().catch(()=>{});}
 const bytes=new Uint8Array(length);let offset=0;for(const p of parts){bytes.set(p,offset);offset+=p.length;}return bytes;
}
export async function geminiModels(key,fetcher=fetch){return listModels(key,{fetcher});}
export async function geminiGenerate(key,model,text,{structured=false,grounded=false,groundingEnabled=false,fetcher=fetch}={}){
 if(grounded)checkGrounding(model,groundingEnabled);
 const payload={systemInstruction:{parts:[{text:SYSTEM}]},contents:[{role:'user',parts:[{text}]}],generationConfig:generationConfig(model,structured)};
 if(grounded)payload.tools=[{google_search:{}}];
 const response=await fetcher(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,{method:'POST',headers:{'Content-Type':'application/json','x-goog-api-key':key},body:JSON.stringify(payload),signal:AbortSignal.timeout(90000)});
 if(!response.ok){const e=await providerError(response,{grounded});throw new HttpError(response.status===429?429:502,e.message);}
 const data=JSON.parse(new TextDecoder().decode(await limited(response))),candidate=data.candidates?.[0];
 check(candidate?.finishReason==='STOP',502,'Gemini did not finish a complete response. No new draft was saved.');
 const answer=candidate.content?.parts?.filter(p=>!p.thought&&p.text).map(p=>p.text).join('\n');
 check(answer,502,'Gemini returned no usable answer.');return {text:answer,metadata:candidate.groundingMetadata||{},model};
}
function rpcData(text){
 try{return JSON.parse(text);}catch{}
 for(const line of text.split('\n'))if(line.startsWith('data: ')){try{const d=JSON.parse(line.slice(6));if(d.id===1)return d;}catch{}}
 throw new HttpError(502,'Web search returned an unsupported response.');
}
export async function reachSearch(brief,fetcher=fetch,key=''){
 const query=`${brief.product} ${brief.region==='PK'?'Pakistan':'global'} ${brief.platform} advertising product examples ${brief.query||''}`.slice(0,500);
 const response=await fetcher('https://mcp.exa.ai/mcp',{method:'POST',headers:{'Content-Type':'application/json',Accept:'application/json, text/event-stream',...(key?{'x-api-key':key}:{})},body:JSON.stringify({jsonrpc:'2.0',id:1,method:'tools/call',params:{name:'web_search_exa',arguments:{query,numResults:6,objective:'Find public official product pages and accessible advertising references relevant to this product, market and platform. Return source URLs. Separate product listings and organic posts from verified paid ads; do not infer regional ad delivery.'}}}),signal:AbortSignal.timeout(25000)});
 check(response.ok,response.status===429?429:502,'Public web search is unavailable or rate limited. Catalogue references remain available.');
 const data=rpcData(new TextDecoder().decode(await limited(response,200000)));
 check(!data.result?._meta?.['ai.exa/rateLimited'],429,'Exa public search quota is exhausted. Connect an Exa key in account settings or use catalogue references and regional search links.');
 check(!data.error&&!data.result?.isError,502,'Public web search could not complete this request.');
 const text=(data.result?.content||[]).filter(c=>c.type==='text').map(c=>c.text).join('\n').slice(0,30000);
 const sources=[],seen=new Set();
 const add=(value,title)=>{const url=publicHttps(value);if(!url||seen.has(url))return;seen.add(url);sources.push({id:'reach:'+sources.length,title:String(title||new URL(url).hostname).slice(0,250),url,kind:'public_web_result',verification:'Paid-ad delivery unverified'});};
 let structured=data.result?.structuredContent;try{structured ||= JSON.parse(text);}catch{}
 const results=Array.isArray(structured)?structured:structured?.results||structured?.data?.results||[];
 for(const item of results)add(item.url,item.title);
 for(const match of text.matchAll(/(?:URL:|url:)\s*(https:\/\/[^\s<>"']+)/g)){
  const url=publicHttps(match[1]);if(!url||seen.has(url))continue;
  const section=text.slice(Math.max(0,match.index-500),match.index),title=section.match(/(?:Title:|title:)\s*([^\n]+)/g)?.at(-1)?.replace(/^(?:Title:|title:)\s*/,'')||new URL(url).hostname;
  add(url,title);
 }
 check(text.trim()&&sources.length,502,'Search returned no source-linked results. Nothing was saved as research.');
 return {text,sources:sources.slice(0,12),queries:[query],supports:[],search_suggestions:'',method:'Agent Reach / Exa MCP',retrieved_at:new Date().toISOString()};
}
// Clean-room protocol adapter, based on inspected Open-Higgsfield request shape.
// We do not copy its browser-local plaintext-key storage or provider error text.
export async function submitDesign(key,model,prompt,fetcher=fetch){
 check(IMAGE_MODELS.some(m=>m.id===model),400,'Choose a supported image model.');
 const payload=model==='flux-dev-image'?{prompt,width:1024,height:1280,num_images:1}:{prompt,aspect_ratio:'4:5',image_url:null};
 const response=await fetcher(`https://api.muapi.ai/api/v1/${model}`,{method:'POST',headers:{'Content-Type':'application/json','x-api-key':key},body:JSON.stringify(payload),signal:AbortSignal.timeout(25000)});
 check(response.ok,response.status===429?429:502,`Image provider rejected the submission (${response.status}). Check your key, credits and model access. Prism will not retry it automatically.`);
 const data=JSON.parse(new TextDecoder().decode(await limited(response,100000))),id=data.request_id||data.id;
 check(typeof id==='string'&&/^[a-zA-Z0-9_-]{1,150}$/.test(id),502,'Provider gave no valid request ID. Submission state is uncertain; do not retry without checking provider history.');return id;
}
export function designUrl(value){
 const url=publicHttps(typeof value==='string'?value:value?.url);if(!url)return null;const h=new URL(url).hostname;
 return ['muapi.ai','fal.media','replicate.delivery'].some(d=>h===d||h.endsWith('.'+d))||h==='storage.googleapis.com'?url:null;
}
export async function pollDesign(key,id,fetcher=fetch){
 check(/^[a-zA-Z0-9_-]{1,150}$/.test(id),400,'Invalid provider request.');
 const response=await fetcher(`https://api.muapi.ai/api/v1/predictions/${id}/result`,{headers:{'x-api-key':key},signal:AbortSignal.timeout(20000)});
 check(response.ok,502,`Image status is unavailable (${response.status}). This does not resubmit the generation.`);
 const data=JSON.parse(new TextDecoder().decode(await limited(response,100000))),status=String(data.status||'pending').toLowerCase();
 if(['failed','error'].includes(status))return {status:'failed',urls:[]};
 if(!['completed','succeeded','success'].includes(status))return {status:'processing',urls:[]};
 const outputs=data.outputs||[data.url||data.output?.url];const urls=outputs.map(designUrl).filter(Boolean).slice(0,1);
 check(urls.length,502,'The provider completed this request but its image URL is not supported. Check provider history; do not resubmit automatically.');return {status:'completed',urls};
}
