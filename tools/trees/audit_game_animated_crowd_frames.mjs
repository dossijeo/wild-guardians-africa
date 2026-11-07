import {createRequire} from 'node:module';
import {writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
const require=createRequire(import.meta.url),{chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const browser=await chromium.launch({channel:'msedge',headless:true});
try{
 const runs=[],mangrove=true,crowd=true,steps=1;let projection;
 if(!Number.isInteger(steps)||steps<1||steps>500)throw Error('Invalid SIM_STEPS');
 for(const mode of ['main','worker','worker','main']){
  const page=await browser.newPage({viewport:{width:1280,height:720}}),errors=[];page.on('pageerror',e=>errors.push(String(e)));console.log(`${mode}: loading`);
  try{
   await page.goto('http://127.0.0.1:5175/tests/browser/guardian-combat.html?biome=manglares&culture=mapungubwe&lightingReview&productionFarWarm&treeReview&recoveryDay&wildEngineThreads=0');
   await page.waitForFunction(()=>window.treeReview&&document.querySelector('#status')?.textContent.includes('"ready": true'),null,{timeout:180000});
   if(crowd){await page.locator('#stress').evaluate(e=>e.click());await page.waitForFunction(()=>{const r=window.treeReview;return r.state.raid?.animals.length===20&&r.state.raid.animals.every(a=>r.world.mixers.has(a.id));},null,{timeout:120000});}
   const row=await page.evaluate(async ({mode,mangrove,steps})=>{
    const r=window.treeReview,w=r.world;if(r.authority!=='spatial-wasm'||!r.state.mangroveNetwork)throw Error('Wrong scene');r.setManual(true);
    const {createGamePhysics}=await import('/tests/browser/mobility-game-physics-core.js'),{GpuTimer}=await import('/tests/browser/gpu-timer.js');let simulation,worker;
    if(mode==='main')simulation=await createGamePhysics({originalClips:true,initialAnimation:true});else{worker=new Worker('/tests/browser/mobility-game-animated-frame-worker.js',{type:'module'});await new Promise((resolve,reject)=>{worker.onerror=e=>reject(Error(e.message));worker.onmessage=e=>e.data.kind==='ready'?resolve():e.data.kind==='error'?reject(Error(e.data.error)):null;});}
    const gl=w.renderer.getContext(),ext=gl.getExtension('WEBGL_debug_renderer_info'),raf=()=>new Promise(requestAnimationFrame);let result,pending,sentAt,doneAt;
    try{
     for(let i=0;i<25;i++){await raf();w.render(0);}
     const frames=[],draw=[],timer=new GpuTimer(gl,64);
     for(let i=0;i<100;i++){
      const now=await raf();frames.push(now);
      if(i===10){sentAt=performance.now();if(mode==='main'){const started=performance.now(),step=simulation.step(),state=simulation.state();result={step,state,workerTotalMs:performance.now()-started};doneAt=performance.now();}else{pending=new Promise((resolve,reject)=>{worker.onmessage=e=>e.data.kind==='result'?resolve(e.data):e.data.kind==='error'?reject(Error(e.data.error)):null;});worker.postMessage({kind:'step'});pending.then(value=>{result=value;doneAt=performance.now();});}}
      const start=performance.now(),timed=timer.begin(i);w.render(0);if(timed)timer.end();draw.push(performance.now()-start);
     }
     if(pending)await pending;for(let i=0;i<30&&timer.pending.length;i++){await raf();timer.poll();}const gpu=timer.report();timer.dispose();const intervals=frames.slice(1).map((v,i)=>v-frames[i]);const stats=a=>{const s=[...a].sort((x,y)=>x-y),p=q=>s[Math.floor((s.length-1)*q)];return {count:s.length,p95:p(.95),p99:p(.99),max:s.at(-1)};};
     return {mode,projection:JSON.stringify({snapshot:result.state.snapshot,sample:result.step.sample,events:result.state.events,phases:result.state.phases}),responseMs:doneAt-sentAt,firstTickMs:result.step.tickMs,totalComputeMs:result.workerTotalMs,gpu:{reason:gpu.reason,count:gpu.samples.length,p95:stats(gpu.samples.map(x=>x.ms)).p95,p99:stats(gpu.samples.map(x=>x.ms)).p99,disjoint:gpu.disjointEvents,discarded:gpu.discarded},frames:stats(intervals),overlap:stats(intervals.filter((_,i)=>frames[i+1]>=sentAt&&frames[i]<=doneAt)),renderMs:stats(draw),renderer:ext?gl.getParameter(ext.UNMASKED_RENDERER_WEBGL):gl.getParameter(gl.RENDERER),mangroveNetwork:r.state.mangroveNetwork,animals:r.state.raid?.animals.length??0,sceneErrors:r.errors};
    }finally{simulation?.dispose();worker?.terminate();}
   },{mode,mangrove,steps});
   if(errors.length||row.sceneErrors.length)throw Error(JSON.stringify({errors,sceneErrors:row.sceneErrors}));if(projection===undefined)projection=row.projection;else if(projection!==row.projection)throw Error('Selected simulation projection differs');row.stateHash=createHash('sha256').update(row.projection).digest('hex');delete row.projection;runs.push(row);console.log(JSON.stringify(row));
  }finally{await page.close();}
 }
 const report={runs,selectedProjectionEqual:true,scope:'One real cold Game.tick with scripted impact and Rapier in main or Worker, converted mangrove island snapshot and 24 synthetic chunks, normalized test rig in an original running pose and full state serialization. Separate frozen real WorldScene with 20 test animals; no shared simulation or pose, input, HUD, physics parity beyond this step, or gameplay integration. Initialization excluded.'};
 await writeFile('docs/lighting/tree-near-retexture/performance/mobility-game-animated-crowd-frame-abba.json',JSON.stringify(report,null,2)+'\n');
}finally{await browser.close();}
