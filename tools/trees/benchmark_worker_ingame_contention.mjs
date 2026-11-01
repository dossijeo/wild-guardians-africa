import {createRequire} from 'node:module';
import {writeFile} from 'node:fs/promises';
const require=createRequire(import.meta.url),{chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const browser=await chromium.launch({channel:'msedge',headless:true});
try{
 const results=[];
 const modes=process.env.INGAME_MODES?.split(',')??['idle','worker','worker','idle'];if(modes.some(mode=>!['idle','worker'].includes(mode)))throw Error('Invalid mode');
 for(const [index,mode] of modes.entries()){
  const page=await browser.newPage({viewport:{width:1280,height:720}}),errors=[];page.on('pageerror',e=>errors.push(String(e)));
  console.log(JSON.stringify({index,mode,phase:'loading'}));
  await page.goto('http://127.0.0.1:5175/tests/browser/guardian-combat.html?biome=manglares&culture=mapungubwe&lightingReview&productionFarWarm&treeReview&recoveryDay&wildEngineThreads=0');
  await page.waitForFunction(()=>window.treeReview&&document.querySelector('#status')?.textContent.includes('"ready": true'),null,{timeout:180000});
  await page.locator('#stress').evaluate(e=>e.click());
  await page.waitForFunction(()=>{const r=window.treeReview;return r.state.raid?.animals.length===20&&r.state.raid.animals.every(a=>r.world.mixers.has(a.id));},null,{timeout:120000});
  const result=await page.evaluate(async mode=>{
   const {tick}=await import('/src/simulation/game.js'),{GpuTimer}=await import('/tests/browser/gpu-timer.js'),r=window.treeReview,w=r.world,gl=w.renderer.getContext(),ext=gl.getExtension('WEBGL_debug_renderer_info');r.setManual(true);
   if(r.authority!=='spatial-wasm'||!r.state.mangroveNetwork)throw Error('Wrong world authority or mangrove layout');
   const worker=new Worker('/tests/browser/mobility-worker-budget.js',{type:'module'}),pending=new Map();let id=0;
   await new Promise((resolve,reject)=>{worker.onerror=e=>reject(Error(e.message));worker.onmessage=e=>{const row=e.data;if(row.kind==='ready')resolve();else if(row.kind==='error'){const p=pending.get(row.id);if(p){pending.delete(row.id);p.reject(Error(row.error));}else reject(Error(row.error));}else{const p=pending.get(row.id);if(p){pending.delete(row.id);p.resolve(row);}}};});
   const send=message=>new Promise((resolve,reject)=>{const request=++id;pending.set(request,{resolve,reject});worker.postMessage({...message,id:request});});
   const raf=()=>new Promise(requestAnimationFrame),stats=values=>{const a=[...values].sort((x,y)=>x-y);return {count:a.length,p95:a[Math.floor(a.length*.95)]??null,p99:a[Math.floor(a.length*.99)]??null,max:a.at(-1)??null};};
   for(let i=0;i<30;i++){await raf();w.render(0);}
   const timer=new GpuTimer(gl,64),rows=[],jobs=[];let last=null,active=null,previous=null;
   try{
    for(let i=0;i<150;i++){
     const now=await raf();if(mode==='worker'&&i%25===5&&!active){const requestedAt=performance.now();active=send({kind:'start'}).then(()=>send({kind:'run',count:700,final:true})).then(result=>{jobs.push({requestedAt,receivedAt:performance.now(),startedAt:result.startedEpoch-performance.timeOrigin,finishedAt:result.finishedEpoch-performance.timeOrigin,workerMs:result.elapsed,queries:result.queries,hash:result.hash});active=null;});}
     const tickProfile=r.nav.tickProfile={intents:0,physics:0,raid:0,workers:0,reservations:0,arrivalPoint:0,arrivalWalk:0,arrivalEntrance:0,prepareMotion:0,moveMotion:0,byStatus:{}},start=performance.now();tick(r.state,.05,r.nav);const simulationMs=performance.now()-start,drawStart=performance.now(),timed=timer.begin(i);w.render(.05);if(timed)timer.end();const renderMs=performance.now()-drawStart;
     if(last!==null)rows.push({index:i,start:last,end:now,dt:now-last,previous,hidden:document.hidden,simulationMs,renderMs});last=now;previous={simulationMs,renderMs,tickProfile:{...tickProfile}};
    }
    if(active)await active;for(let i=0;i<30&&timer.pending.length;i++){await raf();timer.poll();}const gpu=timer.report();
    const overlap=row=>jobs.some(job=>row.end>=job.startedAt&&row.start<=job.finishedAt);
    return {mode,authority:r.authority,mangroveNetwork:r.state.mangroveNetwork,renderer:ext?gl.getParameter(ext.UNMASKED_RENDERER_WEBGL):gl.getParameter(gl.RENDERER),animalCount:r.state.raid?.animals.length,simulationTime:r.state.elapsed,frames:stats(rows.map(x=>x.dt)),overlapFrames:stats(rows.filter(overlap).map(x=>x.dt)),simulationMs:stats(rows.map(x=>x.simulationMs)),renderMs:stats(rows.map(x=>x.renderMs)),longFrames:rows.filter(x=>x.dt>100),hiddenFrames:rows.filter(x=>x.hidden).length,gpu:{reason:gpu.reason,samples:gpu.samples.length,p95:stats(gpu.samples.map(x=>x.ms)).p95,p99:stats(gpu.samples.map(x=>x.ms)).p99},jobs,actors:r.state.raid?.animals.map(a=>({id:a.id,x:a.x,z:a.z,status:a.status})),fixtureErrors:r.errors};
   }finally{delete r.nav.tickProfile;timer.dispose();worker.terminate();}
  },mode);
  if(errors.length||result.fixtureErrors.length||mode==='worker'&&(!result.jobs.length||result.jobs.some(j=>j.queries!==700)))throw Error(JSON.stringify({errors,result}));
  results.push(result);console.log(JSON.stringify({index,mode,frames:result.frames,simulationMs:result.simulationMs,renderMs:result.renderMs,gpu:result.gpu,jobs:result.jobs.length,overlap:result.overlapFrames}));await page.close();
 }
 await writeFile(`docs/lighting/tree-near-retexture/performance/mobility-worker-ingame-contention-${modes.length===4?'abba':'diagnostic'}.json`,JSON.stringify({scope:'Manual diagnostic ticks and real WorldScene rendering, with synthetic independent navigation load. Not an integrated worker simulation or a gameplay equivalence proof.',results},null,2)+'\n');
}finally{await browser.close();}
