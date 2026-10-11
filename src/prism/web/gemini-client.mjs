// Keys and model discovery stay in page memory. Never put a key in a URL.
const API='https://generativelanguage.googleapis.com/v1beta/';
const textModel=id=>/^gemini-(?:\d+(?:\.\d+)?-flash(?:-[a-z0-9-]+)?|flash(?:-lite)?-latest)$/.test(id)&&!/(?:image|audio|live|tts|robotics|native)/.test(id);

export function usableModels(models){
  const unique=new Map();
  for(const m of models||[]){
    const id=String(m.name||'').replace(/^models\//,'');
    if(textModel(id)&&m.supportedGenerationMethods?.includes('generateContent'))unique.set(id,{id,label:String(m.displayName||id).slice(0,128)});
  }
  return [...unique.values()].sort((a,b)=>{
    const rank=m=>(/preview|exp|latest/.test(m.id)?10:0)+(m.id.includes('lite')?0:1);
    return rank(a)-rank(b)||b.id.localeCompare(a.id,undefined,{numeric:true});
  });
}

export async function providerError(response,{grounded=false}={}){
  // Inspect only fixed error reasons; raw provider text can echo request secrets.
  const data=await response.json().catch(()=>null);
  const invalid=data?.error?.details?.some(d=>d.reason==='API_KEY_INVALID');
  if(invalid||response.status===401)return Error('Google rejected this API key. Check the key in AI Studio and reconnect privately.');
  if(response.status===404)return Error('Google does not offer this model to your project. Open AI connection, click Load available models, choose a listed model, and connect again.');
  if(response.status===429)return Error('Gemini quota is exhausted or unavailable for this project. Check its free-tier limits in AI Studio. Prism will not switch models or enable paid billing.');
  if(response.status===403)return Error('Google denied this request. Check API-key restrictions, project permissions and model access in AI Studio.');
  if(response.status===400&&grounded)return Error('Google rejected web-search grounding for this model or project. Use Find product references and Open regional ad searches; chat and concepts can still use text generation.');
  if(response.status===400)return Error('Google rejected this model’s text/JSON request. Reload available models in AI connection and choose another listed Flash model.');
  if(response.status>=500)return Error('Google’s model service is temporarily unavailable. Your existing results are saved. Try again later or explicitly choose another listed model.');
  return Error(`Google could not complete the request (${response.status}). Your existing results are saved.`);
}

export async function listModels(key,{fetcher=fetch,signal}={}){
  if(key.length<20)throw Error('This API key appears incomplete. Enter the complete key privately.');
  const models=[];let token='';
  const timeout=AbortSignal.timeout(20000),combined=signal?AbortSignal.any([signal,timeout]):timeout;
  for(let page=0;page<5;page++){
    const url=new URL(API+'models');url.searchParams.set('pageSize','200');if(token)url.searchParams.set('pageToken',token);
    const r=await fetcher(url.href,{headers:{'x-goog-api-key':key},signal:combined});
    if(!r.ok)throw await providerError(r);
    const data=await r.json();models.push(...(data.models||[]));token=data.nextPageToken;
    if(!token){const usable=usableModels(models);if(!usable.length)throw Error('Google listed no compatible Flash text models for this key. Check this project’s model access in AI Studio.');return usable;}
  }
  throw Error('Google’s model list exceeded the discovery limit. Try again later.');
}

export function generationConfig(model,structured=false){
  if(!textModel(model))throw Error('Load available models and select a compatible Flash text model first.');
  const config={maxOutputTokens:8192};
  // Newer models reject old sampling parameters. Leave their defaults intact.
  if(/^gemini-2\.5-flash/.test(model))config.thinkingConfig={thinkingBudget:0};
  if(structured)config.responseMimeType='application/json';
  return config;
}

export function checkGrounding(model,enabled){
  if(!enabled)throw Error('Gemini web search is switched off. For the free route, use Find product references and Open regional ad searches. Newer Gemini models do not include Google Search in their API free tier; chat and concepts still work within eligible text quotas. Review pricing in AI connection before enabling web search.');
}
