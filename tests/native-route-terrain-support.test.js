import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createNativeRouteExecutionFixture} from './helpers/native-route-execution.js';
import {createWebGpuTerrainResidency} from '../src/rendering/webgpu-terrain-residency.js';
import {createConfirmedTerrainSupport} from '../src/rendering/confirmed-terrain-support.js';
import {copyNativeRoutePresentation,NATIVE_ROUTE_PRESENTATION_WIDTH as width} from '../src/world/native-route-presentation.js';
import {createChunkPublicationCoordinator} from '../src/rendering/webgpu-chunk-publication.js';

function fixture(options={}){
 const native=createNativeRouteExecutionFixture(),scene=new THREE.Scene(),material=new THREE.MeshBasicMaterial({side:THREE.DoubleSide}),residency=createWebGpuTerrainResidency({scene,material}),chunks=[];
 for(let z=-1;z<=1;z++)for(let x=-1;x<=1;x++){native.session.core.selectChunk(x,z);residency.replace(native.session.core.chunkPayload(),1,'terrain');chunks.push({cx:x,cz:z,revision:1});}
 const terrainManifest={epoch:'terrain',chunks},support=createConfirmedTerrainSupport({residency,...options}),handle=native.worker(1,native.point(-6,0),native.point(6,0),{urgent:true,runRemaining:3.25}),packet=native.bridge.captureNativeRoutePresentation(handle);
 return {...native,scene,material,residency,support,packet,terrainManifest,close(){support.dispose();residency.dispose();material.dispose();native.session.dispose();}};
}
function verifyTriangles(f,result){
 assert(result);assert.equal(result.kind,'native-route-terrain-support');assert.equal(result.valid(),true);const {actor,presentation}=result,ray=new THREE.Raycaster(),position=new THREE.Vector3(),direction=new THREE.Vector3(0,-1,0);f.scene.updateMatrixWorld(true);
 assert.equal(actor.actorId,String(presentation.nativeRoute.actorId));assert.equal(actor.segments[0].t0,presentation.startTime);assert.equal(actor.segments.at(-1).t1,presentation.endTime);
 for(const part of actor.segments)for(const fraction of [.11,.53,.89]){
  const at=part.t0+(part.t1-part.t0)*fraction,x=part.x0+(part.x1-part.x0)*fraction,z=part.z0+(part.z1-part.z0)*fraction,y=part.y0+(part.y1-part.y0)*fraction;
  position.set(x,1e4,z);ray.set(position,direction);const hit=ray.intersectObject(f.residency.get(Math.floor((x+24)/48),Math.floor((z+24)/48)),false)[0];assert(hit);assert(Math.abs(hit.point.y-y)<1e-7,'height must follow actual triangles between cuts');
  const expected=f.bridge.sampleNativeRoute(presentation.nativeRoute.routeHandle,at);assert(Math.abs(expected.x-x)<1e-8);assert(Math.abs(expected.z-z)<1e-8);
 }
}

test('a native assignment gets exact 3D support from the actual resident WASM terrain',()=>{
 const f=fixture();try{const body=f.body(1),before=f.packet.rows.slice(),result=f.support.prepareNativeRoute(f.packet,{terrainManifest:f.terrainManifest});verifyTriangles(f,result);assert(result.actor.segments.length>10);assert.deepEqual(result.presentation.nativeRoute,f.packet.nativeRoute);assert.equal(result.presentation.authorizedAutonomy,false);assert.deepEqual(f.body(1),body);assert.deepEqual(f.packet.rows,before);assert.notEqual(result.presentation.rows.buffer,f.packet.rows.buffer);f.packet.rows.fill(-99);assert.deepEqual(result.presentation.rows,before);assert.equal(result.valid(),true);}finally{f.close();}
});

test('native support retains unchanged meshes when an unrelated chunk is replaced',()=>{
 const f=fixture();try{const result=f.support.prepareNativeRoute(f.packet,{terrainManifest:f.terrainManifest}),mesh=f.residency.get(0,0);assert(result?.valid());f.session.core.selectChunk(1,1);f.residency.replace(f.session.core.chunkPayload(),2,'terrain');assert.equal(f.residency.matchesManifest(f.terrainManifest),false);assert.equal(result.valid(),true);assert.equal(f.residency.get(0,0),mesh);const part=result.actor.segments[0],cx=Math.floor((part.x0+24)/48),cz=Math.floor((part.z0+24)/48);f.session.core.selectChunk(cx,cz);f.residency.replace(f.session.core.chunkPayload(),2,'terrain');assert.equal(result.valid(),false);}finally{f.close();}
});

test('native height proof expires when a used triangle buffer changes or its owner is disposed',()=>{
 const f=fixture();try{const result=f.support.prepareNativeRoute(f.packet,{terrainManifest:f.terrainManifest}),part=result.actor.segments[0],mesh=f.residency.get(Math.floor((part.x0+24)/48),Math.floor((part.z0+24)/48));mesh.geometry.attributes.position.needsUpdate=true;assert.equal(result.valid(),false);const next=f.support.prepareNativeRoute(f.packet,{terrainManifest:f.terrainManifest});assert(next?.valid());f.support.dispose();assert.equal(next.valid(),false);assert.throws(()=>f.support.prepareNativeRoute(f.packet,{terrainManifest:f.terrainManifest}),/disposed/);}finally{f.close();}
});

test('native support names every full-route chunk that must retain its confirmed revision',()=>{
 const f=fixture();try{const result=f.support.prepareNativeRoute(f.packet,{terrainManifest:f.terrainManifest});assert(result?.valid());assert.equal(result.unchangedBy({changedKeys:new Set(['1,1'])}),true);const part=result.actor.segments.at(-1),key=`${Math.floor((part.x1+24)/48)},${Math.floor((part.z1+24)/48)}`;assert.equal(result.unchangedBy({changedKeys:new Set([key])}),false);assert.equal(result.unchangedBy({}),false);assert.equal(result.valid(),true);}finally{f.close();}
});

test('a real retained terrain revision preserves native support on the same mesh and epoch',()=>{
 const f=createNativeRouteExecutionFixture(),scene=new THREE.Scene(),material=new THREE.MeshBasicMaterial({side:THREE.DoubleSide}),admission={prepare(){},async prepareManyAndPublish(){throw Error('Unexpected legacy publication');},deferRelease(_object,release){release();}},coordinator=createChunkPublicationCoordinator({admission}),residency=createWebGpuTerrainResidency({scene,material,pipelineAdmission:admission,coordinator}),terrain=createConfirmedTerrainSupport({residency});try{f.session.core.selectChunk(0,0);const payload=f.session.core.chunkPayload(),first=residency.prepareRevision(payload,1,'terrain',{publicationOrder:1}).participant();first.activate();first.attach();let result=first.finalize();result.retire();result.notify();const handle=f.worker(1,f.point(-6,0),f.point(6,0)),packet=f.bridge.captureNativeRoutePresentation(handle),manifest={epoch:'terrain',chunks:[{cx:0,cz:0,revision:1}]},support=terrain.prepareNativeRoute(packet,{terrainManifest:manifest}),mesh=residency.get(0,0);assert(support?.valid());assert.equal(support.unchangedBy({changedKeys:new Set(['0,0']),get:()=>mesh}),true);const part=residency.prepareRetainedRevision(payload,2,'terrain',{publicationOrder:2}).participant();part.activate();part.attach();result=part.finalize();result.retire();result.notify();assert.equal(residency.revisionAt(0,0).revision,2);assert.equal(residency.matchesManifest(manifest),false);assert.equal(support.valid(),true);assert.equal(residency.get(0,0),mesh);mesh.geometry.attributes.position.needsUpdate=true;assert.equal(support.valid(),false);}finally{terrain.dispose();residency.dispose();coordinator.dispose();material.dispose();f.session.dispose();}
});

test('long native assignments use the complete timetable rather than historical segment limits',()=>{
 const f=fixture();try{const points=Array.from({length:130},(_,i)=>f.point(i%2?5:-5,0)),origin=f.point(-6,0),end=points.at(-1),ptr=f.w.nav_intent_attack_route_input_ptr(points.length);new Float32Array(f.w.memory.buffer,ptr,points.length*2).set(points.flatMap(p=>[p.x,p.z]));assert.equal(f.w.nav_intent_restore_home(900011,origin.x,origin.z,end.x,end.z,points.length),1);const raw=f.bridge.intentChanges().at(-1).routeHandle,prepared=f.bridge.prepareNativeRouteMotion(raw,{radius:.28});assert.equal(prepared.status,'prepared');const packet=f.bridge.captureNativeRoutePresentation(prepared.routeHandle);assert(packet.rows.length/width>64);const result=f.support.prepareNativeRoute(packet,{terrainManifest:f.terrainManifest});assert(result);assert(result.actor.segments.length>256);assert.equal(result.actor.segments.at(-1).t1,packet.endTime);for(let i=width;i<packet.rows.length;i+=width)assert(result.actor.segments.some(part=>part.t1===packet.rows[i]));}finally{f.close();}
});

test('capacity, missing native rows and unsupported terrain reject the whole preparation',()=>{
 const f=fixture({maxPieces:1});try{assert.equal(f.support.prepareNativeRoute(f.packet,{terrainManifest:f.terrainManifest}),null);const other=createConfirmedTerrainSupport({residency:f.residency,maxNativeSourceSegments:1});try{assert.equal(other.prepareNativeRoute(f.packet,{terrainManifest:f.terrainManifest}),null);}finally{other.dispose();}const unlimited=createConfirmedTerrainSupport({residency:f.residency});try{assert(unlimited.prepareNativeRoute(f.packet,{terrainManifest:f.terrainManifest}));const bad=structuredClone(f.packet);bad.rows=bad.rows.slice(width);assert.equal(unlimited.prepareNativeRoute(bad,{terrainManifest:f.terrainManifest}),null);const first=f.packet.rows,cx=Math.floor((first[1]+24)/48),cz=Math.floor((first[2]+24)/48);f.residency.get(cx,cz).material.positionNode={isNode:true};assert.equal(unlimited.prepareNativeRoute(f.packet,{terrainManifest:f.terrainManifest}),null);}finally{unlimited.dispose();}}finally{f.close();}
});

test('native resource validation rejects malformed samples and unrelated authority identities',()=>{
 const f=fixture();try{const invalid=[v=>v.version++,v=>v.authorizedAutonomy=true,v=>v.rows[width]=v.rows[0],v=>v.rows[1]=NaN,v=>v.rows[6]=.5,v=>v.rows[7]=2,v=>v.rows[14]=-1,v=>v.rows[15]=-1,v=>v.nativeRoute.assignmentSequence=0,v=>v.nativeRoute.routeHandle.generation=0,v=>v.motionMode='forecast',v=>v.endTime++,v=>v.rows=new Float32Array(v.rows),v=>v.worldBoundary={version:1,authorityEpoch:'other',nativeSession:1,ticket:1,effectiveTime:10}];for(const mutate of invalid){const value=structuredClone(f.packet);mutate(value);assert.throws(()=>copyNativeRoutePresentation(value),TypeError);assert.equal(f.support.prepareNativeRoute(value,{terrainManifest:f.terrainManifest}),null);}const copy=copyNativeRoutePresentation(f.packet);assert(Object.isFrozen(copy));assert(Object.isFrozen(copy.nativeRoute.routeHandle));assert.notEqual(copy.rows.buffer,f.packet.rows.buffer);}finally{f.close();}
});

test('native resources cannot bypass the historical support acceptance contract',()=>{
 const f=fixture();try{assert.equal(f.support.prepare(f.packet),null);assert.equal(f.support.prepare({sequence:1,start:f.packet.startTime,end:f.packet.endTime,safeForAutonomousPlayback:true,reasons:[],trace:{actors:[],terrainManifest:f.terrainManifest,start:f.packet.startTime,end:f.packet.endTime}}),null);}finally{f.close();}
});

test('native world identity is copied and cannot be paired with another session',()=>{
 const f=fixture();try{const value=structuredClone(f.packet),handle=value.nativeRoute.routeHandle;value.worldBoundary={version:1,authorityEpoch:handle.authorityEpoch,nativeSession:handle.session,ticket:1,effectiveTime:10};const copy=copyNativeRoutePresentation(value);assert(Object.isFrozen(copy.worldBoundary));value.worldBoundary.ticket=99;assert.equal(copy.worldBoundary.ticket,1);value.worldBoundary.nativeSession++;assert.throws(()=>copyNativeRoutePresentation(value),/another world/);value.worldBoundary={...copy.worldBoundary};value.rows=new Float64Array((16384+1)*width);assert.throws(()=>copyNativeRoutePresentation(value),TypeError);}finally{f.close();}
});

test('an already arrived native route retains its one terminal sample without inventing time or a segment',()=>{
 const f=fixture();try{const raw=f.point(-6,0),position={x:Math.fround(raw.x),z:Math.fround(raw.z)},handle=f.worker(1,position,position),packet=f.bridge.captureNativeRoutePresentation(handle);assert.equal(packet.rows.length,width);assert.equal(packet.startTime,packet.endTime);const result=f.support.prepareNativeRoute(packet,{terrainManifest:f.terrainManifest});assert(result?.valid());assert.equal(result.actor.startHeight,result.actor.endHeight);assert.deepEqual(result.actor.segments,[]);}finally{f.close();}
});

test('native corridor admission ignores an unmaterialized unrelated region but historical admission remains global',()=>{
 const f=fixture();try{
  const manifest=structuredClone(f.terrainManifest);manifest.chunks.push({cx:2,cz:1,revision:1});assert.equal(f.residency.matchesManifest(manifest),false);
  const result=f.support.prepareNativeRoute(f.packet,{terrainManifest:manifest});verifyTriangles(f,result);
  const p=f.packet,segments=[];for(let i=width;i<p.rows.length;i+=width)segments.push({t0:p.rows[i-width],t1:p.rows[i],x0:p.rows[i-width+1],z0:p.rows[i-width+2],x1:p.rows[i+1],z1:p.rows[i+2]});
  const trace={start:p.startTime,end:p.endTime,terrainManifest:structuredClone(f.terrainManifest),actors:[{actorId:'a',continuous:true,timed:true,start:{at:p.startTime,x:p.rows[1],z:p.rows[2]},end:{at:p.endTime,x:p.rows.at(-width+1),z:p.rows.at(-width+2)},segments}]},preview={sequence:1,start:p.startTime,end:p.endTime,safeForAutonomousPlayback:false,reasons:['visual-time-and-support-unverified'],trace};
  assert(f.support.prepare(preview)?.valid());trace.terrainManifest=manifest;assert.equal(f.support.prepare(preview),null);
  f.session.core.selectChunk(2,1);f.residency.replace(f.session.core.chunkPayload(),1,'terrain');assert(result.valid());
 }finally{f.close();}
});
test('new native corridor preparation permits an unrelated stale revision, not a stale used revision',()=>{
 const f=fixture();try{f.session.core.selectChunk(1,1);f.residency.replace(f.session.core.chunkPayload(),2,'terrain');assert.equal(f.residency.matchesManifest(f.terrainManifest),false);verifyTriangles(f,f.support.prepareNativeRoute(f.packet,{terrainManifest:f.terrainManifest}));
  f.session.core.selectChunk(0,0);f.residency.replace(f.session.core.chunkPayload(),2,'terrain');assert.equal(f.support.prepareNativeRoute(f.packet,{terrainManifest:f.terrainManifest}),null);
 }finally{f.close();}
});
test('native subset never hides malformed declaration, duplicates or invalid epoch',()=>{
 const f=fixture();try{for(const mutate of [m=>m.chunks.push({...m.chunks[0]}),m=>m.chunks.push({cx:2,cz:1,revision:0}),m=>m.chunks.push({cx:NaN,cz:1,revision:1}),m=>m.epoch='',m=>m.epoch='foreign',m=>m.chunks=[],m=>m.chunks=null]){const m=structuredClone(f.terrainManifest);mutate(m);assert.equal(f.support.prepareNativeRoute(f.packet,{terrainManifest:m}),null);}for(const m of [undefined,null,{}])assert.equal(f.support.prepareNativeRoute(f.packet,{terrainManifest:m}),null);}finally{f.close();}
});
test('native corridor still rejects used terrain absent from declaration, hidden or removed',()=>{
 const f=fixture();try{const m=structuredClone(f.terrainManifest);m.chunks=m.chunks.filter(c=>c.cx!==0||c.cz!==0);assert.equal(f.support.prepareNativeRoute(f.packet,{terrainManifest:m}),null);
  const mesh=f.residency.get(0,0);mesh.visible=false;assert.equal(f.support.prepareNativeRoute(f.packet,{terrainManifest:f.terrainManifest}),null);mesh.visible=true;const result=f.support.prepareNativeRoute(f.packet,{terrainManifest:f.terrainManifest});assert(result?.valid());f.residency.remove(0,0,2);assert.equal(result.valid(),false);assert.equal(f.support.prepareNativeRoute(f.packet,{terrainManifest:f.terrainManifest}),null);
 }finally{f.close();}
});
test('admitted native support snapshots its used declaration and expires on used geometry changes',()=>{
 const f=fixture();try{const m=structuredClone(f.terrainManifest);m.chunks.push({cx:2,cz:1,revision:1});const result=f.support.prepareNativeRoute(f.packet,{terrainManifest:m});assert(result?.valid());m.epoch='mutated';m.chunks.length=0;assert(result.valid());f.residency.get(0,0).geometry.attributes.position.needsUpdate=true;assert.equal(result.valid(),false);}finally{f.close();}
});
