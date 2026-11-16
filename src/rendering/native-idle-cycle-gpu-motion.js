import {uniform,int} from 'three/tsl';
import {copyNativeIdleCycleReference,nativeIdleCycleSuccessor,nativeIdleCycleWatchKnot} from '../world/native-idle-cycle.js';
import {nativeEntityNumericId} from '../world/native-entity-id.js';
import {markRemoteClockNode} from './remote-clock-bindings.js';
import {createNativeStationaryGpuTransform} from './native-stationary-gpu-transform.js';
import {floorFloat32} from './float32-time.js';

// Finite native program on the resident body. Both authored clips belong to
// the same graph; the native clock selects phase, never a JS timer or RNG.
export function createNativeIdleCycleGpuMotion({actorId,support,anchorPosition=null,anchorYaw=0,heightOffset=0}={}){
 let reference=copyNativeIdleCycleReference(support?.reference);
 function supported(value,r){const p=r.sourceBody.reference.sourceRequest.pose;return value?.kind==='native-idle-cycle-terrain-support'&&value.valid?.()===true&&value.point?.x===p.x&&value.point.z===p.z&&value.point.at===r.worldBoundary.effectiveTime&&Number.isFinite(value.point.height)&&Number.isFinite(Math.fround(value.point.height));}
 if(!supported(support,reference)||nativeEntityNumericId(actorId)!==reference.actorId||![anchorYaw,heightOffset].every(n=>Number.isFinite(n)&&Number.isFinite(Math.fround(n)))||anchorPosition!==null&&![anchorPosition?.x,anchorPosition?.y,anchorPosition?.z].every(n=>Number.isFinite(n)&&Number.isFinite(Math.fround(n))))throw TypeError('Invalid native Idle cycle GPU support');
 const source=reference,pose=source.sourceBody.reference.sourceRequest.pose,clockNode=markRemoteClockNode(uniform(0),'relative',reference.worldBoundary.effectiveTime,null,null,null,null,null,null,null,null,null,null,null,null,reference),
  end=floorFloat32(source.duration),watchKnotNode=markRemoteClockNode(uniform(nativeIdleCycleWatchKnot(reference)),'idle-cycle-watch-knot',reference.worldBoundary.effectiveTime,null,null,null,null,null,null,null,null,null,null,null,null,reference),timeNode=clockNode.clamp(0,uniform(end)),
  clipNames=Object.freeze(['Idle','Alert']),clipNode=timeNode.greaterThanEqual(watchKnotNode).or(uniform(source.initialState.mode==='watch'?1:0,'int').equal(1)).select(int(1),int(0)),
  offsetHigh=Math.fround(source.watchStartOffset),offsetLow=Math.fround(source.watchStartOffset-offsetHigh),watchTime=timeNode.sub(uniform(offsetHigh)).sub(uniform(offsetLow)).max(0),
  stationary=createNativeStationaryGpuTransform({origin:pose,height:support.point.height,heading:pose.yaw,anchorPosition,anchorYaw,heightOffset,label:'Idle cycle'}),phases=new Map();
 let disposed=false,sealed=false,executionEpoch=reference.worldBoundary.effectiveTime;
 function check(){if(disposed)throw Error('Native Idle cycle GPU motion disposed');}
 function age(value){check();if(!Number.isFinite(value)||value<0||Math.fround(value)!==value)throw TypeError('Native Idle cycle requires its submitted relative float');return Math.min(value,end);}
 function phase(clip,duration){check();if(!clipNames.includes(clip)||!Number.isFinite(duration)||duration<=0||!Number.isFinite(Math.fround(duration))||Math.fround(duration)===0)throw TypeError('Invalid native Idle cycle clip');return Math.fround((source.initialState.mode===(clip==='Idle'?'rest':'watch')?source.initialState.elapsed:0)%duration);}
 return {actorId,clockNode,watchKnotNode,timeNode,clipNode,clipNames,bindingAnchor:stationary.bindingAnchor,
  resolve(_fallback,clip,duration){const base=phase(clip,duration),key=clip+':'+duration;let node=phases.get(key);if(!node){node=(clip==='Idle'?timeNode:watchTime).add(uniform(base));phases.set(key,node);}return node;},
  sampleForClip(value,clip,duration){const base=phase(clip,duration),t=age(value),local=clip==='Idle'?t:Math.max(0,Math.fround(Math.fround(t-offsetHigh)-offsetLow));return Math.fround(local+base);},
  sampleClip(value){const t=age(value);return source.initialState.mode==='watch'||t>=watchKnotNode.value?'Alert':'Idle';},
  bind(material){check();return stationary.bind(material);},unbind:stationary.unbind,sample(value){age(value);return stationary.sample();},
  retargetNativeIdleCycle(nextSupport,{retagClock}={}){check();if(sealed||typeof retagClock!=='function')throw Error('Native Idle cycle already published');const next=copyNativeIdleCycleReference(nextSupport?.reference);if(!supported(nextSupport,next)||!nativeIdleCycleSuccessor(reference,next)||nextSupport.point.height!==support.point.height)return false;if(retagClock(clockNode,reference,next)!==true||retagClock(watchKnotNode,reference,next)!==true)throw Error('Native Idle cycle clock was not retagged');reference=next;support=nextSupport;executionEpoch=next.worldBoundary.effectiveTime;watchKnotNode.value=nativeIdleCycleWatchKnot(reference,executionEpoch);return Object.freeze({changedData:false,nativeIdleCycle:reference});},
  setExecutionEpoch(at){check();if(sealed||!Number.isFinite(at)||at<reference.worldBoundary.effectiveTime)throw Error('Native Idle cycle execution origin unavailable');executionEpoch=at;watchKnotNode.value=nativeIdleCycleWatchKnot(reference,at);},
  seal(){check();sealed=true;},valid:()=>!disposed&&support.valid()===true,
  status(){return {disposed,sealed,nativeIdleCycle:reference,executionEpoch,installed:disposed?null:Object.freeze({start:Object.freeze({at:reference.worldBoundary.effectiveTime,x:pose.x,y:support.point.height+heightOffset,z:pose.z}),segments:0,nativeIdleCycle:reference})};},
  dispose(){if(disposed)return;disposed=true;stationary.dispose();phases.clear();}
 };
}
