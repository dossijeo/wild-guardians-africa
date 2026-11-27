import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import test from 'node:test';
import {deserialize,serialize} from '../src/persistence/snapshots.js';
import {prepareWorkerCheckpoint} from '../src/persistence/prepare-worker-checkpoint.js';
import {savedNativeAuthorityOptions} from '../src/simulation/native-authority-checkpoint.js';
import {createSpatialGameSession} from '../src/world/wild-engine/spatial-game-session.js';
import {nativeProductionAuthority,untilProduction} from './helpers/native-production-authority.js';
import {nativeWorkerGraphicsFixture} from './helpers/native-task-consequence-graphics.js';

const input=JSON.parse(gunzipSync(readFileSync(new URL('./fixtures/desierto983-gated-flight-input.json.gz',import.meta.url))));
const gateId='structure-'+input.expectedGate;
const gate=state=>state.structures.find(structure=>structure.gate);

async function tick(f){
 const step=await f.command({kind:'advance',seconds:.02,steps:2,nightFastForward:false});
 for(const key of step.residency.missing){
  const [cx,cz]=key.split(',').map(Number);
  f.command({kind:'addChunk',cx,cz});
 }
 await f.present();
 assert.deepEqual(f.faults,[]);
 return JSON.parse(step.snapshot);
}

async function prepareColdHomeGraphics(state,proposal){
 const module=new WebAssembly.Module(readFileSync(new URL('../src/world/wild-engine/spatial-savanna.wasm',import.meta.url)));
 const loaded=new Map(),session=createSpatialGameSession(module,state,{loaded:()=>loaded});
 let fixture,part,finishWalk,finishIdle,idleStarted;
 const walk=new Promise(resolve=>{finishWalk=resolve;});
 const idle=new Promise(resolve=>{finishIdle=resolve;});
 const idleRequest=new Promise(resolve=>{idleStarted=resolve;});
 try{
  for(let z=-1;z<=1;z++)for(let x=-1;x<=1;x++){
   if(session.core.selectChunk(x,z)<0)session.core.addChunk(x,z);
  }
  const worker=state.workers[0];
  fixture=await nativeWorkerGraphicsFixture({state,worker,actor:worker.id,session,close:()=>session.dispose()},{
   coldWalk:true,idle:true,clips:['Walk_Skip','Idle','Run'],
   beforeBake(clip){if(clip==='Walk_Skip')return walk;if(clip==='Idle'){idleStarted();return idle;}}
  });
  assert.equal(worker.nativeRouteAdmission,'pending-raid-flight-resources');
  await idleRequest;
  finishWalk();
  await new Promise(resolve=>setImmediate(resolve));
  const actor=fixture.roster.get(worker.id);
  assert.equal(actor.hasBakedWalking(),false);
  const support=fixture.terrain.prepareNativeHomeRouteProposal(proposal,{terrainManifest:fixture.manifest});
  assert(support?.valid());
  const preparing=fixture.roster.prepareNativeHomeRouteProposal(support,{getPickTime:fixture.getPickTime});
  let settled=false;
  const completion=preparing.then(value=>{part=value;settled=true;},()=>{settled=true;});
  await new Promise(resolve=>setImmediate(resolve));
  const waitedForIdle=!settled;
  finishIdle();
  await preparing;
  await completion;
  assert(waitedForIdle);
  assert(part.valid());
  assert.equal(fixture.roster.get(worker.id),actor);
  assert.equal(fixture.acquires,1);
  assert.deepEqual(fixture.errors,[]);
 }finally{
  finishWalk();finishIdle();
  part?.cancel();
  if(fixture)fixture.close();else session.dispose();
 }
}

test('public Desert flight checkpoint reacquires the open gate and both routes',async()=>{
 const original=deserialize(input.snapshot);
 const live=await nativeProductionAuthority(original,{chunkKeys:input.chunkKeys,qualifyFarmFlee:true,qualifyAnimalCrop:true});
 let cold,release,held;
 const wait=new Promise(resolve=>{release=resolve;});
 const commits=new Map();
 const pair=f=>{
  const frame=f.host.inspect().nativeRouteFrame;
  const home=frame?.bindings.find(row=>row.nativeHome),animal=frame?.bindings.find(row=>row.nativeAnimalCrop?.purpose==='center');
  return home&&animal&&frame.bindings.some(row=>row.nativeGate?.gateId===input.expectedGate)?{frame,home,animal}:null;
 };
 try{
  live.command({kind:'setNavigationView',view:input.navigationView});
  await untilProduction(live,()=>live.records.some(row=>row.kind==='farm-arrival'&&row.committed));
  let current,cut;
  for(let i=0;i<420&&!cut;i++){
   current=await tick(live);
   const draw=pair(live);
   if(current.workers[0].status==='fleeing'&&draw?.home.relativeTime>0&&draw.animal.relativeTime>0&&gate(current).gateOpen===1)cut=draw;
  }
  assert(cut,'expected both advancing clocks and the gate motor in the cut');
  const saving=live.command({kind:'snapshot',nativeAuthorityCheckpoint:true,visualTerrain:true});
  const disk=prepareWorkerCheckpoint(saving,{slotId:original.slotId,policy:{nativeAuthority:true},savedAt:0});
  assert(disk.saved);
  const marker=disk.state.workerNativeAuthorityCheckpoint.raidFlight;
  assert.deepEqual(marker.gate,{id:gateId,opening:1});
  assert.equal(disk.state.workers[0].x,current.workers[0].x);
  assert.equal(disk.state.raid.animals[0].motionPhase,current.raid.animals[0].motionPhase);
  const badOpening=structuredClone(disk.state);
  gate(badOpening).gateOpen=.9;
  assert.throws(()=>savedNativeAuthorityOptions(serialize(badOpening)),/differs from the saved cohort/);
  const badOwner=structuredClone(disk.state);
  badOwner.workerNativeAuthorityCheckpoint.raidFlight.gate.id=original.structures[1].id;
  assert.throws(()=>savedNativeAuthorityOptions(serialize(badOwner)),/differs from the saved cohort/);

  const options=savedNativeAuthorityOptions(serialize(disk.state));
  cold=await nativeProductionAuthority(disk.state,{...options,attach:false,onCommit:(record,data)=>commits.set(record,data),async onPrepare(record){
   if(record.kind==='home-route')await prepareColdHomeGraphics(cold.snapshot(),record.resources);
  },async onReady(record){
   if(!held){held=record;await wait;}
  }});
  await cold.attach();
  assert.equal(cold.authority.verifyNativeBootstrap(options.nativeBootstrap),true);
  assert.equal(gate(cold.snapshot()).gateOpen,1);
  await untilProduction(cold,()=>held?.packet);
  assert.equal(held.kind,'home-route');
  assert.deepEqual(held.resources.gates.map(row=>row.gateId),[input.expectedGate]);
  for(let i=0;i<2;i++){
   const waiting=await tick(cold);
   assert.equal(gate(waiting).gateOpen,1);
   assert.equal(waiting.workers[0].z,marker.workerPose.z);
   assert.equal(waiting.workers[0].runPhase,marker.workerPose.runPhase);
   assert.equal(waiting.raid.animals[0].motionPhase,marker.animalPose.phase);
  }
  release();
  let firstPair,checkedRefuge=false;
  for(let i=0;i<1800;i++){
   current=await tick(cold);
   firstPair??=pair(cold);
   if(!checkedRefuge&&current.raid&&current.workers[0].status==='home'){
    checkedRefuge=true;
    const sheltered=cold.command({kind:'snapshot',nativeAuthorityCheckpoint:true});
    assert.equal(sheltered.saveAvailable,true);
    assert.deepEqual(sheltered.nativeAuthorityCheckpoint.refugeReturn.gate,marker.gate);
   }
   if(!current.raid&&current.workers[0].nativeRouteAdmission==='native-idle')break;
  }
  assert(firstPair);
  assert(checkedRefuge);
  assert.notEqual(firstPair.frame.worldBoundary.authorityEpoch,cut.frame.worldBoundary.authorityEpoch);
  assert.deepEqual(commits.get(held).nativeHomeRouteBinding.gateIds,[input.expectedGate]);
  const home=cold.records.find(record=>record.kind==='home-arrival'&&record.committed);
  const retired=commits.get(home).nativeHomeArrivalBinding,carried=commits.get(cold.records.find(row=>row.kind==='farm-arrival'&&row.committed)).nativeFarmArrivalBinding;
  assert.equal(carried.reference.sourceRequest.refugeSequence,retired.retiredSequence);
  assert.notEqual(carried.reference.bodyId,retired.reference.bodyId);
  assert.equal(current.workers[0].personId,marker.personId);
  assert.equal(current.workers[0].hits,0);
  assert.equal(current.workers[0].nativeRouteAdmission,'native-idle');
  const raidEvents=current.events.filter(event=>event.simulationTime>=disk.elapsed);
  assert.deepEqual(raidEvents.filter(event=>event.type==='StructureHit').map(event=>event.structureHit.hp),input.expectedCenterHits);
  assert.equal(raidEvents.filter(event=>event.type==='RaidEnded').length,1);
  assert.deepEqual(current.ledger,disk.state.ledger);
 }finally{release();await cold?.close();await live.close();}
});

test('a sheltered Desert worker returns through the saved gate after a cold center raid',async()=>{
 const initial=deserialize(input.snapshot),cuts=new Map(),commits=new Map();
 const live=await nativeProductionAuthority(initial,{chunkKeys:input.chunkKeys,qualifyFarmFlee:true,qualifyAnimalCrop:true,
  onCommit:(record,data)=>commits.set(record.kind,data)});
 let originalEpoch;
 try{
  live.command({kind:'setNavigationView',view:input.navigationView});
  await untilProduction(live,()=>live.records.some(row=>row.kind==='farm-arrival'&&row.committed));
  for(let i=0;i<1750&&cuts.size<3;i++){
   await tick(live);
   const current=live.snapshot(),animal=current.raid?.animals[0];
   const home=commits.get('home-arrival')?.nativeHomeArrivalBinding;
   if(!home||!animal||current.workers[0].status!=='home')continue;
   const phase=animal.status==='attacking'?'strike':animal.status==='retreating'?'retreat':'approach';
   const kind=phase==='strike'?27:26,purpose=phase==='retreat'?'retreat':'center';
   const draw=live.host.inspect().nativeRouteFrame;
   if(cuts.has(phase)||!draw?.bindings.some(row=>row.nativeAnimalCrop?.kind===kind&&
      row.nativeAnimalCrop.purpose===purpose&&row.relativeTime>.1))continue;
   const result=live.command({kind:'snapshot',nativeAuthorityCheckpoint:true,visualTerrain:true});
   const disk=prepareWorkerCheckpoint(result,{slotId:initial.slotId,policy:{nativeAuthority:true},savedAt:0});
   assert(disk.saved,`missing ${phase} checkpoint`);
   assert.equal(disk.state.workers[0].status,'home');
   assert.deepEqual(disk.state.workerNativeAuthorityCheckpoint.refugeReturn.gate,{id:gateId,opening:1});
   cuts.set(phase,{disk:disk.state,purpose,kind});
   originalEpoch=home.reference.worldBoundary.authorityEpoch;
  }
  assert.deepEqual([...cuts.keys()],['approach','strike','retreat']);
 }finally{await live.close();}
 for(const [phase,{disk,purpose,kind}] of cuts){
  const changed=structuredClone(disk);
  gate(changed).gateOpen=0;
  assert.throws(()=>savedNativeAuthorityOptions(serialize(changed)),/refuge return differs/i);
  const options=savedNativeAuthorityOptions(serialize(disk));
  let held,release,absence,returned;
  const ready=new Promise(resolve=>{release=resolve;});
  const cold=await nativeProductionAuthority(disk,{...options,attach:false,async onReady(record){
   if(!held){held=record;await ready;}
  },onCommit(record,data){
   if(record.kind==='farm-arrival')returned=data.nativeFarmArrivalBinding;
  }});
  try{
   const post=cold.controlPort.postMessage;
   cold.controlPort.postMessage=message=>{absence??=message.restoredRefugeReturn;post(message);};
   await cold.attach();
   assert(cold.authority.verifyNativeBootstrap(options.nativeBootstrap));
   assert.notEqual(absence.authorityEpoch,originalEpoch);
   assert.equal(absence.actorId,900011);
   assert.deepEqual(cold.snapshot().workers,disk.workers);
   assert.equal(gate(cold.snapshot()).gateOpen,1);
   await untilProduction(cold,()=>held?.packet);
   assert.equal(held.kind,kind===27?'animal-crop-strike':'animal-crop-route');
   assert.equal(held.resources.reference.purpose,purpose);
   const waiting=await tick(cold),animal=waiting.raid.animals[0],saved=disk.raid.animals[0];
   assert.equal(waiting.workers[0].status,'home');
   assert.equal(waiting.workers[0].walkPhase,disk.workers[0].walkPhase);
   for(const key of ['x','z','heading','motionPhase','hitsRemaining','attackId','attackRemaining'])
    assert.equal(animal[key],saved[key],`${phase}: ${key} changed before READY`);
   assert.equal(cold.command({kind:'snapshot',nativeAuthorityCheckpoint:true}).saveAvailable,true);
   release();
   let current,sawRestoredDraw=false;
   for(let i=0;i<1850;i++){
    current=await tick(cold);
    sawRestoredDraw||=cold.host.inspect().nativeRouteFrame?.bindings.some(row=>
      row.nativeAnimalCrop?.worldBoundary.authorityEpoch===absence.authorityEpoch&&row.nativeAnimalCrop.kind===kind&&
      row.nativeAnimalCrop.purpose===purpose&&row.relativeTime>=0);
    if(!current.raid&&current.workers[0].nativeRouteAdmission==='native-idle')break;
   }
   assert(sawRestoredDraw,`missing restored ${phase} draw`);
   assert.equal(current.workers[0].nativeRouteAdmission,'native-idle');
   assert.equal(current.workers[0].personId,disk.workers[0].personId);
   assert.equal(current.workers[0].hits,0);
   assert.deepEqual(current.ledger,disk.ledger);
   assert.equal(returned.reference.sourceRequest.refugeSequence,absence.retiredSequence);
   assert.deepEqual(returned.gateIds,[input.expectedGate]);
   const hits=current.events.filter(event=>event.type==='StructureHit');
   assert.deepEqual(hits.map(event=>event.structureHit.hp),input.expectedCenterHits);
   const logical=current.events.filter(event=>event.type==='AnimalLogicalHit');
   assert.equal(logical.length,4);
   assert.equal(new Set(logical.map(event=>event.attackId)).size,4);
  }finally{release();await cold.close();}
 }
});

test('a confirmed Stop24 reloads while Home READY is still outstanding',async()=>{
 const initial=deserialize(input.snapshot);
 let stop,preparingHome,oldHome,releaseStop,releasePreparation,releaseHome;
 const stopReady=new Promise(resolve=>{releaseStop=resolve;});
 const homePreparation=new Promise(resolve=>{releasePreparation=resolve;});
 const homeReady=new Promise(resolve=>{releaseHome=resolve;});
 const live=await nativeProductionAuthority(initial,{chunkKeys:input.chunkKeys,qualifyFarmFlee:true,qualifyAnimalCrop:true,
  async onPrepare(record){if(record.kind==='home-route'&&!preparingHome){preparingHome=record;await homePreparation;}},
  async onReady(record){
   if(record.kind==='farm-arrival-stop'&&!stop){stop=record;await stopReady;}
   if(record.kind==='home-route'&&!oldHome){oldHome=record;await homeReady;}
  }});
 let disk,oldEpoch;
 try{
  live.command({kind:'setNavigationView',view:input.navigationView});
  await untilProduction(live,()=>live.records.some(row=>row.kind==='farm-arrival'&&row.committed));
  for(let i=0;i<430&&!stop?.packet;i++)await tick(live);
  assert(stop?.packet&&!stop.committed);
  const preparingStop=live.command({kind:'snapshot',nativeAuthorityCheckpoint:true});
  assert.equal(preparingStop.saveAvailable,false);
  releaseStop();
  for(let i=0;i<40&&!preparingHome;i++)await tick(live);
  assert(preparingHome&&!preparingHome.packet);
  const beforeReady=live.command({kind:'snapshot',nativeAuthorityCheckpoint:true});
  assert.equal(beforeReady.nativeAuthorityCheckpoint.raidFlight.homePending,true);
  assert.equal(beforeReady.saveAvailable,true);
  releasePreparation();
  for(let i=0;i<40&&!oldHome?.packet;i++)await tick(live);
  assert(live.records.some(record=>record.kind==='farm-arrival-stop'&&record.committed));
  assert(oldHome?.packet&&!oldHome.committed);
  oldEpoch=oldHome.resources.worldBoundary.authorityEpoch;
  disk=prepareWorkerCheckpoint(live.command({kind:'snapshot',nativeAuthorityCheckpoint:true,visualTerrain:true}),
   {slotId:initial.slotId,policy:{nativeAuthority:true},savedAt:0});
  assert(disk.saved);
  const marker=disk.state.workerNativeAuthorityCheckpoint.raidFlight;
  assert.equal(marker.homePending,true);
  assert.equal(marker.homePath,undefined);
  assert.equal(marker.workerPose.runPhase,oldHome.resources.sourceRequest.pose.runPhase);
  assert.deepEqual(marker.gate,{id:gateId,opening:1});
  const incompatible=structuredClone(disk.state);
  incompatible.workerNativeAuthorityCheckpoint.raidFlight.homePath=[oldHome.resources.sourceRequest.home];
  assert.throws(()=>savedNativeAuthorityOptions(serialize(incompatible)),/Invalid native raid flight checkpoint/i);
 }finally{
  releaseStop();releasePreparation();
  try{await live.close();}finally{releaseHome();}
 }
 const options=savedNativeAuthorityOptions(serialize(disk.state)),marker=disk.state.workerNativeAuthorityCheckpoint.raidFlight;
 let held,release;
 const ready=new Promise(resolve=>{release=resolve;});
 const commits=new Map();
 const cold=await nativeProductionAuthority(disk.state,{...options,onCommit:(record,data)=>commits.set(record.kind,data),
  async onReady(record){if(record.kind==='home-route'&&!held){held=record;await ready;}}});
 try{
  assert(cold.authority.verifyNativeBootstrap(options.nativeBootstrap));
  await untilProduction(cold,()=>held?.packet);
  assert.notEqual(held.resources.worldBoundary.authorityEpoch,oldEpoch);
  assert.deepEqual(held.resources.gates.map(gate=>gate.gateId),[input.expectedGate]);
  for(let i=0;i<3;i++){
   const waiting=await tick(cold),worker=waiting.workers[0],animal=waiting.raid.animals[0];
   assert.equal(worker.nativeRouteAdmission,'pending-raid-flight-resources');
   for(const key of ['x','z','runPhase','walkPhase','carryPhase','runRemaining'])
    assert.equal(worker[key],marker.workerPose[key]);
   assert.equal(worker.heading,marker.workerPose.yaw);
   assert.equal(animal.x,marker.animalPose.x);
   assert.equal(animal.z,marker.animalPose.z);
   assert.equal(gate(waiting).gateOpen,1);
  }
  const again=cold.command({kind:'snapshot',nativeAuthorityCheckpoint:true});
  assert.equal(again.saveAvailable,true);
  assert.equal(again.nativeAuthorityCheckpoint.raidFlight.homePending,true);
  release();
  let current,firstPair;
  for(let i=0;i<1850;i++){
   current=await tick(cold);
   const draw=cold.host.inspect().nativeRouteFrame;
   if(draw?.bindings.some(item=>item.nativeHome)&&draw.bindings.some(item=>item.nativeAnimalCrop)&&
      draw.bindings.some(item=>item.nativeGate?.gateId===input.expectedGate))firstPair??=draw;
   if(!current.raid&&current.workers[0].nativeRouteAdmission==='native-idle')break;
  }
  assert(firstPair);
  assert(!cold.records.some(record=>record.kind==='farm-arrival-stop'));
  assert.deepEqual([...commits.keys()].slice(0,2),['home-route','animal-crop-route']);
  const arrival=commits.get('home-arrival').nativeHomeArrivalBinding;
  const paidReturn=commits.get('farm-arrival').nativeFarmArrivalBinding;
  assert.equal(paidReturn.reference.sourceRequest.refugeSequence,arrival.retiredSequence);
  assert.deepEqual(paidReturn.gateIds,[input.expectedGate]);
  assert.equal(current.workers[0].nativeRouteAdmission,'native-idle');
  assert.equal(current.workers[0].personId,marker.personId);
  assert.deepEqual(current.ledger,disk.state.ledger);
  assert.deepEqual(current.events.filter(event=>event.type==='StructureHit').map(event=>event.structureHit.hp),input.expectedCenterHits);
 }finally{release();await cold.close();}
});
