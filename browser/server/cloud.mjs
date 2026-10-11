import {body,check,cleanId,consume,decryptKey,encryptKey,hash,HttpError,json,now,principal,random,sameOrigin} from './security.mjs';
import {configured,startOAuth,finishOAuth,logout} from './oauth.mjs';
import {campaignPayload,deleteCampaign,getCampaign,listCampaigns,saveCampaign,saveIdea} from './campaigns.mjs';
import {designUrl,geminiGenerate,geminiModels,IMAGE_MODELS,limited,pollDesign,reachSearch,submitDesign} from './providers.mjs';
import {validateBrief} from '../../src/prism/web/research-core.mjs';
const providerNames=['gemini','muapi','exa'];
async function keyFor(env,user,provider,optional=false){
 const row=await env.DB.prepare('SELECT encrypted,model FROM provider_keys WHERE user_id=? AND provider=?').bind(user,provider).first();
 if(!row&&optional)return null;check(row,409,`Connect ${provider==='muapi'?'an image-provider':provider} key in your account settings first.`);
 return {key:await decryptKey(env,user,provider,row.encrypted),model:row.model};
}
const jobView=row=>({id:row.id,campaign_id:row.campaign_id,prompt:row.prompt,model:row.model,status:row.status,images:JSON.parse(row.results).map((_,index)=>`/api/cloud/designs/${row.id}/image?index=${index}`),created_at:row.created_at,updated_at:row.updated_at});
async function ownedJob(env,user,id){const row=await env.DB.prepare('SELECT * FROM design_jobs WHERE user_id=? AND id=?').bind(user,cleanId(id)).first();check(row,404,'Design not found in this account.');return row;}
async function providerStatus(env,user){
 const rows=await env.DB.prepare('SELECT provider,model,updated_at FROM provider_keys WHERE user_id=?').bind(user).all();
 return Object.fromEntries(providerNames.map(name=>[name,rows.results.find(r=>r.provider===name)||null]));
}
export async function handleCloud(request,env,fetcher=fetch){
 try{
  const url=new URL(request.url),parts=url.pathname.replace(/^\/api\/cloud\/?/,'').split('/').filter(Boolean),method=request.method;
  if(parts[0]==='config'&&method==='GET')return json({accounts_ready:configured(env),database_ready:!!env.DB,google_ready:!!(env.GOOGLE_CLIENT_ID&&env.GOOGLE_CLIENT_SECRET),vault_ready:!!env.VAULT_KEY,media_ready:!!env.MEDIA,max_users:Math.min(30,Math.max(1,Number(env.MAX_USERS)||30)),research:'Agent Reach / Exa MCP',generation:'Open-Higgsfield-compatible Muapi',image_models:IMAGE_MODELS});
  if(parts[0]==='auth'&&parts[1]==='google'&&method==='GET')return await startOAuth(request,env);
  if(parts[0]==='auth'&&parts[1]==='callback'&&method==='GET')return await finishOAuth(request,env,fetcher);
  const mutation=!['GET','HEAD'].includes(method),user=await principal(request,env,mutation);
  if(mutation&&!['auth','account','keys'].includes(parts[0]))await consume(env,user.id,'requests',600,86400);
  if(parts[0]==='auth'&&parts[1]==='me'&&method==='GET')return json({...user,providers:await providerStatus(env,user.id)});
  if(parts[0]==='auth'&&parts[1]==='logout'&&method==='POST')return await logout(request,env);
  if(parts[0]==='campaigns'){
   if(parts.length===1&&method==='GET')return json({campaigns:await listCampaigns(env,user.id)});
   const id=cleanId(parts[1]);
   if(parts.length===2&&method==='GET')return json(await getCampaign(env,user.id,id));
   if(parts.length===2&&method==='PUT'){await consume(env,user.id,'save',600);const d=await body(request);return json(await saveCampaign(env,user.id,id,d.payload,d.version));}
   if(parts.length===2&&method==='DELETE')return json(await deleteCampaign(env,user.id,id));
   if(parts[2]==='ideas'&&method==='POST'){const d=await body(request,24000);return json(await saveIdea(env,user.id,id,d.idea),201);}
   if(parts[2]==='ideas'&&method==='GET'){
    await getCampaign(env,user.id,id);const rows=await env.DB.prepare('SELECT id,title,payload,created_at FROM saved_ideas WHERE user_id=? AND campaign_id=? ORDER BY created_at DESC').bind(user.id,id).all();return json({ideas:rows.results.map(r=>({...r,payload:JSON.parse(r.payload)}))});
   }
  }
  if(parts[0]==='ideas'&&parts[1]&&method==='DELETE'){const result=await env.DB.prepare('DELETE FROM saved_ideas WHERE user_id=? AND id=? RETURNING id').bind(user.id,cleanId(parts[1])).first();check(result,404,'Saved idea not found.');return json({deleted:true});}
  if(parts[0]==='keys'){
   if(parts.length===1&&method==='GET')return json(await providerStatus(env,user.id));
   const provider=parts[1];check(providerNames.includes(provider),400,'Unsupported provider.');
   if(method==='DELETE'){await env.DB.prepare('DELETE FROM provider_keys WHERE user_id=? AND provider=?').bind(user.id,provider).run();return json({deleted:true});}
   if(method==='PUT'){
    await consume(env,user.id,'keys',30);const d=await body(request,4000);
    check(typeof d.key==='string'&&d.key.trim().length>=20&&d.key.trim().length<=500,400,'Enter the complete provider key privately.');
    const model=String(d.model||'');
    if(provider==='gemini'){const models=await geminiModels(d.key.trim(),fetcher);check(models.some(m=>m.id===model),400,'Choose a model offered to this key.');}
    if(provider==='muapi')check(IMAGE_MODELS.some(m=>m.id===model),400,'Choose an image model.');
    const encrypted=await encryptKey(env,user.id,provider,d.key.trim());
    await env.DB.prepare('INSERT INTO provider_keys(user_id,provider,encrypted,model,updated_at) VALUES(?,?,?,?,?) ON CONFLICT(user_id,provider) DO UPDATE SET encrypted=excluded.encrypted,model=excluded.model,updated_at=excluded.updated_at').bind(user.id,provider,encrypted,model,now()).run();
    return json({saved:true,provider,model});
   }
  }
  if(parts[0]==='gemini'&&parts[1]==='models'&&method==='POST'){
   await consume(env,user.id,'models',30);const d=await body(request,2000),saved=await keyFor(env,user.id,'gemini',true),key=d.key?.trim()||saved?.key;
   check(key&&key.length>=20,400,'Enter a Gemini key privately first.');return json({models:await geminiModels(key,fetcher)});
  }
  if(parts[0]==='gemini'&&parts[1]==='model'&&method==='PUT'){
   await consume(env,user.id,'models',30);const d=await body(request,1000),saved=await keyFor(env,user.id,'gemini'),models=await geminiModels(saved.key,fetcher);
   check(models.some(m=>m.id===d.model),400,'Choose a model offered to your saved key.');await env.DB.prepare('UPDATE provider_keys SET model=?,updated_at=? WHERE user_id=? AND provider=?').bind(d.model,now(),user.id,'gemini').run();return json({saved:true,model:d.model});
  }
  if(parts[0]==='gemini'&&parts[1]==='generate'&&method==='POST'){
   await consume(env,user.id,'generate',60);const d=await body(request,120000);check(typeof d.text==='string'&&d.text.length>0&&d.text.length<=100000,400,'This assistant request is too large.');
   const saved=await keyFor(env,user.id,'gemini');return json(await geminiGenerate(saved.key,saved.model,d.text,{structured:d.structured===true,grounded:d.grounded===true,groundingEnabled:d.groundingEnabled===true,fetcher}));
  }
  if(parts[0]==='research'&&method==='POST'){
   await consume(env,user.id,'research',20);const d=await body(request,6000),saved=await keyFor(env,user.id,'exa',true);return json(await reachSearch(validateBrief(d.brief),fetcher,saved?.key));
  }
  if(parts[0]==='media'){
   check(env.MEDIA,503,'Account image storage is awaiting setup. Original images remain on this device.');
   if(parts.length===1&&method==='GET'){
    const campaign=cleanId(url.searchParams.get('campaign'));await getCampaign(env,user.id,campaign);
    const rows=await env.DB.prepare('SELECT id,mime,bytes,created_at FROM media WHERE user_id=? AND campaign_id=? ORDER BY created_at DESC LIMIT 100').bind(user.id,campaign).all();
    return json({images:rows.results.map(r=>({...r,url:`/api/cloud/media/${r.id}`}))});
   }
   if(parts.length===1&&method==='POST'){
    const campaign=cleanId(url.searchParams.get('campaign'));await getCampaign(env,user.id,campaign);await consume(env,user.id,'upload',100);
    const mime=request.headers.get('content-type')?.split(';')[0];check(['image/jpeg','image/png','image/webp'].includes(mime),400,'Upload a JPEG, PNG or WebP image.');
    const bytes=await limited(request,10*1024*1024);check(bytes.length>12,400,'Image file is empty or incomplete.');
    const valid=mime==='image/jpeg'?bytes[0]===255&&bytes[1]===216:mime==='image/png'?[137,80,78,71,13,10,26,10].every((v,i)=>bytes[i]===v):new TextDecoder().decode(bytes.slice(0,4))==='RIFF'&&new TextDecoder().decode(bytes.slice(8,12))==='WEBP';
    check(valid,400,'File bytes do not match the image type.');const id=crypto.randomUUID(),object=`${user.id}/${campaign}/${id}`;
    const row=await env.DB.prepare('INSERT INTO media(id,user_id,campaign_id,object_key,mime,bytes,created_at) SELECT ?,?,?,?,?,?,? WHERE COALESCE((SELECT SUM(bytes) FROM media WHERE user_id=?),0)+?<=104857600 RETURNING id').bind(id,user.id,campaign,object,mime,bytes.length,now(),user.id,bytes.length).first();
    check(row,409,'The 100 MiB account-image limit was reached. Remove old uploads first.');
    try{await env.MEDIA.put(object,bytes,{httpMetadata:{contentType:mime}});}catch{await env.DB.prepare('DELETE FROM media WHERE user_id=? AND id=?').bind(user.id,id).run();throw new HttpError(503,'Image upload did not complete. Keep your original file and retry.');}
    return json({id,url:`/api/cloud/media/${id}`,bytes:bytes.length},201);
   }
   const row=await env.DB.prepare('SELECT object_key,mime FROM media WHERE user_id=? AND id=?').bind(user.id,cleanId(parts[1])).first();check(row,404,'Account image not found.');
   if(method==='GET'){const object=await env.MEDIA.get(row.object_key);check(object,404,'Account image is unavailable.');return new Response(object.body,{headers:{'Content-Type':row.mime,'Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff'}});}
   if(method==='DELETE'){await env.MEDIA.delete(row.object_key);await env.DB.prepare('DELETE FROM media WHERE user_id=? AND id=?').bind(user.id,parts[1]).run();return json({deleted:true});}
  }
  if(parts[0]==='designs'){
   if(parts.length===1&&method==='GET'){
    const campaign=cleanId(url.searchParams.get('campaign'));await getCampaign(env,user.id,campaign);
    const rows=await env.DB.prepare('SELECT * FROM design_jobs WHERE user_id=? AND campaign_id=? ORDER BY created_at DESC LIMIT 40').bind(user.id,campaign).all();return json({jobs:rows.results.map(jobView)});
   }
   if(parts.length===1&&method==='POST'){
    const d=await body(request,8000),idempotency=request.headers.get('idempotency-key');cleanId(idempotency);
    const previous=await env.DB.prepare('SELECT * FROM design_jobs WHERE user_id=? AND request_key=?').bind(user.id,idempotency).first();
    if(previous){check(previous.campaign_id===d.campaign_id&&previous.prompt===d.prompt,409,'This generation request was already used for a different prompt. Check its saved job before creating a new request.');return json(jobView(previous));}
    const campaign=cleanId(d.campaign_id);await getCampaign(env,user.id,campaign);
    check(typeof d.prompt==='string'&&d.prompt.trim().length>=10&&d.prompt.length<=3000,400,'Review a design prompt of 10–3,000 characters.');
    check(d.confirm_provider_usage===true,400,'Confirm generation with your image-provider credits.');
    const saved=await keyFor(env,user.id,'muapi');await consume(env,user.id,'design',2,86400);
    const id=crypto.randomUUID();
    // Commit dispatch intent BEFORE provider I/O. Unknown states are never resubmitted.
    const inserted=await env.DB.prepare('INSERT INTO design_jobs(id,user_id,campaign_id,request_key,prompt,model,status,created_at,updated_at) VALUES(?,?,?,?,?,?,?, ?,?) ON CONFLICT(user_id,request_key) DO NOTHING RETURNING id').bind(id,user.id,campaign,idempotency,d.prompt,saved.model,'submitting',now(),now()).first();
    if(!inserted)return json(jobView(await env.DB.prepare('SELECT * FROM design_jobs WHERE user_id=? AND request_key=?').bind(user.id,idempotency).first()));
    try{const providerId=await submitDesign(saved.key,saved.model,d.prompt,fetcher);await env.DB.prepare('UPDATE design_jobs SET provider_id=?,status=?,updated_at=? WHERE user_id=? AND id=?').bind(providerId,'processing',now(),user.id,id).run();}
    catch{await env.DB.prepare('UPDATE design_jobs SET status=?,updated_at=? WHERE user_id=? AND id=?').bind('needs_attention',now(),user.id,id).run();}
    return json(jobView(await ownedJob(env,user.id,id)),201);
   }
   const job=await ownedJob(env,user.id,parts[1]);
   if(parts[2]==='image'&&method==='GET'){
    check(job.status==='completed',409,'The design is not complete.');const urls=JSON.parse(job.results),index=Number(url.searchParams.get('index')||0),image=urls[index];check(Number.isInteger(index)&&image&&designUrl(image),404,'Design image not found.');
    const response=await fetcher(image,{redirect:'manual',signal:AbortSignal.timeout(20000)}),type=response.headers.get('content-type')?.split(';')[0];check(response.ok&&['image/jpeg','image/png','image/webp'].includes(type),502,'Provider image is unavailable.');
    return new Response(await limited(response,10*1024*1024),{headers:{'Content-Type':type,'Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff'}});
   }
   if(parts.length===2&&method==='POST'){
    await consume(env,user.id,'poll',120);if(job.status==='processing'&&job.provider_id){
     const saved=await keyFor(env,user.id,'muapi'),result=await pollDesign(saved.key,job.provider_id,fetcher);
     await env.DB.prepare('UPDATE design_jobs SET status=?,results=?,updated_at=? WHERE user_id=? AND id=?').bind(result.status,JSON.stringify(result.urls),now(),user.id,job.id).run();
    }
    return json(jobView(await ownedJob(env,user.id,job.id)));
   }
   if(parts.length===2&&method==='GET')return json(jobView(job));
  }
  if(parts[0]==='account'&&parts[1]==='export'&&method==='GET'){
   const campaigns=await env.DB.prepare('SELECT payload FROM campaigns WHERE user_id=?').bind(user.id).all(),ideas=await env.DB.prepare('SELECT campaign_id,payload FROM saved_ideas WHERE user_id=?').bind(user.id).all(),jobs=await env.DB.prepare('SELECT * FROM design_jobs WHERE user_id=?').bind(user.id).all();
   return json({schema:'prism/account-export/1',campaigns:campaigns.results.map(r=>JSON.parse(r.payload)),ideas:ideas.results.map(r=>({...r,payload:JSON.parse(r.payload)})),designs:jobs.results.map(jobView),note:'Provider keys and original image files are excluded. Download generated images separately.'});
  }
  if(parts[0]==='account'&&method==='DELETE'){
   const d=await body(request,1000);check(d.confirm==='DELETE MY ACCOUNT',400,'Confirm account deletion explicitly.');
   const objects=await env.DB.prepare('SELECT object_key FROM media WHERE user_id=?').bind(user.id).all();
   if(objects.results.length){check(env.MEDIA,503,'Image storage is unavailable; deletion did not complete.');for(const o of objects.results)await env.MEDIA.delete(o.object_key);}
   await env.DB.prepare('DELETE FROM users WHERE id=?').bind(user.id).run();return json({deleted:true},200,{'Set-Cookie':'__Host-prism-session=; Path=/; Max-Age=0; Secure; HttpOnly; SameSite=Lax'});
  }
  throw new HttpError(404,'Account operation not found.');
 }catch(error){
  // Do not echo raw provider errors, SQL, keys or OAuth authorization codes.
  return json({detail:error instanceof HttpError?error.message:'This operation could not complete. Your saved work is retained.'},error instanceof HttpError?error.status:503);
 }
}
