import assert from 'node:assert/strict';
import test from 'node:test';
import {nativeFarmArrivalRouteFixture} from './helpers/native-farm-arrival-route.js';
import {nativeProductionAuthority,untilProduction} from './helpers/native-production-authority.js';
import {fixture as drawFixture,flush} from './helpers/remote-webgpu-fixture.js';
import {nativeClockResourceEnd} from '../src/rendering/native-clock-resource-end.js';
import {prepareWorkerCheckpoint} from '../src/persistence/prepare-worker-checkpoint.js';
import {savedNativeAuthorityOptions} from '../src/simulation/native-authority-checkpoint.js';

const chunkKeys=Array.from({length:25},(_,i)=>[i%5-2,Math.floor(i/5)-2].join(','));
const eventLoop=()=>new Promise(resolve=>setImmediate(resolve));
async function setup(qualifyRaidEncounter,{captureHistoricalEvents=false}={}){
 const fixture=nativeFarmArrivalRouteFixture({peer:false}),state=structuredClone(fixture.state);
 fixture.close();
 state.rng=3;
 state.dayPlan={done:false,at:state.time+.8,group:['warthog']};
 const world=await nativeProductionAuthority(state,{chunkKeys,qualifyFarmFlee:true,qualifyAnimalCrop:true,qualifyRaidEncounter,captureHistoricalEvents,recoverEncounterLoss:captureHistoricalEvents});
 await untilProduction(world,()=>world.records.some(record=>record.kind==='farm-arrival'&&record.committed));
 world.command({kind:'setNavigationView',view:{bounds:[-48,-48,48,48],eye:{x:-16,z:1.4},target:{x:-10,z:0}}});
 return world;
}
async function advance(world,count=1){
 return await world.command({kind:'advance',steps:count,seconds:.02,nightFastForward:false});
}
async function reachSecondHit(world){
 let snapshot=world.snapshot();
 while(snapshot.elapsed<12.60-1e-9){
  snapshot=JSON.parse((await advance(world)).snapshot);
  await world.present();
 }
 return snapshot;
}
async function until(read){
 for(let i=0;i<1000;i++){
  const value=read();
  if(value)return value;
  await eventLoop();
 }
 assert.fail('Native encounter did not reach the expected port boundary');
}
async function presentDepartedEncounter(world,snapshot){
 if(!world.host.inspect().nativeRouteFrame?.bindings.some(binding=>binding.nativeAnimalCrop?.purpose==='retreat'))return;
 const nativeWorldBoundary=world.client.requiredNativeWorldBoundary();
 const {client}=world;
 client.beginFrame({nativeWorldBoundary});
 const encoder=client.device.createCommandEncoder();
 const pass=encoder.beginRenderPass({colorAttachments:[{
  view:client.context.getCurrentTexture().createView(),loadOp:'clear',storeOp:'store'
 }]});
 pass.end();
 client.device.queue.submit([encoder.finish()]);
 const frame=client.endFrame({nativeWorldBoundary,clock:{...world.clock,elapsed:snapshot.elapsed,
  safeUntil:snapshot.elapsed,segments:[],paused:true}});
 await world.present();
 await frame;
}
async function finishWoundedHome(world,snapshot){
 const worker=snapshot.workers[0],elapsed=snapshot.elapsed;
 assert.equal(worker.status,'incapacitated');
 assert.equal(worker.nativeRouteAdmission,'pending-home-resources');
 const route=await until(()=>world.records.find(record=>record.kind==='home-route'&&record.resources.sourceRequest.recoveryHit));
 assert.equal(route.resources.sourceRequest.recoveryHit,29210);
 assert.equal(route.resources.sourceRequest.bodyId,1);
 assert.equal(route.resources.motionFlags,38);
 assert.ok(Math.abs(route.resources.runSpeed-.84)<1e-12);
 try{await untilProduction(world,()=>route.committed);}
 catch(error){throw Error([error,...world.errors,...world.faults].join('\n'));}
 await world.present();
 const first=world.host.inspect().nativeRouteFrame?.bindings.find(row=>row.nativeHome?.sourceRequest?.recoveryHit===29210);
 assert.equal(first?.nativeHome.bodyId,1);
 assert.equal(first.relativeTime,0);
 const start=world.snapshot().workers[0];
 const next=JSON.parse((await advance(world)).snapshot).workers[0];
 assert.equal(start.recoveryExitRemaining,.24);
 assert.ok(Math.abs(next.recoveryExitRemaining-.22)<1e-12);
 assert.equal(next.runRemaining,worker.runRemaining);
 assert.equal(next.walkPhase,start.walkPhase);
 assert.ok(Math.abs(next.runPhase-start.runPhase-.007)<1e-12);
 assert.ok(Math.abs(Math.hypot(next.x-start.x,next.z-start.z)-.0168)<1e-8);
 for(let i=0;i<100;i++){
  const step=await world.command({kind:'advance',seconds:.25,nightFastForward:false});
  if(step.elapsed>route.resources.endTime)break;
 }
 await untilProduction(world,()=>world.records.some(record=>record.kind==='home-arrival'&&record.committed));
 const complete=world.snapshot();
 assert.equal(complete.workers[0].status,'home');
 assert.equal(complete.workers[0].incapacitated,true);
 assert.equal(complete.workers[0].hits,2);
 assert.equal(complete.workers[0].nativeRouteAdmission,undefined);
 assert.equal(complete.workers[0].runRemaining,worker.runRemaining);
 assert.equal(complete.raid,null);
 assert.ok(complete.elapsed>elapsed);
 assert.deepEqual(complete.ledger,snapshot.ledger);
 assert.equal(world.command({kind:'snapshot',nativeAuthorityCheckpoint:true}).saveAvailable,true);
 assert.equal((await advance(world,2)).stepsExecuted,2);
 assert.deepEqual([...world.errors,...world.faults],[]);
}

test('the qualified Desert encounter waits for its submitted Retreat before the next substep',async()=>{
 const world=await setup(true);
 try{
  let snapshot=await reachSecondHit(world);
  const worker=snapshot.workers[0],first=snapshot.events.find(event=>event.type==='WorkerHit');
  assert.equal(first.nativeHomeImpact.home.reference.bodyId,1);
  assert.equal(worker.hits,1);
  const checkpoint=await world.command({kind:'snapshot',nativeAuthorityCheckpoint:true});
  assert.equal(checkpoint.saveAvailable,false);
  assert.equal(checkpoint.nativeAuthorityCheckpoint,undefined);
  const receive=world.resourcePort.onmessage;
  let held,settled=false;
  world.resourcePort.onmessage=event=>{
   if(event.data.result?.assignment){held=event;return;}
   receive(event);
  };
  const advancing=advance(world,2);
  advancing.then(()=>{settled=true;},()=>{settled=true;});
  const at=snapshot.elapsed+.02;
  await until(()=>settled||world.host.inspect().nativeCausalClock.committedThrough===at&&world.host.inspect().pendingSequence!==null);
  assert.equal(settled,false);
  assert.equal(held,undefined);
  const lastDraw=world.host.inspect().nativeRouteFrame?.sequence;
  world.host.setVisibility(true);
  await world.present();
  const hidden=world.host.inspect();
  assert.equal(hidden.presentationOpportunities.at(-1).outcome,'hidden');
  assert.equal(hidden.nativeRouteFrame?.sequence,lastDraw);
  assert.equal(hidden.nativeCausalClock.committedThrough,at);
  assert.equal(held,undefined);
  assert.equal(settled,false);
  world.host.setVisibility(false);
  await world.present();
  await until(()=>held||settled);
  assert.equal(settled,false);
  const submitted=world.host.inspect().nativeRouteFrame;
  assert.equal(submitted.worldBoundary.ticket,held.data.result.worldBoundary.ticket);
  assert.equal(submitted.sequence,held.data.result.sequence);
  assert.equal(submitted.clockElapsed,at);
  assert.equal(submitted.bindings.find(row=>row.nativeAnimalCrop?.purpose==='retreat').relativeTime,0);
  assert.equal(held.data.result.assignment,12);
  receive(held);
  world.resourcePort.onmessage=receive;
  const completed=await advancing;
  assert.equal(completed.stepsExecuted,2);
  assert.equal(completed.elapsed,at+.02);
  assert.equal(completed.events.filter(event=>event.type==='AnimalRetreating').length,1);
  snapshot=JSON.parse(completed.snapshot);
  while(snapshot.elapsed<19&&!snapshot.workers[0].recoveryExitRemaining){
   snapshot=JSON.parse((await advance(world)).snapshot);
   await world.present();
   if(!snapshot.raid)await presentDepartedEncounter(world,snapshot);
  }
  assert.equal(snapshot.workers[0].recoveryExitRemaining,.24);
  assert.equal(snapshot.workers[0].hits,2);
  assert.equal(snapshot.raid,null);
  assert.equal(snapshot.structures[0].hp,600);
  assert.deepEqual([...world.errors,...world.faults],[]);
  await finishWoundedHome(world,snapshot);
 }finally{await world.close();}
});

for(const order of ['commit in transit','commit accepted'])test(`retiring Draw before the Retreat submit leaves the next substep unexecuted with ${order}`,async()=>{
 const world=await setup(true);
 try{
  const snapshot=await reachSecondHit(world);
  const at=snapshot.elapsed+.02;
  const receive=world.resourcePort.onmessage;
  const post=world.resourcePort.postMessage.bind(world.resourcePort);
  let heldCommit;
  if(order==='commit in transit')world.resourcePort.postMessage=(message,...args)=>{
   if(message.kind==='commitEncounterRetreatResources'){heldCommit=message;return;}
   post(message,...args);
  };
  const submissions=[];
  world.resourcePort.onmessage=event=>{
   if(event.data.result?.assignment)submissions.push(event.data.result);
   receive(event);
  };
  const advancing=advance(world,2);
  advancing.catch(()=>{});
  await until(()=>world.host.inspect().nativeCausalClock.committedThrough===at&&world.host.inspect().pendingSequence!==null&&
   (order==='commit in transit'?heldCommit:world.records.some(record=>record.resources.reference?.purpose==='retreat'&&record.committed)));
  const pending=world.host.inspect().pendingSequence;
  assert.notEqual(world.host.inspect().nativeRouteFrame?.sequence,pending);
  world.client.dispose();
  await world.host.dispose();
  if(heldCommit)post(heldCommit);
  const reason=order==='commit in transit'?/graphics retired before commit/i:/disposed/i;
  await assert.rejects(advancing,reason);
  assert.deepEqual(submissions,[]);
  assert.notEqual(world.host.inspect().nativeRouteFrame?.sequence,pending);
  assert.throws(()=>world.command({kind:'snapshot'}),reason);
 }finally{await world.close();}
});

for(const first of ['resources','draw'])test(`encounter recovery waits for both retirements with ${first} first`,async()=>{
 const world=await setup(true);
 try{
  const snapshot=await reachSecondHit(world);
  const at=snapshot.elapsed+.02;
  const advancing=advance(world,2);
  advancing.catch(()=>{});
  await until(()=>world.host.inspect().nativeCausalClock.committedThrough===at&&world.host.inspect().pendingSequence!==null&&
   world.records.some(record=>record.resources.reference?.purpose==='retreat'&&record.committed));
  const submitted=world.host.inspect().nativeRouteFrame?.sequence;
  const hold=await world.authority.quiesceNativeIntentProduction();
  await assert.rejects(world.authority.flushNativeResourcePreparation({allowRetired:true}),/already pending/);
  let settled=false;
  const retired=world.authority.flushNativeResourcePreparation({allowRetired:true,forLostDraw:true});
  retired.then(()=>{settled=true;},()=>{settled=true;});
  if(first==='resources'){
   world.retireResourceEndpoint();
   await until(()=>world.authority.nativeResourcePreparationStatus().phase==='failed');
  }else{
   await world.host.dispose();
   await until(()=>world.authority.nativeIntentControlStatus().current?.drained);
  }
  await eventLoop();
  assert.equal(settled,false);
  assert.equal(world.host.inspect().nativeRouteFrame?.sequence,submitted);
  assert.throws(()=>world.authority.resumeNativeIntentProduction(hold),/still owns/);
  if(first==='resources')await world.host.dispose();
  else world.retireResourceEndpoint();
  assert.deepEqual(await retired,{version:1,session:'production-resources',terminal:true,callbacksSettled:true});
  await assert.rejects(advancing,first==='resources'?
   {name:'AbortError',message:'Native gate preparation cancelled'}:/WebGPU device lost/);
  assert.equal(world.host.inspect().nativeRouteFrame?.sequence,submitted);
  assert.equal(world.authority.nativeIntentProductionStatus().phase,'suspended');
 }finally{await world.close();}
});

for(const delayed of [false,true])test(`terminal encounter resumes through a new Draw with ${delayed?'late':'early'} loss claim`,async()=>{
 const world=await setup(true,{captureHistoricalEvents:true});
 const ports=new MessageChannel();
 let draw;
 try{
  const snapshot=await reachSecondHit(world),at=snapshot.elapsed+.02;
  const seconds=delayed ? .05 : .02;
  const advancing=world.command({kind:'advance',steps:2,seconds,nightFastForward:false,captureClockSegments:true});
  let settled=false;
  advancing.then(()=>{settled=true;},()=>{settled=true;});
  await until(()=>world.host.inspect().nativeCausalClock.committedThrough===at&&world.host.inspect().pendingSequence!==null&&
   world.records.some(record=>record.resources.reference?.purpose==='retreat'&&record.committed));
  if(delayed){
   world.retireResourceEndpoint();
   await until(()=>world.authority.nativeResourcePreparationStatus().phase==='failed');
   await eventLoop();
   assert.equal(settled,false);
  }
  const hold=await world.authority.quiesceNativeIntentProduction();
  const retired=world.authority.flushNativeResourcePreparation({allowRetired:true,forLostDraw:true,lossHoldId:30});
  retired.catch(()=>{});
  if(!delayed)world.retireResourceEndpoint();
  await world.host.dispose();
  const partial=await advancing;
  assert.equal(partial.elapsed,at);
  assert.equal(partial.stepsExecuted,delayed?0:1);
  const remainder=partial.encounterRecoveryCut.remainingSeconds;
  assert(Math.abs(remainder-(delayed ? .03 : 0))<1e-9);
  assert.deepEqual(partial.events.map(event=>event.type),['WorkerIncapacitated','AnimalRetreating']);
  assert.equal((await retired).terminal,true);
  const route=await world.authority.terminalWorkerRoute();
  assert.equal(route?.encounter,true);
  draw=await drawFixture({capabilities:{nativeAnimalCropVersion:1}},
    {intentControl:{port:ports.port2,session:'production-control',recoveryHold:30}});
  await assert.rejects(world.authority.attachHeldWorkerRoute(ports.port1,'production-control',31,hold,route),/Exact active native hold/);
  const {recoveredWorkerRoute:replacement}=await world.authority.attachHeldWorkerRoute(ports.port1,'production-control',30,hold,route);
  const ref=replacement.members[0].resources.nativeAnimalCropRouteBinding.reference;
  const clock={version:1,epoch:1,elapsed:at,safeUntil:at,anchorAbsoluteMs:0,paused:true,segments:[]};
  const frame={nativeWorldBoundary:ref.worldBoundary,clock};
  draw.client.registerClockBinding(draw.buffer,{byteOffset:0,epoch:at,semantic:'relative',
    nativeAnimalCrop:ref,resourceEnd:nativeClockResourceEnd(at,ref.endTime)});
  assert.throws(()=>world.authority.resumeNativeIntentProduction(hold),/still owns/);
  const pending=draw.frame(3,{...frame,recoveredEncounterFall:replacement.encounter});
  pending.catch(()=>{});
  await flush();await draw.host.idle();
  await assert.rejects(world.authority.checkHeldDraw(30,hold,route),/Missing submitted/);
  draw.host.present();
  await pending;
  const unverifiable=draw.frame(3,{...frame,recoveredEncounterFall:{...replacement.encounter,workerBody:3}});
  await flush();await draw.host.idle();draw.host.present();await unverifiable;
  await assert.rejects(world.authority.checkHeldDraw(30,hold,route),/Missing submitted/);
  assert.throws(()=>world.authority.resumeNativeIntentProduction(hold),/still owns/);
  const verified=draw.frame(3,{...frame,recoveredEncounterFall:replacement.encounter});
  await flush();await draw.host.idle();draw.host.present();await verified;
  const submitted=await world.authority.checkHeldDraw(30,hold,route);
  assert.deepEqual(submitted.encounter,replacement.encounter);
  assert.equal(submitted.members[0].relativeTime,0);
  await world.attachRecoveredResources(draw);
  assert.equal(world.authority.resumeNativeIntentProduction(hold),true);
  const next=await world.command({kind:'advance',steps:1,seconds:remainder||.02,nightFastForward:false});
  assert(Math.abs(next.elapsed-(at+(remainder||.02)))<1e-9);
  assert.equal(next.events.some(event=>['WorkerIncapacitated','AnimalRetreating'].includes(event.type)),false);
 }finally{
  await world.close();
  draw?.client.dispose();
  await draw?.host.dispose();
  ports.port1.close();ports.port2.close();
 }
});

test('the ordinary Desert qualifications still withhold contact corridors without encounter qualification',async()=>{
 const world=await setup(false);
 try{
  let snapshot=world.snapshot();
  while(snapshot.elapsed<12.64-1e-9){
   snapshot=JSON.parse((await advance(world)).snapshot);
   await world.present();
  }
  assert.equal(snapshot.workers[0].hits,0);
  assert.equal(snapshot.events.some(event=>event.nativeHomeImpact),false);
  assert.equal(world.records.some(record=>record.kind==='animal-crop-route'&&record.committed),false);
  assert.equal((await world.command({kind:'snapshot',nativeAuthorityCheckpoint:true})).nativeAuthorityCheckpoint.version,3);
  assert.deepEqual([...world.errors,...world.faults],[]);
 }finally{await world.close();}
});

for(const getUp of [false,true])test(`a disk checkpoint restores the qualified encounter during ${getUp?'GetUp after Retreat':'Fall and Retreat'}`,async()=>{
 const source=await setup(true);
 let loaded;
 try{
  const before=await reachSecondHit(source);
  const go=before.elapsed+.02;
  const advancing=advance(source);
  advancing.catch(()=>{});
  await until(()=>source.host.inspect().nativeCausalClock.committedThrough===go&&source.host.inspect().pendingSequence!==null);
  await source.present();await advancing;
  if(getUp){
   let current=source.snapshot();
   while(current.elapsed<19&&!current.workers[0].recovery){
    current=JSON.parse((await advance(source)).snapshot);
    await source.present();
   }
   assert(current.workers[0].recovery);
   assert.equal(current.raid,null);
  }
  const command={kind:'snapshot',nativeAuthorityCheckpoint:true};
  assert.equal(source.command({kind:'snapshot'}).saveAvailable,false);
  const snapshot=source.command(command),state=JSON.parse(snapshot.snapshot);
  const at=state.elapsed;
  assert.equal(snapshot.saveAvailable,true);
  const saved=prepareWorkerCheckpoint(snapshot,{slotId:state.slotId,policy:{nativeAuthority:true},savedAt:1});
  assert.equal(saved.saved,true);
  const encoded=JSON.stringify(saved.state);
  const marker=saved.state.workerNativeAuthorityCheckpoint.encounter;
  const hit=state.events.find(event=>event.type==='WorkerIncapacitated');
  assert.deepEqual(marker,{version:1,workerId:900011,animalId:Number(hit.animalId.split('-').at(-1)),hit:29210});
  const forged=structuredClone(saved.state);forged.workerNativeAuthorityCheckpoint.encounter.hit++;
  assert.throws(()=>savedNativeAuthorityOptions(JSON.stringify(forged)),/differs from the completed hit/);
  const options=savedNativeAuthorityOptions(encoded);
  loaded=await nativeProductionAuthority(saved.state,{...options,attach:false,
   qualifyRaidEncounter:true,qualifyAnimalCrop:true,qualifyFarmFlee:true});
  assert.throws(()=>loaded.authority.execute({kind:'advance',sequence:1,seconds:.02,nightFastForward:false}),
   /requires native control/);
  await loaded.attach();
  if(!getUp)await untilProduction(loaded,()=>loaded.records.some(record=>record.kind==='animal-crop-route'&&record.committed));
  const restored=loaded.snapshot();
  if(getUp){
   assert.equal(restored.raid,null);
   assert.equal(loaded.records.length,0);
  }else{
   const proof=loaded.records.find(record=>record.kind==='animal-crop-route').resources.reference;
   const original=source.records.find(record=>record.kind==='animal-crop-route'&&record.resources.reference.purpose==='retreat').resources.reference;
   assert.notEqual(proof.worldBoundary.authorityEpoch,original.worldBoundary.authorityEpoch);
   assert.equal(proof.worldBoundary.effectiveTime,at);
   assert.deepEqual([restored.raid.animals[0].x,restored.raid.animals[0].z,restored.raid.animals[0].motionPhase],
    [state.raid.animals[0].x,state.raid.animals[0].z,state.raid.animals[0].motionPhase]);
  }
  assert.deepEqual(restored.workers[0],state.workers[0]);
  const facts=[];
  let current=restored;
  while(current.elapsed<19&&!current.workers[0].recoveryExitRemaining){
   const publication=await advance(loaded);
   facts.push(...publication.events);
   current=JSON.parse(publication.snapshot);
   await loaded.present();
   if(!current.raid)await presentDepartedEncounter(loaded,current);
  }
  assert.equal(current.workers[0].recoveryExitRemaining,.24);
  assert.equal(current.raid,null);
  assert.equal(facts.filter(event=>event.type==='RaidEnded').length,getUp?0:1);
  assert.equal(facts.some(event=>['WorkerIncapacitated','AnimalRetreating'].includes(event.type)),false);
  assert.equal(current.structures[0].hp,600);
  assert.deepEqual(current.ledger,state.ledger);
  assert.deepEqual([...loaded.errors,...loaded.faults],[]);
  await finishWoundedHome(loaded,current);
 }finally{await loaded?.close();await source.close();}
});
