import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {WORKER_SPATIAL_PROFILE,ANIMAL_SPATIAL_PROFILES} from '../../src/world/wild-engine/spatial-movement-profiles.js';

// Browser integration check, not a GPU or game-performance benchmark.
// The module and WASM must be adjacent and use their product filenames.
const modulePath=resolve(process.env.WG_THREAD_RUNTIME??'public/wild-engine/spatial-threaded.mjs');
const wasmPath=resolve(process.env.WG_THREAD_WASM??'public/wild-engine/spatial-threaded.wasm');
const playwright=process.env.PLAYWRIGHT_MODULE?await import(pathToFileURL(resolve(process.env.PLAYWRIGHT_MODULE)).href):await import('playwright');
const routes={
 '/spatial-threaded.mjs':['text/javascript',modulePath],
 '/spatial-threaded.wasm':['application/wasm',wasmPath],
 '/prepare.js':['text/javascript','tools/experiments/qa-spatial-pthread-preparation.js'],
 '/publish.js':['text/javascript','tools/experiments/qa-spatial-pthread-publication.js']
};
const server=createServer(async(req,res)=>{
 res.setHeader('Cross-Origin-Opener-Policy','same-origin');
 res.setHeader('Cross-Origin-Embedder-Policy','require-corp');
 const path=req.url?.split('?')[0];if(path==='/'){res.end('<!doctype html><title>Wild Engine runtime check</title>');return;}
 const entry=routes[path];if(!entry){res.writeHead(404);res.end();return;}
 try{res.setHeader('Content-Type',entry[0]);res.end(await readFile(entry[1]));}catch(error){res.writeHead(500);res.end(String(error));}
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));let browser;
try{
 const launch={headless:true,...(process.env.WG_BROWSER_EXECUTABLE?{executablePath:process.env.WG_BROWSER_EXECUTABLE}:{channel:'msedge'})};
 browser=await playwright.chromium.launch(launch);const reports=[];
 for(const mode of ['preparation','publication']){
  const page=await browser.newPage(),errors=[];page.on('pageerror',error=>errors.push(error.message));
  try{
   await page.goto(`http://127.0.0.1:${server.address().port}/`);
   const result=await page.evaluate(async({mode,profiles})=>{
    const {default:factory}=await import('/spatial-threaded.mjs'),module=await factory();
    try{
     if(!crossOriginIsolated||!(module.HEAPU8.buffer instanceof SharedArrayBuffer)||module.PThread.unusedWorkers.length!==1)throw Error('Shared pthread runtime unavailable');
     return await (mode==='preparation'?(await import('/prepare.js')).verifyThreadPreparation(module,profiles):(await import('/publish.js')).verifyThreadPublication(module,profiles));
    }finally{module.PThread.terminateAllThreads();}
   },{mode,profiles:[WORKER_SPATIAL_PROFILE,...Object.values(ANIMAL_SPATIAL_PROFILES)]});
   if(errors.length)throw Error(JSON.stringify(errors));reports.push({mode,result,errors});
  }finally{await page.close();}
 }
 console.log(JSON.stringify({scope:'Browser pthread preparation and publication, not gameplay or GPU performance',reports}));
}finally{await browser?.close();await new Promise(resolve=>server.close(resolve));}
