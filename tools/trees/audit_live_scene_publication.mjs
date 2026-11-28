import {createRequire} from 'node:module';import {writeFile} from 'node:fs/promises';
const require=createRequire(import.meta.url),{chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const browser=await chromium.launch({channel:'msedge',headless:true});
try{
 const page=await browser.newPage({viewport:{width:1280,height:720}}),errors=[];page.on('pageerror',e=>errors.push(String(e)));
 await page.goto('http://127.0.0.1:5175/tests/browser/guardian-combat.html?biome=manglares&culture=mapungubwe&lightingReview&productionFarWarm&treeReview&recoveryDay&wildEngineThreads=0');
 await page.waitForFunction(()=>window.treeReview&&document.querySelector('#status')?.textContent.includes('"ready": true'),null,{timeout:180000});await page.locator('#stress').evaluate(e=>e.click());await page.waitForFunction(()=>{const r=window.treeReview;return r.state.raid?.animals.length===20&&r.state.raid.animals.every(a=>r.world.mixers.has(a.id));},null,{timeout:120000});
 const report=await page.evaluate(async()=>{
  const r=window.treeReview;if(r.authority!=='spatial-wasm'||!r.state.mangroveNetwork)throw Error('Wrong world');r.setManual(true);
  const {serialize}=await import('/src/persistence/snapshots.js'),{createSimulation}=await import('/tests/browser/mobility-worker-simulation-core.js');
  const source=serialize(r.state).replaceAll('"qa-beast-0"','"qa-beast-1000000"'),chunks=[...r.world.chunks.keys()],worker=new Worker('/tests/browser/mobility-worker-live-snapshot.js',{type:'module'});
  let fail,ready,received,result,requestAt,receivedAt,appliedAt,applyMs,changed=0,applied=0;const failure=new Promise((_,reject)=>fail=reject),readyP=new Promise(resolve=>ready=resolve),response=new Promise(resolve=>received=resolve);const timeout=setTimeout(()=>fail(Error('Worker timeout')),120000);
  worker.onerror=e=>fail(Error(e.message));worker.onmessage=({data:d})=>{if(d.kind==='ready')ready(d);else if(d.kind==='error')fail(Error(d.error));else if(d.kind==='result'){receivedAt=performance.now();result=d;received();}};
  const wait=p=>Promise.race([p,failure]);
  try{
   worker.postMessage({kind:'init',source,chunks});const init=await wait(readyP),frames=[],draw=[],raf=()=>new Promise(requestAnimationFrame);
   for(let i=0;i<20;i++){await raf();r.world.render(0);}
   for(let i=0;i<150;i++){
    const now=await raf();frames.push(now);
    if(i===10){requestAt=performance.now();worker.postMessage({kind:'run',steps:1});}
    if(result&&!appliedAt){const start=performance.now(),projection=JSON.parse(result.projection),actors=new Map([...r.state.workers,...r.state.raid.animals].map(a=>[a.id,a]));
     for(const actor of [...projection.workers,...projection.animals]){const id=actor.id==='qa-beast-1000000'?'qa-beast-0':actor.id,original=actors.get(id);if(!original)throw Error('Unknown actor '+id);if(original.x!==actor.x||original.z!==actor.z)changed++;original.x=actor.x;original.z=actor.z;original.heading=actor.heading??original.heading;applied++;}
     applyMs=performance.now()-start;appliedAt=performance.now();}
    const start=performance.now();r.world.render(0);draw.push(performance.now()-start);
    if(appliedAt){for(const a of r.state.raid.animals){const mesh=r.world.objects.get(a.id);if(mesh&&(Math.abs(mesh.position.x-a.x)>1e-8||Math.abs(mesh.position.z-a.z)>1e-8))throw Error('Scene position mismatch');} }
   }
   await wait(response);if(!appliedAt)throw Error('No publication during render');
   const reference=await createSimulation({snapshotSource:source,chunkKeys:chunks});let equal;try{equal=reference.run(1,.05,{full:true}).snapshot===result.snapshot;}finally{reference.dispose();}if(!equal)throw Error('Snapshot differs');
   const stats=a=>{const s=[...a].sort((x,y)=>x-y);return {count:s.length,p95:s[Math.floor((s.length-1)*.95)],p99:s[Math.floor((s.length-1)*.99)],max:s.at(-1)};};
   return {network:r.state.mangroveNetwork,chunks:chunks.length,animals:r.state.raid.animals.length,initMs:init.initializationMs,tickMs:result.timings[0],responseMs:receivedAt-requestAt,applyDelayMs:appliedAt-receivedAt,applyMs,projectionBytes:new TextEncoder().encode(result.projection).length,snapshotBytes:new TextEncoder().encode(result.snapshot).length,actorsApplied:applied,actorsChanged:changed,frames:stats(frames.slice(1).map((v,i)=>v-frames[i])),renderMs:stats(draw),fullSnapshotEqual:equal,sceneErrors:r.errors};
  }finally{clearTimeout(timeout);worker.terminate();}
 });
 if(errors.length||report.sceneErrors.length)throw Error(JSON.stringify({errors,report}));
 report.scope='One experimental confirmed actor-position publication from a Worker-owned clone into a frozen real mangrove-islands QA scene. QA animal ID 0 renamed in clone, 25 scene chunk keys, no physics manager in clone; only x/z/heading copied, no gameplay, routes, events, time, collision, smooth interpolation, animation synchronization, input, or production authority. The main scene remains a separate native world. Snapshot serialized and sent even though only projection is applied; timings reflect this protocol, not a minimal transport.';
 await writeFile('docs/lighting/tree-near-retexture/performance/mobility-live-scene-publication.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2));
}finally{await browser.close();}
