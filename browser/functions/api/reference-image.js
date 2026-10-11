import {imageLink} from '../../../src/prism/web/research-core.mjs';
import {limitedBody} from './discover.js';
export async function referenceImage(value,fetcher=fetch){
  if(typeof value!=='string'||value.length>2000)throw Error('Invalid image URL.');
  const url=imageLink(value);if(!url)throw Error('Only catalogue images from the supported image host can be imported.');
  const r=await fetcher(url,{redirect:'manual',signal:AbortSignal.timeout(15000)});
  const type=r.headers.get('content-type')?.split(';')[0];
  if(!r.ok||!['image/jpeg','image/png','image/webp'].includes(type))throw Error('This image is unavailable.');
  return new Response(await limitedBody(r,10*1024*1024),{headers:{'Content-Type':type,'Cache-Control':'public, max-age=3600','X-Content-Type-Options':'nosniff'}});
}
export async function onRequestGet({request}){
  try{return await referenceImage(new URL(request.url).searchParams.get('url'));}
  catch{return Response.json({detail:'Image unavailable or not supported. Upload a saved image instead.'},{status:400});}
}
