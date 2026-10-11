import {STORES,validateBrief,catalogueResults} from '../../../src/prism/web/research-core.mjs';
const reply=(data,status=200)=>Response.json(data,{status,headers:{'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});
export async function limitedBody(response,max){
  if(Number(response.headers.get('content-length'))>max)throw Error('Response too large.');
  const reader=response.body.getReader();let size=0,chunks=[];
  try{while(true){const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>max)throw Error('Response too large.');chunks.push(value);}}finally{await reader.cancel().catch(()=>{});}
  const result=new Uint8Array(size);let offset=0;for(const chunk of chunks){result.set(chunk,offset);offset+=chunk.length;}return result;
}
export async function discover(brief,fetcher=fetch){
  brief=validateBrief(brief);
  const stores=STORES.filter(s=>brief.region==='GLOBAL'||s.region==='PK');
  const results=await Promise.all(stores.map(async store=>{
    try{
      const url=new URL(`https://${store.host}/search/suggest.json`);
      url.search=new URLSearchParams({q:brief.query,'resources[type]':'product','resources[limit]':'6'});
      const r=await fetcher(url.href,{redirect:'manual',signal:AbortSignal.timeout(12000),headers:{Accept:'application/json'}});
      if(!r.ok||!r.headers.get('content-type')?.includes('json'))throw Error('Catalogue unavailable.');
      const data=JSON.parse(new TextDecoder().decode(await limitedBody(r,512000)));
      return {store:store.name,items:catalogueResults(data,store),status:'ok'};
    }catch{return {store:store.name,items:[],status:'unavailable'};}
  }));
  return {references:results.flatMap(r=>r.items),catalogues:results.map(({store,status,items})=>({store,status,count:items.length})),scope:'Public product catalogues. These are not verified paid Instagram ads.',retrieved_at:new Date().toISOString()};
}
export async function onRequestPost({request}){
  if(request.headers.get('origin')!==new URL(request.url).origin)return reply({detail:'Use Prism on this origin.'},403);
  try{if(Number(request.headers.get('content-length'))>6000)return reply({detail:'Brief too large.'},413);
    const text=await request.text();if(text.length>6000)return reply({detail:'Brief too large.'},413);
    return reply(await discover(JSON.parse(text)));
  }catch{return reply({detail:'Check your campaign brief and try again.'},400);}
}
