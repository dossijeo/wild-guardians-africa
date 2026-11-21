import {uniform} from 'three/tsl';
import {copyNativeInitialIdleBodyReference,nativeInitialIdleBodySuccessor} from '../world/native-initial-idle-body.js';
import {nativeEntityNumericId} from '../world/native-entity-id.js';
import {markRemoteClockNode} from './remote-clock-bindings.js';
import {createNativeStationaryGpuTransform} from './native-stationary-gpu-transform.js';

// Residency of the actual initialized pose, not execution of the pending Idle
// policy. The native clock authorizes this body; its age cannot advance RNG,
// private Idle elapsed, a clip transition or an autonomous stroll.
export function createNativeInitialIdleBodyGpuMotion({actorId,support,anchorPosition=null,anchorYaw=0,heightOffset=0}={}){
 let reference=copyNativeInitialIdleBodyReference(support?.reference);
 function supported(value,r){const p=r.sourceRequest.pose;return value?.kind==='native-initial-idle-body-terrain-support'&&value.valid?.()===true&&value.point?.x===p.x&&value.point.z===p.z&&value.point.at===r.worldBoundary.effectiveTime&&Number.isFinite(value.point.height)&&Number.isFinite(Math.fround(value.point.height));}
 if(!supported(support,reference)||nativeEntityNumericId(actorId)!==reference.actorId||![anchorYaw,heightOffset].every(n=>Number.isFinite(n)&&Number.isFinite(Math.fround(n)))||anchorPosition!==null&&![anchorPosition?.x,anchorPosition?.y,anchorPosition?.z].every(n=>Number.isFinite(n)&&Number.isFinite(Math.fround(n))))throw TypeError('Invalid native initial Idle body GPU support');
 const q=reference.sourceRequest,clockNode=markRemoteClockNode(uniform(0),'relative',reference.worldBoundary.effectiveTime,null,null,null,null,null,null,null,null,null,null,null,reference),
  timeNode=clockNode.clamp(0,0),clipNames=Object.freeze(['Idle','Alert']),clipNode=uniform(q.idleState.mode==='rest'?0:1,'int'),
  stationary=createNativeStationaryGpuTransform({origin:q.pose,height:support.point.height,heading:q.pose.yaw,anchorPosition,anchorYaw,heightOffset,label:'initial Idle body'}),phases=new Map();
 let disposed=false,sealed=false,executionEpoch=reference.worldBoundary.effectiveTime;
 function check(){if(disposed)throw Error('Native initial Idle body GPU motion disposed');}
 function age(value){check();if(!Number.isFinite(value)||value<0||Math.fround(value)!==value)throw TypeError('Native initial Idle body requires its submitted relative float');return value;}
 function phase(clip,duration){check();if(!clipNames.includes(clip)||!Number.isFinite(duration)||duration<=0||!Number.isFinite(Math.fround(duration))||Math.fround(duration)===0)throw TypeError('Invalid native initial Idle body clip');return Math.fround(q.idleState.elapsed%duration);}
 return {actorId,clockNode,timeNode,clipNode,clipNames,bindingAnchor:stationary.bindingAnchor,
  // Like the existing clamped stationary action graph, retain the native clock
  // binding in color/shadow/pick provenance even while its pose phase is held.
  resolve(_fallback,clip,duration){const value=phase(clip,duration),key=clip+':'+duration;let node=phases.get(key);if(!node){node=timeNode.add(uniform(value));phases.set(key,node);}return node;},
  sampleForClip(value,clip,duration){age(value);return phase(clip,duration);},sampleClip(value){age(value);return clipNames[clipNode.value];},
  bind(material){check();return stationary.bind(material);},unbind:stationary.unbind,sample(value){age(value);return stationary.sample();},
  retargetNativeInitialIdleBody(nextSupport,{retagClock}={}){check();if(sealed||typeof retagClock!=='function')throw Error('Native initial Idle body already published');const next=copyNativeInitialIdleBodyReference(nextSupport?.reference);if(!supported(nextSupport,next)||!nativeInitialIdleBodySuccessor(reference,next)||nextSupport.point.height!==support.point.height)return false;if(retagClock(clockNode,reference,next)!==true)throw Error('Native initial Idle body clock was not retagged');reference=next;support=nextSupport;executionEpoch=next.worldBoundary.effectiveTime;return Object.freeze({changedData:false,nativeInitialIdleBody:reference});},
  setExecutionEpoch(at){check();if(sealed||!Number.isFinite(at)||at<reference.worldBoundary.effectiveTime)throw Error('Native initial Idle body execution origin unavailable');executionEpoch=at;},
  seal(){check();sealed=true;},valid:()=>!disposed&&support.valid()===true,
  status(){return {disposed,sealed,nativeInitialIdleBody:reference,executionEpoch,installed:disposed?null:Object.freeze({start:Object.freeze({at:reference.worldBoundary.effectiveTime,x:q.pose.x,y:support.point.height+heightOffset,z:q.pose.z}),segments:0,nativeInitialIdleBody:reference})};},
  dispose(){if(disposed)return;disposed=true;stationary.dispose();phases.clear();}
 };
}
