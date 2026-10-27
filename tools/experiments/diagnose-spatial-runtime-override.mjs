import {chromium} from 'playwright';
import {readFile,writeFile} from 'node:fs/promises';
const results=[];
for(const directory of ['public/wild-engine','.codex-tmp/release-border-candidate']){
 const browser=await chromium.launch({channel:'chrome',headless:true}),context=await browser.newContext(),page=await context.newPage(),events=[];
 page.on('console',m=>events.push({type:m.type(),text:m.text()}));page.on('pageerror',e=>events.push({error:String(e)}));page.on('worker',w=>events.push({worker:w.url()}));context.on('requestfailed',r=>events.push({failed:r.url(),reason:r.failure()}));
 await context.route(/\/wild-engine\/spatial-threaded\.(mjs|wasm)(?:\?.*)?$/,async route=>{const name=new URL(route.request().url()).pathname.split('/').at(-1);events.push({load:name});const response=await route.fetch();await route.fulfill({response,contentType:name.endsWith('.wasm')?'application/wasm':'application/javascript',body:await readFile(directory+'/'+name)});});
 await page.goto('http://127.0.0.1:5220/');
 const outcome=await page.evaluate(async()=>{try{return await Promise.race([(async()=>{const {default:factory}=await import('/wild-engine/spatial-threaded.mjs');const memory=new WebAssembly.Memory({initial:256,maximum:8192,shared:true});const runtime=await factory({wasmMemory:memory,printErr:console.error,monitorRunDependencies:n=>console.log('dependencies',n)});const result={ready:true,workers:runtime.PThread.unusedWorkers.length};runtime.PThread.terminateAllThreads();return result;})(),new Promise(resolve=>setTimeout(()=>resolve({timeout:true}),20000))]);}catch(e){return {error:String(e),stack:e.stack};}});
 results.push({directory,outcome,events});await browser.close();
}
await writeFile(process.env.WG_RUNTIME_DIAGNOSTIC_OUT??'.codex-tmp/runtime-load-diagnostic.json',JSON.stringify(results,null,2));console.log(JSON.stringify(results,null,2));
