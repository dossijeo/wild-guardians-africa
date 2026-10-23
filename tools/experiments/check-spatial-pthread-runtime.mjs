import {createServer} from 'node:http';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {chromium} from 'playwright';
import {WORKER_SPATIAL_PROFILE,ANIMAL_SPATIAL_PROFILES} from '../../src/world/wild-engine/spatial-movement-profiles.js';
const preparation=process.env.WG_PREPARE_TEST==='1';
const server=createServer(async(req,res)=>{
 res.setHeader('Cross-Origin-Opener-Policy','same-origin');
 res.setHeader('Cross-Origin-Embedder-Policy','require-corp');
 try{
  if(req.url==='/'){res.setHeader('Content-Type','text/html');res.end('<!doctype html><title>Wild Engine pthread runtime QA</title>');return;}
  const files={'/qa-spatial-pthread-preparation.js':['text/javascript','tools/experiments/qa-spatial-pthread-preparation.js'],'/spatial-threaded.mjs':['text/javascript','tools/experiments/spatial-threaded.mjs'],'/spatial-threaded.wasm':['application/wasm','tools/experiments/spatial-threaded.wasm']};
  const entry=files[req.url];if(!entry){res.writeHead(404);res.end();return;}
  res.setHeader('Content-Type',entry[0]);res.end(await readFile(entry[1]));
 }catch(error){res.writeHead(500);res.end(String(error));}
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const browser=await chromium.launch({channel:'chrome',headless:true});
try{
 const page=await browser.newPage(),errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 await page.goto(`http://127.0.0.1:${server.address().port}/`);
 const result=await page.evaluate(async({preparation,profiles})=>{
  const {default:create}=await import('/spatial-threaded.mjs');const m=await create();
  try{if(preparation)return await (await import('/qa-spatial-pthread-preparation.js')).verifyThreadPreparation(m,profiles);return {isolated:crossOriginIsolated,shared:m.HEAPU8.buffer instanceof SharedArrayBuffer,bytes:m.HEAPU8.buffer.byteLength,pool:m.PThread.unusedWorkers.length,props:m._spatial_generate_biome(712,4,0,0),sectors:m._spatial_build_nav_profile(1,.28,1)};}
  finally{m.PThread.terminateAllThreads();}
 },{preparation,profiles:[WORKER_SPATIAL_PROFILE,...Object.values(ANIMAL_SPATIAL_PROFILES)]});
 if(!preparation&&(!result.isolated||!result.shared||result.pool!==1||result.sectors!==16||errors.length))throw Error(JSON.stringify({result,errors}));
 if(errors.length)throw Error(JSON.stringify(errors));
 const report={preparation,scope:preparation?'Real pthread preparation; see result.scope for limits.':'Full engine compiled with Emscripten pthread runtime, one preloaded worker and shared linear memory. Generation is still synchronous here: this proves browser runtime boot only, not parallel generation, itch.io deployment, Vite packaging or Tauri compatibility.',result,errors};
 await mkdir('docs/qa/wild-engine-pthreads',{recursive:true});
 await writeFile(`docs/qa/wild-engine-pthreads/${preparation?'thread-preparation':'runtime-boot'}.json`,JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));
}finally{await browser.close();await new Promise(resolve=>server.close(resolve));}
