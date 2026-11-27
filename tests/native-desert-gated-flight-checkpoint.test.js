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
 async function tick(f){
  const step=await f.command({kind:'advance',seconds:.02,steps:2,nightFastForward:false});
  for(const key of step.residency.missing){const [cx,cz]=key.split(',').map(Number);f.command({kind:'addChunk',cx,cz});}
  await f.present();
  assert.deepEqual(f.faults,[]);
  return JSON.parse(step.snapshot);
 }
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
    assert.equal(cold.command({kind:'snapshot',nativeAuthorityCheckpoint:true}).saveAvailable,false);
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
