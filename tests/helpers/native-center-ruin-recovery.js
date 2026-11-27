import assert from 'node:assert/strict';
import {fixture,flush,pair} from './remote-webgpu-fixture.js';
import {originalRig} from './native-animal-crop-rig.js';
import {floorFloat32} from '../../src/rendering/float32-time.js';
import {nativeClockResourceEnd} from '../../src/rendering/native-clock-resource-end.js';
import {sameNativeAnimalCropReference} from '../../src/world/native-animal-crop-resource.js';
import {copyNativeRecoveryGroup} from '../../src/world/native-worker-route-recovery.js';
import {createSimulationAuthorityClient} from '../../src/simulation/simulation-authority-client.js';

export async function recoverRouteAfterRuin(world,proof,at,state=null,{endpoint=false,retireFirst=true,beforeRuin=false}={}){
 const stop=()=>world.authority.quiesceNativeIntentProduction({forLostDraw:endpoint});
 const pending=retireFirst?null:stop();pending?.catch(()=>{});
 world.gpu.device.destroy();world.retireResourceEndpoint();
 const hold=await (pending??stop());
 const retired=await world.authority.flushNativeResourcePreparation({allowRetired:true});
 assert(retired.terminal&&retired.callbacksSettled);
 const source=beforeRuin?proof:proof.prepared.retreat??proof.prepared.approach??proof.prepared.strike;
 const route=await world.authority.terminalWorkerRoute(),ref=source.reference,kind=ref.kind;
 assert.deepEqual(route,beforeRuin?{kind,actorId:ref.actorId}:{version:2,ruin:true,members:[{kind,actorId:ref.actorId}]});
 const [authorityPort,drawPort]=pair();
 const draw=await fixture({capabilities:{nativeAnimalCropVersion:1,nativeFarmArrivalVersion:1,nativeIdleCycleVersion:1}},
  {intentControl:{port:drawPort,session:'production-control',recoveryHold:30},absoluteNow:()=>Number.MAX_SAFE_INTEGER});
 let rig;
 try{
  const {recoveredWorkerRoute:q}=await world.authority.attachHeldWorkerRoute(authorityPort,'production-control',30,hold,route);
  const boundary=beforeRuin?ref.worldBoundary:proof.acquired;
  assert.deepEqual(q.ruin,beforeRuin?undefined:proof);
  assert.deepEqual(q.worldBoundary,beforeRuin?undefined:boundary);
  const {execution,resources}=beforeRuin?q:q.members[0];
  assert.equal(execution.executedThrough,at);
  if(endpoint){
   assert.equal(execution.arrived,true);
   const accepted=await readClientAssignment(q);
   assert.deepEqual((beforeRuin?accepted:accepted.members[0]).execution,execution);
   if(!beforeRuin){
    const unrelated=structuredClone(q);delete unrelated.ruin;
    await assert.rejects(readClientAssignment(unrelated),/Invalid replacement committed assignment/);
   }
   const wrongPose=structuredClone(q);(beforeRuin?wrongPose:wrongPose.members[0]).execution.x+=.01;
   await assert.rejects(readClientAssignment(wrongPose),/Invalid replacement committed assignment/);
   const wrongHeading=structuredClone(q);(beforeRuin?wrongHeading:wrongHeading.members[0]).execution.yaw+=.01;
   await assert.rejects(readClientAssignment(wrongHeading),/Invalid replacement committed assignment/);
  }
  assert.deepEqual(execution.binding.reference,ref);
  if(kind===27)assert.equal(execution.binding.attackId,source.attackId);
  else assert.deepEqual(resources.presentation.worldBoundary,boundary);
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
   if(endpoint)await assert.rejects(rig.recover({resources,execution,terrainManifest:q.terrainManifest,recoveryCut:boundary}),
    /Invalid recovered crop source/);
   const requests=await rig.recover({resources,execution,terrainManifest:q.terrainManifest,recoveryCut:q.worldBoundary,ruin:q.ruin});
   assert(requests.some(count=>count>0));
  }
  if(!beforeRuin){
   const evidence={version:2,members:[{kind,proof:execution.binding}],ruin:proof};
   assert.deepEqual(copyNativeRecoveryGroup(evidence,boundary).ruin,proof);
   const foreign=structuredClone(evidence);
   foreign.ruin.revisions[1]++;
   assert.throws(()=>copyNativeRecoveryGroup(foreign,boundary),/differs from the acquired center ruin/);
   assert.throws(()=>copyNativeRecoveryGroup(evidence,ref.worldBoundary),/differs from the acquired center ruin/);
   if(kind===27){
    const wrongAttack=structuredClone(evidence);wrongAttack.members[0].proof.attackId++;
    assert.throws(()=>copyNativeRecoveryGroup(wrongAttack,boundary),/differs from the acquired center ruin/);
   }
  }
  const epoch=ref.worldBoundary.effectiveTime;
  draw.client.registerClockBinding(draw.buffer,{byteOffset:0,epoch,semantic:'relative',nativeAnimalCrop:ref,
   resourceEnd:kind===27?ref.endTime:nativeClockResourceEnd(epoch,ref.endTime)});
  await assert.rejects(world.authority.checkHeldDraw(30,hold,route),/Missing submitted/);
  const submit=draw.frame(0,{nativeWorldBoundary:boundary,
   clock:{version:1,epoch:0,elapsed:at,safeUntil:at,anchorAbsoluteMs:0,paused:true,segments:[]}}).catch(e=>e);
  await flush();await draw.host.idle();draw.host.present();
  const rendered=await submit;
  assert(!(rendered instanceof Error),rendered.message);
  const witness=await world.authority.checkHeldDraw(30,hold,route);
  const sampledAt=endpoint?nativeClockResourceEnd(epoch,ref.endTime):at;
  const submitted=beforeRuin?witness:witness.members[0];
  assert.equal(submitted.relativeTime,floorFloat32(sampledAt-epoch));
  rig?.presented(submitted.relativeTime);
  if(beforeRuin){
   const routeRecord=world.records.findLast(row=>row.committed&&row.kind==='animal-crop-route'&&
    sameNativeAnimalCropReference(row.resources.reference,source.preparedReference));
   assert(routeRecord);
   routeRecord.cropGroup=draw.group;
   routeRecord.cropBuffer=draw.buffer;
  }
  await world.attachRecoveredResources(draw);
  world.authority.resumeNativeIntentProduction(hold);
  return draw;
 }catch(error){draw.client.dispose();await draw.host.dispose();throw error;}
 finally{rig?.close();}
}

async function readClientAssignment(source){
 const worker={postMessage(){},terminate(){}},session='endpoint-client';
 const client=createSimulationAuthorityClient({snapshot:'{}',chunkKeys:[],session,workerFactory:()=>worker});
 const receive=data=>worker.onmessage({data:{session,...data}});
 try{
  receive({kind:'ready'});await client.ready;
  const snapshot=client.submit({kind:'snapshot'}).result;
  receive({kind:'result',sequence:1});await snapshot;
  const attached=client.attachNativeIntentControl({postMessage(){},close(){}},{recoveryHold:source.holdId});
  receive({kind:'nativeIntentControlAttached',authorityEpoch:(source.worldBoundary??source.resources.worldBoundary).authorityEpoch,sequence:1,
   recoveredWorkerRoute:{...source,publicationSequence:1}});
  return (await attached).recoveredWorkerRoute;
 }finally{client.dispose();}
}
