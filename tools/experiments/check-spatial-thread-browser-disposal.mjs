import {chromium} from 'playwright';
import {writeFile} from 'node:fs/promises';
const browser=await chromium.launch({channel:'chrome',headless:true});
try{
 const page=await browser.newPage(),errors=[];page.on('pageerror',e=>errors.push(String(e)));
 await page.route('**/pthread-disposal-qa',route=>route.fulfill({contentType:'text/html',headers:{'Cross-Origin-Opener-Policy':'same-origin','Cross-Origin-Embedder-Policy':'require-corp'},body:'<!doctype html><title>Pthread disposal QA</title>'}));
 await page.goto(`http://127.0.0.1:${process.env.WG_THREAD_PORT??5299}/pthread-disposal-qa`);
 const result=await page.evaluate(async()=>{
  if(!crossOriginIsolated)throw Error('Isolation required');
  const {default:factory}=await import('/wild-engine/spatial-threaded.mjs');
  const {createThreadedSpatialWorld}=await import('/src/world/wild-engine/spatial-thread-runtime.js');
  const {WORKER_SPATIAL_PROFILE,ANIMAL_SPATIAL_PROFILES}=await import('/src/world/wild-engine/spatial-movement-profiles.js');
  const rows=[];
  for(const phase of ['idle','running','ready'])for(let repeat=0;repeat<3;repeat++){
   const handle=await createThreadedSpatialWorld(factory),core=handle.core,p=core.preparation;
   core.generate(712,0,0,'manglares');
   for(const profile of [WORKER_SPATIAL_PROFILE,...Object.values(ANIMAL_SPATIAL_PROFILES)])core.buildNavigationProfile(profile.index,profile.radius,profile.worker);
   let id=0;
   if(phase!=='idle'){
    id=p.start(1,0);if(id<=0)throw Error('Job rejected');
    const target=phase==='running'?2:3,deadline=performance.now()+10000;
    while(p.status()!==target){if(performance.now()>deadline||p.status()>target)throw Error('Missed requested disposal phase');await new Promise(r=>setTimeout(r,0));}
   }
   const before=p.status(),chunks=core.metrics().loadedChunks,start=performance.now();
   const first=handle.dispose(),callMs=performance.now()-start,second=handle.dispose();
   if(first!==second)throw Error('Disposal is not idempotent');
   let timer;try{await Promise.race([first,new Promise((_,reject)=>{timer=setTimeout(()=>reject(Error('Disposal timeout')),10000);})]);}finally{clearTimeout(timer);}
   const elapsedMs=performance.now()-start,workers=Object.keys(handle.runtime.PThread.pthreads).length+handle.runtime.PThread.unusedWorkers.length;
   if(workers||p.status()!==5||core.metrics().loadedChunks!==chunks)throw Error('Worker/resource/publication leaked');
   if(id&&p.publish(id,1,0)!==-1)throw Error('Disposed job published');
   rows.push({phase,repeat,before,callMs,elapsedMs,workers,loadedChunks:chunks,memoryBytes:handle.memory.buffer.byteLength});
  }
  return {userAgent:navigator.userAgent,rows};
 });
 if(errors.length)throw Error(JSON.stringify(errors));
 await writeFile('docs/qa/wild-engine-pthreads/thread-browser-disposal.json',JSON.stringify({scope:'Nine real Chrome native runtime lifecycle cases; no game renderer or process RSS measurement',result,errors},null,2)+'\n');
 console.log(JSON.stringify(result));
}finally{await browser.close();}
