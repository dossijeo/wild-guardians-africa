import * as THREE from 'three';
import {applyWorkerPose,workerPose} from './worker-actions.js';
import {createBakedWalkPresentation} from './webgpu-baked-walk.js';
import {applyActorExpression} from './actor-expression.js';
import {createActorTerrainSampler,hasResidentActorTerrain} from './webgpu-actor-terrain.js';

// Consumes confirmed state only. Actor motion, interactions and collision
// authority remain in Wild Engine; this is a Worker-owned visual rig.
export async function createWebGpuConfirmedWorker({scene,residency,state,actorId,assetBank,signal,renderer=null,presentationWorkerHeadings=null,confirmedClock=null,phaseSource=null,resourceRegistry=null,getEntity=()=>state.workers.find(item=>item.id===actorId),getTask=id=>state.tasks.find(item=>item.id===id)}={}){
 if(!scene?.isScene||!residency||!state||!assetBank||typeof actorId!=='string'||!actorId||typeof getEntity!=='function'||typeof getTask!=='function'||presentationWorkerHeadings!==null&&!(presentationWorkerHeadings instanceof Map)||confirmedClock!==null&&(!confirmedClock.node?.isNode||!Number.isFinite(confirmedClock.elapsed)))throw TypeError('Invalid confirmed worker');
 const worker=getEntity(),profile=worker?.id===actorId?worker.profile:null;if(!profile)throw Error('Confirmed worker unavailable');
 if(signal?.aborted)throw new DOMException('Worker presentation cancelled','AbortError');
 const shared=await assetBank.acquire(profile),model=shared.model,root=new THREE.Group(),sampleTerrain=createActorTerrainSampler(residency),mixer=new THREE.AnimationMixer(model),data={model,mixer,clips:shared.clips,action:null,name:null};let closed=false,baked=null,pendingBaked=null,bakedMotion=null,pendingBakedMotion=null;
 if(signal?.aborted){shared.release();throw new DOMException('Worker presentation cancelled','AbortError');}
 const rest=[],meshRest=[];model.traverse(o=>{if(o===model||o.isBone)rest.push({node:o,position:o.position.clone(),quaternion:o.quaternion.clone(),scale:o.scale.clone()});if(o.isMesh){o.castShadow=o.receiveShadow=true;o.frustumCulled=false;}if(o.isSkinnedMesh)meshRest.push({node:o,visible:o.visible});});root.add(model);scene.add(root);
 function update(){if(closed)return;const entity=getEntity();if(!entity||entity.status==='home'){root.visible=false;return;}if(entity.id!==actorId||entity.profile!==profile)throw Error('Confirmed worker identity or profile changed');root.visible=true;
  const hasTerrain=hasResidentActorTerrain(residency,entity.x,entity.z);root.visible=hasTerrain;
  if(hasTerrain)root.position.set(entity.x,sampleTerrain(entity.x,entity.z)+.025,entity.z);else root.position.set(entity.x,root.position.y,entity.z);root.rotation.y=presentationWorkerHeadings?.get(actorId)??(entity.downHeading!==undefined&&(entity.fallRemaining>0||entity.recovery)?entity.downHeading:entity.path?.length?Math.atan2(entity.path[0].x-entity.x,entity.path[0].z-entity.z):entity.heading??0);
  const elapsed=confirmedClock?.elapsed??state.elapsed,task=getTask(entity.taskId),pose=workerPose(entity,task,elapsed,shared.library);
  const eligible=baked&&pose.name==='Walk_Skip'&&(['walking','arriving','returning'].includes(entity.status)||['idle','waiting'].includes(entity.status)&&entity.idleState?.mode==='walk')&&!entity.running&&!entity.recovery&&!entity.fallRemaining&&!entity.recoveryExitRemaining&&!entity.incapacitated&&!entity.gateWaiting;
  if(eligible){
   if(!baked.isEnabled())applyWorkerPose(data,entity,task,elapsed,shared.library);
   baked.set(pose.time);
  }else{if(baked?.isEnabled()){baked.disable();data.name=null;}applyWorkerPose(data,entity,task,elapsed,shared.library);}
  applyActorExpression(data,entity,'worker',elapsed);
 }
 try{update();}catch(error){scene.remove(root);mixer.stopAllAction();mixer.uncacheRoot(model);shared.release();throw error;}
 async function installBakedWalk(bake,{pipelineAdmission,signal:admissionSignal,motionBinding=null,isCurrent=()=>true}={}){
  if(closed||baked||pendingBaked)return false;
  if(typeof isCurrent!=='function'||motionBinding!==null&&(typeof motionBinding.originalMaterial!=='function'||typeof motionBinding.extend!=='function'||typeof pipelineAdmission?.prepareAndPublish!=='function'))throw TypeError('Invalid baked motion admission');
  if(bake?.meta?.species!==profile||typeof pipelineAdmission?.prepare!=='function')throw TypeError('Invalid baked worker admission');
  if(admissionSignal?.aborted)throw new DOMException('Baked walking cancelled','AbortError');
  const live=rest.map(item=>({node:item.node,position:item.node.position.clone(),quaternion:item.node.quaternion.clone(),scale:item.node.scale.clone()})),visibility=meshRest.map(item=>({node:item.node,visible:item.node.visible}));let candidate;
  try{for(const item of rest){item.node.position.copy(item.position);item.node.quaternion.copy(item.quaternion);item.node.scale.copy(item.scale);}for(const item of meshRest)item.node.visible=item.visible;root.updateWorldMatrix(true,true);candidate=createBakedWalkPresentation({model,root,renderer,bake,confirmedClock,phaseSource,resourceRegistry,...(motionBinding?{sourceMaterial:mesh=>motionBinding.originalMaterial(mesh)}:{})});}
  finally{for(const item of live){item.node.position.copy(item.position);item.node.quaternion.copy(item.quaternion);item.node.scale.copy(item.scale);}for(const item of visibility)item.node.visible=item.visible;root.updateWorldMatrix(true,true);}
  pendingBaked=candidate;
  try{
   if(motionBinding)pendingBakedMotion=motionBinding.extend(candidate.motionMeshes(),candidate.motionReplicaSources());
   const publish=()=>{if(closed||admissionSignal?.aborted||!isCurrent())throw new DOMException('Baked walking cancelled','AbortError');pendingBakedMotion?.activate();baked=candidate;try{update();}catch(error){baked=null;candidate.disable();pendingBakedMotion?.dispose();throw error;}bakedMotion=pendingBakedMotion;pendingBakedMotion=null;pendingBaked=null;};
   const options={signal:admissionSignal,include:candidate.admissionObjects(),...(pendingBakedMotion?{materialAlternatives:pendingBakedMotion.materialAlternatives()}:{})};
   if(pendingBakedMotion)await pipelineAdmission.prepareAndPublish(root,options,publish);
   else if(typeof pipelineAdmission.prepareTicket==='function')for(;;){const ticket=await pipelineAdmission.prepareTicket(root,options);if(closed||admissionSignal?.aborted||!isCurrent())throw new DOMException('Baked walking cancelled','AbortError');baked=candidate;try{update();if(ticket.valid()){pendingBaked=null;break;}}catch(error){baked=null;candidate.disable();throw error;}baked=null;candidate.disable();data.name=null;update();}
   else if(typeof pipelineAdmission.prepareAndPublish==='function')await pipelineAdmission.prepareAndPublish(root,options,publish);
   else{await pipelineAdmission.prepare(root,options);publish();}
   return true;
  }finally{if(pendingBaked===candidate){pendingBaked=null;const binding=pendingBakedMotion;pendingBakedMotion=null;const release=()=>{binding?.dispose();candidate.dispose();};if(typeof pipelineAdmission.deferRelease==='function')pipelineAdmission.deferRelease(root,release);else release();}}
 }
 return {root,update,installBakedWalk,preparePick(){return baked?.isEnabled()?baked.preparePick():()=>{};},admissionObjects:()=>baked?.admissionObjects()??[],isBakedWalking:()=>baked?.isEnabled()??false,dispose(){if(closed)return;closed=true;pendingBakedMotion?.dispose();pendingBakedMotion=null;pendingBaked?.dispose();pendingBaked=null;bakedMotion?.dispose();bakedMotion=null;baked?.dispose();scene.remove(root);mixer.stopAllAction();mixer.uncacheRoot(model);shared.release();}};
}
