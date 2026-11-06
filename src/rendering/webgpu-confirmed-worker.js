import * as THREE from 'three';
import {applyWorkerPose} from './worker-actions.js';
import {applyActorExpression} from './actor-expression.js';
import {createActorTerrainSampler,hasResidentActorTerrain} from './webgpu-actor-terrain.js';

// Consumes confirmed state only. Actor motion, interactions and collision
// authority remain in Wild Engine; this is a Worker-owned visual rig.
export async function createWebGpuConfirmedWorker({scene,residency,state,actorId,assetBank,signal,presentationWorkerHeadings=null,confirmedClock=null,getEntity=()=>state.workers.find(item=>item.id===actorId),getTask=id=>state.tasks.find(item=>item.id===id)}={}){
 if(!scene?.isScene||!residency||!state||!assetBank||typeof actorId!=='string'||!actorId||typeof getEntity!=='function'||typeof getTask!=='function'||presentationWorkerHeadings!==null&&!(presentationWorkerHeadings instanceof Map)||confirmedClock!==null&&(!confirmedClock.node?.isNode||!Number.isFinite(confirmedClock.elapsed)))throw TypeError('Invalid confirmed worker');
 const worker=getEntity(),profile=worker?.id===actorId?worker.profile:null;if(!profile)throw Error('Confirmed worker unavailable');
 if(signal?.aborted)throw new DOMException('Worker presentation cancelled','AbortError');
 const shared=await assetBank.acquire(profile),model=shared.model,root=new THREE.Group(),sampleTerrain=createActorTerrainSampler(residency),mixer=new THREE.AnimationMixer(model),data={model,mixer,clips:shared.clips,action:null,name:null};let closed=false;
 if(signal?.aborted){shared.release();throw new DOMException('Worker presentation cancelled','AbortError');}
 model.traverse(o=>{if(o.isMesh){o.castShadow=o.receiveShadow=true;o.frustumCulled=false;}});root.add(model);scene.add(root);
 function update(){if(closed)return;const entity=getEntity();if(!entity||entity.status==='home'){root.visible=false;return;}if(entity.id!==actorId||entity.profile!==profile)throw Error('Confirmed worker identity or profile changed');root.visible=true;
  const hasTerrain=hasResidentActorTerrain(residency,entity.x,entity.z);root.visible=hasTerrain;
  if(hasTerrain)root.position.set(entity.x,sampleTerrain(entity.x,entity.z)+.025,entity.z);else root.position.set(entity.x,root.position.y,entity.z);root.rotation.y=presentationWorkerHeadings?.get(actorId)??(entity.downHeading!==undefined&&(entity.fallRemaining>0||entity.recovery)?entity.downHeading:entity.path?.length?Math.atan2(entity.path[0].x-entity.x,entity.path[0].z-entity.z):entity.heading??0);
  const elapsed=confirmedClock?.elapsed??state.elapsed,task=getTask(entity.taskId);applyWorkerPose(data,entity,task,elapsed,shared.library);applyActorExpression(data,entity,'worker',elapsed);
 }
 try{update();}catch(error){scene.remove(root);mixer.stopAllAction();mixer.uncacheRoot(model);shared.release();throw error;}
 return {root,update,dispose(){if(closed)return;closed=true;scene.remove(root);mixer.stopAllAction();mixer.uncacheRoot(model);shared.release();}};
}
