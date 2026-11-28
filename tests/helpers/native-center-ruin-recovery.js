import assert from 'node:assert/strict';
import {fixture,flush,pair} from './remote-webgpu-fixture.js';
import {originalRig} from './native-animal-crop-rig.js';
import {floorFloat32} from '../../src/rendering/float32-time.js';
import {nativeClockResourceEnd} from '../../src/rendering/native-clock-resource-end.js';
import {sameNativeAnimalCropReference} from '../../src/world/native-animal-crop-resource.js';
import {copyNativeRecoveryGroup,matchesRecoveredRuinMotorSamples} from '../../src/world/native-worker-route-recovery.js';
import {createSimulationAuthorityClient} from '../../src/simulation/simulation-authority-client.js';

export async function recoverRouteAfterRuin(world,proof,at,state=null,{endpoint=false,retireFirst=true,beforeRuin=false,interrupted=null,beforeRetiring=null,movingMotors=false}={}){
 const stop=()=>world.authority.quiesceNativeIntentProduction({forLostDraw:endpoint||!!interrupted});
 const pending=retireFirst?null:stop();pending?.catch(()=>{});
 if(beforeRetiring)await beforeRetiring();
 world.gpu.device.destroy();world.retireResourceEndpoint();
 const hold=await (pending??stop());
 const retired=await world.authority.flushNativeResourcePreparation({allowRetired:true,...(interrupted?{forLostDraw:true,lossHoldId:30}:{})});
 assert(retired.terminal&&retired.callbacksSettled);
 if(interrupted){
  const prefix=await interrupted;
  assert.equal(prefix.pendingRuinRecoveryCut.holdId,30);
  state=JSON.parse(prefix.snapshot);
  assert(Math.abs(state.elapsed-at)<1e-9);
  at=state.elapsed;
  assert.throws(()=>world.authority.resumeNativeIntentProduction(hold),/still owns native production/);
 }
 const prepared=beforeRuin?proof:proof.prepared;
 const home=prepared.home,typedBeforeRuin=movingMotors||!!home;
 const source=beforeRuin&&!typedBeforeRuin?proof:prepared.retreat??prepared.approach??prepared.strike;
 const route=await world.authority.terminalWorkerRoute(),ref=source.reference,kind=ref.kind;
 const grouped=!beforeRuin||typedBeforeRuin;
 const members=[...(home?[{kind:18,actorId:home.reference.actorId}]:[]),{kind,actorId:ref.actorId}];
 assert.deepEqual(route,grouped?{version:2,[beforeRuin?'pendingRuin':'ruin']:true,members}:{kind,actorId:ref.actorId});
 const [authorityPort,drawPort]=pair();
 const draw=await fixture({capabilities:{nativeAnimalCropVersion:1,nativeFarmArrivalVersion:1,nativeIdleCycleVersion:1,nativeHomeRouteVersion:1,nativeHomeArrivalVersion:1}},
  {intentControl:{port:drawPort,session:'production-control',recoveryHold:30},absoluteNow:()=>Number.MAX_SAFE_INTEGER});
 let rig;
 try{
  const {recoveredWorkerRoute:q}=await world.authority.attachHeldWorkerRoute(authorityPort,'production-control',30,hold,route);
  const boundary=beforeRuin?(typedBeforeRuin?prepared.previous:ref.worldBoundary):proof.acquired;
  assert.deepEqual(q.ruin,beforeRuin?undefined:proof);
  assert.deepEqual(q.pendingRuin,beforeRuin&&typedBeforeRuin?prepared:undefined);
  assert.deepEqual(q.worldBoundary,grouped?boundary:undefined);
  const {execution,resources}=grouped?q.members.at(-1):q;
  assert.equal(execution.executedThrough,at);
  if(movingMotors){
   const accepted=await readClientAssignment(q);
   assert.deepEqual(accepted.pendingRuin,prepared);
   assert.deepEqual(accepted.ruinMotors,q.ruinMotors);
   const {ruinMotors,...withoutMotors}=q;
   await assert.rejects(readClientAssignment(withoutMotors),/needs its retained motor programs/);
   const wrongTime=structuredClone(q);
   wrongTime.members[0].execution.executedThrough-=.01;
   await assert.rejects(readClientAssignment(wrongTime),/different times/);
  }
  if(home){
   const accepted=await readClientAssignment(q);
   const worker=state.workers.find(row=>row.id==='worker-'+home.reference.actorId);
   assert.deepEqual(accepted.members[0].execution.binding,home);
   assert.deepEqual(accepted.members[1].execution,execution);
   assert.deepEqual([accepted.members[0].execution.x,accepted.members[0].execution.z],[worker.x,worker.z]);
   const foreign=structuredClone(q);
   const foreignSource=beforeRuin?foreign.pendingRuin:foreign.ruin.prepared;
   foreignSource.home.assignmentSequence++;
   await assert.rejects(readClientAssignment(foreign),/Recovered Home route differs|Invalid replacement committed assignment/);
  }
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
   const requests=await rig.recover({resources,execution,terrainManifest:q.terrainManifest,recoveryCut:q.worldBoundary,ruin:q.ruin,pendingRuin:q.pendingRuin,flightHome:home});
   assert(requests.some(count=>count>0));
  }
  if(!beforeRuin){
   const evidence={version:2,members:[...(home?[{kind:18,proof:home}]:[]),{kind,proof:execution.binding}],ruin:proof,ruinMotors:q.ruinMotors};
   assert.deepEqual(copyNativeRecoveryGroup(evidence,boundary).ruin,proof);
   const foreign=structuredClone(evidence);
   foreign.ruin.revisions[1]++;
   assert.throws(()=>copyNativeRecoveryGroup(foreign,boundary),/differs from the acquired center ruin/);
   assert.throws(()=>copyNativeRecoveryGroup(evidence,ref.worldBoundary),/differs from the acquired center ruin/);
   if(q.ruinMotors){
    const {ruinMotors,...absent}=evidence;
    assert.throws(()=>copyNativeRecoveryGroup(absent,boundary),/needs its retained motor programs/);
    const mismatched=structuredClone(evidence);
    mismatched.ruinMotors.gates.pop();
    assert.throws(()=>copyNativeRecoveryGroup(mismatched,boundary),/motors differ from the acquired center ruin/);
    const accepted=await readClientAssignment(q);
    assert.deepEqual(accepted.ruinMotors,ruinMotors);
   }
   if(kind===27){
    const wrongAttack=structuredClone(evidence);wrongAttack.members[0].proof.attackId++;
    assert.throws(()=>copyNativeRecoveryGroup(wrongAttack,boundary),/differs from the acquired center ruin/);
   }
  }
  const epoch=ref.worldBoundary.effectiveTime;
  draw.client.registerClockBinding(draw.buffer,{byteOffset:0,epoch,semantic:'relative',nativeAnimalCrop:ref,
   resourceEnd:kind===27?ref.endTime:nativeClockResourceEnd(epoch,ref.endTime)});
  await assert.rejects(world.authority.checkHeldDraw(30,hold,route),/Missing submitted/);
  const metadata={nativeWorldBoundary:boundary,
   clock:{version:1,epoch:0,elapsed:at,safeUntil:at,anchorAbsoluteMs:0,paused:true,segments:[]}};
  let motors=q.ruinMotors;
  if(home){
   const ref=home.reference,{device}=draw.client;
   const buffer=device.createBuffer({size:16,usage:72});device.queue.writeBuffer(buffer,0,new Float32Array(4));
   draw.client.registerClockBinding(buffer,{byteOffset:0,semantic:'relative',epoch:ref.worldBoundary.effectiveTime,
    resourceEnd:nativeClockResourceEnd(ref.worldBoundary.effectiveTime,ref.endTime),nativeHome:ref});
   draw.client.registerClockBinding(buffer,{byteOffset:4,semantic:'origin-modulo',epoch:ref.worldBoundary.effectiveTime,period:1.25,nativeHome:ref});
   draw.homeGroup=device.createBindGroup({entries:[{binding:0,resource:{buffer}}]});
   motors={worldBoundary:ref.worldBoundary,gates:q.members[0].resources.presentation.gates};
  }
  const civilGroups=home?[draw.homeGroup]:[];
  if(motors?.gates.length){
   const noGates=submitRuinMotors(draw,{...motors,gates:[]},metadata,civilGroups);
   const absent=await settleReplacementFrame(draw,noGates);
   assert.match(absent.message,/bound worker clock/);
   await assert.rejects(world.authority.checkHeldDraw(30,hold,route),/Missing submitted/);
  }
  const rendered=await settleReplacementFrame(draw,motors?submitRuinMotors(draw,motors,metadata,civilGroups):draw.frame(0,metadata));
  assert(!(rendered instanceof Error),rendered.message);
  const witness=await world.authority.checkHeldDraw(30,hold,route);
  assert(matchesRecoveredRuinMotorSamples(witness.ruinMotorSamples,q.ruinMotors,at));
  const sampledAt=endpoint?nativeClockResourceEnd(epoch,ref.endTime):at;
  const submitted=grouped?witness.members.at(-1):witness;
  assert.equal(submitted.relativeTime,floorFloat32(sampledAt-epoch));
  if(home){
   const civil=witness.members[0],start=home.reference.worldBoundary.effectiveTime;
   assert.equal(civil.relativeTime,floorFloat32(at-start));
   assert.deepEqual(civil.nativeGate,{gateId:home.gateIds[0],worldBoundary:home.reference.worldBoundary});
   assert.equal(civil.gateElapsed,start+civil.relativeTime);
   const homeRecord=world.records.findLast(row=>row.kind==='home-route'&&row.committed);
   homeRecord.gateGroups=draw.motorGroups;
   homeRecord.homeGroup=draw.homeGroup;
  }
  rig?.presented(submitted.relativeTime);
  if(beforeRuin||home){
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

async function settleReplacementFrame(draw,pending){
 let settled=false,result;
 const finish=value=>{settled=true;result=value;};
 pending.then(finish,finish);
 for(let i=0;i<1000&&!settled;i++){
  await flush();await draw.host.idle();draw.host.present();await new Promise(resolve=>setImmediate(resolve));
 }
 const {activeSequence,pendingSequence,errors}=draw.host.inspect();
 assert(settled,JSON.stringify({activeSequence,pendingSequence,errors}));return result;
}

function submitRuinMotors(draw,motors,metadata,groups=[]){
 const {device,context}=draw.client;
 draw.client.beginFrame(metadata);
 const encoder=device.createCommandEncoder(),pass=encoder.beginRenderPass({colorAttachments:[{view:context.getCurrentTexture().createView(),loadOp:'clear',storeOp:'store'}]});
 pass.setPipeline(draw.pipeline);pass.setBindGroup(0,draw.group);pass.draw(3);
 for(const group of groups){pass.setBindGroup(0,group);pass.draw(3);}
 draw.motorGroups=[];
 for(const gate of motors.gates){
  const buffer=device.createBuffer({size:16,usage:72});
  device.queue.writeBuffer(buffer,0,new Float32Array(4));
  draw.client.registerClockBinding(buffer,{byteOffset:0,semantic:'relative',epoch:gate.startTime,
   resourceEnd:nativeClockResourceEnd(gate.startTime,gate.endTime),nativeGate:{gateId:gate.gateId,worldBoundary:motors.worldBoundary}});
  const group=device.createBindGroup({entries:[{binding:0,resource:{buffer}}]});
  draw.motorGroups.push(group);
  pass.setBindGroup(0,group);pass.draw(3);
 }
 pass.end();device.queue.submit([encoder.finish()]);return draw.client.endFrame();
}

export async function readClientAssignment(source){
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
