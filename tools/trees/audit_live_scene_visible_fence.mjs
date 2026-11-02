import {createRequire} from 'node:module';import {writeFile} from 'node:fs/promises';
const require=createRequire(import.meta.url),{chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const browser=await chromium.launch({channel:'msedge',headless:true});
try{
 const page=await browser.newPage({viewport:{width:1280,height:720}}),errors=[];page.on('pageerror',e=>errors.push(String(e)));
 await page.goto('http://127.0.0.1:5175/tests/browser/guardian-combat.html?biome=manglares&culture=mapungubwe&lightingReview&productionFarWarm&treeReview&recoveryDay&wildEngineThreads=0');
 await page.waitForFunction(()=>window.treeReview&&document.querySelector('#status')?.textContent.includes('"ready": true'),null,{timeout:180000});await page.locator('#stress').evaluate(e=>e.click());await page.waitForFunction(()=>{const r=window.treeReview;return r.state.raid?.animals.length===20&&r.state.raid.animals.every(a=>r.world.mixers.has(a.id));},null,{timeout:120000});
 const report=await page.evaluate(async()=>{
  const r=window.treeReview;if(r.authority!=='spatial-wasm'||!r.state.mangroveNetwork)throw Error('Wrong world');r.setManual(true);
  const {serialize}=await import('/src/persistence/snapshots.js'),{createSimulation}=await import('/tests/browser/mobility-worker-simulation-core.js'),{observeGameEvents,observePresentationGameEvents,notifyConfirmedPresentationEvent}=await import('/src/simulation/game.js');const {createVisibleEventFence}=await import('/tools/trees/prototype_visible_event_fence.mjs');const canvas=r.world.renderer.domElement,visibility=[];const fence=createVisibleEventFence('qa',{classify:()=> 'structural',setVisible:visible=>{canvas.style.visibility=visible?'visible':'hidden';visibility.push({visible,at:performance.now()});}});let observerCount=0,simulationObserverCount=0;const stopObserver=observePresentationGameEvents(r.state,()=>observerCount++),stopSimulationObserver=observeGameEvents(r.state,()=>simulationObserverCount++);
  const source=serialize(r.state).replaceAll('"qa-beast-0"','"qa-beast-1000000"'),chunks=[...r.world.chunks.keys()],worker=new Worker('/tests/browser/mobility-worker-live-projection.js',{type:'module'});
  let fail,ready,deliveredSnapshot,deliverSnapshot,completed=0,requested=0,eventsReceived=0;const results=[],failure=new Promise((_,reject)=>fail=reject),readyP=new Promise(resolve=>ready=resolve),timeout=setTimeout(()=>fail(Error('Worker timeout')),120000);
  worker.onerror=e=>fail(Error(e.message));worker.onmessage=({data:d})=>{if(d.kind==='ready')ready(d);else if(d.kind==='error')fail(Error(d.error));else if(d.kind==='result')results.push({...d,receivedAt:performance.now()});else if(d.kind==='snapshot'){deliveredSnapshot=d.snapshot;deliverSnapshot();}};
  const snapshotP=new Promise(resolve=>deliverSnapshot=resolve);const wait=p=>Promise.race([p,failure]);
  try{
   worker.postMessage({kind:'init',source,chunks});const init=await wait(readyP),frames=[],draw=[],publications=[],raf=()=>new Promise(requestAnimationFrame),requestTimes=[];
   for(let i=0;i<20;i++){await raf();r.world.render(0);}
   const request=()=>{requested++;requestTimes.push(performance.now());worker.postMessage({kind:'run',steps:1});};
   for(let i=0;i<210;i++){
    await raf();const now=performance.now();frames.push(now);if(i===10)request();
    if(results.length){const result=results.shift(),sequence=completed+1,start=performance.now(),projection=JSON.parse(result.projection),actors=new Map([...r.state.workers,...r.state.raid.animals].map(a=>[a.id,a]));
     const accepted=fence.receive({session:'qa',sequence,firstEvent:eventsReceived,events:projection.events});if(!accepted.accepted)throw Error('Fence receive rejected '+JSON.stringify(accepted));if(accepted.hide){await raf();await raf();if(getComputedStyle(canvas).visibility!=='hidden')throw Error('Canvas was not hidden');}let changed=0,applied=0;
     const committed=fence.present(sequence,events=>{for(const actor of [...projection.workers,...projection.animals]){const id=actor.id==='qa-beast-1000000'?'qa-beast-0':actor.id,original=actors.get(id);if(!original)throw Error('Unknown actor '+id);if(original.x!==actor.x||original.z!==actor.z)changed++;original.x=actor.x;original.z=actor.z;original.heading=actor.heading??original.heading;applied++;}for(const event of events){r.state.events.push(event);notifyConfirmedPresentationEvent(r.state,event);}if(r.state.events.length>200)r.state.events.splice(0,r.state.events.length-200);},()=>r.world.render(0));if(getComputedStyle(canvas).visibility!=='visible')throw Error('Canvas remained hidden');if(!committed.accepted||fence.state().pending)throw Error('Fence commit rejected');
     eventsReceived+=projection.events.length;completed++;publications.push({sequence,elapsed:projection.elapsed,tickMs:result.timings[0],responseMs:result.receivedAt-requestTimes[sequence-1],applyDelayMs:start-result.receivedAt,applyMs:performance.now()-start,events:projection.events.length,actorsApplied:applied,actorsChanged:changed});if(completed<10)request();
    }
    const start=performance.now();r.world.render(0);draw.push(performance.now()-start);
    if(completed){for(const actor of r.state.raid.animals){const mesh=r.world.objects.get(actor.id);if(mesh&&(Math.abs(mesh.position.x-actor.x)>1e-8||Math.abs(mesh.position.z-actor.z)>1e-8))throw Error('Scene position mismatch');}}
   }
   if(completed!==10||requested!==10||results.length)throw Error(`Incomplete publications: ${completed}/${requested}`);
   worker.postMessage({kind:'snapshot'});await wait(snapshotP);const reference=await createSimulation({snapshotSource:source,chunkKeys:chunks});let equal;try{equal=reference.run(10,.05,{full:true}).snapshot===deliveredSnapshot;}finally{reference.dispose();}if(!equal)throw Error('Snapshot differs');
   const stats=a=>{const s=[...a].sort((x,y)=>x-y);return {count:s.length,p95:s[Math.floor((s.length-1)*.95)],p99:s[Math.floor((s.length-1)*.99)],max:s.at(-1)};};
   return {network:r.state.mangroveNetwork,chunks:chunks.length,animals:r.state.raid.animals.length,initMs:init.initializationMs,publications,eventsReceived,observerCount,simulationObserverCount,visibility,fenceState:fence.state(),frames:stats(frames.slice(1).map((v,i)=>v-frames[i])),renderMs:stats(draw),fullSnapshotEqual:equal,sceneErrors:r.errors};

  }finally{stopObserver();stopSimulationObserver();clearTimeout(timeout);worker.terminate();}
 });
 if(errors.length||report.sceneErrors.length)throw Error(JSON.stringify({errors,report}));
 if(report.publications.length!==10||report.eventsReceived<1||report.observerCount!==report.eventsReceived||report.simulationObserverCount!==0)throw Error('Unexpected event observer result');if(!report.visibility.some(x=>!x.visible)||!report.visibility.some(x=>x.visible))throw Error('No structural visibility transition observed');report.scope='Ten sequential Worker-owned clone ticks and confirmed projection/event publications into a frozen real mangrove-islands QA scene. At most one request in flight. QA animal ID 0 renamed, 25 chunk keys, no physics manager; only positions and heading copied. All events classified structural; canvas CSS visibility is held hidden for two RAFs on invalidation and restored after synchronous application and draw. No compositor pixel proof, gameplay input, interpolation, synchronized animations, continuous collision, transaction rollback or production authority. The final Worker snapshot alone is checked against a reference.';
 await writeFile(`docs/lighting/tree-near-retexture/performance/mobility-live-scene-visible-fence-${process.env.RUN_SUFFIX??'1'}.json`,JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2));
}finally{await browser.close();}
