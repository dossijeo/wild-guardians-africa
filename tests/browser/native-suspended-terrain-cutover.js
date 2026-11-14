import {PerspectiveCamera,Vector3} from 'three';
import {serializeConfirmedState} from '../../src/simulation/confirmed-live-state.js';
import {captureNativeRoutePickFrame} from '../../src/rendering/native-route-pick-frame.js';

// Fault injection only. All preparation, adoption and drawing use product owners.
export async function auditNativeSuspendedTerrain({client,bridge,session,state,publication,publisher,preparer,started,ended,commit,before,prepared,reused,transportSession,errors,route,nativePreparation,camera}){
 const now=()=>performance.timeOrigin+performance.now(),workerBefore=JSON.stringify(state.workers[0]),at=nativePreparation.motionPlan.holds[0].from+.3;
 commit(false,1);state.elapsed=at;if(bridge.advanceNativeRouteExecution(at).status!=='advanced')throw Error('Native suspension frontier unavailable');commit(false,1);
 let ready,committedAt,block,reference,previewPose;
 const outcome=await bridge.mutateNativeWorldAfterGpuQuiescence({getPublication:()=>publication,mutation:{type:'removeChunks',chunks:[[0,1]],releaseOnly:false},prepareResources:async request=>{
  const rows=request.resources.routeEffects.rows;if(rows.length!==26||rows[5]!==4)throw Error('Expected one pinned native suspension');previewPose=Array.from(rows.slice(8));
  const handle=await publisher.prepareNativeWorldResources(request);ready=await client.inspect();
  for(const factory of ['createTexture','createSampler','createShaderModule','createPipelineLayout','createRenderPipeline','createRenderPipelineAsync'])if(ready.qaCumulativeFactories[factory]!==prepared.qaCumulativeFactories[factory])throw Error('Suspension recreated unchanged '+factory+' '+JSON.stringify({ready:ready.qaCumulativeFactories,prior:prepared.qaCumulativeFactories}));
  if(bridge.nativeSuspendedGateRoute(route.nativeRoute.actorId)!==null||!session.core.hasResidentChunk(0,1))throw Error('Preparation changed native state');
  preparer.postMessage({kind:'block-control-preparation',durationMs:1500});block=await started;
  return {preparedWorldBoundary:handle.preparedWorldBoundary,valid:handle.valid,abort:handle.abort,commit(value){committedAt=now();for(const payload of value.resources.chunks)publisher.stage(payload,value.worldBoundary.effectiveTime);for(const payload of value.resources.removed)publisher.stage({authority:'spatial-wasm',...payload,removed:true},value.worldBoundary.effectiveTime);return handle.commit(value);}};
 }});
 if(outcome.status!=='committed')throw Error('Suspended terrain commit failed '+JSON.stringify(outcome));
 const suspended=bridge.nativeSuspendedGateRoute(route.nativeRoute.actorId),nativePose=JSON.stringify(suspended.pose),gate=bridge.nativeGateMechanismPose('structure-990001');
 if(suspended.pose.x!==previewPose[0]||suspended.pose.z!==previewPose[1]||suspended.pose.currentSpeed!==0)throw Error('Native body differs from prepared pose');
 state.elapsed=route.endTime+1;if(bridge.advanceNativeRouteExecution(state.elapsed).status!=='advanced')throw Error('Pinned body did not retain an executed future frontier');commit(false,2);
 let pump;try{
  pump=setInterval(()=>{try{state.elapsed+=.02;if(bridge.advanceNativeRouteExecution(state.elapsed).status!=='advanced')throw Error('Suspended cohort clock failed');commit(false,2);if(JSON.stringify(bridge.nativeSuspendedGateRoute(route.nativeRoute.actorId).pose)!==nativePose||JSON.stringify(state.workers[0])!==workerBefore)throw Error('Suspension moved its body or JS worker');}catch(error){errors.push(String(error));}},20);
  await new Promise(resolve=>setTimeout(resolve,220));await window.nativeWorkerWorldCheckpoint?.('suspended-blocked');
 }finally{clearInterval(pump);}
 const endBlock=await ended,unpublished=await client.inspect(),consumer=unpublished.drawExecution.consumer,frames=consumer.samples.filter(frame=>frame.at>=committedAt&&frame.at<endBlock.end&&frame.nativeWorldBoundary?.ticket===outcome.worldBoundary.ticket);
 if(committedAt<block.start||committedAt>=endBlock.end||frames.length<3||Math.max(...frames.map(frame=>frame.clockElapsed))-Math.min(...frames.map(frame=>frame.clockElapsed))<.1)throw Error('Prepared suspended world did not draw inside the preparer stall '+JSON.stringify({frames,block,endBlock}));
 for(const key of ['uniformForks','bindingForks','bufferForks','textureForks'])if((ready.drawExecution.consumer[key]??0)!==(consumer[key]??0))throw Error('Suspension forked resources after readiness '+key);
 if(unpublished.drawExecution.resourcesCreated!==ready.drawExecution.resourcesCreated)throw Error('Suspension created resources after readiness');
 reference=consumer.nativeRouteFrame.bindings.find(binding=>binding.nativeSuspended)?.nativeSuspended;if(!reference||reference.bodyId!==suspended.bodyId||reference.resumeGeneration!==suspended.resumeHandle.generation)throw Error('Submitted body does not carry its direct suspension identity');
 const pick=captureNativeRoutePickFrame(consumer);if(pick.getSuspendedTime(reference,route.startTime)>state.elapsed+1e-6)throw Error('Suspended draw borrowed future time');
 if(!frames.some(frame=>frame.clockElapsed>route.endTime))throw Error('Held drawing still expired at its revoked route endpoint');
 if(consumer.nativeRouteFrame.bindings.some(binding=>binding.nativeRoute?.actorId===route.nativeRoute.actorId))throw Error('Suspension retained the revoked moving permission');
 // Adopt the confirmed logical snapshot only after observing autonomous replay.
 publisher.commit(2);client.presentationPort.postMessage({kind:'publication',session:transportSession,publication:{session:transportSession,sequence:2,elapsed:state.elapsed,physicsPose:null,snapshot:serializeConfirmedState(state),events:[],terrainChanged:true,nativeWorldResources:[{version:1,kind:outcome.resources.kind,worldBoundary:outcome.worldBoundary,chunks:outcome.resources.chunks.map(({cx,cz})=>({cx,cz})),removed:outcome.resources.removed}]}});
 const deadline=performance.now()+10000;let after;do{after=await client.inspect();if(after.state.sequence===2)break;await new Promise(resolve=>setTimeout(resolve,4));}while(performance.now()<deadline&&!errors.length);
 if(after.state.sequence!==2||after.workers.native!==1||after.inspectionGeneration!==before.inspectionGeneration||after.drawExecution.consumer.gpuErrors||after.drawExecution.consumer.failed||errors.length)throw Error('Confirmed suspension adoption failed '+JSON.stringify({errors,after}));
 if(after.qaNativeRig.poseHash!==before.qaNativeRig.poseHash)throw Error('Suspension changed the original CPU rig');
 const actualGate=after.qaNativeGates.find(value=>value.entityId==='structure-990001');if(!actualGate||Math.abs(actualGate.opening-gate.opening)>3e-6)throw Error('Fixed gate differs from native freeze '+JSON.stringify({actualGate,gate}));
 for(const key of ['mesh','geometry','positionVersion','normalVersion','positionHash'])if(actualGate[key]!==before.qaNativeGates[0][key])throw Error('Suspension replaced gate geometry '+key);
 const oldRelease=await client.releaseNativeRoute(state.workers[0].id,route.nativeRoute);if(oldRelease!==false)throw Error('Late old release detached suspended body');
 const cameraPick=new PerspectiveCamera(45,640/360,.1,500);cameraPick.position.set(camera.x,camera.y,camera.z);cameraPick.lookAt(camera.targetX,camera.targetY,camera.targetZ);cameraPick.updateMatrixWorld(true);let inputPick=null;
 for(const height of [.7,1,.4,1.3]){const point=new Vector3(suspended.pose.x,session.core.surface(suspended.pose.x,suspended.pose.z)+height,suspended.pose.z).project(cameraPick);const result=await client.pick({x:point.x,y:point.y});if(result.entityId===state.workers[0].id){inputPick=result;break;}}
 if(!inputPick)throw Error('Normal input did not hit the submitted suspended original worker');
 await publication.fenceGpu();await window.nativeWorkerWorldCheckpoint?.('suspended-confirmed');
 return {scope:'Prepared future terrain eviction with a pinned native body and fixed original gate, using the product WorldClient/WorldWorker/WorldSurface/roster/coordinator/draw owner. Not ordinary gameplay feed or integrated migration acceptance.',adapter:consumer.adapterInfo,prepared,reused,inputPick,revokedRouteEnd:route.endTime,reference,previewPose,suspended,gate,oldRelease,before:{generation:before.inspectionGeneration,resourcesCreated:before.drawExecution.resourcesCreated,workers:before.workers,rig:before.qaNativeRig,gates:before.qaNativeGates},ready:{resourcesCreated:ready.drawExecution.resourcesCreated,factories:ready.qaCumulativeFactories},after:{generation:after.inspectionGeneration,workers:after.workers,rig:after.qaNativeRig,gates:after.qaNativeGates},final:{gpuErrors:after.drawExecution.consumer.gpuErrors},block:{start:block.start,end:endBlock.end,committedAt,drawFrames:frames.length,minClock:Math.min(...frames.map(frame=>frame.clockElapsed)),maxClock:Math.max(...frames.map(frame=>frame.clockElapsed)),resourcesAfterReady:unpublished.drawExecution.resourcesCreated-ready.drawExecution.resourcesCreated},worldBoundary:outcome.worldBoundary,receipt:outcome.receipt,frames,errors};
}
