import {markRemoteAnimalCropNode} from './remote-clock-bindings.js';
import {prepareAnimalCropGpuTable} from './native-route-gpu-table.js';
import {nativeFarmIdlePhaseOffset} from './native-farm-idle-phase.js';
import {NATIVE_STOP_POSE_FIELDS} from '../world/native-worker-route-stop-codec.js';
import {copyNativeStoppedBodySelector} from './native-stopped-clock.js';
import {copyNativeIdleStrollResources,nativeIdleStrollSuccessor} from '../world/native-idle-stroll.js';
import {nativeFarmArrivalRouteSuccessor} from '../world/native-farm-arrival-route.js';
import {nativeHomeRouteSuccessor} from '../world/native-home-route.js';
import {nativeTaskConsequenceSuccessor} from '../world/native-task-consequence.js';
import {nativeClockResourceEnd} from './native-clock-resource-end.js';
import {nativeTaskStartSuccessor} from '../world/native-task-start-reference.js';
import {nativeResumeSuccessor} from '../world/native-resume-reference.js';
import {DataTexture,FloatType,NearestFilter,RGBAFormat,Vector3,Vector4} from 'three';
import {Fn,If,Loop,clamp,float,int,ivec2,mix,struct,textureLoad,uniform,vec3,vec4} from 'three/tsl';
import {markRemoteClockNode,markRemoteStoppedNode} from './remote-clock-bindings.js';
import {bindGpuMotionMaterial,unbindGpuMotionMaterial,gpuActorLocalTransform} from './gpu-actor-motion-material.js';
import {prepareNativeRouteGpuTable,prepareNativeResumeGpuTable,prepareNativeTaskStartGpuTable,prepareNativeTaskConsequenceGpuTable,prepareNativeHomeRouteGpuTable,prepareNativeFarmArrivalGpuTable,prepareNativeIdleStrollGpuTable,sampleNativeRouteGpuTable,sampleNativeRouteGpuTableRelative} from './native-route-gpu-table.js';
import {copyNativeSuspendedBodyReference} from '../world/native-suspended-body-reference.js';
import {floorFloat32} from './float32-time.js';
import {nativeEntityNumericId} from '../world/native-entity-id.js';

let nextResource=0;
const NativeState=struct({pose:'vec4',phases:'vec4',mode:'vec4'});

// One immutable route assignment, with its own tagged physical uniform. Time
// remains owned by NativeRouteControl in the draw worker; this creates no timer,
// grants no horizon and performs no per-frame JS sampling or buffer uploads.
export function createNativeGpuMotion(options={}){
 if(options.support?.kind!=='native-route-terrain-support')throw TypeError('Native assignment requires route terrain support');
 const {actorId,support,anchorYaw=0,heightOffset=0,anchorPosition=null,resourceRegistry=null}=options;
 return createMotion({actorId,support,anchorYaw,heightOffset,anchorPosition,resourceRegistry});
}
export function createAnimalCropGpuMotion(options){
 if(options?.support?.kind!=='native-animal-crop-route-support')throw Error('Crop route proposal required');
 return createMotion(options);
}
export function createNativeResumeGpuMotion(options={}){
 if(options.support?.kind!=='native-resume-terrain-support')throw TypeError('Native resume requires proposal terrain support');
 return createMotion(options);
}
export function createNativeTaskStartGpuMotion(options={}){if(options.support?.kind!=='native-task-start-terrain-support')throw TypeError('Native first task requires proposal terrain support');return createMotion(options);}
export function createNativeTaskConsequenceGpuMotion(options={}){if(options.support?.kind!=='native-task-consequence-terrain-support')throw TypeError('Native consequence requires proposal terrain support');return createMotion(options);}
export function createNativeFarmArrivalGpuMotion(options={}){if(options.support?.kind!=='native-farm-arrival-terrain-support')throw TypeError('Native farm arrival requires proposal terrain support');return createMotion(options);}
export function createNativeHomeRouteGpuMotion(options={}){if(options.support?.kind!=='native-home-route-terrain-support')throw TypeError('Native Home requires proposal terrain support');return createMotion(options);}
export function createNativeIdleStrollGpuMotion(options={}){if(options.support?.kind!=='native-idle-stroll-terrain-support')throw TypeError('Native Idle stroll requires proposal terrain support');return createMotion(options);}
// One registry entry owns the immutable texture. Replacement presentations
// retain it independently; the caller's existing GPU fence retires each owner.
function routeData(table,resourceRegistry){
 const texture=new DataTexture(table.data,table.width,table.height,RGBAFormat,FloatType);if(table.nativeStroll)texture.name=`wg-native-idle-stroll-route:${table.nativeStroll.actorId}:${table.nativeStroll.sourceDecisionSequence}`;else if(table.nativeFarmArrival)texture.name=`wg-native-farm-arrival-route:${table.nativeFarmArrival.actorId}:${table.nativeFarmArrival.sourceRequest.requestSequence}`;texture.minFilter=texture.magFilter=NearestFilter;texture.generateMipmaps=false;texture.needsUpdate=true;
 let refs=0,lease=null,closed=false;
 try{if(resourceRegistry){lease=resourceRegistry.adopt({namespace:'native-gpu-motion',key:String(++nextResource),bytes:table.data.byteLength,dispose:()=>texture.dispose()});lease.commit();}}catch(error){if(lease)lease.release();else texture.dispose();throw error;}
 return {table,texture,retain(){if(closed)throw Error('Native route data retired');refs++;let released=false;return ()=>{if(released)return;released=true;if(--refs===0){closed=true;if(lease)lease.release();else texture.dispose();}};},references:()=>refs};
}
// Creates graphical data only. The direct authority channel must separately
// authorize presentation on the new consumer before the runtime releases hold.
export function createRecoveredIdleStrollGpuMotion({resources,terrain,terrainManifest,...options}) {
  const source = copyNativeIdleStrollResources(resources);
  const support = terrain.prepareNativeRoute(source.presentation, {terrainManifest});
  if (!support?.valid()) throw Error('Recovered Idle22 corridor is not resident');
  const {nativeRoute, ...table} = prepareNativeRouteGpuTable(support);
  const ref = source.nativeIdleStrollBinding.reference;
  if (nativeRoute.assignmentSequence !== source.nativeIdleStrollBinding.assignmentSequence) {
    throw Error('Recovered Idle22 assignment changed');
  }
  const restored = createMotion({...options,support}, null, null, {...table,nativeStroll:ref});
  restored.seal();
  return restored;
}

function createMotion({actorId,support,anchorYaw=0,heightOffset=0,anchorPosition=null,resourceRegistry=null},shared=null,suspension=null,recoveredTable=null){
 if(typeof actorId!=='string'||!actorId||![anchorYaw,heightOffset].every(Number.isFinite)||anchorPosition!==null&&![anchorPosition?.x,anchorPosition?.y,anchorPosition?.z].every(Number.isFinite)||resourceRegistry!==null&&typeof resourceRegistry?.adopt!=='function')throw TypeError('Invalid native GPU motion configuration');
 let table=shared?.table??recoveredTable??(support?.kind==='native-animal-crop-route-support'?prepareAnimalCropGpuTable(support):support?.kind==='native-farm-arrival-terrain-support'?prepareNativeFarmArrivalGpuTable(support):support?.kind==='native-idle-stroll-terrain-support'?prepareNativeIdleStrollGpuTable(support):support?.kind==='native-home-route-terrain-support'?prepareNativeHomeRouteGpuTable(support):support?.kind==='native-task-consequence-terrain-support'?prepareNativeTaskConsequenceGpuTable(support):support?.kind==='native-resume-terrain-support'?prepareNativeResumeGpuTable(support):support?.kind==='native-task-start-terrain-support'?prepareNativeTaskStartGpuTable(support):prepareNativeRouteGpuTable(support));
 if(nativeEntityNumericId(actorId)!==(table.nativeAnimalCrop?.actorId??table.nativeRoute?.actorId??table.nativeResume?.actorId??table.nativeStart?.actorId??table.nativeConsequence?.actorId??table.nativeStroll?.actorId??table.nativeHome?.actorId??table.nativeFarmArrival?.actorId))throw TypeError('Native GPU actor identity mismatch');
 const data=shared??routeData(table,resourceRegistry),releaseData=data.retain(),texture=data.texture,held=suspension?.pose??new Float64Array(18);let start=Object.freeze(suspension?{at:suspension.reference.suspendedAt,x:held[0],y:suspension.height+heightOffset,z:held[1]}:{...table.start,y:table.start.y+heightOffset}),end=Object.freeze(suspension?{...start}:{...table.end,y:table.end.y+heightOffset});const bindingAnchor=Object.freeze(anchorPosition?{x:anchorPosition.x,y:anchorPosition.y,z:anchorPosition.z}:{x:start.x,y:start.y,z:start.z}),clockNode=table.nativeAnimalCrop?markRemoteAnimalCropNode(uniform(0),table.nativeAnimalCrop):suspension?.stop?markRemoteStoppedNode(uniform(0),suspension.stop,table.epoch):markRemoteClockNode(uniform(0),'relative',table.epoch,suspension?null:table.nativeRoute??null,null,suspension?.reference??null,suspension?null:table.nativeResume??null,null,suspension?Number.MAX_SAFE_INTEGER:nativeClockResourceEnd(table.epoch,table.end.at),suspension?null:table.nativeStart??null,null,suspension?null:table.nativeConsequence??null,null,suspension?null:table.nativeHome??null,null,null,suspension?null:table.nativeStroll??null,suspension?null:table.nativeFarmArrival??null),bindings=new Map(),idlePhases=new Map(),anchor=uniform(new Vector3(bindingAnchor.x,bindingAnchor.y,bindingAnchor.z)),parameters=uniform(new Vector4(table.count,table.columns,table.duration,anchorYaw)),heldFlag=uniform(suspension?.stop?2:suspension?1:0),heldPose=uniform(new Vector4(held[0],suspension?.height??0,held[1],held[4])),heldPhases=uniform(new Vector4(held[3],held[9],held[10],held[11])),heldArrived=uniform(held[6]);
 let executionEpoch=table.epoch;let disposed=false,sealed=!!suspension||!(table.nativeResume||table.nativeStart||table.nativeConsequence||table.nativeHome||table.nativeStroll||table.nativeFarmArrival);
 const load=(index,column)=>textureLoad(texture,ivec2(index.mod(int(parameters.y)).mul(5).add(column),index.div(int(parameters.y))));
 const stopAge=uniform(0),stopValues=Object.fromEntries(Object.entries(NATIVE_STOP_POSE_FIELDS).map(([key,index])=>[key,uniform(held[index])]));
 if(suspension?.stop){markRemoteStoppedNode(stopAge,suspension.stop,table.epoch,'age');for(const [field,node] of Object.entries(stopValues))markRemoteStoppedNode(node,suspension.stop,table.epoch,field);}
 const relativeTime=clockNode.sub(clockNode.abs().max(1).mul(.000000476837158203125)),motionClock=heldFlag.greaterThan(1.5).select(stopAge,clockNode),sampleTime=motionClock.sub(motionClock.abs().max(1).mul(.000000476837158203125)),timeNode=clamp(sampleTime,float(0),parameters.z);
 const state=Fn(()=>{
  const result=NativeState({pose:vec4(heldPose.xyz,heldPose.w.sub(parameters.w)),phases:heldPhases,mode:vec4(0,0,heldArrived,relativeTime.max(0))}).toVar();
  If(heldFlag.lessThan(.5).or(heldFlag.greaterThan(1.5)),()=>{
  const time=timeNode.toVar(),low=int(0).toVar(),high=int(parameters.x).toVar();
  // Upper bound, then its predecessor: categorical values are right-continuous
  // at native knots. 15 bisections cover every supported 16385-row resource.
  Loop(15,()=>{If(low.lessThan(high),()=>{const middle=low.add(high).div(int(2)).toVar();If(load(middle,0).x.lessThanEqual(time),()=>{low.assign(middle.add(1));}).Else(()=>{high.assign(middle);});});});
  const index=low.sub(int(1)).max(int(0)).toVar(),next=index.add(int(1)).min(int(parameters.x).sub(1)).toVar(),a=load(index,0).toVar(),b=load(next,0).toVar(),span=b.x.sub(a.x),fraction=clamp(time.sub(a.x).div(span.max(1e-30)),float(0),float(1)),from=load(index,1).toVar(),to=load(next,1).toVar(),clips=load(index,2).toVar(),nextClips=load(next,2).toVar(),pose=mix(a.yzw,b.yzw,fraction),phases=mix(clips.yzw,nextClips.yzw,fraction);
  result.assign(NativeState({pose:vec4(pose,from.z.sub(parameters.w)),phases:vec4(mix(from.y,to.y,fraction),phases),mode:vec4(load(index,3).w,load(index,4).x,clips.x,time)}));
  If(heldFlag.greaterThan(1.5),()=>{result.assign(NativeState({pose:vec4(stopValues.x,pose.y,stopValues.z,stopValues.yaw.sub(parameters.w)),phases:vec4(stopValues.phase,stopValues.runPhase,stopValues.walkPhase,stopValues.carryPhase),mode:vec4(0,0,stopValues.arrived,relativeTime.max(0))}));});
  });return result;
 })();
 const transform=base=>Fn(()=>{const sampled=state.toVar();return gpuActorLocalTransform(base,sampled.get('pose').xyz.add(vec3(0,heightOffset,0)),sampled.get('pose').w,anchor,int(1).greaterThan(0));})();
 let installed=Object.freeze({start,end,segments:suspension?0:table.count-1,...(table.nativeRoute?{nativeRoute:table.nativeRoute}:table.nativeResume?{nativeResume:table.nativeResume}:table.nativeStart?{nativeStart:table.nativeStart}:table.nativeStroll?{nativeStroll:table.nativeStroll}:table.nativeHome?{nativeHome:table.nativeHome}:table.nativeFarmArrival?{nativeFarmArrival:table.nativeFarmArrival}:{nativeConsequence:table.nativeConsequence}),...(suspension?.stop?{nativeStopped:suspension.stop}:suspension?{nativeSuspended:suspension.reference}:{})});
 const phases=Object.freeze({...(table.nativeAnimalCrop?{Walking:state.get('phases').x,Running:state.get('phases').x}:{}),Walk_Skip:state.get('phases').z,Run:state.get('phases').y,Carry_Crate:state.get('phases').w}),phaseFields=Object.freeze({...(table.nativeAnimalCrop?{Walking:'phase',Running:'phase'}:{}),Walk_Skip:'walkPhase',Run:'runPhase',Carry_Crate:'carryPhase'});
 // Gate Idle follows logical time while locomotion phases stay frozen.
 // Reduce the epoch by the clip period before converting it to a GPU float.
 function idleDuration(duration){if(!Number.isFinite(duration)||duration<=0)throw Error('Native idle requires its clip duration');}
 function sample(at){
  if(!suspension)return sampleNativeRouteGpuTable(table,at);
  if(suspension.stop){const values=suspension.getProjection();if(!Number.isFinite(at)||at!==values.at)throw TypeError('Native stopped sample requires its submitted frame time');const height=sampleNativeRouteGpuTableRelative(table,values.age).y;return {...values,y:height,at,relativeTime:Math.max(0,Math.fround((values.relativeTime??floorFloat32(at-table.epoch))-Math.fround(Math.max(Math.abs(values.relativeTime??floorFloat32(at-table.epoch)),1)*.000000476837158203125))),running:0,currentSpeed:0};}
  if(!Number.isFinite(at)||at<suspension.reference.suspendedAt)throw TypeError('Invalid native suspension sample time');
  const raw=floorFloat32(at-table.epoch),relativeTime=Math.max(0,Math.fround(raw-Math.fround(Math.max(Math.abs(raw),1)*.000000476837158203125)));
  return {x:Math.fround(held[0]),y:Math.fround(suspension.height),z:Math.fround(held[1]),yaw:Math.fround(held[4]),distance:held[2],phase:Math.fround(held[3]),firstRemainingPoint:held[5],arrived:held[6],at,relativeTime,runPhase:Math.fround(held[9]),walkPhase:Math.fround(held[10]),carryPhase:Math.fround(held[11]),runDistance:held[12],walkDistance:held[13],runRemaining:held[14],running:0,currentSpeed:0};
 }
 function validateSuspendedInputs({reference,nativePose,height,isCurrent}={}){
  if(disposed||suspension)throw Error('Native moving resource unavailable for suspension');
  reference=copyNativeSuspendedBodyReference(reference);const route=reference.nativeRoute,proposal=table.nativeResume??table.nativeStart??table.nativeConsequence??table.nativeHome??table.nativeStroll??table.nativeFarmArrival,old=table.nativeRoute??{actorId:proposal.actorId,assignmentSequence:route.assignmentSequence,routeHandle:proposal.expectedRouteHandle};
  if(table.nativeFarmArrival&&(reference.bodyId!==table.nativeFarmArrival.bodyId||reference.suspendedAt>=executionEpoch+(table.end.at-table.epoch))||proposal&&route.assignmentSequence<=proposal.sourceControlSequence||route.actorId!==old.actorId||route.assignmentSequence!==old.assignmentSequence||['authorityEpoch','session','slot','generation'].some(key=>route.routeHandle[key]!==old.routeHandle[key])||!(nativePose instanceof Float64Array)||nativePose.length!==18||!nativePose.every(Number.isFinite)||[0,1,3,4,6,9,10,11].some(index=>!Number.isFinite(Math.fround(nativePose[index])))||![0,1].includes(nativePose[6])||nativePose[7]!==reference.suspendedAt||nativePose[15]!==0||nativePose[16]!==0||nativePose[17]!==2||reference.suspendedAt<executionEpoch||reference.suspendedAt>executionEpoch+(table.end.at-table.epoch)||!Number.isFinite(height)||!Number.isFinite(Math.fround(height))||typeof isCurrent!=='function'||isCurrent()!==true)throw TypeError('Invalid native suspended motion support');
  return reference;
 }
 function prepareSuspended({reference,nativePose,height,isCurrent}={}){
  if(table.nativeFarmArrival)throw Error('Native farm arrival suspension requires prepared lifecycle');
  reference=validateSuspendedInputs({reference,nativePose,height,isCurrent});
  return createMotion({actorId,support,anchorYaw,heightOffset,anchorPosition:bindingAnchor,resourceRegistry},data,{reference,pose:Float64Array.from(nativePose),height,isCurrent});
 }
 function prepareStopped({reference,nativePose,height,isCurrent,getProjection}={}){
  const stop=copyNativeStoppedBodySelector(reference),owner=stop.stop.routes.find(r=>r.nativeRoute.actorId===stop.actorId),b=stop.stop.worldBoundary;
  const body={kind:'native-suspended-body',version:1,nativeRoute:owner.nativeRoute,worldBoundary:b,bodyId:owner.bodyId,resumeGeneration:owner.resumeGeneration,suspendedAt:b.effectiveTime};
  if(typeof getProjection!=='function')throw TypeError('Stopped motion requires its submitted projection');
  validateSuspendedInputs({reference:body,nativePose,height,isCurrent});
  return createMotion({actorId,support,anchorYaw,heightOffset,anchorPosition:bindingAnchor,resourceRegistry},data,{reference:body,stop,pose:Float64Array.from(nativePose),height,isCurrent,getProjection});
 }
 // Only an unpublished, exclusively owned candidate can replace data. The
 // renderer cancels its old retained packet before invoking this operation.
 function retargetNativeProposal(nextSupport,{retagClock}={},starting=false){
  const farm=starting==='farm-arrival',home=starting==='home',consequence=starting==='consequence',stroll=starting==='stroll',key=farm?'nativeFarmArrival':stroll?'nativeStroll':home?'nativeHome':consequence?'nativeConsequence':starting?'nativeStart':'nativeResume',pack=farm?prepareNativeFarmArrivalGpuTable:stroll?prepareNativeIdleStrollGpuTable:home?prepareNativeHomeRouteGpuTable:consequence?prepareNativeTaskConsequenceGpuTable:starting?prepareNativeTaskStartGpuTable:prepareNativeResumeGpuTable,successor=farm?nativeFarmArrivalRouteSuccessor:stroll?nativeIdleStrollSuccessor:home?nativeHomeRouteSuccessor:consequence?nativeTaskConsequenceSuccessor:starting?nativeTaskStartSuccessor:nativeResumeSuccessor;
  if(disposed||sealed||suspension||!table[key]||data.references()!==1||typeof retagClock!=='function')throw Error('Native resume data is already published or shared');
  const next=pack(nextSupport),before=table.presentation,after=next.presentation;
  if(!successor(table[key],next[key])||['motionMode','motionFlags','profile','radius'].some(key=>before[key]!==after[key])||next.width!==table.width||next.height!==table.height||next.columns!==table.columns||next.data.length!==table.data.length)return false;
  if(nextSupport.valid()!==true)throw Error('Native resume support changed before data replacement');
  // Retagging addresses the existing physical uniforms, not a shader rebuild.
  // The consumer still requires direct authority for the new proposal identity.
  if(retagClock(clockNode,table[key],next[key],nativeClockResourceEnd(next.epoch,next.end.at))!==true)throw Error('Native resume clock was not retagged');
  const changed=next.data.some((value,index)=>!Object.is(value,table.data[index]));
  texture.image.data=next.data;if(changed)texture.needsUpdate=true;
  table=next;data.table=next;support=nextSupport;parameters.value.set(next.count,next.columns,next.duration,anchorYaw);
  for(const [duration,entry] of idlePhases){if(table[key])retagClock(entry.base,entry.reference,next[key]);entry.reference=next[key];entry.base.value=next.epoch%duration;}executionEpoch=next.epoch;
  start=Object.freeze({...next.start,y:next.start.y+heightOffset});end=Object.freeze({...next.end,y:next.end.y+heightOffset});installed=Object.freeze({start,end,segments:next.count-1,[key]:next[key]});
  return Object.freeze({changedData:changed,[key]:next[key]});
 }
 function unbind(material){return unbindGpuMotionMaterial(bindings,material);}
 return {actorId,clockNode,get clockEpoch(){return table.epoch;},timeNode,bindingAnchor,phaseNode:state.get('phases').x,runPhaseNode:phases.Run,walkPhaseNode:phases.Walk_Skip,carryPhaseNode:phases.Carry_Crate,runningNode:state.get('mode').x,idleNode:state.get('mode').y.lessThanEqual(0),currentSpeedNode:state.get('mode').y,arrivedNode:state.get('mode').z,
  prepareSuspended,prepareStopped,retargetNativeFarmArrival:(support,options)=>retargetNativeProposal(support,options,'farm-arrival'),retargetNativeIdleStroll:(support,options)=>retargetNativeProposal(support,options,'stroll'),retargetNativeHomeRoute:(support,options)=>retargetNativeProposal(support,options,'home'),retargetNativeTaskConsequence:(support,options)=>retargetNativeProposal(support,options,'consequence'),retargetNativeResume:(support,options)=>retargetNativeProposal(support,options),retargetNativeTaskStart:(support,options)=>retargetNativeProposal(support,options,true),setExecutionEpoch(at){if(disposed||sealed||!(table.nativeResume||table.nativeStart||table.nativeConsequence||table.nativeHome||table.nativeStroll||table.nativeFarmArrival)||!Number.isFinite(at)||at<table.epoch)throw Error('Native execution origin unavailable');executionEpoch=at;},seal(){if(disposed)throw Error('Native GPU motion disposed');sealed=true;},
  bind(material){if(disposed)throw Error('Native GPU motion disposed');return bindGpuMotionMaterial(bindings,material,transform);},unbind,
  resolve(fallback,clip,duration){if(disposed)throw Error('Native GPU motion disposed');if(clip==='Idle'){idleDuration(duration);let entry=idlePhases.get(duration);if(!entry){const base=uniform(table.epoch%duration);if((table.nativeResume||table.nativeStart||table.nativeConsequence||table.nativeHome||table.nativeStroll||table.nativeFarmArrival)&&!suspension)markRemoteClockNode(base,(table.nativeFarmArrival||table.nativeStroll)?'idle-offset':'origin-modulo',table.epoch,null,null,null,table.nativeResume??null,duration,null,table.nativeStart??null,null,table.nativeConsequence??null,null,table.nativeHome??null,null,null,table.nativeStroll??null,table.nativeFarmArrival??null);entry={base,reference:table.nativeResume??table.nativeStart??table.nativeConsequence??table.nativeHome??table.nativeStroll??table.nativeFarmArrival,node:base.add(state.get('mode').w)};idlePhases.set(duration,entry);}return entry.node;}if(!Object.hasOwn(phases,clip))throw Error('Unsupported native animation phase');return phases[clip];},
  sampleForClip(at,clip,duration,idleOffset){if(disposed)throw Error('Native GPU motion disposed');const value=sample(at);if(clip==='Idle'){idleDuration(duration);const base=(table.nativeFarmArrival||table.nativeStroll)&&!suspension?(idleOffset??nativeFarmIdlePhaseOffset({elapsed:executionEpoch+(at-table.epoch),executionEpoch,relativeTime:floorFloat32(at-table.epoch),duration:table.duration,period:duration})):Math.fround(executionEpoch%duration);if(!Number.isFinite(base)||Math.fround(base)!==base)throw TypeError('Invalid submitted Idle phase offset');return Math.fround(base+Math.fround(value.relativeTime));}if(!Object.hasOwn(phaseFields,clip))throw Error('Unsupported native animation phase');return value[phaseFields[clip]];},
  sample(at){if(disposed)throw Error('Native GPU motion disposed');const value=sample(at);return {...value,y:value.y+heightOffset,dx:value.x-bindingAnchor.x,dy:value.y+heightOffset-bindingAnchor.y,dz:value.z-bindingAnchor.z,yawDelta:value.yaw-anchorYaw};},
  valid:()=>!disposed&&(suspension?suspension.isCurrent()===true:support.valid()===true),get texture(){return texture;},status(){return {disposed,sealed,sequence:table.nativeRoute?.assignmentSequence??null,...(table.nativeResume?{nativeResume:table.nativeResume}:table.nativeStart?{nativeStart:table.nativeStart}:table.nativeConsequence?{nativeConsequence:table.nativeConsequence}:table.nativeStroll?{nativeStroll:table.nativeStroll}:table.nativeHome?{nativeHome:table.nativeHome}:table.nativeFarmArrival?{nativeFarmArrival:table.nativeFarmArrival}:{}),installed:disposed?null:installed,rows:table.count,columns:table.columns,bytes:table.data.byteLength,dataReferences:data.references(),...(suspension?.stop?{nativeStopped:suspension.stop}:suspension?{nativeSuspended:suspension.reference}:{})};},
  dispose(){if(disposed)return;disposed=true;for(const material of [...bindings.keys()])unbind(material);releaseData();}
 };
}
