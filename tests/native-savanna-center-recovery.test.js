import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import test from 'node:test';
import {MessageChannel} from 'node:worker_threads';
import {gunzipSync} from 'node:zlib';
import {nativeProductionAuthority,untilProduction} from './helpers/native-production-authority.js';
import {fixture,flush} from './helpers/remote-webgpu-fixture.js';
import {originalRig} from './helpers/native-animal-crop-rig.js';
import {savedNativeAuthorityOptions} from '../src/simulation/native-authority-checkpoint.js';
import {nativeWorkerRouteRecoveryProfile} from '../src/world/native-worker-route-recovery.js';
import {floorFloat32} from '../src/rendering/float32-time.js';
import {nativeClockResourceEnd} from '../src/rendering/native-clock-resource-end.js';
import {captureNativeRoutePickFrame} from '../src/rendering/native-route-pick-frame.js';

const phases=[{phase:'moving-approach',kind:26},{phase:'acquired-strike',kind:27}];
const cases=phases.flatMap(phase=>[
 {...phase,name:'Savanna center',fixture:'sabana714-d5-center-'+phase.phase,targetId:'structure-2'},
 {...phase,name:'Desert crop',fixture:'desierto712-d1-two-crops-before-night',targetId:'plant-3'},
 {...phase,name:'Desert crop with a paid gate',fixture:'desierto712-d1-paid-gate-before-night',targetId:'plant-3',gateId:'structure-7'},
]);

for(const stage of cases)test('terminal Draw recovers the ordinary '+stage.name+' '+stage.phase,{timeout:30000},async()=>{
 const raw=gunzipSync(readFileSync(new URL('./fixtures/'+stage.fixture+'.json.gz',import.meta.url))).toString();
 const state=JSON.parse(raw),options=savedNativeAuthorityOptions(raw);
 assert.equal(options.nativeWorkerLifecycle,true);
 const beforeBirth=state.raid===null;
 const manifest={epoch:stage.fixture,chunks:options.chunkKeys.map(key=>{
  const [cx,cz]=key.split(',').map(Number);return {cx,cz,revision:1};
 })};
 const f=await nativeProductionAuthority(state,{...options,emptyBeastPhysics:beforeBirth,getTerrainManifest:()=>manifest});
 let replacement,attached=false,rig,control,draw;
 try{
  f.command({kind:'setNavigationView',view:options.navigationView});
  const type=stage.kind===26?'animal-crop-route':'animal-crop-strike';
  const tick=()=>f.command({kind:'advance',seconds:.05,steps:2,nightFastForward:beforeBirth});
  const acquired=()=>f.records.find(r=>r.kind===type&&r.committed);
  if(beforeBirth){
   for(let i=0;i<950&&!acquired();i++){await tick();await f.present();}
  }else await untilProduction(f,acquired);
  const record=acquired(),a=f.snapshot().raid.animals[0];
  assert(record);
  assert.equal(a.targetId,stage.targetId);
  await f.present();await record.packet.presented;
  const held=JSON.parse((await tick()).snapshot);
  assert.equal(held.raid.animals[0].id,a.id);
  assert(held.elapsed>state.elapsed);
  const receipt=await f.authority.quiesceNativeIntentProduction({forLostDraw:true});
  const expectedRoute={kind:stage.kind,actorId:Number(a.id.split('-').at(-1))};
  ({port1:control,port2:draw}=new MessageChannel());
  await assert.rejects(f.authority.attachHeldWorkerRoute(control,'production-control',30,receipt,expectedRoute),/Previous draw not terminal/);
  f.retireResourceEndpoint();f.gpu.device.destroy();
  await untilProduction(f,()=>f.authority.nativeIntentControlStatus().current?.drained===true);
  const retired=await f.authority.flushNativeResourcePreparation({allowRetired:true,forLostDraw:true});
  assert(retired.terminal&&retired.callbacksSettled);
  const route=await f.authority.terminalWorkerRoute();
  assert.deepEqual(route,expectedRoute);
  await assert.rejects(f.authority.attachHeldWorkerRoute(control,'production-control',30,receipt,{...route,actorId:route.actorId+1}),/Expected current native recovery assignments/);
  replacement=await fixture({capabilities:{nativeAnimalCropVersion:1}},
   {intentControl:{port:draw,session:'production-control',recoveryHold:30},absoluteNow:()=>Number.MAX_SAFE_INTEGER});
  const {recoveredWorkerRoute:q}=await f.authority.attachHeldWorkerRoute(control,'production-control',30,receipt,route);
  const {execution,resources}=q,at=held.elapsed,animal=held.raid.animals[0],profile=nativeWorkerRouteRecoveryProfile(stage.kind);
  const proof=resources[profile.bindingField],ref=proof.reference,epoch=ref.worldBoundary.effectiveTime;
  assert.equal(execution.executedThrough,at);
  assert.equal(execution.bodyId,1);
  assert.deepEqual([execution.x,execution.z,execution.yaw,execution.phase],[animal.x,animal.z,animal.heading,animal.motionPhase]);
  if(stage.kind===27){
   assert.equal(proof.attackId,Number(animal.attackId.split('-').at(-1)));
   assert.equal(execution.attackRemaining,animal.attackRemaining);
  }
  rig=await originalRig(structuredClone(held),manifest);
  assert((await rig.recover({resources,execution,terrainManifest:q.terrainManifest})).some(n=>n>0));
  replacement.client.registerClockBinding(replacement.buffer,{byteOffset:0,epoch,semantic:'relative',nativeAnimalCrop:ref,
   resourceEnd:stage.kind===26?nativeClockResourceEnd(epoch,ref.endTime):ref.endTime});
  await assert.rejects(f.authority.checkHeldDraw(30,receipt,route),/Missing submitted/);
  const writing=replacement.frame(0,{nativeWorldBoundary:ref.worldBoundary,
   clock:{version:1,epoch:0,elapsed:at,safeUntil:at,anchorAbsoluteMs:0,paused:true,segments:[]}});
  writing.catch(()=>{});
  await flush();await replacement.host.idle();replacement.host.present();await writing;
  const witness=await f.authority.checkHeldDraw(30,receipt,route);
  assert.equal(witness.relativeTime,floorFloat32(at-epoch));
  await assert.rejects(f.authority.checkHeldDraw(31,receipt,route),/Missing submitted/);
  const pick=captureNativeRoutePickFrame(replacement.host.inspect());
  assert.equal(pick.getAnimalCropAge(ref),witness.relativeTime);
  rig.presented(pick.getAnimalCropAge(ref));
  await f.attachRecoveredResources(replacement);attached=true;
  assert.equal(f.authority.resumeNativeIntentProduction(receipt),true);
  const events=[];
  let next=held;
  for(let i=0;i<950&&!events.some(event=>event.type==='AnimalLogicalHit');i++){
   const p=await tick();events.push(...p.events);next=JSON.parse(p.snapshot);await f.present();
  }
  const [impact,...duplicates]=events.filter(e=>e.type==='AnimalLogicalHit');
  assert(impact&&!duplicates.length);
  assert.equal(impact.targetId,stage.targetId);
  if(stage.kind===27)assert.equal(impact.attackId,animal.attackId);
  const following=await tick();
  assert.equal(following.events.filter(event=>event.attackId===impact.attackId&&event.type==='AnimalLogicalHit').length,0);
  if(beforeBirth){
   assert.deepEqual(events.filter(e=>e.type==='CropDestroyed').map(e=>e.targetId),[stage.targetId]);
   assert.deepEqual(next.plants.map(crop=>[crop.id,crop.alive]),[['plant-3',false],['plant-5',true]]);
   assert.deepEqual(next.workers,held.workers);
   if(stage.gateId){
    const gate=state.structures.find(row=>row.id===stage.gateId);
    assert.equal(gate.gateOpen,0);
    assert.deepEqual(next.structures.find(row=>row.id===gate.id),gate);
   }
  }else assert.deepEqual(events.filter(e=>e.type==='StructureHit').map(e=>e.structureHit.hp),[125]);
  assert.deepEqual(next.ledger,state.ledger);
  assert.deepEqual(f.faults,[]);
 }finally{
  rig?.close();control?.close();draw?.close();
  try{await f.close();}finally{if(replacement&&!attached){replacement.client.dispose();await replacement.host.dispose();}}
 }
});
