import assert from 'node:assert/strict';
import {fixture,flush,pair} from './remote-webgpu-fixture.js';
import {originalRig} from './native-animal-crop-rig.js';
import {floorFloat32} from '../../src/rendering/float32-time.js';
import {nativeClockResourceEnd} from '../../src/rendering/native-clock-resource-end.js';
import {copyNativeRecoveryGroup} from '../../src/world/native-worker-route-recovery.js';

export async function recoverRouteAfterRuin(world,proof,at,state=null){
 world.gpu.device.destroy();world.retireResourceEndpoint();
 const hold=await world.authority.quiesceNativeIntentProduction();
 const retired=await world.authority.flushNativeResourcePreparation({allowRetired:true});
 assert(retired.terminal&&retired.callbacksSettled);
 const source=proof.prepared.retreat??proof.prepared.approach??proof.prepared.strike;
 const route=await world.authority.terminalWorkerRoute(),ref=source.reference,kind=ref.kind;
 assert.deepEqual(route,{version:2,ruin:true,members:[{kind,actorId:ref.actorId}]});
 const [authorityPort,drawPort]=pair();
 const draw=await fixture({capabilities:{nativeAnimalCropVersion:1,nativeFarmArrivalVersion:1,nativeIdleCycleVersion:1}},
  {intentControl:{port:drawPort,session:'production-control',recoveryHold:30},absoluteNow:()=>Number.MAX_SAFE_INTEGER});
 let rig;
 try{
  const {recoveredWorkerRoute:q}=await world.authority.attachHeldWorkerRoute(authorityPort,'production-control',30,hold,route);
  assert.deepEqual(q.ruin,proof);
  assert.deepEqual(q.worldBoundary,proof.acquired);
  const [{execution,resources}]=q.members;
  assert.equal(execution.executedThrough,at);
  assert.deepEqual(execution.binding.reference,ref);
  if(kind===27)assert.equal(execution.binding.attackId,source.attackId);
  else assert.deepEqual(resources.presentation.worldBoundary,q.worldBoundary);
  if(state){
   const animal=state.raid.animals[0];
   assert.deepEqual([execution.x,execution.z,execution.phase,execution.yaw],
    [animal.x,animal.z,animal.motionPhase,animal.heading]);
   assert.equal(animal.targetId,ref.purpose==='center'?'structure-'+ref.targetId:null);
   if(ref.purpose==='center'){
    const target=state.structures.find(row=>row.id===animal.targetId);
    assert.equal(target?.status,'intact');
    assert.deepEqual([target.x,target.z],[ref.targetX,ref.targetZ]);
   }
   rig=await originalRig(structuredClone(state),q.terrainManifest);
   const requests=await rig.recover({resources,execution,terrainManifest:q.terrainManifest,recoveryCut:q.worldBoundary});
   assert(requests.some(count=>count>0));
  }
  const evidence={version:2,members:[{kind,proof:execution.binding}],ruin:proof};
  assert.deepEqual(copyNativeRecoveryGroup(evidence,q.worldBoundary).ruin,proof);
  const foreign=structuredClone(evidence);
  foreign.ruin.revisions[1]++;
  assert.throws(()=>copyNativeRecoveryGroup(foreign,q.worldBoundary),/differs from the acquired center ruin/);
  assert.throws(()=>copyNativeRecoveryGroup(evidence,ref.worldBoundary),/differs from the acquired center ruin/);
  if(kind===27){
   const wrongAttack=structuredClone(evidence);wrongAttack.members[0].proof.attackId++;
   assert.throws(()=>copyNativeRecoveryGroup(wrongAttack,q.worldBoundary),/differs from the acquired center ruin/);
  }
  const epoch=ref.worldBoundary.effectiveTime;
  draw.client.registerClockBinding(draw.buffer,{byteOffset:0,epoch,semantic:'relative',nativeAnimalCrop:ref,
   resourceEnd:kind===27?ref.endTime:nativeClockResourceEnd(epoch,ref.endTime)});
  await assert.rejects(world.authority.checkHeldDraw(30,hold,route),/Missing submitted/);
  const submit=draw.frame(0,{nativeWorldBoundary:q.worldBoundary,
   clock:{version:1,epoch:0,elapsed:at,safeUntil:at,anchorAbsoluteMs:0,paused:true,segments:[]}}).catch(e=>e);
  await flush();await draw.host.idle();draw.host.present();
  const rendered=await submit;
  assert(!(rendered instanceof Error),rendered.message);
  const witness=await world.authority.checkHeldDraw(30,hold,route);
  assert.equal(witness.members[0].relativeTime,floorFloat32(at-epoch));
  rig?.presented(witness.members[0].relativeTime);
  await world.attachRecoveredResources(draw);
  world.authority.resumeNativeIntentProduction(hold);
  return draw;
 }catch(error){draw.client.dispose();await draw.host.dispose();throw error;}
 finally{rig?.close();}
}
