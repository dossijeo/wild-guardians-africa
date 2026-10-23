import {createServer} from 'node:http';
import {readFile,writeFile} from 'node:fs/promises';
import {chromium} from 'playwright';
const prefix='/nested/game/';
const server=createServer(async(req,res)=>{
 res.setHeader('Cross-Origin-Opener-Policy','same-origin');
 res.setHeader('Cross-Origin-Embedder-Policy','require-corp');
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
const browser=await chromium.launch({channel:'chrome',headless:true});
try{
 const page=await browser.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(`http://127.0.0.1:${server.address().port}${prefix}`);
 const result=await page.evaluate(async()=>{
  const {default:factory}=await import('./wild-engine/spatial-threaded.mjs');
  const m=await factory();
  try{
   m._spatial_generate_biome(712,4,0,0);m._spatial_build_nav_profile(1,.28,1);
   const id=m._spatial_prepare_start(1,0),t=performance.now();
   while(m._spatial_prepare_status()!==3){if(performance.now()-t>15000)throw Error('Timeout');await new Promise(r=>setTimeout(r,1));}
   const worker=m._spatial_prepare_metric(0),published=m._spatial_prepare_publish(id);
   if(worker!==1||published<=0)throw Error('No worker publication');
   return {isolated:crossOriginIsolated,shared:m.HEAPU8.buffer instanceof SharedArrayBuffer,worker,published};
  }finally{m._spatial_prepare_shutdown();while(m._spatial_prepare_status()!==5||m.PThread.unusedWorkers.length!==1)await new Promise(r=>setTimeout(r,1));m._spatial_prepare_release();m.PThread.terminateAllThreads();}
 });
 if(errors.length)throw Error(JSON.stringify(errors));
 await writeFile('docs/qa/wild-engine-pthreads/thread-package.json',JSON.stringify({scope:'Vite dist runtime in Chrome from nested URL with isolation. Not actual itch deployment, full-game validation or Tauri.',result,errors},null,2)+'\n');
 console.log(result);
}finally{await browser.close();await new Promise(r=>server.close(r));}
