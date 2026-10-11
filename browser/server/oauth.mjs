import {createRemoteJWKSet,jwtVerify} from 'jose';
import {check,hash,random,now,cookie,json,HttpError} from './security.mjs';
const googleKeys=createRemoteJWKSet(new URL('https://www.googleapis.com/oauth2/v3/certs'));
const setCookie=(name,value,age)=>`${name}=${value}; Path=/; Max-Age=${age}; Secure; HttpOnly; SameSite=Lax`;
export function configured(env){return !!(env.DB&&env.GOOGLE_CLIENT_ID&&env.GOOGLE_CLIENT_SECRET&&env.VAULT_KEY);}
export async function validateGoogleToken(token,clientId,nonce,keys=googleKeys){
 const {payload}=await jwtVerify(token,keys,{audience:clientId,issuer:['https://accounts.google.com','accounts.google.com'],algorithms:['RS256'],maxTokenAge:'10m'});
 check(payload.nonce===nonce&&payload.email_verified===true&&typeof payload.sub==='string'&&typeof payload.email==='string',401,'Google sign-in could not be verified.');
 return {sub:payload.sub,email:payload.email,name:String(payload.name||payload.email).slice(0,120)};
}
export async function admitGoogleUser(env,identity){
 const allow=String(env.ALLOWED_EMAILS||'').toLowerCase().split(',').map(s=>s.trim()).filter(Boolean);
 check(!allow.length||allow.includes(identity.email.toLowerCase()),403,'This account is not on the pilot invitation list.');
 let user=await env.DB.prepare('SELECT id FROM users WHERE google_sub=?').bind(identity.sub).first();
 if(!user){
  user=await env.DB.prepare('INSERT INTO users(id,google_sub,email,name,created_at) SELECT ?,?,?,?,? WHERE (SELECT COUNT(*) FROM users)<? ON CONFLICT(google_sub) DO NOTHING RETURNING id').bind(crypto.randomUUID(),identity.sub,identity.email,identity.name,now(),Math.min(30,Math.max(1,Number(env.MAX_USERS)||30))).first();
  user ||= await env.DB.prepare('SELECT id FROM users WHERE google_sub=?').bind(identity.sub).first();
  check(user,403,'The 30-user pilot is full. Contact the Prism owner.');
 }
 await env.DB.prepare('UPDATE users SET email=?,name=? WHERE id=?').bind(identity.email,identity.name,user.id).run();return user;
}
export async function startOAuth(request,env){
 check(configured(env),503,'Google sign-in is awaiting database and OAuth configuration.');
 check(!request.headers.get('sec-fetch-site')||['same-origin','none'].includes(request.headers.get('sec-fetch-site')),403,'Start sign-in from Prism.');
 const state=random(),nonce=random(),verifier=random();
 await env.DB.batch([
  env.DB.prepare('DELETE FROM oauth_states WHERE expires_at<?').bind(now()),
  env.DB.prepare('INSERT INTO oauth_states(state_hash,nonce,verifier,expires_at) VALUES(?,?,?,?)').bind(await hash(state),nonce,verifier,now()+600)
 ]);
 const url=new URL('https://accounts.google.com/o/oauth2/v2/auth');
 url.search=new URLSearchParams({client_id:env.GOOGLE_CLIENT_ID,redirect_uri:new URL('/api/cloud/auth/callback',request.url).href,response_type:'code',scope:'openid email profile',state,nonce,code_challenge:await hash(verifier),code_challenge_method:'S256',prompt:'select_account'});
 return new Response(null,{status:302,headers:{Location:url.href,'Set-Cookie':setCookie('__Host-prism-oauth',state,600),'Cache-Control':'no-store','Referrer-Policy':'no-referrer'}});
}
export async function finishOAuth(request,env,fetcher=fetch){
 check(configured(env),503,'Google sign-in is not configured.');
 const url=new URL(request.url),state=url.searchParams.get('state'),code=url.searchParams.get('code');
 check(state&&state===cookie(request,'__Host-prism-oauth')&&code?.length<4000,401,'Google sign-in expired or was cancelled. Start again.');
 const row=await env.DB.prepare('DELETE FROM oauth_states WHERE state_hash=? AND expires_at>? RETURNING nonce,verifier').bind(await hash(state),now()).first();
 check(row,401,'This sign-in has expired or was already used.');
 const response=await fetcher('https://oauth2.googleapis.com/token',{method:'POST',body:new URLSearchParams({client_id:env.GOOGLE_CLIENT_ID,client_secret:env.GOOGLE_CLIENT_SECRET,code,code_verifier:row.verifier,redirect_uri:new URL('/api/cloud/auth/callback',request.url).href,grant_type:'authorization_code'}),signal:AbortSignal.timeout(15000)});
 check(response.ok,401,'Google could not finish sign-in. Start again.');
 const data=await response.json();let identity;
 try{identity=await validateGoogleToken(data.id_token,env.GOOGLE_CLIENT_ID,row.nonce);}catch{throw new HttpError(401,'Google sign-in could not be verified.');}
 const user=await admitGoogleUser(env,identity);
 const token=random(),csrf=random();
 await env.DB.batch([
  env.DB.prepare('DELETE FROM sessions WHERE expires_at<?').bind(now()),
  env.DB.prepare('INSERT INTO sessions(token_hash,user_id,csrf,expires_at) VALUES(?,?,?,?)').bind(await hash(token),user.id,csrf,now()+30*86400)
 ]);
 const headers=new Headers({Location:'/', 'Cache-Control':'no-store','Referrer-Policy':'no-referrer'});
 headers.append('Set-Cookie',setCookie('__Host-prism-session',token,30*86400));headers.append('Set-Cookie',setCookie('__Host-prism-oauth','',0));
 return new Response(null,{status:302,headers});
}
export async function logout(request,env){
 await env.DB.prepare('DELETE FROM sessions WHERE token_hash=?').bind(await hash(cookie(request,'__Host-prism-session'))).run();
 return json({signed_out:true},200,{'Set-Cookie':setCookie('__Host-prism-session','',0)});
}
