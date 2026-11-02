import {createRequire} from 'node:module';
import {writeFile} from 'node:fs/promises';
const require=createRequire(import.meta.url),{chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const browser=await chromium.launch({channel:'msedge',headless:true});
try{
 const motionTrace=process.env.MOTION_STACKS==='1'?'stacks':process.env.MOTION_TRACE==='1',page=await browser.newPage({viewport:{width:1280,height:720}}),errors=[];page.on('pageerror',e=>errors.push(String(e)));
 await page.goto('http://127.0.0.1:5175/tests/browser/guardian-combat.html?biome=manglares&culture=mapungubwe&lightingReview&productionFarWarm&treeReview&recoveryDay&wildEngineThreads=0');
 await page.waitForFunction(()=>window.treeReview&&document.querySelector('#status')?.textContent.includes('"ready": true'),null,{timeout:180000});await page.locator('#stress').evaluate(e=>e.click());await page.waitForFunction(()=>{const r=window.treeReview;return r.state.raid?.animals.length===20&&r.state.raid.animals.every(a=>r.world.mixers.has(a.id));},null,{timeout:120000});
 const report=await page.evaluate(async motionTrace=>{
  const r=window.treeReview;if(r.authority!=='spatial-wasm'||!r.state.mangroveNetwork)throw Error('Wrong scene');r.setManual(true);
  const {serialize}=await import('/src/persistence/snapshots.js'),{createSimulation}=await import('/tests/browser/mobility-worker-simulation-core.js');
  const capture=performance.now(),raw=serialize(r.state),source=raw.replaceAll('"qa-beast-0"','"qa-beast-1000000"'),chunks=[...r.world.chunks.keys()],captureMs=performance.now()-capture;
  const init=performance.now(),reference=await createSimulation({snapshotSource:source,chunkKeys:chunks}),mainInitMs=performance.now()-init;
  const worker=new Worker('/tests/browser/mobility-worker-live-snapshot.js',{type:'module'});
  const request=data=>new Promise((resolve,reject)=>{worker.onerror=e=>reject(Error(e.message));worker.onmessage=e=>e.data.kind==='error'?reject(Error(e.data.error)):resolve(e.data);worker.postMessage(data);});
  try{
   const started=performance.now(),ready=await request({kind:'init',source,chunks,motionTrace}),workerInitResponseMs=performance.now()-started,rows=[];
   for(const steps of [1,5,5]){const requestAt=performance.now(),pending=request({kind:'run',steps}),main=reference.run(steps,.05,{full:true}),remote=await pending;const snapshotEqual=main.snapshot===remote.snapshot,projectionEqual=main.projection===remote.projection;if(!snapshotEqual||!projectionEqual)throw Error('Instrumented simulation diverged');const samples=remote.motion?.flat()??[],nonzero=samples.filter(s=>Math.hypot(s.to.x-s.from.x,s.to.z-s.from.z)>1e-9),multiTick=remote.motion?.reduce((sum,tick)=>{const counts=new Map();for(const s of tick)if(Math.hypot(s.to.x-s.from.x,s.to.z-s.from.z)>1e-9)counts.set(s.id,(counts.get(s.id)??0)+1);return sum+[...counts.values()].filter(n=>n>1).length;},0)??0;const origins={};if(motionTrace==='stacks')for(const s of nonzero)origins[s.origin]=(origins[s.origin]??0)+1;rows.push({steps,snapshotEqual,projectionEqual,mainTickMs:main.timings,workerTickMs:remote.timings,responseMs:performance.now()-requestAt,elapsed:main.elapsed,...(motionTrace?{coordinatePairs:samples.length,movingPairs:nonzero.length,incompleteAxes:samples.filter(s=>s.axes.length!==2).length,actorsWithMultiplePairsPerTick:multiTick,...(motionTrace==='stacks'?{origins}: {})}: {})});}
   return {biome:r.state.biome,mangroveNetwork:r.state.mangroveNetwork,animals:r.state.raid.animals.length,chunks:chunks.length,snapshotBytes:new TextEncoder().encode(source).length,captureMs,mainInitMs,workerInitMs:ready.initializationMs,workerInitResponseMs,rows,sceneErrors:r.errors};
  }finally{reference.dispose();worker.terminate();}
 },motionTrace);
 if(errors.length||report.sceneErrors.length)throw Error(JSON.stringify({errors,report}));
 report.scope=`Snapshot captured from live mangrove-islands QA scene with 20 test animals; QA ID qa-beast-0 is renamed in the copy because native intent IDs require a positive numeric suffix. Both main and Worker restore independent game and spatial sessions from the same adapted serialized state and visible chunk keys. ${motionTrace?'Worker coordinate assignments are intercepted diagnostically; paired axes are not authoritative paths.':''} No comparison against the original scene native state, physics manager, GPU, inputs, render, full residency or production migration.`;
 await writeFile(`docs/lighting/tree-near-retexture/performance/mobility-live-scene-${motionTrace==='stacks'?'motion-origins':motionTrace?'motion-trace':'snapshot'}-worker.json`,JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2));
}finally{await browser.close();}
