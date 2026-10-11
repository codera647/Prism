const encoder=new TextEncoder();
export class HttpError extends Error {constructor(status,message){super(message);this.status=status;}}
export const check=(condition,status,message)=>{if(!condition)throw new HttpError(status,message);};
export const b64=bytes=>btoa(String.fromCharCode(...new Uint8Array(bytes))).replaceAll('+','-').replaceAll('/','_').replaceAll('=','');
export const unb64=value=>Uint8Array.from(atob(value.replaceAll('-','+').replaceAll('_','/')),c=>c.charCodeAt(0));
export const random=()=>b64(crypto.getRandomValues(new Uint8Array(32)));
export const hash=async value=>b64(await crypto.subtle.digest('SHA-256',encoder.encode(value)));
export const now=()=>Math.floor(Date.now()/1000);
export const json=(value,status=200,headers={})=>Response.json(value,{status,headers:{'Cache-Control':'no-store','X-Content-Type-Options':'nosniff',...headers}});
export const cookie=(request,name)=>request.headers.get('cookie')?.split(';').map(s=>s.trim()).find(s=>s.startsWith(name+'='))?.slice(name.length+1)||'';
export function sameOrigin(request){check(request.headers.get('origin')===new URL(request.url).origin,403,'Use Prism on this origin.');}
export async function body(request,max=300000){
 check(!Number(request.headers.get('content-length'))||Number(request.headers.get('content-length'))<=max,413,'This request is too large.');
 const reader=request.body?.getReader();if(!reader)throw new HttpError(400,'A JSON body is required.');
 let length=0,parts=[];
 try{while(true){const {done,value}=await reader.read();if(done)break;length+=value.length;check(length<=max,413,'This request is too large.');parts.push(value);}}finally{await reader.cancel().catch(()=>{});}
 const bytes=new Uint8Array(length);let offset=0;for(const p of parts){bytes.set(p,offset);offset+=p.length;}
 try{return JSON.parse(new TextDecoder().decode(bytes));}catch{throw new HttpError(400,'Send valid JSON.');}
}
export function cleanId(id){check(typeof id==='string'&&/^[a-zA-Z0-9:_-]{1,100}$/.test(id),400,'Invalid record identifier.');return id;}
export async function vaultKey(env){
 check(typeof env.VAULT_KEY==='string',503,'Saved-key storage is not configured.');
 let bytes;try{bytes=unb64(env.VAULT_KEY);}catch{throw new HttpError(503,'Saved-key storage is not configured.');}
 check(bytes.length===32,503,'Saved-key storage is not configured.');
 return crypto.subtle.importKey('raw',bytes,'AES-GCM',false,['encrypt','decrypt']);
}
export async function encryptKey(env,user,provider,value){
 const iv=crypto.getRandomValues(new Uint8Array(12)),key=await vaultKey(env);
 const encrypted=await crypto.subtle.encrypt({name:'AES-GCM',iv,additionalData:encoder.encode(`prism:v1:${user}:${provider}`)},key,encoder.encode(value));
 return `v1.${b64(iv)}.${b64(encrypted)}`;
}
export async function decryptKey(env,user,provider,encrypted){
 const [version,iv,bytes]=encrypted.split('.');check(version==='v1',503,'Saved key requires operator recovery.');
 try{return new TextDecoder().decode(await crypto.subtle.decrypt({name:'AES-GCM',iv:unb64(iv),additionalData:encoder.encode(`prism:v1:${user}:${provider}`)},await vaultKey(env),unb64(bytes)));}
 catch{throw new HttpError(503,'Saved key requires operator recovery.');}
}
export async function principal(request,env,mutation=false){
 check(env.DB,503,'Account database is not configured.');
 const token=cookie(request,'__Host-prism-session');check(token.length>=40&&token.length<=100,401,'Sign in with Google first.');
 const row=await env.DB.prepare('SELECT u.id,u.name,u.email,s.csrf FROM sessions s JOIN users u ON u.id=s.user_id WHERE s.token_hash=? AND s.expires_at>?').bind(await hash(token),now()).first();
 check(row,401,'Your session expired. Sign in with Google again.');
 if(mutation){sameOrigin(request);check(request.headers.get('x-csrf-token')===row.csrf,403,'Refresh Prism before saving.');}
 return row;
}
export async function consume(env,user,kind,limit,seconds=3600){
 // Bound retained counters without scheduled infrastructure. Indexed user cleanup.
 await env.DB.prepare('DELETE FROM usage_buckets WHERE user_id=? AND kind=? AND bucket<?').bind(user,kind,Math.floor(now()/seconds)-Math.ceil(8*86400/seconds)).run();
 const bucket=Math.floor(now()/seconds);
 const result=await env.DB.prepare('INSERT INTO usage_buckets(user_id,kind,bucket,count) VALUES(?,?,?,1) ON CONFLICT(user_id,kind,bucket) DO UPDATE SET count=count+1 WHERE count<? RETURNING count').bind(user,kind,bucket,limit).first();
 check(result,429,'Your Prism request limit was reached. Try again later.');
}
export function publicHttps(value){
 try{const u=new URL(value),h=u.hostname.toLowerCase();return u.protocol==='https:'&&!u.username&&!u.password&&!u.port&&!/^(?:localhost|.*\.localhost|.*\.local|.*\.internal)$/.test(h)&&!h.includes(':')&&!/^\d+(?:\.\d+){3}$/.test(h)&&h.includes('.')?u.href:null;}catch{return null;}
}
