import * as THREE from 'three';
import {applyWorkerPose} from './worker-actions.js';
import {applyActorExpression} from './actor-expression.js';
import {createActorTerrainSampler} from './webgpu-actor-terrain.js';

// Consumes confirmed state only. Actor motion, interactions and collision
// authority remain in Wild Engine; this is a Worker-owned visual rig.
export async function createWebGpuConfirmedWorker({scene,residency,state,actorId,assetBank,signal,presentationWorkerHeadings=null}={}){
 if(!scene?.isScene||!residency||!state||!assetBank||typeof actorId!=='string'||!actorId||presentationWorkerHeadings!==null&&!(presentationWorkerHeadings instanceof Map))throw TypeError('Invalid confirmed worker');
 const worker=state.workers.find(item=>item.id===actorId),profile=worker?.profile;if(!profile)throw Error('Confirmed worker unavailable');
 if(signal?.aborted)throw new DOMException('Worker presentation cancelled','AbortError');
 const shared=await assetBank.acquire(profile),model=shared.model,root=new THREE.Group(),sampleTerrain=createActorTerrainSampler(residency),mixer=new THREE.AnimationMixer(model),data={model,mixer,clips:shared.clips,action:null,name:null};let closed=false;
 if(signal?.aborted){shared.release();throw new DOMException('Worker presentation cancelled','AbortError');}
 model.traverse(o=>{if(o.isMesh){o.castShadow=o.receiveShadow=true;o.frustumCulled=false;}});root.add(model);scene.add(root);
 function update(){if(closed)return;const entity=state.workers.find(item=>item.id===actorId);if(!entity||entity.status==='home'){root.visible=false;return;}if(entity.profile!==profile)throw Error('Confirmed worker profile changed');root.visible=true;
  const height=sampleTerrain(entity.x,entity.z);
  root.position.set(entity.x,height+.025,entity.z);root.rotation.y=presentationWorkerHeadings?.get(actorId)??(entity.downHeading!==undefined&&(entity.fallRemaining>0||entity.recovery)?entity.downHeading:entity.path?.length?Math.atan2(entity.path[0].x-entity.x,entity.path[0].z-entity.z):entity.heading??0);
  const task=state.tasks.find(item=>item.id===entity.taskId);applyWorkerPose(data,entity,task,state.elapsed,shared.library);applyActorExpression(data,entity,'worker',state.elapsed);
 }
 try{update();}catch(error){scene.remove(root);mixer.stopAllAction();mixer.uncacheRoot(model);shared.release();throw error;}
 return {root,update,dispose(){if(closed)return;closed=true;scene.remove(root);mixer.stopAllAction();mixer.uncacheRoot(model);shared.release();}};
}
