import {nativeIdleCycleBodyState} from '../world/native-idle-cycle-body-source.js';
import {copyNativeIdleStrollProposal} from '../world/native-idle-stroll.js';
import {copyNativeIdleCycleReference} from '../world/native-idle-cycle.js';
import {copyNativeFarmArrivalRouteProposal} from '../world/native-farm-arrival-route.js';
import {copyNativeHomeRouteProposal} from '../world/native-home-route.js';
import {copyNativeTaskConsequenceProposal} from '../world/native-task-consequence.js';
import {copyNativeTaskSettlementReference} from '../world/native-task-settlement.js';
import {copyNativeInitialIdleBodyReference} from '../world/native-initial-idle-body.js';
import {copyNativeResumeProposal} from '../world/native-resume-presentation.js';
import {copyNativeTaskStartProposal} from '../world/native-task-start-presentation.js';
import {copyNativeTaskActionReference,nativeTaskActionActor} from '../world/native-task-action-presentation.js';
import {copyNativeSuspendedBodyReference} from '../world/native-suspended-body-reference.js';
import {historicalPhysicalActorIds} from '../simulation/worker-historical-physics-isolation.js';
import {createActorTerrainSampler} from './webgpu-actor-terrain.js';
import {copyNativeRoutePresentation,NATIVE_ROUTE_PRESENTATION_WIDTH} from '../world/native-route-presentation.js';

// One geometric kernel certifies heights on the currently visible native
// triangles. The historical and native-assignment entry points retain separate
// provenance contracts. Neither grants execution time, checks collision, plans
// a route, or certifies a skinned pose. Mesh inspection is cached by version.
export function createConfirmedTerrainSupport({residency,maxPieces=16384,maxActors=256,maxSourceSegments=4096,maxNativeSourceSegments=16384,heightTolerance=0.0001}={}){
 if(typeof residency?.get!=='function'||typeof residency?.getVisible!=='function'||typeof residency?.surface!=='function'||typeof residency?.surfaceInChunk!=='function'||typeof residency?.matchesManifest!=='function'||![maxPieces,maxActors,maxSourceSegments,maxNativeSourceSegments].every(value=>Number.isSafeInteger(value)&&value>0)||!Number.isFinite(heightTolerance)||heightTolerance<0)throw TypeError('Invalid confirmed terrain support');
 const cache=new WeakMap(),sampleActorTerrain=createActorTerrainSampler(residency);let closed=false;
 function inspect(mesh,cx,cz){
  if(!mesh?.isMesh||!mesh.parent||mesh.isSkinnedMesh||mesh.morphTargetInfluences||!mesh.geometry?.isBufferGeometry||Array.isArray(mesh.material))return null;for(let node=mesh;node;node=node.parent)if(node.visible===false)return null;const material=mesh.material;if(!material||material.visible===false||material.positionNode||material.vertexNode||material.displacementMap||material.transparent||material.opacity!==1||material.alphaTest>0||material.clippingPlanes?.length)return null;
  const positions=mesh.geometry.getAttribute('position'),index=mesh.geometry.index;if(!positions||positions.itemSize!==3||positions.count!==49*49||!(positions.array instanceof Float32Array)||!(index?.array instanceof Uint16Array||index?.array instanceof Uint32Array)||index.count!==48*48*6||mesh.geometry.drawRange.start!==0||mesh.geometry.drawRange.count<index.count)return null;
  mesh.updateWorldMatrix(true,false);const matrix=mesh.matrixWorld.elements,expected=[1,0,0,0,0,1,0,0,0,0,1,0,cx*48,0,cz*48,1];if(matrix.some((value,i)=>value!==expected[i]))return null;
  let prior=cache.get(mesh);if(prior&&prior.geometry===mesh.geometry&&prior.positions===positions&&prior.indices===index&&prior.positionArray===positions.array&&prior.indexArray===index.array&&prior.positionVersion===positions.version&&prior.indexVersion===index.version)return prior;
  const p=positions.array,indices=index.array;for(let z=0;z<49;z++)for(let x=0;x<49;x++){const i=(z*49+x)*3;if(p[i]!==x-24||p[i+2]!==z-24||!Number.isFinite(p[i+1]))return null;}
  for(let z=0;z<48;z++)for(let x=0;x<48;x++){const base=z*49+x,k=(z*48+x)*6;if(indices[k]!==base||indices[k+1]!==base+49||indices[k+2]!==base+1||indices[k+3]!==base+1||indices[k+4]!==base+49||indices[k+5]!==base+50)return null;}
  prior={mesh,cx,cz,geometry:mesh.geometry,positions,indices:index,positionArray:positions.array,indexArray:index.array,positionVersion:positions.version,indexVersion:index.version};cache.set(mesh,prior);return prior;
 }
 function stillValid(entry){const {mesh,cx,cz,geometry,positions,indices,positionArray,indexArray,positionVersion,indexVersion}=entry;if(residency.get(cx,cz)!==mesh||residency.getVisible(cx,cz)!==mesh||mesh.geometry!==geometry||geometry.getAttribute('position')!==positions||geometry.index!==indices||positions.array!==positionArray||indices.array!==indexArray||positions.version!==positionVersion||indices.version!==indexVersion)return false;return !!inspect(mesh,cx,cz);}
 function addCuts(cuts,a,b,budget,axis){const delta=b-a;if(delta===0)return true;const low=Math.min(a,b),high=Math.max(a,b),first=Math.floor(low)+1,last=Math.ceil(high)-1;if(last-first+1>budget)return false;for(let n=first;n<=last;n++){const t=(n-a)/delta;if(t>0&&t<1)cuts.push({t,[axis]:n});}return true;}
 function prepare(preview,{actorIds=null}={}){
  if(closed)throw Error('Confirmed terrain support disposed');if(actorIds!==null&&(!Array.isArray(actorIds)||actorIds.length>maxActors||actorIds.some(id=>typeof id!=='string'||!id)||new Set(actorIds).size!==actorIds.length))throw TypeError('Invalid terrain support actor selection');const wanted=actorIds===null?null:new Set(actorIds),trace=preview?.trace,manifest=trace?.terrainManifest;if(!Number.isSafeInteger(preview?.sequence)||preview.sequence<1||preview.safeForAutonomousPlayback!==false||!Array.isArray(preview.reasons)||!preview.reasons.includes('visual-time-and-support-unverified')||preview.reasons.some(reason=>reason!=='visual-time-and-support-unverified')||!trace||!Array.isArray(trace.actors)||trace.actors.length>(wanted?4096:maxActors)||!Number.isFinite(trace.start)||!Number.isFinite(trace.end)||trace.start!==preview.start||trace.end!==preview.end||trace.end<trace.start||!residency.matchesManifest(manifest))return null;
  return preparePaths(trace,{wanted,sequence:preview.sequence,physicalIds:historicalPhysicalActorIds(trace),sourceLimit:maxSourceSegments,exactManifest:true});
 }
 function prepareNativeRoute(value,{terrainManifest}={}){
  if(closed)throw Error('Confirmed terrain support disposed');
  let presentation;try{presentation=copyNativeRoutePresentation(value);}catch{return null;}
  return prepareNativeMotion(presentation,terrainManifest,String(presentation.nativeRoute.actorId),'native-route-terrain-support');
 }
 function prepareNativeResumeProposal(value,{terrainManifest}={}){
  if(closed)throw Error('Confirmed terrain support disposed');
  let presentation;try{presentation=copyNativeResumeProposal(value);}catch{return null;}
  return prepareNativeMotion(presentation,terrainManifest,String(presentation.actorId),'native-resume-terrain-support');
 }
 function prepareNativeMotion(presentation,terrainManifest,actorId,kind){
  // Native support depends on the complete corridor, not unrelated regions
  // announced by the authority. The kernel checks all used revisions below.
  const {rows,startTime:start,endTime:end}=presentation,width=NATIVE_ROUTE_PRESENTATION_WIDTH,segments=[];
  for(let i=width;i<rows.length;i+=width)segments.push({t0:rows[i-width],t1:rows[i],x0:rows[i-width+1],z0:rows[i-width+2],x1:rows[i+1],z1:rows[i+2]});
  const trace={start,end,terrainManifest,actors:[{actorId,continuous:true,timed:true,start:{at:start,x:rows[1],z:rows[2]},end:{at:end,x:rows.at(-width+1),z:rows.at(-width+2)},segments}]},result=preparePaths(trace,{wanted:null,sequence:presentation.nativeRoute?.assignmentSequence??null,physicalIds:[],sourceLimit:maxNativeSourceSegments,exactManifest:false});
  return result?Object.freeze({kind,presentation,actor:result.actors[0],valid:result.valid,unchangedBy:result.unchangedBy}):null;
 }
 // A pinned native body needs only its executed point's triangle, never the
 // future suffix's terrain. This is geometric support, not a motion permission.
 function prepareNativeBody(value,nativePose){
  if(closed)throw Error('Confirmed terrain support disposed');
  const reference=copyNativeSuspendedBodyReference(value);
  if(!(nativePose instanceof Float64Array)||nativePose.length!==18||!nativePose.every(Number.isFinite)||nativePose[7]!==reference.suspendedAt||nativePose[15]!==0||nativePose[16]!==0)return null;
  const x=nativePose[0],z=nativePose[1],cx=Math.floor((x+24)/48),cz=Math.floor((z+24)/48),revision=residency.revisionAt?.(cx,cz);if(!revision||typeof revision.epoch!=='string')return null;
  const point={at:reference.suspendedAt,x,z},manifest={epoch:revision.epoch,chunks:[{cx,cz,revision:revision.revision}]},actorId=String(reference.nativeRoute.actorId),trace={start:point.at,end:point.at,terrainManifest:manifest,actors:[{actorId,continuous:true,timed:true,start:point,end:point,segments:[]}]};
  if(!residency.matchesManifest(manifest))return null;
  const result=preparePaths(trace,{wanted:null,sequence:reference.nativeRoute.assignmentSequence,physicalIds:[],sourceLimit:maxNativeSourceSegments,exactManifest:false});
  return result?Object.freeze({kind:'native-body-terrain-support',reference,point:Object.freeze({...point,height:result.actors[0].startHeight}),valid:result.valid,unchangedBy:result.unchangedBy}):null;
 }
 function prepareNativeTaskAction(value){
  if(closed)throw Error('Confirmed terrain support disposed');
  const reference=copyNativeTaskActionReference(value);
  return prepareStationaryPoint(reference,reference.origin,reference.startTime,String(nativeTaskActionActor(reference.request)),'native-task-action-terrain-support');
 }
 function prepareNativeTaskSettlement(value){
  if(closed)throw Error('Confirmed terrain support disposed');
  const reference=copyNativeTaskSettlementReference(value);
  return prepareStationaryPoint(reference,reference.pose,reference.worldBoundary.effectiveTime,String(reference.actorId),'native-task-settlement-terrain-support');
 }
 function prepareNativeIdleCycle(value){
  if(closed)throw Error('Confirmed terrain support disposed');
  const reference=copyNativeIdleCycleReference(value);
  return prepareStationaryPoint(reference,nativeIdleCycleBodyState(reference.sourceBody).pose,reference.worldBoundary.effectiveTime,String(reference.actorId),'native-idle-cycle-terrain-support');
 }
 function prepareNativeInitialIdleBody(value){
  if(closed)throw Error('Confirmed terrain support disposed');
  const reference=copyNativeInitialIdleBodyReference(value);
  return prepareStationaryPoint(reference,reference.sourceRequest.pose,reference.worldBoundary.effectiveTime,String(reference.actorId),'native-initial-idle-body-terrain-support');
 }
 function prepareStationaryPoint(reference,{x,z},at,actorId,kind){
  const cx=Math.floor((x+24)/48),cz=Math.floor((z+24)/48),revision=residency.revisionAt?.(cx,cz);
  if(!revision||typeof revision.epoch!=='string')return null;
  const point={at,x,z},manifest={epoch:revision.epoch,chunks:[{cx,cz,revision:revision.revision}]},trace={start:point.at,end:point.at,terrainManifest:manifest,actors:[{actorId,continuous:true,timed:true,start:point,end:point,segments:[]}]};
  if(!residency.matchesManifest(manifest))return null;
  const result=preparePaths(trace,{wanted:null,sequence:null,physicalIds:[],sourceLimit:maxNativeSourceSegments,exactManifest:false});
  return result?Object.freeze({kind,reference,point:Object.freeze({...point,height:result.actors[0].startHeight}),valid:result.valid,unchangedBy:result.unchangedBy}):null;
 }
 // Private geometry-only kernel. Callers cannot weaken the historical entry's
 // safety checks by passing native data or arbitrary validation options to it.
 function preparePaths(trace,{wanted,sequence,physicalIds,sourceLimit,exactManifest}){
  const manifest=trace.terrainManifest;
  // Validate the full declaration even when only its used subset must reside.
  if(!manifest||typeof manifest.epoch!=='string'||!manifest.epoch||!Array.isArray(manifest.chunks)||!manifest.chunks.length)return null;
  const declared=new Set();for(const chunk of manifest.chunks){if(!Number.isSafeInteger(chunk?.cx)||!Number.isSafeInteger(chunk.cz)||!Number.isSafeInteger(chunk.revision)||chunk.revision<1)return null;const key=chunk.cx+','+chunk.cz;if(declared.has(key))return null;declared.add(key);}
  const manifestKeys=declared,used=new Map(),samples=new Map(),actors=[],ids=new Set();let count=0,sourceSegments=0;
  function entryAt(cx,cz){const key=`${cx},${cz}`;if(!manifestKeys.has(key))return null;const mesh=residency.get(cx,cz);if(!mesh||mesh!==residency.getVisible(cx,cz))return null;const entry=used.get(key)??inspect(mesh,cx,cz);if(entry)used.set(key,entry);return entry;}
  function sample(x,z){if(!Number.isFinite(x)||!Number.isFinite(z))return null;const key=`${x},${z}`;if(samples.has(key))return samples.get(key);const cx=Math.floor((x+24)/48),cz=Math.floor((z+24)/48);if(!entryAt(cx,cz))return null;const exact=residency.surface(x,z),actual=sampleActorTerrain(x,z);if(!Number.isFinite(exact)||!Number.isFinite(actual)||Math.abs(exact-actual)>heightTolerance)return null;const value={height:exact};samples.set(key,value);return value;}
  function piece(out,t0,t1,x0,z0,x1,z1){
   const cuts=[{t:0,x:x0,z:z0},{t:1,x:x1,z:z1}],budget=maxPieces-count;
   if(!addCuts(cuts,x0,x1,budget,'x')||!addCuts(cuts,z0,z1,budget,'z')||!addCuts(cuts,x0+z0,x1+z1,budget,'sum'))return false;
   cuts.sort((a,b)=>a.t-b.t);const unique=[];for(const cut of cuts){const previous=unique.at(-1);if(previous?.t===cut.t)Object.assign(previous,cut);else unique.push({...cut});}
   // Compute one shared intersection per grid plane, preserving its known
   // coordinate and the exact native endpoints/times. Reusing it on both sides
   // avoids selecting the adjacent chunk after a rounded parameter round-trip.
   const points=unique.map(cut=>{const x=cut.x??(x0+(x1-x0)*cut.t),z=cut.z??(cut.sum===undefined?z0+(z1-z0)*cut.t:cut.sum-x);return {x,z,at:cut.t===0?t0:cut.t===1?t1:t0+(t1-t0)*cut.t};});
   for(let i=1;i<points.length;i++){
    if(++count>maxPieces)return false;const a=points[i-1],b=points[i],mx=(a.x+b.x)*.5,mz=(a.z+b.z)*.5,entry=entryAt(Math.floor((mx+24)/48),Math.floor((mz+24)/48)),from=sample(a.x,a.z),to=sample(b.x,b.z);
    if(!entry||!from||!to)return false;
    const y0=residency.surfaceInChunk(entry.cx,entry.cz,a.x,a.z),y1=residency.surfaceInChunk(entry.cx,entry.cz,b.x,b.z);
    if(!Number.isFinite(y0)||!Number.isFinite(y1)||Math.abs(y0-from.height)>heightTolerance||Math.abs(y1-to.height)>heightTolerance||b.at<=a.at)return false;
    out.push(Object.freeze({t0:a.at,t1:b.at,x0:a.x,z0:a.z,y0:from.height,x1:b.x,z1:b.z,y1:to.height}));
   }return true;
  }
  for(const actor of trace.actors){if(wanted&&!wanted.has(actor?.actorId))continue;const physical=physicalIds.includes(actor?.actorId);if(typeof actor?.actorId!=='string'||!actor.actorId||ids.has(actor.actorId)||!physical&&actor.continuous!==true||actor.timed!==true||!Array.isArray(actor.segments)||actor.start?.at!==trace.start||actor.end?.at!==trace.end)return null;ids.add(actor.actorId);if(physical){for(const frame of trace.physicsPoseSamples.samples){const pose=frame.poses?.find(p=>p.actorId===actor.actorId),box=frame.bounds?.find(b=>b.actorId===actor.actorId);if(!pose||!box||!sample(pose.root[0],pose.root[2]))return null;const x0=Math.floor((box.minX+24)/48),x1=Math.floor((box.maxX+24)/48),z0=Math.floor((box.minZ+24)/48),z1=Math.floor((box.maxZ+24)/48);if(![x0,x1,z0,z1].every(Number.isSafeInteger)||(x1-x0+1)*(z1-z0+1)>maxPieces-count)return null;for(let z=z0;z<=z1;z++)for(let x=x0;x<=x1;x++){if(++count>maxPieces||!entryAt(x,z))return null;}}actors.push(Object.freeze({actorId:actor.actorId,physical:true,segments:Object.freeze([])}));continue;}sourceSegments+=actor.segments.length;if(sourceSegments>sourceLimit)return null;let x=actor.start.x,z=actor.start.z,t=trace.start;const initial=sample(x,z),segments=[];if(!initial)return null;
   for(const segment of actor.segments){if(![segment?.t0,segment?.t1,segment?.x0,segment?.z0,segment?.x1,segment?.z1].every(Number.isFinite)||segment.t0<t||segment.t1<=segment.t0||segment.t1>trace.end||segment.x0!==x||segment.z0!==z)return null;if(segment.t0>t&&!piece(segments,t,segment.t0,x,z,x,z))return null;if(!piece(segments,segment.t0,segment.t1,x,z,segment.x1,segment.z1))return null;t=segment.t1;x=segment.x1;z=segment.z1;}
   if(x!==actor.end.x||z!==actor.end.z)return null;if(t<trace.end&&!piece(segments,t,trace.end,x,z,x,z))return null;const final=sample(x,z);if(!final)return null;actors.push(Object.freeze({actorId:actor.actorId,startHeight:initial.height,endHeight:final.height,segments:Object.freeze(segments)}));
  }
  if(wanted&&ids.size!==wanted.size)return null;const entries=[...used.values()];const snapshot=structuredClone(exactManifest?manifest:{epoch:manifest.epoch,chunks:manifest.chunks.filter(chunk=>used.has(`${chunk.cx},${chunk.cz}`))});if(!residency.matchesManifest(snapshot)||entries.some(entry=>!stillValid(entry)))return null;return Object.freeze({sequence,start:trace.start,end:trace.end,actors:Object.freeze(actors),unchangedBy(view){return !!view&&view.changedKeys instanceof Set&&entries.every(entry=>!view.changedKeys.has(`${entry.cx},${entry.cz}`)||view.get?.(entry.cx,entry.cz)===entry.mesh);},valid(){return !closed&&(exactManifest||typeof residency.revisionAt!=='function'?residency.matchesManifest(snapshot):entries.every(entry=>residency.revisionAt(entry.cx,entry.cz)?.epoch===snapshot.epoch))&&entries.every(stillValid);}});
 }
 function audit(preview){
  const manifest=preview?.trace?.terrainManifest,actors=preview?.trace?.actors;if(closed||!Array.isArray(actors))return {reason:'unavailable'};
  let matches=false;try{matches=residency.matchesManifest(manifest)===true;}catch{}
  const chunks=[],points=[],seen=new Set();
  function inspectDetails(mesh,cx,cz){if(!mesh)return null;const material=mesh.material,geometry=mesh.geometry,positions=geometry?.getAttribute?.('position'),index=geometry?.index,ancestors=[];for(let node=mesh;node;node=node.parent)ancestors.push({type:node.type,visible:node.visible});mesh.updateWorldMatrix(true,false);const matrix=mesh.matrixWorld.elements,expected=[1,0,0,0,0,1,0,0,0,0,1,0,cx*48,0,cz*48,1];let positionMismatch=null,indexMismatch=null;if(positions?.array instanceof Float32Array&&positions.count===49*49)for(let z=0;z<49&&!positionMismatch;z++)for(let x=0;x<49;x++){const i=(z*49+x)*3,p=positions.array;if(p[i]!==x-24||p[i+2]!==z-24||!Number.isFinite(p[i+1])){positionMismatch={x,z,values:[p[i],p[i+1],p[i+2]]};break;}}if((index?.array instanceof Uint16Array||index?.array instanceof Uint32Array)&&index.count===48*48*6)for(let z=0;z<48&&!indexMismatch;z++)for(let x=0;x<48;x++){const base=z*49+x,k=(z*48+x)*6,actual=Array.from(index.array.slice(k,k+6)),want=[base,base+49,base+1,base+1,base+49,base+50];if(actual.some((v,i)=>v!==want[i])){indexMismatch={x,z,actual,expected:want};break;}}return {type:mesh.type,parent:!!mesh.parent,skinned:!!mesh.isSkinnedMesh,morphTargetInfluences:!!mesh.morphTargetInfluences,ancestors,material:Array.isArray(material)?{array:true}:material?{type:material.type,visible:material.visible,positionNode:!!material.positionNode,vertexNode:!!material.vertexNode,displacementMap:!!material.displacementMap,transparent:material.transparent,opacity:material.opacity,alphaTest:material.alphaTest,clippingPlanes:material.clippingPlanes?.length??0}:null,geometry:geometry?{type:geometry.type,positionCount:positions?.count??null,positionItemSize:positions?.itemSize??null,positionArray:positions?.array?.constructor?.name??null,indexCount:index?.count??null,indexArray:index?.array?.constructor?.name??null,drawStart:geometry.drawRange.start,drawCount:geometry.drawRange.count,positionMismatch,indexMismatch}:null,matrix:Array.from(matrix),expectedMatrix:expected};}
  for(const actor of actors){for(const point of [actor.start,actor.end]){if(!Number.isFinite(point?.x)||!Number.isFinite(point?.z))continue;const cx=Math.floor((point.x+24)/48),cz=Math.floor((point.z+24)/48),key=`${cx},${cz}`;if(!seen.has(key)){seen.add(key);const mesh=residency.get(cx,cz),visible=residency.getVisible(cx,cz),canonical=!!mesh&&!!inspect(mesh,cx,cz);chunks.push({cx,cz,manifest:!!manifest?.chunks?.some(chunk=>chunk.cx===cx&&chunk.cz===cz),resident:!!mesh,visible:!!mesh&&mesh===visible,canonical,...(!canonical?{details:inspectDetails(mesh,cx,cz)}:{})});}if(points.length<128){let exact=null,sampled=null;try{exact=residency.surface(point.x,point.z);sampled=sampleActorTerrain(point.x,point.z);}catch{}points.push({actorId:actor.actorId,x:point.x,z:point.z,exact:Number.isFinite(exact)?exact:null,sampled:Number.isFinite(sampled)?sampled:null});}}}
  return {manifestMatches:matches,chunks,points,pointLimit:128,note:'Endpoint diagnostics only; segment cuts and limits are not re-evaluated.'};
 }
 return {prepare,prepareNativeRoute,prepareNativeResumeProposal,prepareNativeIdleStrollProposal(value,{terrainManifest}={}){if(closed)throw Error('Confirmed terrain support disposed');let presentation;try{presentation=copyNativeIdleStrollProposal(value);}catch{return null;}return prepareNativeMotion(presentation,terrainManifest,String(presentation.actorId),'native-idle-stroll-terrain-support');},prepareNativeFarmArrivalProposal(value,{terrainManifest}={}){if(closed)throw Error('Confirmed terrain support disposed');let presentation;try{presentation=copyNativeFarmArrivalRouteProposal(value);}catch{return null;}return prepareNativeMotion(presentation,terrainManifest,String(presentation.actorId),'native-farm-arrival-terrain-support');},prepareNativeHomeRouteProposal(value,{terrainManifest}={}){if(closed)throw Error('Confirmed terrain support disposed');let presentation;try{presentation=copyNativeHomeRouteProposal(value);}catch{return null;}return prepareNativeMotion(presentation,terrainManifest,String(presentation.actorId),'native-home-route-terrain-support');},prepareNativeTaskConsequenceProposal(value,{terrainManifest}={}){if(closed)throw Error('Confirmed terrain support disposed');let presentation;try{presentation=copyNativeTaskConsequenceProposal(value);}catch{return null;}return prepareNativeMotion(presentation,terrainManifest,String(presentation.actorId),'native-task-consequence-terrain-support');},prepareNativeTaskStartProposal(value,{terrainManifest}={}){if(closed)throw Error('Confirmed terrain support disposed');let presentation;try{presentation=copyNativeTaskStartProposal(value);}catch{return null;}return prepareNativeMotion(presentation,terrainManifest,String(presentation.actorId),'native-task-start-terrain-support');},prepareNativeBody,prepareNativeTaskAction,prepareNativeTaskSettlement,prepareNativeInitialIdleBody,prepareNativeIdleCycle,audit,dispose(){closed=true;}};
}
