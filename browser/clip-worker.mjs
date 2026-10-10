import {AutoTokenizer,AutoProcessor,CLIPTextModelWithProjection,CLIPVisionModelWithProjection,RawImage,env} from '@huggingface/transformers';
import {policy,normalize} from './core.mjs';
env.allowLocalModels=false;
env.backends.onnx.wasm.numThreads=1;
env.backends.onnx.wasm.wasmPaths='/static/ort/';
let models;
function progress(p){if(p.status==='progress')postMessage({progress:`Downloading CLIP ${Math.round(p.progress||0)}%`});else if(p.status==='initiate')postMessage({progress:'Preparing browser CLIP model…'});}
async function load(){
  if(!models)models=(async()=>{
    const options={revision:policy.model.revision,device:'wasm',dtype:'q8',progress_callback:progress};
    const tokenizer=await AutoTokenizer.from_pretrained(policy.model.name,options);
    const processor=await AutoProcessor.from_pretrained(policy.model.name,options);
    const vision=await CLIPVisionModelWithProjection.from_pretrained(policy.model.name,options);
    const text=await CLIPTextModelWithProjection.from_pretrained(policy.model.name,options);
    return {tokenizer,processor,vision,text};
  })().catch(e=>{models=null;throw e;});
  return models;
}
async function texts(values){
  const {tokenizer,text}=await load(),result=[];
  for(const value of values){
    const ids=tokenizer.encode(value,{add_special_tokens:false}),chunks=[];
    for(let i=0;i<Math.max(1,ids.length);i+=75)chunks.push(tokenizer.decode(ids.slice(i,i+75),{skip_special_tokens:true}));
    const inputs=tokenizer(chunks,{padding:true,truncation:true,max_length:77});
    const {text_embeds}=await text(inputs),dim=512,sum=new Array(dim).fill(0);
    for(let i=0;i<chunks.length;i++){const row=normalize(text_embeds.data.slice(i*dim,(i+1)*dim));for(let j=0;j<dim;j++)sum[j]+=row[j];}
    result.push(normalize(sum));
  }
  return result;
}
async function images(blobs){
  const {processor,vision}=await load(),result=[];
  for(let i=0;i<blobs.length;i++){
    postMessage({progress:`Analyzing image ${i+1} of ${blobs.length}…`});
    const image=await RawImage.fromBlob(blobs[i]);
    const inputs=await processor(image);
    const {image_embeds}=await vision(inputs);
    result.push(normalize(image_embeds.data));
  }
  return result;
}
// One inference at a time prevents competing models and uncontrolled memory use.
let queue=Promise.resolve();
onmessage=event=>{const {id,kind,values}=event.data;queue=queue.then(async()=>{
  try{const result=kind==='images'?await images(values):await texts(values);postMessage({id,result});}
  catch(error){postMessage({id,error:error.message||'Browser CLIP failed. Try the desktop app on this device.'});}
});};
