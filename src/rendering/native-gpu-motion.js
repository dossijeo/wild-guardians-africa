import {DataTexture,FloatType,NearestFilter,RGBAFormat,Vector3,Vector4} from 'three';
import {Fn,If,Loop,clamp,float,int,ivec2,mix,struct,textureLoad,uniform,vec3,vec4} from 'three/tsl';
import {markRemoteClockNode} from './remote-clock-bindings.js';
import {bindGpuMotionMaterial,unbindGpuMotionMaterial,gpuActorLocalTransform} from './gpu-actor-motion-material.js';
import {prepareNativeRouteGpuTable,prepareNativeResumeGpuTable,sampleNativeRouteGpuTable} from './native-route-gpu-table.js';
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
export function createNativeResumeGpuMotion(options={}){
 if(options.support?.kind!=='native-resume-terrain-support')throw TypeError('Native resume requires proposal terrain support');
 return createMotion(options);
}
// One registry entry owns the immutable texture. Replacement presentations
// retain it independently; the caller's existing GPU fence retires each owner.
function routeData(table,resourceRegistry){
 const texture=new DataTexture(table.data,table.width,table.height,RGBAFormat,FloatType);texture.minFilter=texture.magFilter=NearestFilter;texture.generateMipmaps=false;texture.needsUpdate=true;
 let refs=0,lease=null,closed=false;
 try{if(resourceRegistry){lease=resourceRegistry.adopt({namespace:'native-gpu-motion',key:String(++nextResource),bytes:table.data.byteLength,dispose:()=>texture.dispose()});lease.commit();}}catch(error){if(lease)lease.release();else texture.dispose();throw error;}
 return {table,texture,retain(){if(closed)throw Error('Native route data retired');refs++;let released=false;return ()=>{if(released)return;released=true;if(--refs===0){closed=true;if(lease)lease.release();else texture.dispose();}};},references:()=>refs};
}
function createMotion({actorId,support,anchorYaw=0,heightOffset=0,anchorPosition=null,resourceRegistry=null},shared=null,suspension=null){
 if(typeof actorId!=='string'||!actorId||![anchorYaw,heightOffset].every(Number.isFinite)||anchorPosition!==null&&![anchorPosition?.x,anchorPosition?.y,anchorPosition?.z].every(Number.isFinite)||resourceRegistry!==null&&typeof resourceRegistry?.adopt!=='function')throw TypeError('Invalid native GPU motion configuration');
 const table=shared?.table??(support?.kind==='native-resume-terrain-support'?prepareNativeResumeGpuTable(support):prepareNativeRouteGpuTable(support));
 if(nativeEntityNumericId(actorId)!==(table.nativeRoute?.actorId??table.nativeResume?.actorId))throw TypeError('Native GPU actor identity mismatch');
 const data=shared??routeData(table,resourceRegistry),releaseData=data.retain(),texture=data.texture,held=suspension?.pose??new Float64Array(18),start=Object.freeze(suspension?{at:suspension.reference.suspendedAt,x:held[0],y:suspension.height+heightOffset,z:held[1]}:{...table.start,y:table.start.y+heightOffset}),end=Object.freeze(suspension?{...start}:{...table.end,y:table.end.y+heightOffset}),bindingAnchor=Object.freeze(anchorPosition?{x:anchorPosition.x,y:anchorPosition.y,z:anchorPosition.z}:{x:start.x,y:start.y,z:start.z}),clockNode=markRemoteClockNode(uniform(0),'relative',table.epoch,suspension?null:table.nativeRoute??null,null,suspension?.reference??null,suspension?null:table.nativeResume??null),bindings=new Map(),idlePhases=new Map(),anchor=uniform(new Vector3(bindingAnchor.x,bindingAnchor.y,bindingAnchor.z)),parameters=uniform(new Vector4(table.count,table.columns,table.duration,anchorYaw)),heldFlag=uniform(suspension?1:0),heldPose=uniform(new Vector4(held[0],suspension?.height??0,held[1],held[4])),heldPhases=uniform(new Vector4(held[3],held[9],held[10],held[11])),heldArrived=uniform(held[6]);
 let disposed=false;
 const load=(index,column)=>textureLoad(texture,ivec2(index.mod(int(parameters.y)).mul(5).add(column),index.div(int(parameters.y))));
 const relativeTime=clockNode.sub(clockNode.abs().max(1).mul(.000000476837158203125)),timeNode=clamp(relativeTime,float(0),parameters.z);
 const state=Fn(()=>{
  const result=NativeState({pose:vec4(heldPose.xyz,heldPose.w.sub(parameters.w)),phases:heldPhases,mode:vec4(0,0,heldArrived,relativeTime.max(0))}).toVar();
  If(heldFlag.lessThan(.5),()=>{
  const time=timeNode.toVar(),low=int(0).toVar(),high=int(parameters.x).toVar();
  // Upper bound, then its predecessor: categorical values are right-continuous
  // at native knots. 15 bisections cover every supported 16385-row resource.
  Loop(15,()=>{If(low.lessThan(high),()=>{const middle=low.add(high).div(int(2)).toVar();If(load(middle,0).x.lessThanEqual(time),()=>{low.assign(middle.add(1));}).Else(()=>{high.assign(middle);});});});
  const index=low.sub(int(1)).max(int(0)).toVar(),next=index.add(int(1)).min(int(parameters.x).sub(1)).toVar(),a=load(index,0).toVar(),b=load(next,0).toVar(),span=b.x.sub(a.x),fraction=clamp(time.sub(a.x).div(span.max(1e-30)),float(0),float(1)),from=load(index,1).toVar(),to=load(next,1).toVar(),clips=load(index,2).toVar(),nextClips=load(next,2).toVar(),pose=mix(a.yzw,b.yzw,fraction),phases=mix(clips.yzw,nextClips.yzw,fraction);
  result.assign(NativeState({pose:vec4(pose,from.z.sub(parameters.w)),phases:vec4(mix(from.y,to.y,fraction),phases),mode:vec4(load(index,3).w,load(index,4).x,clips.x,time)}));
  });return result;
 })();
 const transform=base=>Fn(()=>{const sampled=state.toVar();return gpuActorLocalTransform(base,sampled.get('pose').xyz.add(vec3(0,heightOffset,0)),sampled.get('pose').w,anchor,int(1).greaterThan(0));})();
 const installed=Object.freeze({start,end,segments:suspension?0:table.count-1,...(table.nativeRoute?{nativeRoute:table.nativeRoute}:{nativeResume:table.nativeResume}),...(suspension?{nativeSuspended:suspension.reference}:{})});
 const phases=Object.freeze({Walk_Skip:state.get('phases').z,Run:state.get('phases').y,Carry_Crate:state.get('phases').w}),phaseFields=Object.freeze({Walk_Skip:'walkPhase',Run:'runPhase',Carry_Crate:'carryPhase'});
 // Gate Idle follows logical time while locomotion phases stay frozen.
 // Reduce the epoch by the clip period before converting it to a GPU float.
 function idleDuration(duration){if(!Number.isFinite(duration)||duration<=0)throw Error('Native idle requires its clip duration');}
 function sample(at){
  if(!suspension)return sampleNativeRouteGpuTable(table,at);
  if(!Number.isFinite(at)||at<suspension.reference.suspendedAt)throw TypeError('Invalid native suspension sample time');
  const raw=floorFloat32(at-table.epoch),relativeTime=Math.max(0,Math.fround(raw-Math.fround(Math.max(Math.abs(raw),1)*.000000476837158203125)));
  return {x:Math.fround(held[0]),y:Math.fround(suspension.height),z:Math.fround(held[1]),yaw:Math.fround(held[4]),distance:held[2],phase:Math.fround(held[3]),firstRemainingPoint:held[5],arrived:held[6],at,relativeTime,runPhase:Math.fround(held[9]),walkPhase:Math.fround(held[10]),carryPhase:Math.fround(held[11]),runDistance:held[12],walkDistance:held[13],runRemaining:held[14],running:0,currentSpeed:0};
 }
 function prepareSuspended({reference,nativePose,height,isCurrent}={}){
  if(disposed||suspension)throw Error('Native moving resource unavailable for suspension');
  reference=copyNativeSuspendedBodyReference(reference);const route=reference.nativeRoute,old=table.nativeRoute??{actorId:table.nativeResume.actorId,assignmentSequence:route.assignmentSequence,routeHandle:table.nativeResume.expectedRouteHandle};
  if(table.nativeResume&&route.assignmentSequence<=table.nativeResume.sourceControlSequence||route.actorId!==old.actorId||route.assignmentSequence!==old.assignmentSequence||['authorityEpoch','session','slot','generation'].some(key=>route.routeHandle[key]!==old.routeHandle[key])||!(nativePose instanceof Float64Array)||nativePose.length!==18||!nativePose.every(Number.isFinite)||[0,1,3,4,6,9,10,11].some(index=>!Number.isFinite(Math.fround(nativePose[index])))||![0,1].includes(nativePose[6])||nativePose[7]!==reference.suspendedAt||nativePose[15]!==0||nativePose[16]!==0||nativePose[17]!==2||reference.suspendedAt<table.epoch||reference.suspendedAt>table.end.at||!Number.isFinite(height)||!Number.isFinite(Math.fround(height))||typeof isCurrent!=='function'||isCurrent()!==true)throw TypeError('Invalid native suspended motion support');
  return createMotion({actorId,support,anchorYaw,heightOffset,anchorPosition:bindingAnchor,resourceRegistry},data,{reference,pose:Float64Array.from(nativePose),height,isCurrent});
 }
 function unbind(material){return unbindGpuMotionMaterial(bindings,material);}
 return {actorId,clockNode,timeNode,bindingAnchor,phaseNode:state.get('phases').x,runPhaseNode:phases.Run,walkPhaseNode:phases.Walk_Skip,carryPhaseNode:phases.Carry_Crate,runningNode:state.get('mode').x,idleNode:state.get('mode').y.lessThanEqual(0),currentSpeedNode:state.get('mode').y,arrivedNode:state.get('mode').z,
  prepareSuspended,
  bind(material){if(disposed)throw Error('Native GPU motion disposed');return bindGpuMotionMaterial(bindings,material,transform);},unbind,
  resolve(fallback,clip,duration){if(disposed)throw Error('Native GPU motion disposed');if(clip==='Idle'){idleDuration(duration);let node=idlePhases.get(duration);if(!node){node=uniform(table.epoch%duration).add(state.get('mode').w);idlePhases.set(duration,node);}return node;}if(!Object.hasOwn(phases,clip))throw Error('Unsupported native animation phase');return phases[clip];},
  sampleForClip(at,clip,duration){if(disposed)throw Error('Native GPU motion disposed');const value=sample(at);if(clip==='Idle'){idleDuration(duration);return Math.fround(Math.fround(table.epoch%duration)+Math.fround(value.relativeTime));}if(!Object.hasOwn(phaseFields,clip))throw Error('Unsupported native animation phase');return value[phaseFields[clip]];},
  sample(at){if(disposed)throw Error('Native GPU motion disposed');const value=sample(at);return {...value,y:value.y+heightOffset,dx:value.x-bindingAnchor.x,dy:value.y+heightOffset-bindingAnchor.y,dz:value.z-bindingAnchor.z,yawDelta:value.yaw-anchorYaw};},
  valid:()=>!disposed&&(suspension?suspension.isCurrent()===true:support.valid()===true),get texture(){return texture;},status(){return {disposed,sequence:table.nativeRoute?.assignmentSequence??null,...(table.nativeResume?{nativeResume:table.nativeResume}:{}),installed:disposed?null:installed,rows:table.count,columns:table.columns,bytes:table.data.byteLength,dataReferences:data.references(),...(suspension?{nativeSuspended:suspension.reference}:{})};},
  dispose(){if(disposed)return;disposed=true;for(const material of [...bindings.keys()])unbind(material);releaseData();}
 };
}
