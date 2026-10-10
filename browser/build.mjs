import {build} from 'esbuild';
import {mkdir,copyFile,readFile,writeFile,readdir,stat} from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';

const out=path.resolve('dist'), web=path.resolve('../src/prism/web');
const buildId=createHash('sha256').update(await readFile(web+'/app.js')).update(await readFile(web+'/style.css')).update(await readFile('runtime.mjs')).digest('hex').slice(0,16);
await mkdir(out+'/static/ort',{recursive:true});
await build({entryPoints:['runtime.mjs','clip-worker.mjs','decode-worker.mjs'],outdir:out+'/static',bundle:true,
             format:'esm',platform:'browser',target:'es2022',minify:true,sourcemap:false,define:{PRISM_BUILD_ID:JSON.stringify(buildId)}});
for(const name of ['style.css','icon.svg'])await copyFile(web+'/'+name,out+'/static/'+name);
await copyFile(web+'/app.js',out+'/static/app.js');
let html=await readFile(web+'/index.html','utf8');
html=html.replace('<script src="/static/app.js?v=1" defer></script>',`<script type="module" src="/static/runtime.js?v=${buildId}"></script>`).replace('/static/style.css?v=1',`/static/style.css?v=${buildId}`);
await writeFile(out+'/index.html',html);
const ort=path.resolve('node_modules/onnxruntime-web/dist');
for(const name of await readdir(ort))if(/^ort-wasm-simd-threaded.*\.(wasm|mjs)$/.test(name))await copyFile(ort+'/'+name,out+'/static/ort/'+name);
await copyFile('_headers',out+'/_headers');
await copyFile('_redirects',out+'/_redirects');
async function sizes(dir){for(const name of await readdir(dir)){const file=dir+'/'+name,info=await stat(file);if(info.isDirectory())await sizes(file);else if(info.size>25*1024*1024)throw Error('Pages asset exceeds 25 MiB: '+file);}}
await sizes(out);
console.log('Built the browser app. Model weights load from the pinned Hugging Face revision.');
