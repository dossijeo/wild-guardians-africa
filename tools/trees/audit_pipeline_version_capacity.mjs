import {createRequire} from 'node:module';
import {writeFile} from 'node:fs/promises';
const {chromium}=createRequire(import.meta.url)(process.env.PLAYWRIGHT_MODULE??'playwright');
const browser=await chromium.launch({channel:'msedge',headless:true});
try{
 const page=await browser.newPage({viewport:{width:1280,height:720}}),errors=[];page.on('pageerror',e=>errors.push(String(e)));
 await page.goto('http://127.0.0.1:5175/tests/browser/guardian-combat.html?biome=manglares&culture=mapungubwe&lightingReview&productionFarWarm&treeReview&recoveryDay&wildEngineThreads=0');
 await page.waitForFunction(()=>window.treeReview&&document.querySelector('#status')?.textContent.includes('"ready": true'),null,{timeout:180000});
 await page.evaluate(()=>{const r=window.treeReview;r.setManual(true);r.state.elapsed=0;r.world.simElapsed=0;});await page.locator('#stress').evaluate(e=>e.click());
 await page.waitForFunction(()=>{const r=window.treeReview;r.world.render(0,1/30);return r.state.raid?.animals.length===20&&r.state.raid.animals.every(a=>r.world.mixers.has(a.id));},null,{timeout:120000});
 const result=await page.evaluate(async()=>{
  const r=window.treeReview,w=r.world;if(r.authority!=='spatial-wasm'||!r.state.mangroveNetwork)throw Error('Wrong world');
  const {serialize}=await import('/src/persistence/snapshots.js'),{createSimulation}=await import('/tests/browser/mobility-worker-simulation-core.js'),{advanceReal,observeGameEvents}=await import('/src/simulation/game.js'),{createProjectionReceiver}=await import('/tests/browser/mobility-delta-prototype.js');
  const state=JSON.parse(serialize(r.state));state.slotId='fixed-test-slot';const source=JSON.stringify(state).replaceAll('"qa-beast-0"','"qa-beast-1000000"'),chunks=[...w.chunks.keys()].sort(),session=crypto.randomUUID(),receiver=createProjectionReceiver(session),worker=new Worker('/tests/browser/mobility-live-advance-pipeline-worker.js',{type:'module'});
  const exchange=data=>new Promise((resolve,reject)=>{const onMessage=({data:reply})=>{cleanup();reply.kind==='error'?reject(Error(reply.error)):resolve(reply);},onError=e=>{cleanup();reject(Error(e.message));},cleanup=()=>{worker.removeEventListener('message',onMessage);worker.removeEventListener('error',onError);};worker.addEventListener('message',onMessage);worker.addEventListener('error',onError);worker.postMessage(data);});
  try{
   const ready=await exchange({kind:'init',session,source,chunks});if(ready.kind!=='ready')throw Error('Worker init failed');
   for(let sequence=1;sequence<=15;sequence++){const row=await exchange({kind:'advance',session,sequence,seconds:.05,appliedVersion:0,ack:0});if(row.kind!=='result'||!receiver.accept(row.packet).accepted)throw Error('Publication rejected '+sequence);}
   const before=await exchange({kind:'snapshot',session}),refused=await exchange({kind:'advance',session,sequence:16,seconds:.05,appliedVersion:0,ack:0}),after=await exchange({kind:'snapshot',session});
   if(refused.kind!=='refused'||refused.reason!=='version-capacity'||refused.version!==15||before.snapshot!==after.snapshot)throw Error('Capacity refusal was not atomic');
   const retry=await exchange({kind:'advance',session,sequence:16,seconds:.05,appliedVersion:15,ack:receiver.state().lastEvent});if(retry.kind!=='result'||!receiver.accept(retry.packet).accepted)throw Error('Retry failed');
   const final=await exchange({kind:'snapshot',session}),reference=await createSimulation({snapshotSource:source,chunkKeys:chunks});let equal,eventEqual;try{const {game,nav}=reference.diagnosticWorld(),events=[],stop=observeGameEvents(game,e=>events.push({channel:'game',payload:structuredClone(e)})),stopConditions=nav.intentTaskPlanner.observeStructureCondition(change=>events.push({channel:'condition',payload:{at:game.elapsed,change:structuredClone(change)}}));for(let i=0;i<16;i++){advanceReal(game,.05,nav);nav.serviceRaidConnectivityDemand?.();}stop();stopConditions();equal=reference.state().snapshot===final.snapshot;eventEqual=JSON.stringify(events)===JSON.stringify(receiver.state().events.map(e=>e.event));}finally{reference.dispose();}if(!equal||!eventEqual)throw Error('Reference mismatch');
   return {authority:r.authority,network:r.state.mangroveNetwork,animals:r.state.raid.animals.length,chunks:chunks.length,refused:{reason:refused.reason,version:refused.version,elapsed:refused.elapsed},snapshotUnchanged:before.snapshot===after.snapshot,retryVersion:retry.sequence,finalSnapshotEqual:equal,eventEqual,receivedEvents:receiver.state().lastEvent,scope:'QA Worker, 15 unconfirmed versions, forced capacity refusal then confirmation and retry. Frozen scene; no rendering, real input, Rapier, loss recovery, safe horizon or performance claim.'};
  }finally{worker.terminate();}
 });
 if(errors.length)throw Error(JSON.stringify(errors));await writeFile('docs/lighting/tree-near-retexture/performance/mobility-pipeline-version-capacity.json',JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result));
}finally{await browser.close();}
