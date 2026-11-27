import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import test from 'node:test';
import {MessageChannel} from 'node:worker_threads';
import {gunzipSync} from 'node:zlib';
import {prepareWorkerCheckpoint} from '../src/persistence/prepare-worker-checkpoint.js';
import {serialize} from '../src/persistence/snapshots.js';
import {savedNativeAuthorityOptions} from '../src/simulation/native-authority-checkpoint.js';
import {nativeClockResourceEnd} from '../src/rendering/native-clock-resource-end.js';
import {captureNativeRoutePickFrame} from '../src/rendering/native-route-pick-frame.js';
import {floorFloat32} from '../src/rendering/float32-time.js';
import {nativeProductionAuthority,untilProduction} from './helpers/native-production-authority.js';
import {fixture,flush} from './helpers/remote-webgpu-fixture.js';
import {originalRig} from './helpers/native-animal-crop-rig.js';

const origin=gunzipSync(readFileSync(new URL('./fixtures/sabana714-d1-native-pending-home.json.gz',import.meta.url))).toString();
const pose=({x,z,heading,motionPhase})=>[x,z,heading,motionPhase];
const formatManifest=(epoch,options)=>({epoch,chunks:options.chunkKeys.map(key=>{
 const [cx,cz]=key.split(',').map(Number);
 return {cx,cz,revision:1};
})});
const retreatFor=f=>f.records.find(record=>record.kind==='animal-crop-route'&&record.resources.reference.purpose==='retreat');
const advance=(f,steps=1,nightFastForward=false)=>f.command({kind:'advance',seconds:.05,steps,nightFastForward});

test('an ordinary Savanna Retreat with its center intact retains disk and terminal authority',{timeout:45000},async()=>{
 const initial=JSON.parse(origin),options=savedNativeAuthorityOptions(origin);
 const source=await nativeProductionAuthority(initial,{...options,getTerrainManifest:()=>formatManifest('retreat-origin',options)});
 let restored,draw,rig,replacementAttached=false;
 const ports=new MessageChannel();
 try{
  await source.command({kind:'setNavigationView',view:options.navigationView});
  const originalEvents=[];
  for(let i=0;i<620&&!retreatFor(source)?.committed;i++){
   const result=await advance(source,8,true);
   originalEvents.push(...result.events);
   for(const key of result.residency?.missing??[])await source.command({kind:'addChunk',key});
   await source.present();
  }
  const retreat=retreatFor(source);
  assert(retreat?.committed);
  await source.present();await retreat.packet.presented;
  const running=await advance(source,2),current=JSON.parse(running.snapshot);
  const animal=current.raid.animals[0],center=current.structures[0];
  const impacts=originalEvents.filter(event=>event.type==='AnimalLogicalHit');
  assert.equal(center.status,'intact');
  assert.deepEqual(originalEvents.filter(event=>event.type==='StructureHit').map(event=>event.structureHit.hp),[580,560]);
  assert.equal(impacts.length,2);
  assert.equal(animal.attackId,impacts.at(-1).attackId);
  assert.equal(animal.hitsRemaining,0);
  assert.equal(animal.status,'retreating');
  assert.equal(current.workers[0].status,'home');
  assert.equal(retreat.resources.reference.bodyId,2);
  const disk=prepareWorkerCheckpoint(await source.command({kind:'snapshot',nativeAuthorityCheckpoint:true}),
   {slotId:initial.slotId,policy:{nativeAuthority:true},savedAt:0});
  assert(disk.saved);
  const persisted=serialize(disk.state);
  const restoredOptions=savedNativeAuthorityOptions(persisted);
  assert.equal(restoredOptions.nativeWorkerLifecycle,true,'ordinary Retreat must keep the native lifecycle marker');
  assert.deepEqual(pose(disk.state.raid.animals[0]),pose(animal));
  assert(disk.state.raid.animals[0].path.length>0);
  const manifest=formatManifest('retreat-origin',options);
  const held=current,survivor=animal,at=held.elapsed;
  const hold=await source.authority.quiesceNativeIntentProduction({forLostDraw:true});
  source.retireResourceEndpoint();
  source.gpu.device.destroy();
  await untilProduction(source,()=>source.authority.nativeIntentControlStatus().current?.drained===true);
  const retired=await source.authority.flushNativeResourcePreparation({allowRetired:true,forLostDraw:true});
  assert(retired.terminal&&retired.callbacksSettled);
  const descriptor=await source.authority.terminalWorkerRoute();
  assert.deepEqual(descriptor,{kind:26,actorId:Number(animal.id.slice(7))});
  draw=await fixture({capabilities:{nativeAnimalCropVersion:1}},
   {intentControl:{port:ports.port2,session:'production-control',recoveryHold:30},absoluteNow:()=>Number.MAX_SAFE_INTEGER});
  const {recoveredWorkerRoute:q}=await source.authority.attachHeldWorkerRoute(ports.port1,'production-control',30,hold,descriptor);
  const {execution,resources}=q,binding=resources.nativeAnimalCropRouteBinding,ref=binding.reference,epoch=ref.worldBoundary.effectiveTime;
  assert.equal(ref.purpose,'retreat');
  assert.equal(execution.bodyId,2);
  assert.equal(execution.executedThrough,at);
  assert.deepEqual([execution.x,execution.z,execution.yaw,execution.phase],pose(survivor));
  rig=await originalRig(structuredClone(held),manifest);
  assert((await rig.recover({resources,execution,terrainManifest:q.terrainManifest})).some(count=>count>0));
  draw.client.registerClockBinding(draw.buffer,{byteOffset:0,epoch,semantic:'relative',nativeAnimalCrop:ref,
   resourceEnd:nativeClockResourceEnd(epoch,ref.endTime)});
  await assert.rejects(source.authority.checkHeldDraw(30,hold,descriptor),/Missing submitted/);
  const submitted=draw.frame(0,{nativeWorldBoundary:ref.worldBoundary,
   clock:{version:1,epoch:0,elapsed:at,safeUntil:at,anchorAbsoluteMs:0,paused:true,segments:[]}});
  submitted.catch(()=>{});
  await flush();await draw.host.idle();draw.host.present();await submitted;
  const witness=await source.authority.checkHeldDraw(30,hold,descriptor);
  assert.equal(witness.relativeTime,floorFloat32(at-epoch));
  const pick=captureNativeRoutePickFrame(draw.host.inspect());
  assert.equal(pick.getAnimalCropAge(ref),witness.relativeTime);
  rig.presented(pick.getAnimalCropAge(ref));
  await source.attachRecoveredResources(draw);
  replacementAttached=true;
  assert(source.authority.resumeNativeIntentProduction(hold));
  const finish=async(f,snapshot)=>{
   const events=[];
   for(let i=0;i<300&&snapshot.raid;i++){
    const p=await advance(f,2);
    snapshot=JSON.parse(p.snapshot);
    events.push(...p.events);
    await f.present();
   }
   assert.equal(snapshot.raid,null);
   assert.equal(snapshot.structures[0].hp,center.hp);
   assert.deepEqual(snapshot.ledger,current.ledger);
   assert.deepEqual(events.filter(event=>event.type==='AnimalLogicalHit'||event.type==='StructureHit'),[]);
   assert.equal(events.filter(event=>event.type==='RaidEnded').length,1);
   assert.deepEqual(f.faults,[]);
  };
  await finish(source,held);
  restored=await nativeProductionAuthority(disk.state,{...restoredOptions,getTerrainManifest:()=>manifest});
  await restored.command({kind:'setNavigationView',view:restoredOptions.navigationView});
  await untilProduction(restored,()=>retreatFor(restored)?.committed);
  const reacquired=retreatFor(restored);
  await restored.present();await reacquired.packet.presented;
  assert.equal(reacquired.resources.reference.bodyId,1,'a cold authority admits its own body');
  assert.notEqual(reacquired.resources.reference.worldBoundary.authorityEpoch,ref.worldBoundary.authorityEpoch);
  assert.deepEqual(pose(restored.snapshot().raid.animals[0]),pose(animal));
  await finish(restored,restored.snapshot());

 }finally{
  rig?.close();ports.port1.close();ports.port2.close();
  try{await restored?.close();}finally{
   try{await source.close();}finally{if(draw&&!replacementAttached){draw.client.dispose();await draw.host.dispose();}}
  }
 }
});
