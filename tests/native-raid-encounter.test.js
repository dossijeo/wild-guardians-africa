import assert from 'node:assert/strict';
import test from 'node:test';
import {nativeFarmArrivalRouteFixture} from './helpers/native-farm-arrival-route.js';
import {nativeProductionAuthority,untilProduction} from './helpers/native-production-authority.js';
import {fixture as drawFixture,flush} from './helpers/remote-webgpu-fixture.js';
import {nativeClockResourceEnd} from '../src/rendering/native-clock-resource-end.js';
import {prepareWorkerCheckpoint} from '../src/persistence/prepare-worker-checkpoint.js';
import {savedNativeAuthorityOptions} from '../src/simulation/native-authority-checkpoint.js';
import {floorFloat32} from '../src/rendering/float32-time.js';
import {nativeWorkerGraphicsFixture} from './helpers/native-task-consequence-graphics.js';

const chunkKeys=Array.from({length:25},(_,i)=>[i%5-2,Math.floor(i/5)-2].join(','));
const eventLoop=()=>new Promise(resolve=>setImmediate(resolve));
async function setup(qualifyRaidEncounter,{captureHistoricalEvents=false,onReady=()=>{}}={}){
 const fixture=nativeFarmArrivalRouteFixture({peer:false}),state=structuredClone(fixture.state);
 fixture.close();
 state.rng=3;
 state.dayPlan={done:false,at:state.time+.8,group:['warthog']};
 const world=await nativeProductionAuthority(state,{chunkKeys,qualifyFarmFlee:true,qualifyAnimalCrop:true,qualifyRaidEncounter,captureHistoricalEvents,recoverEncounterLoss:captureHistoricalEvents,onReady});
 await untilProduction(world,()=>world.records.some(record=>record.kind==='farm-arrival'&&record.committed));
 world.command({kind:'setNavigationView',view:{bounds:[-48,-48,48,48],eye:{x:-16,z:1.4},target:{x:-10,z:0}}});
 return world;
}
async function advance(world,count=1){
 return await world.command({kind:'advance',steps:count,seconds:.02,nightFastForward:false});
}
async function reachSecondHit(world,draw=world){
 let snapshot=world.snapshot();
 while(snapshot.elapsed<12.60-1e-9){
  snapshot=JSON.parse((await advance(world)).snapshot);
  await world.present();
 }
 const animal=world.records.findLast(record=>record.kind==='animal-crop-route'&&record.committed);
 const current=draw.host.inspect().nativeRouteFrame;
 // Publish the first impact before asking Draw to prepare the second one.
 // The worker's old Home clock no longer belongs to the ordinary packet.
 if(animal&&current?.bindings.some(binding=>binding.nativeHome)&&snapshot.workers[0].nativeRouteAdmission!=='native-home')
  await presentEncounterFrame(world,snapshot,animal.cropGroup,draw);
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
 await presentEncounterFrame(world,snapshot);
}
async function presentEncounterFrame(world,snapshot,group=null,draw=world){
 const {client,pipeline}=draw,nativeWorldBoundary=client.requiredNativeWorldBoundary();
 client.beginFrame({nativeWorldBoundary});
 const encoder=client.device.createCommandEncoder();
 const pass=encoder.beginRenderPass({colorAttachments:[{
  view:client.context.getCurrentTexture().createView(),loadOp:'clear',storeOp:'store'
 }]});
 if(group){pass.setPipeline(pipeline);pass.setBindGroup(0,group);pass.draw(3);}
 pass.end();
 client.device.queue.submit([encoder.finish()]);
 const frame=client.endFrame({nativeWorldBoundary,clock:{...world.clock,elapsed:snapshot.elapsed,
  safeUntil:snapshot.elapsed,segments:[],paused:true}});
 await world.present();
 await frame;
}
async function finishWoundedHome(world,snapshot,afterFirstStep,retriedRoute=null){
 const worker=snapshot.workers[0];
 assert.equal(worker.status,'incapacitated');
 assert.equal(worker.nativeRouteAdmission,'pending-home-resources');
 const route=retriedRoute??await until(()=>world.records.find(record=>record.kind==='home-route'&&record.resources.sourceRequest.recoveryHit));
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
 await afterFirstStep?.(route);
 await finishWoundedHomeArrival(world,route,worker,snapshot);
}
async function finishWoundedHomeArrival(world,route,worker,snapshot){
 for(let i=0;i<100;i++){
  const step=await world.command({kind:'advance',seconds:.25,nightFastForward:false});
  await world.present();
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
 assert.ok(complete.elapsed>snapshot.elapsed);
 assert.deepEqual(complete.ledger,snapshot.ledger);
 assert.equal(world.command({kind:'snapshot',nativeAuthorityCheckpoint:true}).saveAvailable,true);
 assert.equal((await advance(world,2)).stepsExecuted,2);
 assert.deepEqual([...world.errors,...world.faults],[]);
}

test('terminal Draw recovery retains wounded Home and its GetUp exit age',async()=>{
 const world=await setup(true),ports=new MessageChannel();
 let draw,rig;
 try{
  let snapshot=await reachSecondHit(world);
  const at=snapshot.elapsed+.02,advancing=advance(world,2);
  await until(()=>world.host.inspect().nativeCausalClock.committedThrough===at&&world.host.inspect().pendingSequence!==null);
  await world.present();
  snapshot=JSON.parse((await advancing).snapshot);
  while(!snapshot.workers[0].recoveryExitRemaining){
   snapshot=JSON.parse((await advance(world)).snapshot);
   await world.present();
   if(!snapshot.raid)await presentDepartedEncounter(world,snapshot);
  }
  await finishWoundedHome(world,snapshot,async()=>{
   const frozen=world.snapshot(),worker=frozen.workers[0];
   assert.ok(Math.abs(worker.recoveryExitRemaining-.22)<1e-12);
   world.gpu.device.destroy();
   world.retireResourceEndpoint();
   const receipt=await world.authority.quiesceNativeIntentProduction();
   assert.equal((await world.authority.flushNativeResourcePreparation({allowRetired:true})).terminal,true);
   const route=await world.authority.terminalWorkerRoute();
   assert.deepEqual(route,{kind:18,actorId:900011});
   draw=await drawFixture({capabilities:{nativeHomeRouteVersion:1,nativeHomeArrivalVersion:1}},
    {intentControl:{port:ports.port2,session:'production-control',recoveryHold:30}});
   const {recoveredWorkerRoute:q}=await world.authority.attachHeldWorkerRoute(ports.port1,'production-control',30,receipt,route);
   const ref=q.resources.nativeHomeRouteBinding.reference,boundary=ref.worldBoundary,epoch=boundary.effectiveTime;
   assert.equal(ref.sourceRequest.recoveryHit,29210);
   assert.equal(q.execution.bodyId,1);
   assert.equal(q.execution.executedThrough,frozen.elapsed);
   for(const key of ['x','z','runPhase','walkPhase','carryPhase','runRemaining'])assert.equal(q.execution[key],worker[key]);
   assert.equal(q.execution.yaw,worker.heading);

   const payloads=new Map();
   world.authority.publishResidentTerrainForQa(payload=>payloads.set(payload.cx+','+payload.cz,payload));
   let selected;
   const session={core:{selectChunk(x,z){selected=payloads.get(x+','+z);assert(selected);},chunkPayload:()=>selected}};
   rig=await nativeWorkerGraphicsFixture({state:frozen,worker,actor:worker.id,session,close(){}},
    {clips:['Walk_Skip','Run','Idle'],idle:true});
   const age=floorFloat32(frozen.elapsed-epoch);
   const source={...q,terrain:rig.terrain,terrainManifest:rig.manifest};
   let pickReads=0;
   const options={isCurrent:()=>true,getPickTime:()=>{pickReads++;return epoch+age;}};
   rig.state.workers[0].recoveryExitRemaining=.24;
   rig.roster.sync();
   assert.throws(()=>rig.roster.prepareRecoveredWorkerRoute(source,options),/Recovery pose or committed owner differs/);
   rig.state.workers[0].recoveryExitRemaining=worker.recoveryExitRemaining;
   rig.roster.sync();
   await rig.roster.prepareRecoveredWorkerRoute(source,options);
   assert(rig.roster.nativeRouteCurrent(worker.id,q.resources.nativeRoute));
   assert.equal(pickReads,0,'Preparing the replacement must not sample a never-submitted frame');
   await assert.rejects(world.authority.checkHeldDraw(30,receipt,route),/Missing submitted/);

   draw.client.registerClockBinding(draw.buffer,{byteOffset:0,epoch,semantic:'relative',
    nativeHome:ref,resourceEnd:nativeClockResourceEnd(epoch,ref.endTime)});
   const frame=draw.frame(3,{nativeWorldBoundary:boundary,
    clock:{...world.clock,elapsed:frozen.elapsed,safeUntil:frozen.elapsed,paused:true,segments:[]}});
   await flush();await draw.host.idle();draw.host.present();await frame;
   const submitted=await world.authority.checkHeldDraw(30,receipt,route);
   assert.equal(submitted.relativeTime,age);
   const restorePick=rig.roster.get(worker.id).preparePick();
   try{assert(pickReads>0);}finally{restorePick();}
   await world.attachRecoveredResources(draw);
   assert.equal(world.authority.resumeNativeIntentProduction(receipt),true);
   assert.deepEqual(world.snapshot().workers[0],worker);
   const resumed=JSON.parse((await advance(world)).snapshot).workers[0];
   assert.ok(Math.abs(resumed.recoveryExitRemaining-.20)<1e-12);
   assert.ok(Math.abs(Math.hypot(resumed.x-worker.x,resumed.z-worker.z)-.0168)<1e-8);
   assert.equal(resumed.runRemaining,worker.runRemaining);
  });
  assert.deepEqual(draw.errors,[]);
 }finally{rig?.close();await world.close();ports.port1.close();ports.port2.close();}
});

test('the qualified Desert encounter waits for its submitted Retreat before the next substep',async()=>{
 const world=await setup(true);
 try{
  let snapshot=await reachSecondHit(world);
  const worker=snapshot.workers[0],first=snapshot.events.find(event=>event.type==='WorkerHit');
  assert.equal(first.nativeHomeImpact.home.reference.bodyId,1);
  assert.equal(worker.hits,1);
  const checkpoint=await world.command({kind:'snapshot'});
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

test('a checkpoint between impacts acquires the saved approach and consumes one second hit',async()=>{
 const source=await setup(true);
 let loaded,releaseReady;
 try{
  let before=source.snapshot();
  while(!before.events.some(event=>event.type==='WorkerHit')){
   assert(before.elapsed<12.60);
   before=JSON.parse((await advance(source)).snapshot);
   await source.present();
  }
  const result=source.command({kind:'snapshot',nativeAuthorityCheckpoint:true});
  assert.equal(result.saveAvailable,true);
  const {state}=prepareWorkerCheckpoint(result,{slotId:before.slotId,policy:{nativeAuthority:true},savedAt:1});
  const {approachPath,...marker}=state.workerNativeAuthorityCheckpoint.encounter;
  assert.deepEqual(marker,{version:3,workerId:900011,animalId:1000000,hit:29209,spawn:29208});
  assert.equal(approachPath.length,3);
  assert.deepEqual(state.raid.animals[0].path,before.raid.animals[0].path,
   'The checkpoint corridor must not change the live presentation path');
  assert.deepEqual(approachPath,before.raid.animals[0].path.slice(-3));
  const bad=structuredClone(state);
  bad.events.find(event=>event.id==='event-29209').nativeHomeImpact.x+=.01;
  assert.throws(()=>savedNativeAuthorityOptions(JSON.stringify(bad)),/first impact/);
  bad.events=structuredClone(state.events);
  bad.workerNativeAuthorityCheckpoint.encounter.approachPath.at(-1).x+=1;
  assert.throws(()=>savedNativeAuthorityOptions(JSON.stringify(bad)),/first impact/);
  const options=savedNativeAuthorityOptions(JSON.stringify(state));
  const ready=new Promise(resolve=>{releaseReady=resolve;});
  loaded=await nativeProductionAuthority(state,{...options,attach:false,qualifyFarmFlee:true,qualifyAnimalCrop:true,
   qualifyRaidEncounter:true,onReady(record){if(record.resources.reference?.purpose==='center')return ready;}});
  await loaded.attach();
  const approach=await until(()=>loaded.records.find(record=>record.kind==='animal-crop-route'));
  assert.equal(approach.resources.reference.phase,before.raid.animals[0].motionPhase);
  assert.equal(approach.resources.reference.x,before.raid.animals[0].x);
  assert.equal(approach.resources.worldBoundary.effectiveTime,before.elapsed);
  assert.notEqual(approach.resources.worldBoundary.authorityEpoch,
   source.records.find(record=>record.kind==='animal-crop-route').resources.worldBoundary.authorityEpoch);
  const frozen=loaded.snapshot();
  assert.deepEqual(frozen.workers[0],before.workers[0]);
  let settled=false;
  const queued=advance(loaded);
  queued.then(()=>{settled=true;},()=>{settled=true;});
  await loaded.present();
  assert.equal(settled,false);
  assert.equal(approach.committed,false);
  releaseReady();
  await untilProduction(loaded,()=>approach.committed);
  await loaded.present();
  assert.equal(loaded.host.inspect().nativeRouteFrame?.bindings.find(row=>row.nativeAnimalCrop?.purpose==='center')?.relativeTime,0);
  assert.equal((await queued).elapsed,before.elapsed+.02);
  const original=await reachSecondHit(source);
  let restored=await reachSecondHit(loaded);
  assert.equal(restored.elapsed,original.elapsed);
  assert.equal(restored.rng,original.rng);
  assert.deepEqual(restored.workers,original.workers);
  for(const field of ['x','z','heading','motionPhase','hitsRemaining','targetId','reservation'])
   assert.equal(restored.raid.animals[0][field],original.raid.animals[0][field],field);
  const at=restored.elapsed+.02,advancing=advance(loaded,2);
  await until(()=>loaded.host.inspect().nativeCausalClock.committedThrough===at&&loaded.host.inspect().pendingSequence!==null);
  await loaded.present();
  const resultAfter=await advancing;
  assert.equal(resultAfter.stepsExecuted,2);
  assert.equal(resultAfter.events.filter(event=>event.type==='WorkerIncapacitated').length,1);
  assert.equal(resultAfter.events.filter(event=>event.type==='AnimalRetreating').length,1);
  restored=JSON.parse(resultAfter.snapshot);
  assert.equal(restored.events.filter(event=>event.type==='WorkerHit').length,1);
  assert.equal(loaded.command({kind:'snapshot',nativeAuthorityCheckpoint:true}).nativeAuthorityCheckpoint.encounter.version,1);
  while(!restored.workers[0].recoveryExitRemaining){
   assert(restored.elapsed<19);
   restored=JSON.parse((await advance(loaded)).snapshot);
   await loaded.present();
   if(!restored.raid)await presentDepartedEncounter(loaded,restored);
  }
  assert.equal(restored.structures[0].hp,600);
  await finishWoundedHome(loaded,restored);
 }finally{releaseReady?.();await loaded?.close();await source.close();}
});

test('a checkpoint during wounded Home resumes the remaining route and exit phase',async()=>{
 const world=await setup(true);
 let restored,blocked;
 try{
  let snapshot=await reachSecondHit(world);
  const at=snapshot.elapsed+.02,advancing=advance(world,2);
  await until(()=>world.host.inspect().nativeCausalClock.committedThrough===at&&world.host.inspect().pendingSequence!==null);
  await world.present();
  snapshot=JSON.parse((await advancing).snapshot);
  while(!snapshot.workers[0].recoveryExitRemaining){
   snapshot=JSON.parse((await advance(world)).snapshot);
   await world.present();
   if(!snapshot.raid)await presentDepartedEncounter(world,snapshot);
  }
  await finishWoundedHome(world,snapshot,async route=>{
   const actual=world.snapshot().workers[0];
   const result=world.command({kind:'snapshot',nativeAuthorityCheckpoint:true});
   assert.equal(result.saveAvailable,true);
   const checkpoint=prepareWorkerCheckpoint(result,{slotId:snapshot.slotId,policy:{nativeAuthority:true},savedAt:1});
   const stored=checkpoint.state.workerNativeAuthorityCheckpoint.encounter;
   assert.equal(stored.version,2);
   assert.equal(stored.hit,29210);
   assert.equal(stored.home.exitRemaining,actual.recoveryExitRemaining);
   const forged=structuredClone(checkpoint.state);
   forged.workerNativeAuthorityCheckpoint.encounter.home.path.at(-1).z+=1;
   assert.throws(()=>savedNativeAuthorityOptions(JSON.stringify(forged)),/saved encounter Home/);
   forged.workerNativeAuthorityCheckpoint.encounter.home.path=structuredClone(stored.home.path);
   forged.workerNativeAuthorityCheckpoint.encounter.home.path.unshift({x:512,z:512});
   const forgedOptions=savedNativeAuthorityOptions(JSON.stringify(forged));
   blocked=await nativeProductionAuthority(forged,{...forgedOptions,attach:false,
    qualifyFarmFlee:true,qualifyAnimalCrop:true,qualifyRaidEncounter:true});
   await assert.rejects(blocked.attach(),/native corridor proof/);
   const options=savedNativeAuthorityOptions(JSON.stringify(checkpoint.state));
   restored=await nativeProductionAuthority(checkpoint.state,{...options,
    attach:false,qualifyFarmFlee:true,qualifyAnimalCrop:true,qualifyRaidEncounter:true});
   assert.equal(restored.command({kind:'snapshot',nativeAuthorityCheckpoint:true}).saveAvailable,false);
   await restored.attach();
   await untilProduction(restored,()=>restored.records.some(row=>row.kind==='home-route'&&row.committed));
   const rebuilt=restored.records.find(row=>row.kind==='home-route');
   assert.notEqual(rebuilt.resources.worldBoundary.authorityEpoch,route.resources.worldBoundary.authorityEpoch);
   assert.deepEqual(Array.from(rebuilt.resources.points),stored.home.path.flatMap(({x,z})=>[x,z]));
   assert.equal(rebuilt.resources.sourceRequest.recoveryExit,actual.recoveryExitRemaining);
   const start=restored.snapshot().workers[0];
   for(const key of ['x','z','runPhase','walkPhase','carryPhase','runRemaining','recoveryExitRemaining'])assert.equal(start[key],actual[key]);
   await restored.present();
   const drawn=restored.host.inspect().nativeRouteFrame.bindings.find(row=>row.nativeHome?.sourceRequest?.recoveryHit===stored.hit);
   assert.equal(drawn.relativeTime,0);
   assert.equal(drawn.nativeHome.sourceRequest.recoveryExit,actual.recoveryExitRemaining);
   const nextOriginal=JSON.parse((await advance(world)).snapshot).workers[0];
   const nextRestored=JSON.parse((await advance(restored)).snapshot).workers[0];
   for(const key of ['x','z','heading','runPhase','recoveryExitRemaining'])assert.ok(Math.abs(nextOriginal[key]-nextRestored[key])<1e-10,key);
   assert.equal(nextRestored.runRemaining,40);
   await finishWoundedHomeArrival(restored,rebuilt,actual,snapshot);
   await restored.close();
   for(let i=0;i<13;i++)await advance(world);
   const finishedExit=world.command({kind:'snapshot',nativeAuthorityCheckpoint:true});
   assert.equal(finishedExit.saveAvailable,true);
   assert.equal(finishedExit.nativeAuthorityCheckpoint.encounter.home.exitRemaining,0);
   const later=prepareWorkerCheckpoint(finishedExit,{slotId:snapshot.slotId,policy:{nativeAuthority:true},savedAt:2});
   const laterOptions=savedNativeAuthorityOptions(JSON.stringify(later.state));
   restored=await nativeProductionAuthority(later.state,{...laterOptions,
    qualifyFarmFlee:true,qualifyAnimalCrop:true,qualifyRaidEncounter:true});
   await untilProduction(restored,()=>restored.records.some(row=>row.kind==='home-route'&&row.committed));
   assert.equal(restored.records.find(row=>row.kind==='home-route').resources.sourceRequest.recoveryExit,0);
   assert.equal(restored.snapshot().workers[0].recoveryExitRemaining,0);
  });
 }finally{await blocked?.close();await restored?.close();await world.close();}
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

for(const phase of ['approach','retreat'])test(`terminal Draw loss preserves the acquired ${phase} during Fall`, {timeout:30000}, async()=>{
 const world=await setup(true,{captureHistoricalEvents:true}),ports=new MessageChannel();
 let draw;
 try{
  let snapshot=world.snapshot();
  if(phase==='retreat'){
   snapshot=await reachSecondHit(world);
   const hitAt=snapshot.elapsed+.02,advancing=advance(world,2);
   await until(()=>world.host.inspect().nativeCausalClock.committedThrough===hitAt&&world.host.inspect().pendingSequence!==null);
   await world.present();
   snapshot=JSON.parse((await advancing).snapshot);
  }else{
   while(!snapshot.events.some(event=>event.type==='WorkerHit')){
    assert(snapshot.elapsed<12.60);
    snapshot=JSON.parse((await advance(world)).snapshot);
    await world.present();
   }
  }
  const at=snapshot.elapsed,worker=snapshot.workers[0],animal=snapshot.raid.animals[0];
  const hold=await world.authority.quiesceNativeIntentProduction();
  world.retireResourceEndpoint();
  await world.host.dispose();
  const retired=await world.authority.flushNativeResourcePreparation({allowRetired:true,forLostDraw:true,lossHoldId:30});
  assert.equal(retired.terminal,true);
  const route=await world.authority.terminalWorkerRoute();
  assert.equal(route?.encounter,phase);
  draw=await drawFixture({capabilities:{nativeAnimalCropVersion:1}},
   {intentControl:{port:ports.port2,session:'production-control',recoveryHold:30}});
  const {recoveredWorkerRoute:replacement}=await world.authority.attachHeldWorkerRoute(ports.port1,'production-control',30,hold,route);
  const {execution,resources}=replacement.members[0],ref=resources.nativeAnimalCropRouteBinding.reference;
  assert.equal(ref.purpose,phase==='approach'?'center':'retreat');
  assert.ok(ref.worldBoundary.effectiveTime<at);
  assert.equal(execution.x,animal.x);
  assert.equal(execution.phase,animal.motionPhase);
  assert.equal(replacement.encounter.hit,phase==='approach'?29209:29210);
  assert.equal(replacement.encounter.workerBody,1);
  assert.equal(replacement.encounter.remaining,worker.fallRemaining);
  assert.deepEqual(world.snapshot().workers[0],worker);
  const epoch=ref.worldBoundary.effectiveTime;
  draw.client.registerClockBinding(draw.buffer,{byteOffset:0,epoch,semantic:'relative',
   nativeAnimalCrop:ref,resourceEnd:nativeClockResourceEnd(epoch,ref.endTime)});
  const frame={nativeWorldBoundary:replacement.worldBoundary,
   clock:{...world.clock,elapsed:at,safeUntil:at,paused:true,segments:[]}};
  const valid=draw.frame(3,{...frame,recoveredEncounterFall:replacement.encounter});
  valid.catch(()=>{});
  await flush();await draw.host.idle();
  await assert.rejects(world.authority.checkHeldDraw(30,hold,route),/Missing submitted/);
  draw.host.present();await valid;
  const proof=await world.authority.checkHeldDraw(30,hold,route);
  assert.equal(proof.members[0].relativeTime,floorFloat32(at-epoch));
  assert.deepEqual(proof.encounter,replacement.encounter);
  await world.attachRecoveredResources(draw);
  assert.equal(world.authority.resumeNativeIntentProduction(hold),true);
  if(phase==='retreat'){
   const next=await advance(world);
   assert.equal(next.stepsExecuted,1);
   assert.equal(JSON.parse(next.snapshot).workers[0].hits,2);
   assert.equal(next.events.some(event=>['WorkerIncapacitated','AnimalRetreating'].includes(event.type)),false);
   return;
  }
  snapshot=await reachSecondHit(world,draw);
  const secondAt=snapshot.elapsed+.02,advancing=advance(world,2);
  await until(()=>draw.host.inspect().nativeCausalClock.committedThrough===secondAt&&draw.host.inspect().pendingSequence!==null);
  await world.present();
  await until(()=>draw.host.inspect().nativeRouteFrame?.bindings.some(row=>row.nativeAnimalCrop?.purpose==='retreat'));
  const after=await advancing;
  assert.equal(after.stepsExecuted,2);
  assert.deepEqual(after.events.map(event=>event.type),['WorkerIncapacitated','AnimalRetreating']);
  snapshot=JSON.parse(after.snapshot);
  assert.equal(snapshot.events.filter(event=>event.type==='WorkerHit').length,1);
  assert.equal(snapshot.workers[0].hits,2);
  assert.deepEqual([...draw.errors,...world.faults],[]);
 }finally{await world.close();draw?.client.dispose();await draw?.host.dispose();ports.port1.close();ports.port2.close();}
});

for(const phase of ['Fall','GetUp'])test(`terminal Draw verifies stationary ${phase} after RaidEnded`, {timeout:30000}, async()=>{
 const world=await setup(true,{captureHistoricalEvents:true}),ports=new MessageChannel();
 let draw;
 try{
  const before=await reachSecondHit(world),impact=before.elapsed+.02,advancing=advance(world,2);
  await until(()=>world.host.inspect().nativeCausalClock.committedThrough===impact&&world.host.inspect().pendingSequence!==null);
  await world.present();
  let snapshot=JSON.parse((await advancing).snapshot);
  while(snapshot.raid||phase==='GetUp'&&!snapshot.workers[0].recovery){
   assert(snapshot.elapsed<17);
   snapshot=JSON.parse((await advance(world)).snapshot);
   await world.present();
   if(!snapshot.raid)await presentDepartedEncounter(world,snapshot);
  }
  await presentDepartedEncounter(world,snapshot);
  const {elapsed:at,workers:[worker]}=snapshot;
  assert.equal(worker.hits,2);
  assert.equal(!!worker.recovery,phase==='GetUp');
  assert.equal(worker.nativeRouteAdmission,undefined);
  const hold=await world.authority.quiesceNativeIntentProduction();
  world.retireResourceEndpoint();
  await world.host.dispose();
  assert.equal((await world.authority.flushNativeResourcePreparation({allowRetired:true,forLostDraw:true,lossHoldId:30})).terminal,true);
  const route=await world.authority.terminalWorkerRoute();
  assert.deepEqual(route,{version:2,encounter:'stationary',workerId:900011,members:[]});
  draw=await drawFixture({}, {intentControl:{port:ports.port2,session:'production-control',recoveryHold:30}});
  const {recoveredWorkerRoute:replacement}=await world.authority.attachHeldWorkerRoute(ports.port1,'production-control',30,hold,route);
  const {encounter,worldBoundary}=replacement;
  assert.equal(encounter.at,at);
  assert.equal(encounter.workerBody,1);
  assert.equal(encounter.hit,29210);
  assert.equal(encounter.remaining,worker.fallRemaining??0);
  assert.deepEqual(encounter.getUp,worker.recovery??null);
  const frame={nativeWorldBoundary:worldBoundary,recoveredEncounterFall:encounter,
   clock:{...world.clock,elapsed:at,safeUntil:at,paused:true,segments:[]}};
  const recoveryPoseWitness={id:draw.buffer.__remoteGpuId,phaseOffset:0,weightOffset:4};
  const stage=async(value,witness,count=3)=>{
   const {client}=draw;
   client.beginFrame({...frame,...(witness?{recoveryPoseWitness}:{})});
   client.device.queue.writeBuffer(draw.buffer,0,new Float32Array([value]));
   const encoder=client.device.createCommandEncoder(),pass=encoder.beginRenderPass({colorAttachments:[
    {view:client.context.getCurrentTexture().createView(),loadOp:'clear',storeOp:'store'}]});
   pass.setPipeline(draw.pipeline);pass.setBindGroup(0,draw.group);pass.draw(count);pass.end();
   client.device.queue.submit([encoder.finish()]);
   const pending=client.endFrame();
   pending.catch(()=>{});await flush();await draw.host.idle();return {pending};
  };
  const present=async(...args)=>{const {pending}=await stage(...args);draw.host.present();await pending;};
  await present(encounter.phase,null);
  await assert.rejects(world.authority.checkHeldDraw(30,hold,route),/Missing submitted/);
  await present(encounter.phase+1,recoveryPoseWitness);
  await assert.rejects(world.authority.checkHeldDraw(30,hold,route),/Missing submitted/);
  await present(encounter.phase,recoveryPoseWitness,0);
  await assert.rejects(world.authority.checkHeldDraw(30,hold,route),/Missing submitted/);
  const {pending}=await stage(encounter.phase,recoveryPoseWitness);
  await assert.rejects(world.authority.checkHeldDraw(30,hold,route),/Missing submitted/);
  draw.host.present();await pending;
  assert.equal(draw.host.inspect().nativeRouteFrame.recoveredEncounterPose.phase,encounter.phase);
  assert.deepEqual((await world.authority.checkHeldDraw(30,hold,route)).encounter,encounter);
  await present(encounter.phase,null);
  await assert.rejects(world.authority.checkHeldDraw(30,hold,route),/Missing submitted/);
  await present(encounter.phase,recoveryPoseWitness);
  await world.attachRecoveredResources(draw);
  assert.equal(world.authority.resumeNativeIntentProduction(hold),true);
  const next=await advance(world);
  assert.equal(next.stepsExecuted,1);
  assert.equal(next.elapsed,at+.02);
  assert.equal(next.events.some(event=>['WorkerIncapacitated','AnimalRetreating','RaidEnded'].includes(event.type)),false);
  assert.deepEqual([...draw.errors,...world.faults],[]);
 }finally{await world.close();draw?.client.dispose();await draw?.host.dispose();ports.port1.close();ports.port2.close();}
});

for(const order of ['preparer closing first','hold requested first','an ordinary preparation error'])test(`wounded Home READY handles ${order}`,{timeout:35000},async()=>{
 let first,release,reject;
 const ready=new Promise((yes,no)=>{release=yes;reject=no;});
 const world=await setup(true,{captureHistoricalEvents:true,onReady(record){
  if(!first&&record.kind==='home-route'&&record.resources.sourceRequest.recoveryHit){first=record;return ready;}
 }}),ports=new MessageChannel();
 let draw;
 try{
  const before=await reachSecondHit(world),impact=before.elapsed+.02,advancing=advance(world,2);
  await until(()=>world.host.inspect().nativeCausalClock.committedThrough===impact&&world.host.inspect().pendingSequence!==null);
  await world.present();let snapshot=JSON.parse((await advancing).snapshot);
  while(!snapshot.workers[0].recoveryExitRemaining){
   assert(snapshot.elapsed<19);
   snapshot=JSON.parse((await advance(world)).snapshot);
   await world.present();
   if(!snapshot.raid)await presentDepartedEncounter(world,snapshot);
  }
  const at=snapshot.elapsed;
  await until(()=>first);
  assert.equal(first.committed,false);
  if(order==='an ordinary preparation error'){
   const pending=assert.rejects(world.authority.quiesceNativeIntentProduction(),/Invalid fixture Home resources/);
   reject(Error('Invalid fixture Home resources'));
   await pending;
   assert.equal(world.authority.nativeIntentProductionStatus().phase,'failed');
   assert.equal(world.authority.nativeResourcePreparationStatus().phase,'running');
   assert.equal(first.committed,false);
   return;
  }
  const closeFirst=order==='preparer closing first';
  if(closeFirst){
   world.retireResourceEndpoint();release();
   await until(()=>world.authority.nativeIntentProductionStatus().active===null);
  }
  const suspending=world.authority.quiesceNativeIntentProduction({forLostDraw:true});
  suspending.catch(()=>{});
  if(!closeFirst){world.retireResourceEndpoint();release();}
  const hold=await suspending;
  await world.host.dispose();
  assert.equal((await world.authority.flushNativeResourcePreparation({allowRetired:true,forLostDraw:true,lossHoldId:30})).terminal,true);
  assert.equal(first.committed,false);
  await assert.rejects(first.packet.presented);
  assert.equal(world.authority.nativeIntentProductionStatus().last.status,'cancelled');
  const route=await world.authority.terminalWorkerRoute();
  assert.deepEqual(route,{version:2,encounter:'stationary',workerId:900011,members:[]});
  draw=await drawFixture({capabilities:{nativeHomeRouteVersion:1,nativeHomeArrivalVersion:1}},
    {intentControl:{port:ports.port2,session:'production-control',recoveryHold:30}});
  const {recoveredWorkerRoute:{encounter,worldBoundary}}=await world.authority.attachHeldWorkerRoute(ports.port1,'production-control',30,hold,route);
  assert.deepEqual(encounter.home,first.resources.sourceRequest);
  assert.equal(encounter.phase,0);
  assert.equal(encounter.at,at);
  const packet=draw.frame(0,{nativeWorldBoundary:worldBoundary,recoveredEncounterFall:encounter,
   recoveryPoseWitness:{id:draw.buffer.__remoteGpuId,phaseOffset:0,weightOffset:4},
   clock:{...world.clock,elapsed:at,safeUntil:at,paused:true,segments:[]}});
  packet.catch(()=>{});await flush();await draw.host.idle();
  await assert.rejects(world.authority.checkHeldDraw(30,hold,route),/Missing submitted/);
  draw.host.present();await packet;
  assert.equal((await world.authority.checkHeldDraw(30,hold,route)).encounter.home.recoveryHit,29210);
  await world.attachRecoveredResources(draw);
  assert.equal(world.authority.resumeNativeIntentProduction(hold),true);
  const retry=await until(()=>world.records.find(record=>record!==first&&record.kind==='home-route'&&record.resources.sourceRequest.recoveryHit));
  assert.deepEqual(retry.resources.sourceRequest,first.resources.sourceRequest);
  assert.notEqual(retry.resources.worldBoundary.ticket,first.resources.worldBoundary.ticket);
  await finishWoundedHome({...world,...draw,present:()=>world.present()},snapshot,undefined,retry);
  assert.equal(world.records.filter(record=>record.kind==='home-route'&&record.resources.sourceRequest.recoveryHit&&record.committed).length,1);
 }finally{release();await world.close();draw?.client.dispose();await draw?.host.dispose();ports.port1.close();ports.port2.close();}
});

for(const closeFirst of [true,false])test(`wounded Home19 READY is recovered with ${closeFirst?'preparer retirement':'production hold'} first`,{timeout:35000},async()=>{
 let first,release,draw,rig,absentDraw;
 const ready=new Promise(resolve=>release=resolve),ports=new MessageChannel(),absencePorts=new MessageChannel();
 const world=await setup(true,{captureHistoricalEvents:true,onReady(record){
  if(!first&&record.kind==='home-arrival'&&record.resources.nativeHomeArrival.sourceHome.reference.sourceRequest.recoveryHit){
   first=record;return ready;
  }
 }});
 try{
  const before=await reachSecondHit(world),impact=before.elapsed+.02,advancing=advance(world,2);
  await until(()=>world.host.inspect().nativeCausalClock.committedThrough===impact&&world.host.inspect().pendingSequence!==null);
  await world.present();
  let snapshot=JSON.parse((await advancing).snapshot);
  while(!snapshot.workers[0].recoveryExitRemaining){
   assert(snapshot.elapsed<19);
   snapshot=JSON.parse((await advance(world)).snapshot);
   await world.present();
   if(!snapshot.raid)await presentDepartedEncounter(world,snapshot);
  }
  const original=await until(()=>world.records.find(r=>r.kind==='home-route'&&r.resources.sourceRequest.recoveryHit));
  await untilProduction(world,()=>original.committed);
  while(snapshot.elapsed<=original.resources.endTime){
   snapshot=JSON.parse((await world.command({kind:'advance',seconds:.25,nightFastForward:false})).snapshot);
   await world.present();
  }
  const worker=snapshot.workers[0],at=snapshot.elapsed;
  await until(()=>first);
  const arrival=first.resources.nativeHomeArrival;
  assert.equal(first.committed,false);
  assert.equal(worker.nativeRouteAdmission,'native-home');
  assert.equal(worker.running,false);
  const retire=()=>{world.retireResourceEndpoint();release();};
  if(closeFirst){
   retire();
   await until(()=>world.authority.nativeIntentProductionStatus().active===null);
  }
  const holding=world.authority.quiesceNativeIntentProduction({forLostDraw:true});
  if(!closeFirst)retire();
  const hold=await holding;
  await world.host.dispose();
  assert.equal((await world.authority.flushNativeResourcePreparation({allowRetired:true,forLostDraw:true,lossHoldId:30})).terminal,true);
  await assert.rejects(first.packet.presented);
  assert.equal(world.authority.nativeIntentProductionStatus().last.status,'cancelled');
  const route=await world.authority.terminalWorkerRoute();
  assert.deepEqual(route,{kind:18,actorId:900011});
  draw=await drawFixture({capabilities:{nativeHomeRouteVersion:1,nativeHomeArrivalVersion:1}},
   {intentControl:{port:ports.port2,session:'production-control',recoveryHold:30}});
  const {recoveredWorkerRoute:q}=await world.authority.attachHeldWorkerRoute(ports.port1,'production-control',30,hold,route);
  const binding=q.resources.nativeHomeRouteBinding,ref=binding.reference,boundary=ref.worldBoundary,epoch=boundary.effectiveTime;
  assert.deepEqual(binding,arrival.sourceHome);
  assert.equal(q.execution.arrived,true);
  assert.equal(q.execution.executedThrough,at);
  assert.equal(q.execution.bodyId,arrival.bodyId);
  for(const key of ['x','z','runPhase','walkPhase','carryPhase','runRemaining'])assert.equal(q.execution[key],worker[key]);
  assert.equal(q.execution.yaw,worker.heading);
  const resourceEnd=nativeClockResourceEnd(epoch,ref.endTime),age=floorFloat32(resourceEnd-epoch);
  const metadata={nativeWorldBoundary:boundary,clock:{...world.clock,elapsed:at,safeUntil:at,paused:true,segments:[]}};
  await assert.rejects(world.authority.checkHeldDraw(30,hold,route),/Missing submitted/);
  draw.client.registerClockBinding(draw.buffer,{byteOffset:0,epoch,semantic:'relative',nativeHome:ref,resourceEnd});
  const frame=draw.frame(3,metadata);
  await flush();await draw.host.idle();
  await assert.rejects(world.authority.checkHeldDraw(30,hold,route),/Missing submitted/);
  draw.host.present();await frame;
  const submitted=await world.authority.checkHeldDraw(30,hold,route);
  assert.equal(submitted.elapsed,at);
  assert.equal(submitted.relativeTime,age);
  assert.ok(age<at-epoch);
  if(closeFirst){
   const payloads=new Map();
   world.authority.publishResidentTerrainForQa(payload=>payloads.set(payload.cx+','+payload.cz,payload));
   let selected;
   const session={core:{selectChunk(x,z){selected=payloads.get(x+','+z);assert(selected);},chunkPayload:()=>selected}};
   rig=await nativeWorkerGraphicsFixture({state:snapshot,worker,actor:worker.id,session,close(){}},
    {clips:['Walk_Skip','Run','Idle'],idle:true});
   const source={...q,terrain:rig.terrain,terrainManifest:rig.manifest};
   let picks=0;
   const options={isCurrent:()=>true,getPickTime:()=>{picks++;return epoch+submitted.relativeTime;}};
   assert.throws(()=>rig.roster.prepareRecoveredWorkerRoute({...source,execution:{...q.execution,bodyId:2}},options),/Recovery pose or committed owner differs/);
   await rig.roster.prepareRecoveredWorkerRoute(source,options);
   assert(rig.roster.nativeRouteCurrent(worker.id,q.resources.nativeRoute));
   const restorePick=rig.roster.get(worker.id).preparePick();
   try{assert(picks>0);}finally{restorePick();}
  }
  await world.attachRecoveredResources(draw);
  assert.equal(world.authority.resumeNativeIntentProduction(hold),true);
  assert.deepEqual(world.snapshot().workers[0],worker);
  const retry=await until(()=>world.records.find(record=>record!==first&&record.kind==='home-arrival'&&record.resources.nativeHomeArrival.sourceHome.reference.sourceRequest.recoveryHit));
  await untilProduction(world,()=>retry.committed);
  await world.present();
  const acquired=retry.resources.nativeHomeArrival;
  assert.deepEqual(acquired.sourceHome,arrival.sourceHome);
  assert.deepEqual(acquired.pose,arrival.pose);
  assert.notEqual(acquired.worldBoundary.ticket,arrival.worldBoundary.ticket);
  assert.equal(first.committed,false);
  assert.equal(world.records.filter(record=>record.kind==='home-arrival'&&record.committed&&record.resources.nativeHomeArrival.sourceHome.reference.sourceRequest.recoveryHit).length,1);
  const complete=JSON.parse((await advance(world)).snapshot);
  assert.equal(complete.elapsed,at+.02);
  assert.equal(complete.workers[0].status,'home');
  assert.equal(complete.workers[0].hits,2);
  assert.deepEqual(complete.ledger,snapshot.ledger);
  assert.deepEqual([...world.faults,...draw.errors],[]);
  if(!closeFirst){
   await retry.packet.presented;
   world.retireResourceEndpoint();
   const absentHold=await world.authority.quiesceNativeIntentProduction({forLostDraw:true});
   await draw.host.dispose();
   assert.equal((await world.authority.flushNativeResourcePreparation({allowRetired:true,forLostDraw:true,lossHoldId:40})).terminal,true);
   const absentRoute=await world.authority.terminalWorkerRoute();
   assert.deepEqual(absentRoute,{version:2,refuge:true,members:[]});
   absentDraw=await drawFixture({}, {intentControl:{port:absencePorts.port2,session:'production-control',recoveryHold:40}});
   const {recoveredWorkerRoute:source}=await world.authority.attachHeldWorkerRoute(absencePorts.port1,'production-control',40,absentHold,absentRoute);
   assert.deepEqual(source.refuge.reference.sourceHome,arrival.sourceHome);
   assert.equal(source.refuge.reference.worldBoundary.ticket,draw.client.requiredNativeWorldBoundary().ticket);
   const frame=absentDraw.frame(3,{nativeWorldBoundary:source.worldBoundary,clock:{...world.clock,
    elapsed:complete.elapsed,safeUntil:complete.elapsed,paused:true,segments:[]}});
   await flush();await absentDraw.host.idle();
   await assert.rejects(world.authority.checkHeldDraw(40,absentHold,absentRoute),/Missing submitted/);
   absentDraw.host.present();await frame;
   const confirmed=await world.authority.checkHeldDraw(40,absentHold,absentRoute);
   assert.deepEqual(confirmed.refuge,source.refuge);
   assert.deepEqual(confirmed.members,[]);
   assert.deepEqual(absentDraw.host.inspect().nativeRouteFrame.bindings,[]);
   await world.attachRecoveredResources(absentDraw);
   assert.equal(world.authority.resumeNativeIntentProduction(absentHold),true);
   const continued=JSON.parse((await advance(world)).snapshot);
   assert.equal(continued.elapsed,complete.elapsed+.02);
   assert.deepEqual(continued.workers,complete.workers);
   assert.deepEqual(continued.ledger,complete.ledger);
   assert.deepEqual([...world.faults,...absentDraw.errors],[]);
  }
 }finally{release();rig?.close();await world.close();draw?.client.dispose();await draw?.host.dispose();absentDraw?.client.dispose();await absentDraw?.host.dispose();
  for(const pair of [ports,absencePorts]){pair.port1.close();pair.port2.close();}}
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
