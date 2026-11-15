import {Vector3} from 'three';
import {Fn,clamp,float,int,uniform} from 'three/tsl';
import {copyNativeTaskActionReference,nativeTaskActionSuccessor} from '../world/native-task-action-presentation.js';
import {nativeEntityNumericId} from '../world/native-entity-id.js';
import {floorFloat32} from './float32-time.js';
import {markRemoteClockNode} from './remote-clock-bindings.js';
import {bindGpuMotionMaterial,unbindGpuMotionMaterial,gpuActorLocalTransform} from './gpu-actor-motion-material.js';

// The existing actor's stationary transform and finite clip selector. Geometry,
// baked matrices and physical time remain with their existing owners. Sampling
// below is read-only input support; normal drawing evaluates the TSL graph.
export function createNativeTaskActionGpuMotion({actorId,support,anchorPosition=null,anchorYaw=0,heightOffset=0}={}){
 let reference=copyNativeTaskActionReference(support?.reference);
 const q=reference.request;
 if(support?.kind!=='native-task-action-terrain-support'||support.valid?.()!==true||nativeEntityNumericId(actorId)!==q.nativeRoute.actorId||![anchorYaw,heightOffset,support.point?.height].every(n=>Number.isFinite(n)&&Number.isFinite(Math.fround(n)))||support.point.x!==reference.origin.x||support.point.z!==reference.origin.z||support.point.at!==reference.startTime||anchorPosition!==null&&![anchorPosition?.x,anchorPosition?.y,anchorPosition?.z].every(n=>Number.isFinite(n)&&Number.isFinite(Math.fround(n)))||reference.motionFlags&56)throw TypeError('Invalid native action GPU support');
 const f=Math.fround,duration=floorFloat32(q.duration),kind=q.actionKind,clipNames=Object.freeze(kind==='initial'?['Plant','Water']:kind==='water'?['Water']:kind==='repair'?['Idle']:['Harvest']);
 if(q.duration>0&&duration===0)throw RangeError('Native action duration cannot be projected');
 const bindingAnchor=Object.freeze(anchorPosition?{x:anchorPosition.x,y:anchorPosition.y,z:anchorPosition.z}:{x:reference.origin.x,y:support.point.height+heightOffset,z:reference.origin.z});
 if(![bindingAnchor.x,bindingAnchor.y,bindingAnchor.z,support.point.height+heightOffset,q.heading-anchorYaw].every(n=>Number.isFinite(n)&&Number.isFinite(f(n))))throw TypeError('Native action transform cannot be projected');
 const clockNode=markRemoteClockNode(uniform(0),'relative',reference.startTime,null,null,null,null,null,null,null,reference),timeNode=clamp(clockNode,float(0),float(duration)),fraction=duration?timeNode.div(float(duration)):float(0),progress=fraction.mul(float(7.2)),clipNode=kind==='initial'?progress.lessThan(float(3.8)).select(int(0),int(1)):int(0),bindings=new Map(),anchor=uniform(new Vector3(bindingAnchor.x,bindingAnchor.y,bindingAnchor.z)),position=uniform(new Vector3(reference.origin.x,support.point.height+heightOffset,reference.origin.z)),yaw=uniform(q.heading-anchorYaw),phases=new Map();
 let disposed=false,sealed=false;
 const valid=()=>!disposed&&support.valid()===true;
 const transform=base=>Fn(()=>gpuActorLocalTransform(base,position,yaw,anchor,int(1).greaterThan(0)))();
 function check(){if(disposed)throw Error('Native action GPU motion disposed');}
 function sampleAge(age){check();if(!Number.isFinite(age)||age<0||age>q.duration||Math.fround(age)!==age)throw TypeError('Native action input requires a submitted relative float');return Math.min(age,duration);}
 function clipAt(age){return kind==='initial'&&f(f(sampleAge(age)/duration)*f(7.2))>=f(3.8)?'Water':clipNames[0];}
 function clipDuration(clip,value){if(!clipNames.includes(clip)||!Number.isFinite(value)||value<=0||!Number.isFinite(f(value)))throw TypeError('Invalid native action clip');}
 function resolve(_fallback,clip,value){
  check();clipDuration(clip,value);const key=`${clip}:${value}`;let node=phases.get(key);if(node)return node;
  // Keep the native binding in the compiled graph even for an instantaneous
  // repair. Its clamped zero phase carries the same per-actor revocation and
  // submitted-input provenance as every other action; it adds no time span.
  node=kind==='repair'?timeNode:kind==='initial'?(clip==='Plant'?progress.min(float(3.8)):progress.sub(float(3.8)).max(float(0))):fraction.mul(float(value));
  phases.set(key,node);return node;
 }
 function sampleForClip(age,clip,value){
  clipDuration(clip,value);const t=sampleAge(age),u=duration?f(t/duration):0;
  if(kind==='repair')return 0;
  if(kind==='initial'){const p=f(u*f(7.2));return clip==='Plant'?Math.min(p,f(3.8)):Math.max(0,f(p-f(3.8)));}
  return f(u*f(value));
 }
 return {actorId,clockNode,timeNode,clipNode,clipNames,bindingAnchor,resolve,sampleForClip,sampleClip(age){sampleAge(age);return clipAt(age);},
  bind(material){check();return bindGpuMotionMaterial(bindings,material,transform);},unbind:material=>unbindGpuMotionMaterial(bindings,material),
  // Stationary pick transform takes the submitted age, never a second timer.
  sample(age){sampleAge(age);return {x:f(reference.origin.x),y:f(support.point.height+heightOffset),z:f(reference.origin.z),yaw:f(q.heading),dx:f(reference.origin.x)-bindingAnchor.x,dy:f(support.point.height+heightOffset)-bindingAnchor.y,dz:f(reference.origin.z)-bindingAnchor.z,yawDelta:f(q.heading-anchorYaw),currentSpeed:0,running:0};},
  retargetNativeTaskAction(nextSupport,{retagClock}={}){check();if(sealed||typeof retagClock!=='function')throw Error('Native action GPU motion already published');const next=copyNativeTaskActionReference(nextSupport?.reference);if(nextSupport?.kind!=='native-task-action-terrain-support'||nextSupport.valid?.()!==true||!nativeTaskActionSuccessor(reference,next)||nextSupport.point.height!==support.point.height||nextSupport.point.x!==next.origin.x||nextSupport.point.z!==next.origin.z||nextSupport.point.at!==next.startTime)return false;if(retagClock(clockNode,reference,next)!==true)throw Error('Native action clock was not retagged');reference=next;support=nextSupport;return Object.freeze({changedData:false,nativeAction:reference});},
  seal(){check();sealed=true;},valid,status(){const point={x:reference.origin.x,y:support.point.height+heightOffset,z:reference.origin.z};return {disposed,sealed,nativeAction:reference,installed:disposed?null:Object.freeze({start:Object.freeze({at:reference.startTime,...point}),end:Object.freeze({at:reference.endTime,...point}),segments:0,nativeAction:reference})};},
  dispose(){if(disposed)return;disposed=true;for(const material of [...bindings.keys()])unbindGpuMotionMaterial(bindings,material);phases.clear();}
 };
}
