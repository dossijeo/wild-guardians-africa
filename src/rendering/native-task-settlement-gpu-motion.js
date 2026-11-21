import {int,uniform} from 'three/tsl';
import {copyNativeTaskSettlementReference,nativeTaskSettlementSuccessor} from '../world/native-task-settlement.js';
import {nativeEntityNumericId} from '../world/native-entity-id.js';
import {markRemoteClockNode} from './remote-clock-bindings.js';
import {createNativeStationaryGpuTransform} from './native-stationary-gpu-transform.js';

// Original Idle bake on the arrived body. The consumer's current association
// and committed native clock bound replay; a clip loop supplies no time grant.
export function createNativeTaskSettlementGpuMotion({actorId,support,anchorPosition=null,anchorYaw=0,heightOffset=0}={}){
 let reference=copyNativeTaskSettlementReference(support?.reference);
 function supported(value,r){return value?.kind==='native-task-settlement-terrain-support'&&value.valid?.()===true&&value.point?.x===r.pose.x&&value.point.z===r.pose.z&&value.point.at===r.worldBoundary.effectiveTime&&Number.isFinite(value.point.height)&&Number.isFinite(Math.fround(value.point.height));}
 if(!supported(support,reference)||nativeEntityNumericId(actorId)!==reference.actorId||![anchorYaw,heightOffset].every(n=>Number.isFinite(n)&&Number.isFinite(Math.fround(n)))||anchorPosition!==null&&![anchorPosition?.x,anchorPosition?.y,anchorPosition?.z].every(n=>Number.isFinite(n)&&Number.isFinite(Math.fround(n)))||reference.sourceCarry.reference.sourceAction.reference.motionFlags&56)throw TypeError('Invalid native settlement GPU support');
 const clockNode=markRemoteClockNode(uniform(0),'relative',reference.worldBoundary.effectiveTime,null,null,null,null,null,null,null,null,null,reference),timeNode=clockNode.max(0),clipNode=int(0),clipNames=Object.freeze(['Idle']),stationary=createNativeStationaryGpuTransform({origin:reference.pose,height:support.point.height,heading:reference.pose.yaw,anchorPosition,anchorYaw,heightOffset,label:'settlement'});
 let disposed=false,sealed=false,executionEpoch=reference.worldBoundary.effectiveTime;const phases=new Map();
 function check(){if(disposed)throw Error('Native settlement GPU motion disposed');}
 function sampleAge(age){check();if(!Number.isFinite(age)||age<0||Math.fround(age)!==age)throw TypeError('Native settlement input requires a submitted relative float');return age;}
 function clipDuration(clip,value){check();if(clip!=='Idle'||!Number.isFinite(value)||value<=0||!Number.isFinite(Math.fround(value))||Math.fround(value)===0)throw TypeError('Invalid native settlement clip');}
 return {actorId,clockNode,timeNode,clipNode,clipNames,bindingAnchor:stationary.bindingAnchor,
  // Existing baked-walk math performs the authored loop in both shaders and
  // pick sampling. As workerPose does, Idle follows logical time; reduce its
  // issued epoch before converting to float, without a second timer.
  resolve(_fallback,clip,duration){clipDuration(clip,duration);let entry=phases.get(duration);if(!entry){const base=markRemoteClockNode(uniform(reference.worldBoundary.effectiveTime%duration),'origin-modulo',reference.worldBoundary.effectiveTime,null,null,null,null,duration,null,null,null,null,reference);entry={base,node:base.add(timeNode)};phases.set(duration,entry);}return entry.node;},
  sampleForClip(age,clip,duration){clipDuration(clip,duration);return Math.fround(Math.fround(executionEpoch%duration)+sampleAge(age));},sampleClip(age){sampleAge(age);return 'Idle';},
  bind(material){check();return stationary.bind(material);},unbind:stationary.unbind,sample(age){sampleAge(age);return stationary.sample();},
  retargetNativeTaskSettlement(nextSupport,{retagClock}={}){check();if(sealed||typeof retagClock!=='function')throw Error('Native settlement GPU motion already published');const next=copyNativeTaskSettlementReference(nextSupport?.reference);if(!supported(nextSupport,next)||!nativeTaskSettlementSuccessor(reference,next)||nextSupport.point.height!==support.point.height)return false;if(retagClock(clockNode,reference,next)!==true)throw Error('Native settlement clock was not retagged');for(const [duration,entry] of phases){if(retagClock(entry.base,reference,next)!==true)throw Error('Native settlement phase origin was not retagged');entry.base.value=next.worldBoundary.effectiveTime%duration;}reference=next;executionEpoch=next.worldBoundary.effectiveTime;support=nextSupport;return Object.freeze({changedData:false,nativeSettlement:reference});},
  setExecutionEpoch(at){check();if(sealed||!Number.isFinite(at)||at<reference.worldBoundary.effectiveTime)throw Error('Native settlement execution origin unavailable');executionEpoch=at;},
  seal(){check();sealed=true;},valid:()=>!disposed&&support.valid()===true,
  status(){return {disposed,sealed,nativeSettlement:reference,installed:disposed?null:Object.freeze({start:Object.freeze({at:reference.worldBoundary.effectiveTime,x:reference.pose.x,y:support.point.height+heightOffset,z:reference.pose.z}),segments:0,nativeSettlement:reference})};},
  dispose(){if(disposed)return;disposed=true;stationary.dispose();phases.clear();}
 };
}
