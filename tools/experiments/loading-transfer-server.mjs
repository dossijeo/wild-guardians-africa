// QA-only transport. Native assets are read once and served unchanged.
import {createServer} from 'vite';
import {createReadStream} from 'node:fs';
import {stat} from 'node:fs/promises';
import path from 'node:path';
import {setTimeout as delay} from 'node:timers/promises';
import {fileURLToPath} from 'node:url';

export function rewriteLoadingQaAssetUrl(code){
 const needle='return new URL(variants.get(path)??path,base).href;';
 if(!code.includes(needle))throw Error('QA asset alias source changed; refusing an unverified rewrite');
 return code.replace(needle,`const address=new URL(variants.get(path)??path,base),qa=new URLSearchParams(location.search),scope=qa.get('qa-transfer-scope')??'cache-v1',mode=qa.get('qa-transfer-mode')??'cache';
  if(!address.pathname.startsWith('/assets/')&&!address.pathname.startsWith('/content/'))return address.href;
  const group=mode==='slow'?'slow-'+scope:mode==='partial'&&/\\.(glb|hdr)$/.test(address.pathname)?'partial-'+scope:scope;
  address.pathname='/__qa_assets/'+group+address.pathname;return address.href;`);
}
export function loadingQaAssetPath(root,url){
 let pathname;try{pathname=decodeURIComponent(new URL(url,'http://localhost/').pathname);}catch{return null;}
 const match=pathname.match(/^\/__qa_assets\/([a-zA-Z0-9_-]+)\/(assets|content)\/(.+)$/);if(!match)return null;
 const file=path.resolve(root,match[2],match[3]);if(!file.startsWith(path.resolve(root)+path.sep))return null;
 return {file,group:match[1],slow:match[1].startsWith('slow-')};
}
const mime={'.json':'application/json','.webp':'image/webp','.png':'image/png','.jpg':'image/jpeg','.glb':'model/gltf-binary','.css':'text/css','.woff2':'font/woff2','.opus':'audio/ogg'};

export async function startLoadingTransferServer({root=process.cwd(),port=5293,slowBytesPerSecond=1250000}={}){
 const groups=new Map(),publicRoot=path.join(root,'public');
 const server=await createServer({root,cacheDir:path.join(root,'.cache/loading-transfer-vite'),server:{host:'127.0.0.1',port,strictPort:true},plugins:[{
  name:'loading-transfer-qa-only',enforce:'pre',
  transform(code,id){if(id.split('?')[0].replaceAll('\\','/').endsWith('/src/rendering/asset-url.js'))return rewriteLoadingQaAssetUrl(code);},
  configureServer(vite){vite.middlewares.use(async(req,res,next)=>{
   if(req.url==='/__qa_transfer_stats'){res.setHeader('Content-Type','application/json');res.setHeader('Cache-Control','no-store');res.end(JSON.stringify({scope:'QA asset bodies only; original requests, unchanged bytes',groups:Object.fromEntries(groups)}));return;}
   const asset=loadingQaAssetPath(publicRoot,req.url);if(!asset)return next();
   let metadata;try{metadata=await stat(asset.file);if(!metadata.isFile())return next();}catch{return next();}
   const group=groups.get(asset.group)??{requests:0,bytes:0,completed:0,cancelled:0};groups.set(asset.group,group);group.requests++;
   res.setHeader('Content-Type',mime[path.extname(asset.file)]??'application/octet-stream');res.setHeader('Content-Length',metadata.size);res.setHeader('Cache-Control','public, max-age=31536000, immutable');res.setHeader('Timing-Allow-Origin','*');
   const input=createReadStream(asset.file,{highWaterMark:65536});let complete=false;
   res.once('close',()=>{input.destroy();if(!complete)group.cancelled++;});
   try{for await(const chunk of input){if(asset.slow)await delay(chunk.byteLength/slowBytesPerSecond*1000);if(res.destroyed)break;group.bytes+=chunk.byteLength;if(!res.write(chunk))await new Promise(resolve=>{const finish=()=>{for(const event of ['drain','close','error'])res.off(event,finish);resolve();};for(const event of ['drain','close','error'])res.once(event,finish);});}if(!res.destroyed){complete=true;group.completed++;res.end();}}
   catch(error){if(!res.destroyed)res.destroy(error);}
  });}
 }]});
 await server.listen();return server;
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const server=await startLoadingTransferServer();console.log('Loading transfer QA http://127.0.0.1:5293; scope/mode in original native fixture URL; max-age cache and1.25MB/s slow route.');
 const close=()=>server.close().then(()=>process.exit(0));process.once('SIGINT',close);process.once('SIGTERM',close);
}
