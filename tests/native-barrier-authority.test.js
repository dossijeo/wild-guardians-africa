import test from 'node:test';import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {deserialize,serialize} from '../src/persistence/snapshots.js';
import {savedNativeAuthorityOptions} from '../src/simulation/native-authority-checkpoint.js';
import {prepareWorkerCheckpoint} from '../src/persistence/prepare-worker-checkpoint.js';
import {copyNativeBarrierAdditionAttestation} from '../src/world/native-barrier-addition.js';
import {rational} from '../src/simulation/money.js';
import {wallSpec} from '../src/simulation/rules.js';
import {nativeFarmArrivalRouteFixture} from './helpers/native-farm-arrival-route.js';
import {nativeProductionAuthority,untilProduction} from './helpers/native-production-authority.js';
import {createSpatialCampaignOpening} from '../tools/experiments/spatial-campaign-opening.mjs';
async function pump(f,promise){let done=false,result,error;promise.then(value=>{done=true;result=value;},value=>{done=true;error=value;});for(let i=0;i<2000&&!done;i++)await f.present();if(!done)throw Error('Native Build directed test timed out');if(error)throw error;return result;}
async function setup(away=false){
 const source=nativeFarmArrivalRouteFixture({peer:false}),saved=structuredClone(source.state),a=source.point(0,away?8:-3),b=source.point(0,away?14:3);saved.ledger.balance=rational(100000);
 const f=await nativeProductionAuthority(saved,{chunkKeys:[...Array.from({length:9},(_,i)=>`${i%3-1},${Math.floor(i/3)-1}`),'2,-1','2,0','2,1']});
 await untilProduction(f,()=>f.records.some(r=>r.kind==='farm-arrival'&&r.committed));for(let i=0;i<2;i++){f.advance();await f.present();}
 return {f,command:{kind:'buildWallChain',id:away?'native-solid-away':'native-solid-crossing',material:'zarzas',points:[[a.x,a.z],[b.x,b.z]],options:{smooth:false,snap:false}},async close(){try{await f.close();}finally{source.close();}}};
}
for(const away of [false,true])test(`ordinary native solid Build ${away?'outside':'across'} Farm commits only in its own command and preserves immediate checkpoint`,async()=>{
 const x=await setup(away),{f,command}=x;try{
  const before=f.snapshot(),original=f.records.find(r=>r.kind==='farm-arrival').resources.nativeFarmArrival;
  await pump(f,f.authority.prepareNativeStructureCommand(command));
  const ready=f.records.find(r=>r.kind==='barrier-addition');assert(ready);assert.equal(ready.committed,false);assert.equal(f.snapshot().ledger.entries[command.id],undefined);
  const intermediate=f.command({kind:'advance',seconds:.05,nightFastForward:false});assert.equal(intermediate.events.some(e=>e.type==='WallChainBuilt'),false);assert.equal(JSON.parse(intermediate.snapshot).ledger.entries[command.id],undefined);assert.equal(intermediate.nativeWorldResources?.some(r=>r.kind===2)??false,false);
  const result=await pump(f,f.structureCommand(command)),after=JSON.parse(result.snapshot),event=result.events.find(e=>e.type==='WallChainBuilt');
  assert.equal(result.value,true,JSON.stringify({rejection:result.rejection,events:result.events,faults:f.faults}));assert(event);assert.equal(event.commandId,command.id);assert.equal(result.events.filter(e=>e.type==='WallChainBuilt').length,1);assert.equal(event.gates,0);
  assert.deepEqual(after.ledger.entries[command.id],rational(-event.count*wallSpec(command.material).cost));assert.equal(after.structures.length,before.structures.length+event.count);
  const record=result.nativeWorldResources?.find(r=>r.kind===2);assert(record?.nativeBarrierAdditionBinding);assert.equal(result.terrainChanged,false);assert.deepEqual(record.chunks,[]);assert.deepEqual(record.removed,[]);
  const nextTick=f.command({kind:'advance',seconds:.05,nightFastForward:false});assert.equal(nextTick.events.some(e=>e.type==='WallChainBuilt'),false);
  const checkpoint=f.command({kind:'snapshot',visualTerrain:true});assert.deepEqual(checkpoint.terrainCheckpoint.nativeWorldBoundary,record.worldBoundary);assert.equal(checkpoint.events.some(e=>e.type==='WallChainBuilt'),false);
  const duplicate=f.command(command);assert.equal(duplicate.value,false);assert.equal(duplicate.events.some(e=>e.type==='WallChainBuilt'),false);
  await pump(f,f.authority.finishNativeStructureCommand(command));await f.present();assert(ready.committed,JSON.stringify({faults:f.faults,errors:f.errors.map(String),aborted:ready.aborted,host:f.host.inspect()}));assert.deepEqual(f.faults,[]);
  assert.deepEqual(ready.resources.nativeBarrierAddition.additions.map(x=>x.entityId),event.presentation.targetIds);
  if(away){assert.equal(f.records.some(r=>r.kind==='farm-arrival-stop'),false);assert.equal(after.workers[0].nativeRouteAdmission,'native-farm-arrival');}
  else{const stopped=f.records.find(r=>r.kind==='farm-arrival-stop'&&r.committed);assert(stopped);assert.equal(stopped.resources.nativeStop.sourceRoute.actorId,original.actorId);assert.equal(after.workers[0].nativeRouteAdmission,'native-farm-arrival-held');}
 }finally{await x.close();}
});
test('cancelling a ready native solid Build retires its preparation without consuming the purchase',async()=>{
 const x=await setup(true),{f,command}=x;try{
  const before=f.snapshot();await pump(f,f.authority.prepareNativeStructureCommand(command));const record=f.records.find(r=>r.kind==='barrier-addition');assert(record);
  await pump(f,f.authority.finishNativeStructureCommand(command));await f.present();const late=f.command(command),after=JSON.parse(late.snapshot);assert.equal(late.value,false);assert.equal(after.ledger.entries[command.id],undefined);assert.deepEqual(after.structures,before.structures);assert.equal(record.committed,false);assert.deepEqual(f.faults,[]);
 }finally{await x.close();}
});
test('native solid Build rejects an expired quote in its command and never charges',async()=>{
 const x=await setup(true),{f,command}=x;try{
  await pump(f,f.authority.prepareNativeStructureCommand(command));const before=f.snapshot();f.command({kind:'pause',reason:'test-build-stale'});
  const result=await pump(f,f.structureCommand(command)),after=JSON.parse(result.snapshot);assert.equal(result.value,false);assert.equal(after.ledger.entries[command.id],undefined);assert.deepEqual(after.structures,before.structures);assert.equal(result.nativeWorldResources?.some(r=>r.kind===2)??false,false);assert.equal(result.events.some(e=>e.type==='WallChainBuilt'),false);
  await pump(f,f.authority.finishNativeStructureCommand(command));assert.equal(f.records.find(r=>r.kind==='barrier-addition').committed,false);assert.deepEqual(f.faults,[]);
 }finally{await x.close();}
});

const enclosureCommand={kind:'buildWallChain',id:'paid-sheltered-crops-enclosure',material:'zarzas',
 points:[[96,-5],[102,-5],[102,-13],[96,-13],[96,-5]],options:{smooth:false,snap:false,requireComplete:true}};
const enclosureStart=()=>deserialize(gunzipSync(readFileSync(new URL('./fixtures/desierto712-two-crops-prehire.json.gz',import.meta.url))).toString('utf8'));
const wallOwners=reply=>reply.nativeAuthorityCheckpoint.wallOwners;
const enclosureAuthority=(state=enclosureStart())=>nativeProductionAuthority(state,{...savedNativeAuthorityOptions(serialize(state)),drawFarmGate:true});

test('the live Desert enclosure captures already paid crop facts before its READY',async()=>{
 const opening=await createSpatialCampaignOpening({seed:712,biome:'desierto',culture:'mapungubwe'});
 const {state,loaded}=opening;
 await opening.dispose();
 const f=await nativeProductionAuthority(state,{chunkKeys:[...loaded.keys()],nativeWorkerLifecycle:true,drawFarmGate:true});
 const command={...enclosureCommand,id:'live-enclosure-after-crops',points:[[84,-5],[90,-5],[90,-13],[84,-13],[84,-5]],capacityLimit:true};
 try{
  for(const [index,z] of [-7,-10].entries()){
   const paid=f.command({kind:'plant',id:'enclosed-crop-'+index,species:'platano',x:87,z});
   assert.equal(paid.value,true);
   assert.equal(paid.events.filter(event=>event.type==='CropPlaced').length,1);
  }
  await pump(f,f.authority.prepareNativeStructureCommand(command));
  const ready=f.records.find(record=>record.kind==='barrier-addition');
  assert.equal(ready.resources.nativeBarrierAddition.gates[0].entityId,'structure-7');
  for(let i=0;i<9;i++){
   const intermediate=f.command({kind:'advance',seconds:.05,steps:4,nightFastForward:false});
   assert.equal(intermediate.events.some(event=>event.type==='WallChainBuilt'),false);
   assert.equal(JSON.parse(intermediate.snapshot).ledger.entries[command.id],undefined);
   await f.present();
  }
  const reply=await pump(f,f.structureCommand(command));
  assert.equal(reply.value,true,reply.rejection);
  const state=JSON.parse(reply.snapshot);
  assert.deepEqual(state.ledger.entries[command.id],rational(-130));
  assert.deepEqual(state.plants.map(plant=>plant.id),['plant-3','plant-5']);
  assert.deepEqual(reply.events.filter(event=>event.type==='WallChainBuilt').map(({count,gates})=>[count,gates]),[[13,1]]);
  const committed=reply.nativeWorldResources.find(row=>row.nativeBarrierAdditionBinding);
  assert(committed.worldBoundary.effectiveTime>ready.resources.worldBoundary.effectiveTime);
  assert.equal(committed.nativeBarrierAdditionBinding.preparedReference.worldBoundary.ticket,ready.resources.worldBoundary.ticket);
  assert(committed.worldBoundary.ticket>ready.resources.worldBoundary.ticket);
  await pump(f,f.authority.finishNativeStructureCommand(command));
  await f.present();
  assert(ready.committed);
  assert.deepEqual([...f.faults,...f.errors],[]);
 }finally{await f.close();}
});

test('one native Build installs the automatic gate and twelve solid walls together across a disk reload',async()=>{
 const f=await enclosureAuthority();let reloaded;
 try{
  const before=f.snapshot(),original=f.command({kind:'snapshot',nativeAuthorityCheckpoint:true});
  await pump(f,f.authority.prepareNativeStructureCommand(enclosureCommand));
  const [ready]=f.records.filter(record=>record.kind==='barrier-addition');
  assert(ready,'the native mixed Build must produce a single READY');
  assert.equal(ready.committed,false);
  assert.deepEqual(f.snapshot().structures,before.structures);
  assert.deepEqual(wallOwners(f.command({kind:'snapshot',nativeAuthorityCheckpoint:true})),wallOwners(original));
  assert.equal(f.snapshot().ledger.entries[enclosureCommand.id],undefined);
  const {gates,additions,version}=ready.resources.nativeBarrierAddition;
  assert.equal(version,4);assert.equal(gates.length,1);assert.equal(additions.length,12);
  assert.equal(gates[0].entityId,'structure-7');assert.equal(gates[0].opening,0);
  assert.equal(gates[0].openingDirection,undefined);assert.equal(gates[0].openingDegrees,89);
  assert.deepEqual(gates[0].proxies.map(proxy=>proxy.passMask),[0,0,1]);
  assert.deepEqual(ready.nativeBarrierWallEntities.map(piece=>piece.id),[gates[0].entityId,...additions.map(piece=>piece.entityId)]);

  const reply=await pump(f,f.structureCommand(enclosureCommand));
  assert.equal(reply.value,true,JSON.stringify({rejection:reply.rejection,faults:f.faults}));
  await pump(f,f.authority.finishNativeStructureCommand(enclosureCommand));await f.present();
  assert.equal(f.records.filter(record=>record.kind==='barrier-addition').length,1);
  assert.equal(ready.committed,true);
  const [event]=reply.events.filter(event=>event.type==='WallChainBuilt');
  assert.deepEqual(reply.events.filter(event=>event.type==='WallChainBuilt'),[event]);
  assert.deepEqual([event.count,event.gates,event.targetId],[13,1,'structure-7']);
  const committed=reply.nativeWorldResources.filter(resource=>resource.kind===2);
  assert.equal(committed.length,1);
  const binding=committed[0].nativeBarrierAdditionBinding,{nativeIds}=binding;
  assert.equal(nativeIds.length,15);
  const wrongTravel=structuredClone(binding);delete wrongTravel.reference.gates[0].openingDegrees;
  assert.throws(()=>copyNativeBarrierAdditionAttestation(wrongTravel),/differs from its preparation/);
  const wrongIds=structuredClone(binding);[wrongIds.nativeIds[0],wrongIds.nativeIds[3]]=[wrongIds.nativeIds[3],wrongIds.nativeIds[0]];
  assert.throws(()=>copyNativeBarrierAdditionAttestation(wrongIds),/differs from its preparation/);
  const checkpoint=f.command({kind:'snapshot',nativeAuthorityCheckpoint:true});
  const owners=new Map(wallOwners(checkpoint).map(({entityId,ids})=>[entityId,ids]));
  assert.deepEqual(owners.get('structure-7'),nativeIds.slice(0,3));
  assert.deepEqual(additions.map(({entityId})=>owners.get(entityId)),nativeIds.slice(3).map(id=>[id]));
  const saved=prepareWorkerCheckpoint(checkpoint,{slotId:before.slotId,policy:{nativeAuthority:true},savedAt:0});
  assert(saved.saved);assert.deepEqual(saved.state.ledger.entries[enclosureCommand.id],rational(-130));
  assert.deepEqual(saved.state.ledger.balance,rational(270));
  reloaded=await enclosureAuthority(deserialize(serialize(saved.state)));
  const restored=reloaded.command({kind:'snapshot',nativeAuthorityCheckpoint:true});
  assert.deepEqual(wallOwners(restored),wallOwners(checkpoint));
  // Compare the snapshot representation across disk, where signed zero is
  // stored as zero. Every barrier ID, coordinate and counter must survive.
  assert.deepEqual(restored.nativeAuthorityCheckpoint.spatialState,JSON.parse(JSON.stringify(checkpoint.nativeAuthorityCheckpoint.spatialState)));
  assert.deepEqual(reloaded.snapshot().structures,saved.state.structures);
  assert.equal(reloaded.snapshot().structures.find(piece=>piece.id==='structure-7').gateOpenDegrees,89);
  assert.equal(reloaded.command(enclosureCommand).value,false);
  const nextCommand={kind:'buildWallChain',id:'next-wall-after-enclosure',material:'zarzas',points:[[89,5],[92,5]],options:{smooth:false,snap:false}};
  await pump(reloaded,reloaded.authority.prepareNativeStructureCommand(nextCommand));
  const next=await pump(reloaded,reloaded.structureCommand(nextCommand));assert.equal(next.value,true,next.rejection);
  const [nextId]=next.nativeWorldResources.find(resource=>resource.kind===2).nativeBarrierAdditionBinding.nativeIds;
  assert.equal(nextId,nativeIds.at(-1)+1);
  await pump(reloaded,reloaded.authority.finishNativeStructureCommand(nextCommand));
  reloaded.command({kind:'openInitialHiring'});
  reloaded.command({kind:'hire',id:'enclosed-first-worker',selection:{youngMale:1}});
  assert.equal(reloaded.snapshot().workers.length,1);
  let entered=false;
  for(let i=0;i<350&&!entered;i++){
   const packet=await reloaded.command({kind:'advance',seconds:.05,steps:4,nightFastForward:false});
   const state=JSON.parse(packet.snapshot),[worker]=state.workers;
   await reloaded.present();
   if(worker.x>97&&worker.z>-13&&worker.z<-5){
    const gate=state.structures.find(piece=>piece.id==='structure-7');
    assert.equal(gate.gateOpen,1);assert.equal(gate.gateOpenDegrees,89);
    assert.equal(worker.nativeRouteAdmission,'native-task');
    entered=true;
   }
   assert.deepEqual(reloaded.faults,[]);
  }
  assert(entered,'paid worker must physically cross the recertified gate');
  const passage=reloaded.records.find(record=>record.committed&&record.resources.gates?.some(gate=>gate.entityId==='structure-7'&&gate.openingDegrees===89));
  assert(passage,'the worker packet must own the motor and its exact angle');
  assert.deepEqual([...f.faults,...reloaded.faults],[]);
 }finally{await f.close();await reloaded?.close();}
});

test('cancelling the automatic gate batch leaves its ledger, gate and solid barrier IDs unused',async()=>{
 const f=await enclosureAuthority();
 try{
  const before=f.command({kind:'snapshot',nativeAuthorityCheckpoint:true});
  await pump(f,f.authority.prepareNativeStructureCommand(enclosureCommand));
  const record=f.records.find(record=>record.kind==='barrier-addition');assert(record);
  await pump(f,f.authority.finishNativeStructureCommand(enclosureCommand));await f.present();
  assert.equal(record.committed,false);assert.equal(record.aborted,true);
  assert.equal(f.command(enclosureCommand).value,false);
  assert.deepEqual(f.snapshot().ledger,JSON.parse(before.snapshot).ledger);
  const after=f.command({kind:'snapshot',nativeAuthorityCheckpoint:true});
  assert.deepEqual(wallOwners(after),wallOwners(before));
  assert.deepEqual(after.nativeAuthorityCheckpoint.spatialState,before.nativeAuthorityCheckpoint.spatialState);
  assert.deepEqual(f.faults,[]);
 }finally{await f.close();}
});

test('the paid worker finishes watering and returns through the automatic gate at shift end',async()=>{
 const f=await enclosureAuthority();
 try{
  await pump(f,f.authority.prepareNativeStructureCommand(enclosureCommand));
  const purchase=await pump(f,f.structureCommand(enclosureCommand));
  assert.equal(purchase.value,true,purchase.rejection);
  await pump(f,f.authority.finishNativeStructureCommand(enclosureCommand));
  f.command({kind:'openInitialHiring'});
  f.command({kind:'hire',id:'enclosed-first-worker',selection:{youngMale:1}});
  const [hired]=f.snapshot().workers;
  assert(hired);

  let homeRoute,returned,clearedGate=false;
  const waters=[];
  for(let i=0;i<1500&&!returned;i++){
   const packet=await f.command({kind:'advance',seconds:.05,steps:4,nightFastForward:false});
   const state=JSON.parse(packet.snapshot),[worker]=state.workers;
   waters.push(...packet.events.filter(event=>event.type==='WaterSatisfied'));
   await f.present();
   assert.deepEqual(f.faults,[]);
   homeRoute??=f.records.find(record=>record.kind==='home-route'&&record.committed);
   if(homeRoute&&worker.nativeRouteAdmission==='native-home'&&worker.z>-5&&worker.x<=97.2)clearedGate=true;
   if(worker.status==='home')returned=worker;
  }

  assert.equal(waters.length,6);
  assert(homeRoute,JSON.stringify(f.authority.nativeIntentProductionStatus()));
  assert.equal(homeRoute.resources.gates.length,1);
  assert.equal(homeRoute.resources.gates[0].entityId,'structure-7');
  assert.equal(homeRoute.resources.gates[0].openingDegrees,89);
  assert(clearedGate,'the homeward route must pass through the gate');
  await untilProduction(f,()=>f.records.some(record=>record.kind==='home-arrival'&&record.committed));
  const arrival=f.records.find(record=>record.kind==='home-arrival'&&record.committed);
  assert.equal(arrival.resources.nativeHomeArrival.bodyId,homeRoute.resources.bodyId);
  assert.deepEqual([returned.id,returned.x,returned.z],[hired.id,88,0]);
  assert.deepEqual(f.snapshot().ledger.entries[enclosureCommand.id],rational(-130));
  assert.deepEqual(f.errors,[]);
 }finally{await f.close();}
});

test('the enclosure closes for the first raid and reopens on the next paid shift in the same Draw',async()=>{
 const disk=gunzipSync(readFileSync(new URL('./fixtures/desierto712-enclosure-before-home.json.gz',import.meta.url))).toString('utf8');
 const initial=deserialize(disk),events=[];
 let releaseClosing;
 const f=await nativeProductionAuthority(initial,{...savedNativeAuthorityOptions(disk),emptyBeastPhysics:true,drawFarmGate:true,
  onReady(record){if(record.kind==='gate-motion')return new Promise(resolve=>{releaseClosing=resolve;});}});
 const advance=()=>f.command({kind:'advance',seconds:.05,steps:4,nightFastForward:false});
 const gate=state=>state.structures.find(row=>row.id==='structure-7');
 try{
  let state=initial;
  for(let i=0;i<200&&state.workers[0].status!=='home';i++){
   state=JSON.parse((await advance()).snapshot);
   await f.present();
  }
  assert.equal(state.workers[0].status,'home');
  assert.equal(gate(state).gateOpen,1);
  const before=state.elapsed,worker=state.workers[0];
  const lastDraw=f.host.inspect().nativeRouteFrame;
  const pending=Promise.resolve(advance());
  let completed=false;
  pending.then(()=>{completed=true;},()=>{completed=true;});
  try{
   for(let i=0;i<200&&!releaseClosing&&!completed;i++)await f.present();
   assert(releaseClosing,'Home19 must be followed by a prepared closing motor');
   const prepared=f.records.find(record=>record.kind==='gate-motion');
   assert.equal(prepared.committed,false);
   assert.equal(completed,false);
   assert.deepEqual(f.host.inspect().nativeRouteFrame,lastDraw);
   const [motor]=prepared.resources.gates;
   assert.equal(motor.gateId,7);
   assert.equal(motor.openingDegrees,89);
   assert.deepEqual(Array.from(motor.rows),[before,1,before+.6,0]);
   releaseClosing();
   const result=await pump(f,pending);
   state=JSON.parse(result.snapshot);
   assert.equal(result.stepsExecuted,4);
   assert(Math.abs(state.elapsed-before-.2)<1e-9);
   assert(Math.abs(gate(state).gateOpen-2/3)<1e-9);
   assert.equal(prepared.committed,true);
   assert.equal(f.host.inspect().nativeRouteFrame.worldBoundary.ticket,prepared.resources.worldBoundary.ticket);
  }finally{releaseClosing?.();}

  const checkpoint=f.command({kind:'snapshot',nativeAuthorityCheckpoint:true});
  const saved=prepareWorkerCheckpoint(checkpoint,{slotId:state.slotId,policy:{nativeAuthority:true},savedAt:0});
  assert(saved.saved,'the public checkpoint must preserve the partial opening');
  const text=serialize(saved.state);
  const cold=await nativeProductionAuthority(deserialize(text),{...savedNativeAuthorityOptions(text),drawFarmGate:true});
  try{
   assert.equal(gate(cold.snapshot()).gateOpen,gate(state).gateOpen);
   for(let i=0;i<2;i++){
    state=JSON.parse((await advance()).snapshot);
    const continued=JSON.parse((await pump(cold,Promise.resolve(cold.command({kind:'advance',seconds:.05,steps:4,nightFastForward:false})))).snapshot);
    assert.equal(continued.elapsed,state.elapsed);
    assert.equal(gate(continued).gateOpen,gate(state).gateOpen);
   }
   assert.equal(gate(state).gateOpen,0);
  }finally{await cold.close();}

  for(let i=0;i<1000&&!events.some(event=>event.type==='RaidEnded');i++){
   const packet=await advance();
   state=JSON.parse(packet.snapshot);
   events.push(...packet.events);
   await f.present();
   if(state.raid)assert.equal(gate(state).gateOpen,0);
  }
  const [spawn]=events.filter(event=>event.type==='RaidSpawned'),hits=events.filter(event=>event.type==='AnimalLogicalHit');
  assert.equal(spawn.raidFacts.pressureFacts.introductory,true);
  assert.equal(spawn.raidFacts.exposedLiving,2);
  assert.equal(events.filter(event=>event.type==='RaidEnded').length,1);
  assert.deepEqual(hits.map(event=>[event.targetId,event.presentation.target.kind]),[['structure-2','center'],['structure-2','center']]);
  assert.equal(new Set(hits.map(hit=>hit.attackId)).size,2);
  assert.equal(state.structures[0].hp,560);
  assert.equal(state.plants.filter(plant=>plant.alive).length,2);
  assert(!state.workers[0].path?.length);
  assert.deepEqual({...state.workers[0],path:null},{...worker,path:null});
  assert(!events.some(event=>event.type==='CropHit'||event.type==='WorkerHit'));
  assert.deepEqual(state.ledger,initial.ledger);

  // Replace the fixture's last prepared Retreat with the ordinary scene after
  // RaidEnded. An empty pass avoids retaining any worker or animal bindings.
  const retiredDraw=f.host.inspect().nativeRouteFrame;
  const worldBoundary=retiredDraw.worldBoundary;
  f.client.beginFrame({nativeWorldBoundary:worldBoundary,
   clock:{...f.clock,elapsed:state.elapsed,safeUntil:state.elapsed,paused:true,segments:[]}});
  const encoder=f.client.device.createCommandEncoder();
  const pass=encoder.beginRenderPass({colorAttachments:[{view:f.client.context.getCurrentTexture().createView(),loadOp:'clear',storeOp:'store'}]});
  pass.end();
  f.client.device.queue.submit([encoder.finish()]);
  await pump(f,f.client.endFrame());
  const absence=f.host.inspect().nativeRouteFrame;
  assert(absence.sequence>retiredDraw.sequence);
  assert.deepEqual(absence.bindings,[]);

  for(let i=0;i<1000&&state.day===1;i++){
   const packet=await advance();
   state=JSON.parse(packet.snapshot);
   await f.present();
  }
  assert.equal(state.day,2);
  assert(state.pauses.includes('hiring'));
  assert.equal(gate(state).gateOpen,0);
  assert.deepEqual(state.workers,[]);
  const commandId='second-enclosed-shift';
  const hire=f.command({kind:'hire',id:commandId,selection:{youngMale:1}});
  const [newWorker]=JSON.parse(hire.snapshot).workers;
  const [paid]=hire.events.filter(event=>event.type==='HiringConfirmed');
  assert.equal(newWorker.contractDay,2);
  assert.equal(paid.count,1);

  let reopened=false,water;
  for(let i=0;i<450&&!water;i++){
   const packet=await advance();
   state=JSON.parse(packet.snapshot);
   await f.present();
   const [current]=state.workers;
   if(current.x>97&&current.z>-13&&current.z<-5&&gate(state).gateOpen===1)reopened=true;
   water=packet.events.find(event=>event.type==='WaterSatisfied'&&event.workerId===newWorker.id&&event.targetId==='plant-3');
  }
  assert(reopened&&water,'the next paid worker must reopen the gate and water the sheltered crop');
  const farm=f.records.findLast(record=>record.kind==='farm-arrival'&&record.committed);
  assert.equal(farm.resources.worldBoundary.authorityEpoch,worldBoundary.authorityEpoch);
  assert.deepEqual(state.ledger.entries[commandId],rational(-paid.cost));
  assert.deepEqual([...f.faults,...f.errors],[]);
 }finally{await f.close();}
});
