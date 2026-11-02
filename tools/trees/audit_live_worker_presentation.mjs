import {createRequire} from 'node:module';
import {writeFile} from 'node:fs/promises';
const require=createRequire(import.meta.url),{chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const browser=await chromium.launch({channel:'msedge',headless:true});
try{
 const validCrowd=process.env.VALID_CROWD==='1',traceSteps=process.env.TRACE_STEPS?Number(process.env.TRACE_STEPS):1,page=await browser.newPage({viewport:{width:1280,height:720}}),errors=[];if(!Number.isInteger(traceSteps)||traceSteps<1||traceSteps>100)throw Error('Invalid TRACE_STEPS');page.on('pageerror',e=>errors.push(String(e)));
 await page.goto('http://127.0.0.1:5175/tests/browser/guardian-combat.html?biome=manglares&culture=mapungubwe&lightingReview&productionFarWarm&treeReview&recoveryDay&wildEngineThreads=0');
 await page.waitForFunction(()=>window.treeReview&&document.querySelector('#status')?.textContent.includes('"ready": true'),null,{timeout:180000});await page.locator('#stress').evaluate(e=>e.click());await page.waitForFunction(()=>{const r=window.treeReview;return r.state.raid?.animals.length===20&&r.state.raid.animals.every(a=>r.world.mixers.has(a.id));},null,{timeout:120000});
 const report=await page.evaluate(async ({validCrowd,traceSteps})=>{
  const r=window.treeReview,w=r.world;if(r.authority!=='spatial-wasm'||!r.state.mangroveNetwork)throw Error('Wrong scene');r.setManual(true);
  if(validCrowd){
   const animals=r.state.raid.animals,placed=[],workers=r.state.workers.filter(a=>a.status!=='home'&&Number.isFinite(a.x)&&Number.isFinite(a.z));
   const base={x:animals[0].x,z:animals[0].z},offsets=[];for(let z=-60;z<=60;z+=2)for(let x=-60;x<=60;x+=2)offsets.push({x,z,d:x*x+z*z});offsets.sort((a,b)=>a.d-b.d||a.x-b.x||a.z-b.z);
   for(const a of animals){let found=null;for(const off of offsets){const p={x:base.x+off.x,z:base.z+off.z},clear=[...placed,...workers].every(b=>Math.hypot(p.x-b.x,p.z-b.z)>a.radius+(b.radius??.28)+.15);if(clear&&r.spatialSession.actorCanStand(p,{worker:false,species:a.species})){found=p;break;}}if(!found)throw Error('No non-overlapping native placement for '+a.id);a.x=found.x;a.z=found.z;placed.push(a);}
   r.nav.setState(r.state);w.render(0);
  }
  const {serialize}=await import('/src/persistence/snapshots.js'),{actorBlockers,actorSegmentClear}=await import('/src/simulation/actor-motion.js'),source=serialize(r.state).replaceAll('"qa-beast-0"','"qa-beast-1000000"'),before=JSON.parse(source),chunks=[...w.chunks.keys()],worker=new Worker('/tests/browser/mobility-worker-live-snapshot.js',{type:'module'}),raf=()=>new Promise(requestAnimationFrame);
  const request=data=>new Promise((resolve,reject)=>{worker.onerror=e=>reject(Error(e.message));worker.onmessage=e=>e.data.kind==='error'?reject(Error(e.data.error)):resolve(e.data);worker.postMessage(data);});
  try{
   const init=await request({kind:'init',source,chunks});for(let i=0;i<25;i++){await raf();w.render(0);}
   let received=null,sentAt,receivedAt,appliedAt,moved=0,applied=0,maxPositionError=0,pending,verified=false;const frames=[],draw=[],baseline=new Map(r.state.raid.animals.map(a=>[a.id,{x:a.x,z:a.z}]));
   for(let i=0;i<120;i++){
    const t=await raf();frames.push(t);
    if(i===10){sentAt=performance.now();pending=request({kind:'run',steps:traceSteps,trace:traceSteps>1}).then(row=>{received=row;receivedAt=performance.now();});}
    if(received&&!appliedAt){
     const data=JSON.parse(received.projection);for(const item of data.animals){const id=item.id==='qa-beast-1000000'?'qa-beast-0':item.id,animal=r.state.raid.animals.find(a=>a.id===id);if(!animal)throw Error('Unknown actor '+id);if(Math.hypot(animal.x-item.x,animal.z-item.z)>1e-9)moved++;animal.x=item.x;animal.z=item.z;applied++;}appliedAt=performance.now();
    }
    const start=performance.now();w.render(0);draw.push(performance.now()-start);
    if(received&&appliedAt&&!verified){for(const item of JSON.parse(received.projection).animals){const id=item.id==='qa-beast-1000000'?'qa-beast-0':item.id,root=w.objects.get(id);maxPositionError=Math.max(maxPositionError,Math.hypot(root.position.x-item.x,root.position.z-item.z));}verified=true;}
   }
   if(pending)await pending;if(!received||!appliedAt||applied!==20)throw Error('Worker result not applied');
   const intervals=frames.slice(1).map((t,i)=>({start:frames[i],end:t,ms:t-frames[i]})),overlap=intervals.filter(x=>x.end>=sentAt&&x.start<=receivedAt),stats=a=>{const v=[...a].sort((x,y)=>x-y),p=q=>v[Math.floor((v.length-1)*q)];return {count:v.length,p95:p(.95),p99:p(.99),max:v.at(-1)};};
   const targets=new Map(JSON.parse(received.projection).animals.map(a=>[a.id,a])),segments=[];
   for(const animal of before.raid.animals){const end=targets.get(animal.id);if(!end)throw Error('Missing trajectory endpoint');const distance=Math.hypot(end.x-animal.x,end.z-animal.z);if(distance>1e-9)segments.push({id:animal.id,distance,terrainClear:r.nav.segmentClear(animal,end,animal.radius,null,false),staticBodiesClear:actorSegmentClear(animal,end,animal,actorBlockers(before,animal,false))});}
   let overlappingPairs=0,newSweptConflicts=0;for(let i=0;i<before.raid.animals.length;i++)for(let j=i+1;j<before.raid.animals.length;j++){const a=before.raid.animals[i],b=before.raid.animals[j],ae=targets.get(a.id),be=targets.get(b.id),x=a.x-b.x,z=a.z-b.z,vx=(ae.x-a.x)-(be.x-b.x),vz=(ae.z-a.z)-(be.z-b.z),sum=(a.radius??.28)+(b.radius??.28),d0=Math.hypot(x,z),den=vx*vx+vz*vz,t=den?Math.max(0,Math.min(1,-(x*vx+z*vz)/den)):0,closest=Math.hypot(x+vx*t,z+vz*t);if(d0<sum)overlappingPairs++;else if(closest<sum-1e-8)newSweptConflicts++;}
   if(validCrowd&&overlappingPairs)throw Error('Initial crowd overlaps');
   let traceAudit=null;if(received.trace){
    const state=structuredClone(before),perStep=[];
    for(const [index,projection] of received.trace.entries()){
     const next=new Map([...projection.animals,...projection.workers].map(a=>[a.id,a])),animals=state.raid.animals,workers=state.workers.filter(a=>a.status!=='home'),bodies=[...animals,...workers],record={step:index+1,movedAnimals:0,blockedTerrain:0,blockedInitialBodies:0,initialOverlaps:0,newSweptConflicts:0,events:projection.events.map(e=>e.type)};
     for(const a of animals){const end=next.get(a.id);if(!end)throw Error('Missing trace actor');if(Math.hypot(a.x-end.x,a.z-end.z)>1e-9){record.movedAnimals++;if(!r.nav.segmentClear(a,end,a.radius,null,false))record.blockedTerrain++;if(!actorSegmentClear(a,end,a,actorBlockers(state,a,false)))record.blockedInitialBodies++;}}
     for(let i=0;i<bodies.length;i++)for(let j=i+1;j<bodies.length;j++){const a=bodies[i],b=bodies[j],ae=next.get(a.id),be=next.get(b.id);if(!ae||!be)continue;const x=a.x-b.x,z=a.z-b.z,vx=ae.x-a.x-(be.x-b.x),vz=ae.z-a.z-(be.z-b.z),sum=(a.radius??.28)+(b.radius??.28),d=Math.hypot(x,z),den=vx*vx+vz*vz,t=den?Math.max(0,Math.min(1,-(x*vx+z*vz)/den)):0;if(d<sum-1e-8)record.initialOverlaps++;else if(Math.hypot(x+vx*t,z+vz*t)<sum-1e-8)record.newSweptConflicts++;}
     perStep.push(record);for(const a of [...state.raid.animals,...state.workers]){const end=next.get(a.id);if(end){a.x=end.x;a.z=end.z;a.status=end.status;}}
    }
    traceAudit={steps:perStep,scope:'Straight interpolation per tick; original static scene navigation, initial positions and linear discs including non-home workers. Does not reproduce within-tick paths or event-driven geometry changes.'};
   }
   return {animals:applied,moved,initializationMs:init.initializationMs,workerTickMs:received.timings[0],responseMs:receivedAt-sentAt,applyDelayMs:appliedAt-receivedAt,frames:stats(intervals.map(x=>x.ms)),overlapFrames:stats(overlap.map(x=>x.ms)),renderMs:stats(draw),maxPositionError,baselineCount:baseline.size,segments,overlappingPairs,newSweptConflicts,traceAudit,sceneErrors:r.errors};
  }finally{worker.terminate();}
 },{validCrowd,traceSteps});
 if(errors.length||report.sceneErrors.length)throw Error(JSON.stringify({errors,report}));
 report.scope=`Single frozen mangrove QA scene with 20 animals${validCrowd?' manually placed in native-standable non-overlapping positions':''}; Worker restores adapted copy and executes ${traceSteps} ticks; after response the test copies only x/z back for rendering. After measurement, straight segments are checked against the original scene navigation and initial body positions, plus a simultaneous linear disc approximation between animals. This is not an authoritative gameplay bridge, trajectory, collision, pose, input or visual-equivalence proof. Initialization and segment audits outside measurement; no GPU timer.`;
 await writeFile(`docs/lighting/tree-near-retexture/performance/mobility-live-worker-${validCrowd?'valid-crowd-':''}${traceSteps>1?traceSteps+'steps-':''}segment-audit.json`,JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2));
}finally{await browser.close();}
