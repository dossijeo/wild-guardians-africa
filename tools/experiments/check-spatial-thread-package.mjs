import {createServer} from 'node:http';
import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {chromium} from 'playwright';
// QA-only ABI observation derived from the emitted Emscripten establishStackSpace.
for(const name of ['spatial-threaded.mjs','spatial-threaded.wasm']){
 const [built,current]=await Promise.all([readFile('dist/wild-engine/'+name),readFile('public/wild-engine/'+name)]);
 if(!built.equals(current))throw Error('Packaged runtime is stale: '+name+'; rebuild before testing');
}
const runtimeSource=await readFile('dist/wild-engine/spatial-threaded.mjs','utf8');
const stackMatch=runtimeSource.match(/var stackSize=\(growMemViews\(\),HEAPU32\)\[pthread_ptr\+(\d+)>>2\]/);
const stackSizeOffset=stackMatch?Number(stackMatch[1]):null;
const prefix='/nested/game/';
const server=createServer(async(req,res)=>{
 res.setHeader('Cross-Origin-Opener-Policy','same-origin');
 res.setHeader('Cross-Origin-Embedder-Policy','require-corp');
 res.setHeader('Cross-Origin-Resource-Policy','cross-origin');
 try{
  if(req.url===prefix){res.setHeader('Content-Type','text/html');res.end('<!doctype html><title>Packaged pthread QA</title>');return;}
  const names=['spatial-threaded.mjs','spatial-threaded.wasm'];
  const name=names.find(n=>req.url===prefix+'wild-engine/'+n);
  if(!name){res.writeHead(404);res.end();return;}
  res.setHeader('Content-Type',name.endsWith('.wasm')?'application/wasm':'text/javascript');
  res.end(await readFile('dist/wild-engine/'+name));
 }catch(e){res.writeHead(500);res.end(String(e));}
});
await new Promise(r=>server.listen(0,'127.0.0.1',r));
const childOrigin=`http://127.0.0.1:${server.address().port}`,url=childOrigin+prefix;
const parent=createServer((_req,res)=>{
 res.setHeader('Cross-Origin-Opener-Policy','same-origin');
 res.setHeader('Cross-Origin-Embedder-Policy','require-corp');
 res.setHeader('Permissions-Policy',`cross-origin-isolated=(self "${childOrigin}")`);
 res.setHeader('Content-Type','text/html');res.end(`<!doctype html><title>Cross-origin embed QA</title><iframe allow="cross-origin-isolated" src="${url}"></iframe>`);
});
await new Promise(r=>parent.listen(0,'127.0.0.1',r));
const browser=await chromium.launch({channel:'chrome',headless:true});
async function probe(frame){return frame.evaluate(async({stackSizeOffset})=>{
 if(!crossOriginIsolated||typeof SharedArrayBuffer==='undefined')throw Error('Frame is not isolated');
 const {default:factory}=await import('./wild-engine/spatial-threaded.mjs'),m=await factory(),rows=[];
 try{
  if(!(m.HEAPU8.buffer instanceof SharedArrayBuffer))throw Error('Runtime memory is not shared');
  for(const [biome,name] of ['sabana','desierto','gran-rio','volcanes','manglares','gran-canon'].entries()){
   m._spatial_generate_biome(712,biome,0,0);m._spatial_build_nav_profile(1,.28,1);
   const id=m._spatial_prepare_start(1,0),t=performance.now();if(id<=0)throw Error('Job admission failed');
   while(m._spatial_prepare_status()!==3){if(performance.now()-t>15000)throw Error('Worker timeout');await new Promise(r=>setTimeout(r,1));}
   const worker=m._spatial_prepare_metric(0),published=m._spatial_prepare_publish(id);
   if(worker!==1||published<=0)throw Error('No worker publication');m._spatial_prepare_release();const threadPointers=Object.keys(m.PThread.pthreads).map(Number);if(threadPointers.length!==1)throw Error('Expected exactly one native worker');
   const stackBytes=stackSizeOffset===null?null:threadPointers.map(ptr=>new Uint32Array(m.HEAPU8.buffer)[(ptr+stackSizeOffset)>>>2]);
   rows.push({biome:name,worker,published,pthreadStackBytes:stackBytes,linearCapacityBytes:m.HEAPU8.buffer.byteLength});
  }
  return {isolated:crossOriginIsolated,shared:true,origin:location.origin,rows};
 }finally{
  m._spatial_prepare_shutdown();const deadline=performance.now()+15000;
  while(m._spatial_prepare_status()!==5||m.PThread.unusedWorkers.length!==1){if(performance.now()>deadline)throw Error('Shutdown timeout');await new Promise(r=>setTimeout(r,1));}
  m._spatial_prepare_release();m.PThread.terminateAllThreads();
  if(Object.keys(m.PThread.pthreads).length||m.PThread.unusedWorkers.length)throw Error('Worker resources remain');
 }
},{stackSizeOffset});}
try{
 const page=await browser.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(url);const nestedTopLevel=await probe(page);
 await page.goto(`http://127.0.0.1:${parent.address().port}/`);
 await page.waitForFunction(()=>document.querySelector('iframe')?.contentWindow!=null);
 const frame=page.frames().find(f=>f.url()===url)??await page.waitForEvent('framenavigated',{predicate:f=>f.url()===url});await frame.waitForLoadState('load');
 const crossOriginIframe=await probe(frame);
 if(errors.length)throw Error(JSON.stringify(errors));
 const artifacts=[];for(const name of ['spatial-threaded.mjs','spatial-threaded.wasm']){const bytes=await readFile('dist/wild-engine/'+name);artifacts.push({name,bytes:bytes.length,sha256:createHash('sha256').update(bytes).digest('hex')});}
 const report={scope:'Built Vite dist runtime in Chrome: nested top-level URL and cross-origin iframe with explicit isolation delegation, six biomes each and worker teardown. Different localhost ports, not actual itch deployment or complete game rendering.',stackObservation:{method:'QA-only stack-size field offset parsed from emitted runtime; reserved linear stack size, not control-stack or peak stack usage',offset:stackSizeOffset},artifacts,nestedTopLevel,crossOriginIframe,errors};
 await writeFile(process.env.WG_PACKAGE_REPORT??'docs/qa/wild-engine-pthreads/thread-package.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));
}finally{await browser.close();await Promise.all([server,parent].map(s=>new Promise(r=>s.close(r))));}
