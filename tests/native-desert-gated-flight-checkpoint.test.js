import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import test from 'node:test';
import {deserialize,serialize} from '../src/persistence/snapshots.js';
import {prepareWorkerCheckpoint} from '../src/persistence/prepare-worker-checkpoint.js';
import {savedNativeAuthorityOptions} from '../src/simulation/native-authority-checkpoint.js';
import {copyNativeFarmArrivalRouteProposal} from '../src/world/native-farm-arrival-route.js';
import {createSpatialGameSession} from '../src/world/wild-engine/spatial-game-session.js';
import {nativeProductionAuthority,untilProduction} from './helpers/native-production-authority.js';
import {nativeWorkerGraphicsFixture} from './helpers/native-task-consequence-graphics.js';
import {nativeFarmArrivalRouteFixture} from './helpers/native-farm-arrival-route.js';

const input=JSON.parse(gunzipSync(readFileSync(new URL('./fixtures/desierto983-gated-flight-input.json.gz',import.meta.url))));
const gateId='structure-'+input.expectedGate;
const gate=state=>state.structures.find(structure=>structure.gate);

for(const phases of [['flight'],['approach','strike','retreat']])test(`a second Desert center keeps its identity across ${phases.join(', ')} disk cuts`,async()=>{
 const source=nativeFarmArrivalRouteFixture({peer:false});
 const initial=structuredClone(source.state);
 source.close();
 const civilCenter=initial.workers[0].centerId,targetId=`structure-${initial.nextId++}`;
 initial.structures.push({...initial.structures[0],id:targetId,x:-18,z:-12});
 initial.dayPlan={done:false,at:initial.time+.8,group:['warthog']};
 const view={bounds:[-48,-48,48,48],eye:{x:-10,z:-24},target:{x:-10,z:0}};
 const live=await nativeProductionAuthority(initial,{chunkKeys:input.chunkKeys,qualifyFarmFlee:true,qualifyAnimalCrop:true});
 const cuts=new Map();
 let originalEpoch;
 try{
  live.command({kind:'setNavigationView',view});
  await untilProduction(live,()=>live.records.some(row=>row.kind==='farm-arrival'&&row.committed));
  for(let i=0;i<1800&&cuts.size<phases.length;i++){
   const current=await tick(live),animal=current.raid?.animals[0],worker=current.workers[0];
   if(!animal)continue;
   const phase=worker.status==='fleeing'?'flight':worker.status==='home'?
    animal.status==='attacking'?'strike':animal.status==='retreating'?'retreat':'approach':null;
   if(!phases.includes(phase)||cuts.has(phase))continue;
   const kind=phase==='strike'?27:26,purpose=phase==='retreat'?'retreat':'center';
   const draw=live.host.inspect().nativeRouteFrame;
   const binding=draw?.bindings.find(row=>row.nativeAnimalCrop?.kind===kind&&row.nativeAnimalCrop.purpose===purpose&&row.relativeTime>.1);
   if(!binding||phase==='flight'&&!draw.bindings.some(row=>row.nativeHome&&row.relativeTime>.1))continue;
   const result=live.command({kind:'snapshot',nativeAuthorityCheckpoint:true,visualTerrain:true});
   const disk=prepareWorkerCheckpoint(result,{slotId:initial.slotId,policy:{nativeAuthority:true},savedAt:0});
   assert(disk.saved,`missing ${phase} checkpoint`);
   const checkpoint=disk.state.workerNativeAuthorityCheckpoint;
   assert.equal((checkpoint.raidFlight??checkpoint.refugeReturn)?.centerId,civilCenter);
   if(phase!=='retreat')assert.equal(disk.state.raid.animals[0].targetId,targetId);
   cuts.set(phase,{disk:disk.state,kind,purpose});
   originalEpoch=binding.nativeAnimalCrop.worldBoundary.authorityEpoch;
  }
  assert.deepEqual([...cuts.keys()],phases);
 }finally{await live.close();}

 for(const [phase,{disk,kind,purpose}] of cuts){
  const altered=structuredClone(disk),checkpoint=altered.workerNativeAuthorityCheckpoint;
  if(phase==='flight')checkpoint.raidFlight.animalPose.targetId=civilCenter;
  else checkpoint.refugeReturn.centerId=targetId;
  assert.throws(()=>savedNativeAuthorityOptions(serialize(altered)),/differs from/);
  const options=savedNativeAuthorityOptions(serialize(disk));
  let release,held,returned,restoredDraw;
  const ready=new Promise(resolve=>{release=resolve;});
  const cold=await nativeProductionAuthority(disk,{...options,async onReady(record){
   const expected=phase==='flight'?'home-route':kind===27?'animal-crop-strike':'animal-crop-route';
   if(record.kind===expected&&!held){held=record;await ready;}
  },onCommit(record,data){if(record.kind==='farm-arrival')returned=data.nativeFarmArrivalBinding;}});
  try{
   await untilProduction(cold,()=>held?.packet);
   const waiting=await tick(cold),animal=waiting.raid.animals[0],saved=disk.raid.animals[0];
   for(const key of ['x','z','heading','motionPhase','targetId','attackId','attackRemaining','hitsRemaining'])
    assert.equal(animal[key],saved[key],`${phase}: ${key} changed before READY`);
   assert.equal(waiting.workers[0].centerId,civilCenter);
   release();
   let current;
   for(let i=0;i<1850;i++){
    current=await tick(cold);
    restoredDraw??=cold.host.inspect().nativeRouteFrame?.bindings.find(row=>{
     const ref=row.nativeAnimalCrop;
     return ref?.kind===kind&&ref.purpose===purpose&&ref.worldBoundary.authorityEpoch!==originalEpoch&&
      (purpose==='retreat'||'structure-'+ref.targetId===targetId)&&row.relativeTime>=0;
    });
    if(!current.raid&&current.workers[0].nativeRouteAdmission==='native-idle')break;
   }
   assert(restoredDraw,`missing restored ${phase} draw`);
   assert.equal(current.raid,null);
   assert.equal(current.workers[0].nativeRouteAdmission,'native-idle');
   assert.equal(current.workers[0].centerId,civilCenter);
   assert.equal(current.workers[0].personId,disk.workers[0].personId);
   assert.equal(current.workers[0].hits,0);
   assert.deepEqual(current.ledger,disk.ledger);
   assert.equal('structure-'+returned.reference.sourceRequest.centerId,civilCenter);
   assert.equal(current.structures.find(row=>row.id===civilCenter).hp,600);
   assert.deepEqual(current.events.filter(row=>row.type==='StructureHit').map(row=>[row.targetId,row.structureHit.hp]),
    [580,560,540,520].map(hp=>[targetId,hp]));
   const hits=current.events.filter(row=>row.type==='AnimalLogicalHit');
   assert.equal(new Set(hits.map(row=>row.attackId)).size,4);
   assert.equal(hits.length,4);
  }finally{release();await cold.close();}
 }
});

test('a Desert flight checkpoint restores both retained Home gate reservations and the sheltered successor',async()=>{
 const original=deserialize(input.snapshot),extraGate=original.nextId++;
 original.structures.push({...gate(original),id:'structure-'+extraGate,created:gate(original).created+1,z:5.3});
 original.dayPlan.at=original.time+10;
 const gateIds=[input.expectedGate,extraGate],openings=state=>state.structures.filter(row=>row.gate).map(row=>row.gateOpen);
 const live=await nativeProductionAuthority(original,{chunkKeys:input.chunkKeys,qualifyFarmFlee:true,qualifyAnimalCrop:true,drawFarmGate:true});
 const evidence=runtime=>{
  const frame=runtime.host.inspect().nativeRouteFrame;
  const home=frame?.bindings.find(row=>row.nativeHome),animal=frame?.bindings.find(row=>row.nativeAnimalCrop?.purpose==='center');
  return home&&animal?{frame,home,animal,motors:frame.bindings.filter(row=>row.nativeGate).map(row=>row.nativeGate.gateId)}:null;
 };
 const saved=[];
 const persist=snapshot=>{
  const disk=prepareWorkerCheckpoint(snapshot,{slotId:original.slotId,policy:{nativeAuthority:true},savedAt:0});
  assert(disk.saved);
  return serialize(disk.state);
 };
 try{
  live.command({kind:'setNavigationView',view:input.navigationView});
  await untilProduction(live,()=>live.records.some(row=>row.kind==='farm-arrival'&&row.committed));
  assert.deepEqual(live.records[0].resources.gates.map(row=>row.gateId),gateIds);
  for(let i=0;i<340&&saved.length<2;i++){
   await tick(live,.025);
   const current=evidence(live);
   if(!(current?.home.relativeTime>0)||!(current.animal.relativeTime>0))continue;
   assert.deepEqual(new Set(current.motors),new Set(gateIds));
   const snapshot=live.command({kind:'snapshot',nativeAuthorityCheckpoint:true,visualTerrain:true});
   const marker=snapshot.nativeAuthorityCheckpoint?.raidFlight;
   if(!marker)continue;
   const reservations=marker.gates.filter(row=>row.reservedByHome).map(row=>row.id);
   if(reservations.length===2-saved.length)saved.push({text:persist(snapshot),epoch:current.frame.worldBoundary.authorityEpoch});
  }
  assert.equal(saved.length,2,'expected a disk cut with both motors and then a cut past one crossing');
 }finally{await live.close();}

 let shelteredText;
 for(let index=0;index<saved.length;index++){
  const {text,epoch}=saved[index],state=deserialize(text),marker=state.workerNativeAuthorityCheckpoint.raidFlight;
  assert.equal(marker.version,2);
  assert.deepEqual(marker.gates.map(row=>row.id),gateIds.map(id=>'structure-'+id));
  assert.deepEqual(marker.gates.map(row=>row.opening),[1,1]);
  const required=index===0?gateIds:[gateIds[0]];
  assert.deepEqual(marker.gates.filter(row=>row.reservedByHome).map(row=>Number(row.id.split('-').at(-1))),required);
  if(index===0){
   const altered=structuredClone(state);
   altered.workerNativeAuthorityCheckpoint.raidFlight.gates[1].id=marker.gates[0].id;
   assert.throws(()=>savedNativeAuthorityOptions(serialize(altered)),/Invalid native raid flight checkpoint/);
   altered.workerNativeAuthorityCheckpoint.raidFlight.gates[1].id=marker.gates[1].id;
   const second=altered.structures.find(row=>row.id===marker.gates[1].id);
   second.gateOpen=.75;
   assert.throws(()=>savedNativeAuthorityOptions(serialize(altered)),/differs from the saved cohort/);
   second.gateOpen=1;
   altered.workerNativeAuthorityCheckpoint.raidFlight.gates[1].reservedByHome=false;
   const wrong=await nativeProductionAuthority(altered,savedNativeAuthorityOptions(serialize(altered)));
   try{
    await untilProduction(wrong,()=>wrong.authority.nativeIntentProductionStatus().last?.status==='blocked');
    assert.equal(wrong.records.some(row=>row.kind==='home-route'),false);
    assert.equal(wrong.snapshot().workers[0].nativeRouteAdmission,'pending-raid-flight-resources');
   }finally{await wrong.close();}
  }
  let held,release;
  const ready=new Promise(resolve=>{release=resolve;});
  const options=savedNativeAuthorityOptions(text);
  const cold=await nativeProductionAuthority(state,{...options,onReady(record){
   if(record.kind==='home-route'&&!held){held=record;return ready;}
  }});
  try{
   assert(cold.authority.verifyNativeBootstrap(options.nativeBootstrap));
   await untilProduction(cold,()=>held?.packet);
   assert.deepEqual(new Set(held.resources.gates.map(row=>row.gateId)),new Set(required));
   for(let i=0;i<2;i++){
    const waiting=await tick(cold,.025);
    const worker=waiting.workers[0],animal=waiting.raid.animals[0];
    assert(!held.committed);
    assert.deepEqual(openings(waiting),[1,1]);
    for(const [key,value] of Object.entries(marker.workerPose))assert.equal(worker[key==='yaw'?'heading':key],value);
    assert.deepEqual([animal.x,animal.z,animal.heading,animal.motionPhase],
      [marker.animalPose.x,marker.animalPose.z,marker.animalPose.yaw,marker.animalPose.phase]);
   }
   release();
   await untilProduction(cold,()=>held.committed);
   await held.packet.presented;
   for(let i=0;i<50&&!evidence(cold);i++)await tick(cold,.025);
   const first=evidence(cold);
   assert(first);
   assert.notEqual(first.frame.worldBoundary.authorityEpoch,epoch);
   assert.deepEqual(new Set(first.motors),new Set(required));
   assert.equal(first.home.nativeHome.actorId,marker.actorId);
   assert.equal(first.animal.nativeAnimalCrop.actorId,marker.animalId);
   if(index===0){
    for(let i=0;i<260;i++){
     const current=await tick(cold,.025);
     if(current.workers[0].status!=='home')continue;
     const snapshot=cold.command({kind:'snapshot',nativeAuthorityCheckpoint:true,visualTerrain:true});
     if(!snapshot.nativeAuthorityCheckpoint?.refugeReturn)continue;
     assert.equal(cold.records.filter(row=>row.kind==='home-arrival'&&row.committed).length,1);
     shelteredText=persist(snapshot);break;
    }
   }
  }finally{release();await cold.close();}
 }
 assert(shelteredText,'expected a public checkpoint after Home19');
 const state=deserialize(shelteredText),refuge=state.workerNativeAuthorityCheckpoint.refugeReturn;
 assert.deepEqual(refuge.gates,gateIds.map(id=>({id:'structure-'+id,opening:1})));
 assert.equal(refuge.version,2);
 const cold=await nativeProductionAuthority(state,savedNativeAuthorityOptions(shelteredText));
 try{
  let end;
  for(let i=0;i<800;i++){
   end=await tick(cold,.04);
   if(!end.raid&&end.workers[0].nativeRouteAdmission==='native-idle')break;
  }
  assert.equal(end.raid,null);
  assert.equal(end.workers[0].nativeRouteAdmission,'native-idle');
  assert.equal(end.workers[0].personId,refuge.personId);
  assert.equal(end.workers[0].hits,0);
  assert.deepEqual(end.ledger,state.ledger);
  const raidEvents=end.events.filter(event=>event.simulationTime>=state.elapsed);
  assert.deepEqual(raidEvents.filter(event=>event.type==='StructureHit').map(event=>event.structureHit.hp),input.expectedCenterHits);
  assert.equal(raidEvents.filter(event=>event.type==='RaidEnded').length,1);
 }finally{await cold.close();}
});

async function tick(f,seconds=.02){
 const step=await f.command({kind:'advance',seconds,steps:2,nightFastForward:false});
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

for(const frozenGate of [false,true])test(frozenGate?'a partially open gate survives a checkpoint with both flight routes acquired':
 'public Desert flight checkpoint reacquires the open gate and both routes',async()=>{
 const original=deserialize(input.snapshot);
 if(frozenGate)original.dayPlan.at=original.time+.5;
 const live=await nativeProductionAuthority(original,{chunkKeys:input.chunkKeys,qualifyFarmFlee:true,qualifyAnimalCrop:true});
 let cold,release,held;
 const wait=new Promise(resolve=>{release=resolve;});
 const commits=new Map();
 const pair=f=>{
  const frame=f.host.inspect().nativeRouteFrame;
  const home=frame?.bindings.find(row=>row.nativeHome),animal=frame?.bindings.find(row=>row.nativeAnimalCrop?.purpose==='center');
  const motor=frame?.bindings.some(row=>row.nativeGate?.gateId===input.expectedGate);
  return home&&animal&&motor===!frozenGate?{frame,home,animal}:null;
 };
 try{
  live.command({kind:'setNavigationView',view:input.navigationView});
  await untilProduction(live,()=>live.records.some(row=>row.kind==='farm-arrival'&&row.committed));
  let current,cut,saving;
  for(let i=0;i<420&&!cut;i++){
   current=await tick(live,frozenGate ? .01 : .02);
   const draw=pair(live);
   if(current.workers[0].status!=='fleeing'||!(draw?.home.relativeTime>0)||!(draw.animal.relativeTime>0))continue;
   saving=live.command({kind:'snapshot',nativeAuthorityCheckpoint:true,visualTerrain:true});
   if(saving.saveAvailable&&saving.nativeAuthorityCheckpoint?.raidFlight)cut=draw;
  }
  assert(cut,'expected a restorable cut with both advancing clocks');
  const disk=prepareWorkerCheckpoint(saving,{slotId:original.slotId,policy:{nativeAuthority:true},savedAt:0});
  assert(disk.saved);
  const marker=disk.state.workerNativeAuthorityCheckpoint.raidFlight;
  const opening=gate(disk.state).gateOpen;
  if(frozenGate)assert(opening>0&&opening<1);else assert.equal(opening,1);
  assert.deepEqual(marker.gate,{id:gateId,opening,...(frozenGate?{reservedByHome:false}:{})});
  assert.equal(marker.homePending,undefined);
  assert(marker.homePath.length>0);
  assert.equal(disk.state.workers[0].x,current.workers[0].x);
  assert.equal(disk.state.raid.animals[0].motionPhase,current.raid.animals[0].motionPhase);
  const badOpening=structuredClone(disk.state);
  gate(badOpening).gateOpen=.9;
  assert.throws(()=>savedNativeAuthorityOptions(serialize(badOpening)),/differs from the saved cohort/);
  const badOwner=structuredClone(disk.state);
  badOwner.workerNativeAuthorityCheckpoint.raidFlight.gate.id=original.structures[1].id;
  assert.throws(()=>savedNativeAuthorityOptions(serialize(badOwner)),/differs from the saved cohort/);
  if(frozenGate){
   const badReservation=structuredClone(disk.state);
   delete badReservation.workerNativeAuthorityCheckpoint.raidFlight.gate.reservedByHome;
   assert.throws(()=>savedNativeAuthorityOptions(serialize(badReservation)),/Invalid native raid flight checkpoint/);
  }

  const options=savedNativeAuthorityOptions(serialize(disk.state));
  cold=await nativeProductionAuthority(disk.state,{...options,attach:false,onCommit:(record,data)=>commits.set(record,data),async onPrepare(record){
   if(!frozenGate&&record.kind==='home-route')await prepareColdHomeGraphics(cold.snapshot(),record.resources);
  },async onReady(record){
   if(!held){held=record;await wait;}
  }});
  await cold.attach();
  assert.equal(cold.authority.verifyNativeBootstrap(options.nativeBootstrap),true);
  assert.equal(gate(cold.snapshot()).gateOpen,opening);
  await untilProduction(cold,()=>held?.packet);
  assert.equal(held.kind,'home-route');
  const gateIds=frozenGate?[]:[input.expectedGate];
  assert.deepEqual(held.resources.gates.map(row=>row.gateId),gateIds);
  for(let i=0;i<2;i++){
   const waiting=await tick(cold);
   assert.equal(gate(waiting).gateOpen,opening);
   assert.equal(waiting.workers[0].z,marker.workerPose.z);
   assert.equal(waiting.workers[0].runPhase,marker.workerPose.runPhase);
   assert.equal(waiting.raid.animals[0].motionPhase,marker.animalPose.phase);
  }
  release();
  let firstPair,checkedRefuge=false;
  if(frozenGate){
   await untilProduction(cold,()=>pair(cold));
   firstPair=pair(cold);
  }
  for(let i=0;i<1800;i++){
   current=await tick(cold);
   firstPair??=pair(cold);
   if(!checkedRefuge&&current.raid&&current.workers[0].status==='home'){
    checkedRefuge=true;
    const sheltered=cold.command({kind:'snapshot',nativeAuthorityCheckpoint:true});
    assert.equal(sheltered.saveAvailable,true);
    assert.deepEqual(sheltered.nativeAuthorityCheckpoint.refugeReturn.gate,{id:gateId,opening});
   }
   if(!current.raid&&current.workers[0].nativeRouteAdmission==='native-idle')break;
  }
  assert(firstPair);
  assert(checkedRefuge);
  assert.notEqual(firstPair.frame.worldBoundary.authorityEpoch,cut.frame.worldBoundary.authorityEpoch);
  assert.deepEqual(commits.get(held).nativeHomeRouteBinding.gateIds,gateIds);
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

for(const frozenGate of [false,true])test(`a sheltered Desert worker returns through the ${frozenGate?'partially open':'open'} saved gate after a cold center raid`,async()=>{
 const initial=deserialize(input.snapshot),cuts=new Map(),commits=new Map();
 if(frozenGate)initial.dayPlan.at=initial.time+.5;
 const phases=frozenGate?['approach']:['approach','strike','retreat'];
 const live=await nativeProductionAuthority(initial,{chunkKeys:input.chunkKeys,qualifyFarmFlee:true,qualifyAnimalCrop:true,
  onCommit:(record,data)=>commits.set(record.kind,data)});
 let originalEpoch;
 try{
  live.command({kind:'setNavigationView',view:input.navigationView});
  await untilProduction(live,()=>live.records.some(row=>row.kind==='farm-arrival'&&row.committed));
  for(let i=0;i<1750&&cuts.size<phases.length;i++){
   await tick(live);
   const current=live.snapshot(),animal=current.raid?.animals[0];
   const home=commits.get('home-arrival')?.nativeHomeArrivalBinding;
   if(!home||!animal||current.workers[0].status!=='home')continue;
   const phase=animal.status==='attacking'?'strike':animal.status==='retreating'?'retreat':'approach';
   if(!phases.includes(phase))continue;
   const kind=phase==='strike'?27:26,purpose=phase==='retreat'?'retreat':'center';
   const draw=live.host.inspect().nativeRouteFrame;
   if(cuts.has(phase)||!draw?.bindings.some(row=>row.nativeAnimalCrop?.kind===kind&&
      row.nativeAnimalCrop.purpose===purpose&&row.relativeTime>.1))continue;
   const result=live.command({kind:'snapshot',nativeAuthorityCheckpoint:true,visualTerrain:true});
   const disk=prepareWorkerCheckpoint(result,{slotId:initial.slotId,policy:{nativeAuthority:true},savedAt:0});
   assert(disk.saved,`missing ${phase} checkpoint`);
   assert.equal(disk.state.workers[0].status,'home');
   const opening=gate(disk.state).gateOpen;
   if(frozenGate)assert(opening>0&&opening<1);else assert.equal(opening,1);
   assert.deepEqual(disk.state.workerNativeAuthorityCheckpoint.refugeReturn.gate,{id:gateId,opening});
   cuts.set(phase,{disk:disk.state,purpose,kind});
   originalEpoch=home.reference.worldBoundary.authorityEpoch;
  }
  assert.deepEqual([...cuts.keys()],phases);
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
   assert.equal(gate(cold.snapshot()).gateOpen,gate(disk).gateOpen);
   await untilProduction(cold,()=>held?.packet);
   assert.equal(held.kind,kind===27?'animal-crop-strike':'animal-crop-route');
   assert.equal(held.resources.reference.purpose,purpose);
   const waiting=await tick(cold),animal=waiting.raid.animals[0],saved=disk.raid.animals[0];
   assert.equal(gate(waiting).gateOpen,gate(disk).gateOpen);
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

for(const frozenGate of [false,true])test(`a confirmed Stop24 reloads with a ${frozenGate?'partially open':'fully open'} gate while Home READY is outstanding`,async()=>{
 const initial=deserialize(input.snapshot);
 if(frozenGate)initial.dayPlan.at=initial.time+.5;
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
  assert.equal(preparingStop.saveAvailable,true);
  assert(preparingStop.nativeAuthorityCheckpoint.raidFlight.farmStop);
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
  const opening=gate(disk.state).gateOpen;
  if(frozenGate)assert(opening>0&&opening<1);else assert.equal(opening,1);
  assert.deepEqual(marker.gate,{id:gateId,opening});
  const changed=structuredClone(disk.state);
  gate(changed).gateOpen=0;
  assert.throws(()=>savedNativeAuthorityOptions(serialize(changed)),/checkpoint differs from the saved cohort/i);
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
  assert.deepEqual(held.resources.gates.map(gate=>gate.gateId),frozenGate?[]:[input.expectedGate]);
  for(let i=0;i<3;i++){
   const waiting=await tick(cold),worker=waiting.workers[0],animal=waiting.raid.animals[0];
   assert.equal(worker.nativeRouteAdmission,'pending-raid-flight-resources');
   for(const key of ['x','z','runPhase','walkPhase','carryPhase','runRemaining'])
    assert.equal(worker[key],marker.workerPose[key]);
   assert.equal(worker.heading,marker.workerPose.yaw);
   assert.equal(animal.x,marker.animalPose.x);
   assert.equal(animal.z,marker.animalPose.z);
   assert.equal(gate(waiting).gateOpen,marker.gate.opening);
  }
  const again=cold.command({kind:'snapshot',nativeAuthorityCheckpoint:true});
  assert.equal(again.saveAvailable,true);
  assert.equal(again.nativeAuthorityCheckpoint.raidFlight.homePending,true);
  release();
  let current,firstPair;
  for(let i=0;i<1850;i++){
   current=await tick(cold);
   const draw=cold.host.inspect().nativeRouteFrame;
   if(draw?.bindings.some(item=>item.nativeHome)&&draw.bindings.some(item=>item.nativeAnimalCrop))firstPair??=draw;
   if(!current.raid&&current.workers[0].nativeRouteAdmission==='native-idle')break;
  }
  assert(firstPair);
  assert.equal(firstPair.bindings.some(item=>item.nativeGate?.gateId===input.expectedGate),!frozenGate);
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

for(const phase of ['scheduled','opening','open','first-of-two','second-of-two'])test(`a public raid checkpoint reacquires the ${phase} Farm gate before resuming Stop24`,async()=>{
 const initial=deserialize(input.snapshot);
 const multiple=phase.endsWith('-of-two');
 const ids=[input.expectedGate];
 if(multiple){
  ids.push(initial.nextId++);
  initial.structures.push({...gate(initial),id:'structure-'+ids[1],created:gate(initial).created+1,z:5.3});
 }
 const openings=state=>state.structures.filter(row=>row.gate).map(row=>row.gateOpen);
 const measured=state=>({elapsed:state.elapsed,gates:openings(state),worker:state.workers[0].nativeFarmFlightSample.pose});
 initial.dayPlan.at=initial.time+(phase==='scheduled' ? .2 : .5);
 let held,release;
 const ready=new Promise(resolve=>{release=resolve;});
 const live=await nativeProductionAuthority(initial,{chunkKeys:input.chunkKeys,qualifyFarmFlee:true,qualifyAnimalCrop:true,
  async onReady(record){if(record.kind==='farm-arrival-stop'&&!held){held=record;await ready;}}});
 let text,oldEpoch;
 const liveSuffix=[];
 try{
  live.command({kind:'setNavigationView',view:input.navigationView});
  await untilProduction(live,()=>live.records.some(row=>row.kind==='farm-arrival'&&row.committed));
  for(let i=0;i<430&&!held?.packet;i++)await tick(live);
  assert(held?.packet&&!held.committed);
  oldEpoch=held.resources.worldBoundary.authorityEpoch;
  const beforeCut=phase==='second-of-two'?82:phase==='open'?14:0;
  for(let i=0;i<beforeCut;i++)await tick(live);
  const result=live.command({kind:'snapshot',nativeAuthorityCheckpoint:true,visualTerrain:true});
  assert(result.saveAvailable);
  const disk=prepareWorkerCheckpoint(result,{slotId:initial.slotId,policy:{nativeAuthority:true},savedAt:0});
  assert(disk.saved);
  assert.equal(disk.state.workers[0].nativeFarmFlightSample,undefined);
  assert.equal(disk.state.workers[0].nativeRouteAdmission,undefined);
  text=serialize(disk.state);
  const steps=phase==='first-of-two'?82:phase==='scheduled'?6:2;
  for(let i=0;i<steps;i++){
   liveSuffix.push(measured(await tick(live)));
  }
 }finally{try{await live.close();}finally{release();}}
 const state=deserialize(text),options=savedNativeAuthorityOptions(text),cut=state.workerNativeAuthorityCheckpoint.raidFlight;
 assert(cut.farmStop);
 assert.equal(cut.homePending,undefined);
 assert.equal(cut.homePath,undefined);
 const savedGates=cut.gates??[cut.gate],programs=cut.farmStop.motors??[cut.farmStop.motor];
 const motor=programs[phase==='second-of-two'?1:0],opening=savedGates[phase==='second-of-two'?1:0].opening;
 assert.equal(cut.version,multiple?2:1);
 assert.deepEqual(savedGates.map(row=>Number(row.id.split('-').at(-1))),ids);
 if(multiple){
  assert.deepEqual(programs.map(row=>row.gateId),ids);
  assert.equal(savedGates[phase==='first-of-two'?1:0].opening,phase==='first-of-two'?0:1);
 }
 assert(cut.farmStop.startTime<motor.at&&motor.at<motor.endsAt);
 if(phase==='scheduled')assert(cut.at<motor.at&&opening===0);
 else if(phase!=='open')assert(motor.at<cut.at&&cut.at<motor.endsAt&&opening>0&&opening<1);
 else assert(motor.endsAt<cut.at&&opening===1);
 assert.equal(cut.farmStop.waiting,phase!=='scheduled'&&phase!=='open');
 const incompatible=structuredClone(state);
 const incompatibleProgram=incompatible.workerNativeAuthorityCheckpoint.raidFlight.farmStop;
 if(multiple)incompatibleProgram.motors[1].gateId=ids[0];
 else incompatibleProgram.motor.endsAt=motor.at;
 assert.throws(()=>savedNativeAuthorityOptions(serialize(incompatible)),/Invalid saved Farm stop program/);
 const altered=structuredClone(state);
 const alternateProgram=altered.workerNativeAuthorityCheckpoint.raidFlight.farmStop;
 const alternate=multiple?alternateProgram.motors[1]:alternateProgram.motor;
 alternate.at+=.001;
 if(phase==='scheduled'||phase==='first-of-two'){
  alternate.endsAt+=.001;
  alternateProgram.endTime+=.001;
 }
 const bad=await nativeProductionAuthority(altered,{...savedNativeAuthorityOptions(serialize(altered)),drawFarmGate:true});
 try{
  for(let i=0;i<12&&!bad.faults.length;i++)await bad.present();
  assert.match(bad.faults.join('\n'),/Saved Farm gate program differs from its reconstructed corridor/);
  assert.equal(bad.records.length,0);
  assert.throws(()=>bad.snapshot(),/Saved Farm gate program differs from its reconstructed corridor/);
 }finally{await bad.close();}
 let farm,stop,allowFarm,allowStop;
 const waitFarm=new Promise(resolve=>{allowFarm=resolve;}),waitStop=new Promise(resolve=>{allowStop=resolve;});
 const cold=await nativeProductionAuthority(state,{...options,drawFarmGate:true,async onReady(record){
  if(record.kind==='farm-arrival'&&!farm){farm=record;await waitFarm;}
  if(record.kind==='farm-arrival-stop'&&!stop){stop=record;await waitStop;}
 }});
 try{
  await untilProduction(cold,()=>!!farm?.packet);
  const {sourceProgram}=farm.resources.nativeFarmArrival;
  assert(sourceProgram.startTime<cut.at&&sourceProgram.passedDistance>0);
  const rounded=structuredClone(farm.resources);
  rounded.rows[rounded.rows.length-7]=cut.workerPose.walkPhase+rounded.distance/.72;
  if(phase==='open')assert.throws(()=>copyNativeFarmArrivalRouteProposal(rounded),/changed its held phases or endpoint/);
  const heldAdvance=await cold.command({kind:'advance',seconds:.02,steps:2,nightFastForward:false});
  assert.equal(heldAdvance.stepsExecuted,0);
  const heldState=JSON.parse(heldAdvance.snapshot),[worker]=heldState.workers;
  assert.equal(heldState.elapsed,cut.at);
  assert.equal(worker.nativeRouteAdmission,'pending-farm-flight-restore');
  for(const [key,value] of Object.entries(cut.workerPose))assert.equal(worker[key==='yaw'?'heading':key],value);
  assert.deepEqual(openings(heldState),savedGates.map(row=>row.opening));
  assert.equal(farm.committed,false);
  allowFarm();
  await untilProduction(cold,()=>farm.committed);
  await cold.present();await farm.packet.presented;
  const draw=cold.host.inspect().nativeRouteFrame;
  assert.equal(draw.worldBoundary.effectiveTime,cut.at);
  assert.notEqual(draw.worldBoundary.authorityEpoch,oldEpoch);
  assert.equal(draw.bindings.find(row=>row.nativeFarmArrival?.actorId===cut.actorId)?.relativeTime,0);
  assert.deepEqual(draw.bindings.filter(row=>row.nativeGate).map(row=>[row.nativeGate.gateId,row.elapsed]),ids.map(id=>[id,cut.at]));
  assert.equal(cold.snapshot().workers[0].nativeRouteAdmission,'pending-farm-flight-stop');
  await untilProduction(cold,()=>!!stop?.packet);
  let retimed;
  for(const expected of liveSuffix){
   retimed=await tick(cold);
   assert.deepEqual(measured(retimed),expected);
   assert.equal(retimed.raid.animals[0].x,cut.animalPose.x);
   assert.equal(retimed.raid.animals[0].z,cut.animalPose.z);
  }
  const retimedOpenings=openings(retimed),last=retimedOpenings.at(-1);
  if(phase==='open')assert.equal(last,1);
  else assert(last>savedGates.at(-1).opening&&last<1);
  allowStop();
  await untilProduction(cold,()=>stop.committed);
  await cold.present();await stop.packet.presented;
  const stopped=cold.snapshot();
  assert.equal(stopped.workers[0].nativeRouteAdmission,'pending-raid-flight-resources');
  assert.deepEqual(openings(stopped),retimedOpenings);
  let current;
  for(let i=0;i<1850;i++){
   current=await tick(cold);
   if(!current.raid&&current.workers[0].nativeRouteAdmission==='native-idle')break;
  }
  assert.equal(current.raid,null);
  assert.equal(current.workers[0].nativeRouteAdmission,'native-idle');
  assert.equal(current.workers[0].personId,cut.personId);
  assert.deepEqual(current.ledger,state.ledger);
  assert.deepEqual(current.events.filter(event=>event.type==='StructureHit').map(event=>event.structureHit.hp),input.expectedCenterHits);
  const raidFacts=current.events.filter(event=>event.raidFacts?.id===state.raid.id);
  assert.deepEqual(raidFacts.filter(event=>event.type==='RaidSpawned').map(event=>event.id),['event-'+cut.spawnSequence]);
  assert.equal(current.events.filter(event=>event.type==='RaidEnded'&&event.simulationTime>=cut.at).length,1);
  assert.deepEqual(cold.faults,[]);
  assert.deepEqual(cold.errors,[]);
 }finally{allowFarm();allowStop();await cold.close();}
});
