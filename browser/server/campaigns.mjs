import {check,cleanId,now,HttpError,publicHttps} from './security.mjs';
const MAX_BYTES=250000;
function bounded(value,max){check(typeof value==='string'&&value.length<=max,400,'Campaign text exceeded its limit.');return value;}
export function campaignPayload(value){
 check(value&&typeof value==='object'&&!Array.isArray(value),400,'Send a campaign object.');
 const allowed=['id','brief','references','selected','board_id','board_snapshot','imports','ideas','web','created_at','design_prompts'];
 const payload=Object.fromEntries(allowed.filter(k=>value[k]!==undefined).map(k=>[k,value[k]]));
 cleanId(payload.id);check(payload.brief&&typeof payload.brief==='object',400,'A campaign brief is required.');
 bounded(payload.brief.product||'',180);
 check(!payload.references||Array.isArray(payload.references)&&payload.references.length<=100,400,'Too many references.');
 check(!payload.selected||Array.isArray(payload.selected)&&payload.selected.length<=100,400,'Too many selected references.');
 // Never accept provider keys, image blobs or vectors as campaign data.
 const serialized=JSON.stringify(payload);
 check(new TextEncoder().encode(serialized).length<=MAX_BYTES,413,'This campaign is too large to sync. Export it locally.');
 check(!/"(?:api[_-]?key|sessionKey|password|csrf|encrypted|blob|vector)"\s*:/i.test(serialized),400,'Campaigns cannot contain credentials, image files or vectors.');
 if(payload.web?.sources)for(const s of payload.web.sources)check(publicHttps(s.url),400,'Invalid research source URL.');
 return payload;
}
export async function listCampaigns(env,user){
 const result=await env.DB.prepare('SELECT id,title,version,created_at,updated_at FROM campaigns WHERE user_id=? ORDER BY updated_at DESC LIMIT 100').bind(user).all();return result.results;
}
export async function getCampaign(env,user,id){
 const row=await env.DB.prepare('SELECT payload,version,created_at,updated_at FROM campaigns WHERE user_id=? AND id=?').bind(user,cleanId(id)).first();
 check(row,404,'Campaign not found in this account.');return {...row,payload:JSON.parse(row.payload)};
}
export async function saveCampaign(env,user,id,value,version){
 const payload=campaignPayload(value);check(id===payload.id,400,'Campaign identifier does not match.');
 const title=(payload.brief.product||'Untitled campaign').slice(0,180),serialized=JSON.stringify(payload);
 check(Number.isInteger(version)&&version>=0,400,'A campaign version is required.');
 let row;
 if(version===0)row=await env.DB.prepare('INSERT INTO campaigns(id,user_id,title,payload,version,created_at,updated_at) SELECT ?,?,?,?,1,?,? WHERE (SELECT COUNT(*) FROM campaigns WHERE user_id=?)<50 ON CONFLICT(user_id,id) DO NOTHING RETURNING version,updated_at').bind(id,user,title,serialized,now(),now(),user).first();
 else row=await env.DB.prepare('UPDATE campaigns SET title=?,payload=?,version=version+1,updated_at=? WHERE user_id=? AND id=? AND version=? RETURNING version,updated_at').bind(title,serialized,now(),user,id,version).first();
 check(row,409,'This campaign changed in another tab/device, or the 50-campaign limit was reached. Open the latest saved version before retrying.');return row;
}
export async function deleteCampaign(env,user,id){
 await getCampaign(env,user,id);
 const media=await env.DB.prepare('SELECT object_key FROM media WHERE user_id=? AND campaign_id=?').bind(user,id).all();
 if(media.results.length){check(env.MEDIA,503,'Image storage is unavailable; deletion has not completed.');for(const item of media.results)await env.MEDIA.delete(item.object_key);}
 await env.DB.prepare('DELETE FROM campaigns WHERE user_id=? AND id=?').bind(user,id).run();return {deleted:true};
}
export async function saveIdea(env,user,campaign,idea){
 await getCampaign(env,user,campaign);
 check(idea&&typeof idea==='object'&&!Array.isArray(idea),400,'Send a creative idea.');
 const title=bounded(idea.title,200),payload=JSON.stringify(idea);
 check(payload.length<=20000&&!/"(?:api[_-]?key|password|csrf|vector|blob)"\s*:/i.test(payload),400,'This idea is too large or contains private fields.');
 const id=crypto.randomUUID();
 const row=await env.DB.prepare('INSERT INTO saved_ideas(id,user_id,campaign_id,title,payload,created_at) SELECT ?,?,?,?,?,? WHERE (SELECT COUNT(*) FROM saved_ideas WHERE user_id=?)<150 RETURNING id').bind(id,user,campaign,title,payload,now(),user).first();
 check(row,409,'The 150 saved-idea limit was reached. Remove an old idea first.');return {id};
}
