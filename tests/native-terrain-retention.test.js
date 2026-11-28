import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import * as THREE from 'three';
import {createSpatialWorld} from '../src/world/wild-engine/spatial-world.js';
import {createWebGpuTerrainResidency} from '../src/rendering/webgpu-terrain-residency.js';
import {createChunkPublicationCoordinator} from '../src/rendering/webgpu-chunk-publication.js';
import {createWebGpuPipelineAdmission} from '../src/rendering/webgpu-pipeline-admission.js';
import {prepareWebGpuTemporalTerrain} from '../src/rendering/webgpu-temporal-terrain.js';

const module=new WebAssembly.Module(readFileSync(new URL('../src/world/wild-engine/spatial-savanna.wasm',import.meta.url)));
function payload(){const native=createSpatialWorld(module);native.generate(712,0,0,'savanna');const value=native.chunkPayload();value.instances=Array.from({length:20},()=>[]);return value;}
async function fixture(options={}){
 const {initialPayload=payload(),initialMudGeometry=null,...residencyOptions}=options;
 const scene=new THREE.Scene(),material=new THREE.MeshBasicMaterial(),published=[],disposed=[],tickets=[];
 const admission={prepare(){},async prepareManyAndPublish(){throw Error('unexpected legacy admission');},async prepareTicket(object){tickets.push(object);return {valid:()=>true,validAfterAttach:()=>true};},deferRelease(_object,release){release();}};
 const coordinator=createChunkPublicationCoordinator({admission}),residency=createWebGpuTerrainResidency({scene,material,waterMaterial:material,mudMaterial:material,pipelineAdmission:admission,coordinator,onPublished:(_key,id)=>published.push(id),...residencyOptions});
 const first=residency.prepareRevision(initialPayload,1,'e',{publicationOrder:1,mudGeometry:initialMudGeometry,mudPrepared:!!initialMudGeometry}),part=first.participant();part.activate();part.attach();const result=part.finalize();result.retire();result.notify();
 const mesh=residency.get(0,0);mesh.geometry.addEventListener('dispose',()=>disposed.push(mesh.geometry));
 let props=null,failFinalize=false,order=1;
 const biome={ready:Promise.resolve(true),requestSlots:async()=>{},prepareRevision(p,revision,_metadata,opts){const group=new THREE.Group(),old=props;let attached=false,finalized=false;return {abort(){group.removeFromParent();},participant(){return {key:'0,0',epoch:'e',revision,publicationOrder:opts.publicationOrder,side:'biome',object:group,signal:new AbortController().signal,eventRoots:()=>[group],activate:()=>true,attach(){scene.add(group);attached=true;},rollback(){if(attached)group.removeFromParent();},finalize(){props=group;finalized=true;if(failFinalize)throw Error('props finalization failed');return {retire(){old?.removeFromParent();},notify(){}};},rollbackFinalized(){if(finalized)props=old;},cancel(){group.removeFromParent();}};}};}};
 return {scene,material,residency,coordinator,mesh,published,disposed,tickets,admission,
  fail(){failFinalize=true;},
  async prepare(p=payload(),extra={}){return prepareWebGpuTemporalTerrain([{payload:p,revision:2,sequence:2,epoch:'e'}],{scene,residency,biome,coordinator,publicationEpoch:e=>e,publicationOrder:()=>++order,validateInstances(){},suppressed:[],...extra});},
  close(){residency.dispose();coordinator.dispose();material.dispose();}};
}

test('props publication retains terrain attributes, canonical sampling and leases through final disposal',async()=>{
 const f=await fixture();try{
  const {mesh}=f,attributes={...mesh.geometry.attributes},versions=Object.fromEntries(Object.entries(mesh.geometry.attributes).map(([name,a])=>[name,a.version])),height=f.residency.canonicalSurface(0,0,mesh),next=payload();next.instances[0].push({id:'changed-prop'});
  const batch=await f.prepare(next);assert.equal(f.residency.revisionAt(0,0).revision,1);assert.equal(mesh.parent.parent,f.scene);assert.equal(batch.commit(),true);
  assert.equal(f.residency.getVisible(0,0),mesh);assert.equal(f.residency.revisionAt(0,0).revision,2);assert.equal(f.residency.matchesCheckpoint(next,{revision:2,epoch:'e'}),true);assert.equal(f.residency.canonicalSurface(0,0,mesh),height);
  for(const [name,attribute] of Object.entries(attributes)){assert.equal(mesh.geometry.attributes[name],attribute);assert.equal(attribute.version,versions[name]);}
  assert.equal(f.tickets[0],mesh.parent);assert.deepEqual(f.disposed,[]);assert.deepEqual(f.published.at(-1),{epoch:'e',revision:2,publicationOrder:2});
 }finally{f.close();}assert.deepEqual(f.disposed,[f.mesh.geometry]);
});

test('a late props finalization failure restores terrain revision without retiring its buffers',async()=>{
 const f=await fixture();try{const batch=await f.prepare();f.fail();assert.throws(()=>batch.commit(),/props finalization failed/);assert.equal(f.residency.getVisible(0,0),f.mesh);assert.equal(f.residency.revisionAt(0,0).revision,1);assert.equal(f.mesh.userData.spatialTerrainRevision,1);assert.equal(f.mesh.parent.parent,f.scene);assert.deepEqual(f.disposed,[]);assert.equal(f.published.length,1);}finally{f.close();}
});

test('cancelling prepared or blocked admission never disposes visible retained terrain',async()=>{
 for(const blocked of [false,true]){const f=await fixture();try{const controller=new AbortController();let release,started;const ready=new Promise(resolve=>started=resolve);if(blocked)f.admission.prepareTicket=async()=>{started();await new Promise(resolve=>release=resolve);return {valid:()=>true};};const preparing=f.prepare(payload(),{signal:controller.signal});if(blocked){await ready;controller.abort();release();await assert.rejects(preparing,{name:'AbortError'});}else{const batch=await preparing;controller.abort();assert.equal(batch.valid(),false);}
  assert.equal(f.residency.revisionAt(0,0).revision,1);assert.equal(f.residency.getVisible(0,0),f.mesh);assert.equal(f.mesh.parent.parent,f.scene);assert.deepEqual(f.disposed,[]);
 }finally{f.close();}}
});

test('changed terrain streams, mask, water, mud or epoch conservatively prepare a replacement',async()=>{
 for(const change of [p=>p.terrain.positions[1]++,p=>p.terrain.colors[0]+=.1,p=>p.terrain.indices[0]++,p=>p.groundMask=new Uint8Array(35*35*4),p=>p.water=new Float32Array(9),p=>p.mudInputs={changed:true}]){
  const f=await fixture();try{const next=payload();change(next);assert.equal(f.residency.prepareRetainedRevision(next,2,'e',{publicationOrder:2}),null);assert.equal(f.residency.getVisible(0,0),f.mesh);assert.deepEqual(f.disposed,[]);}finally{f.close();}
 }
 const f=await fixture();try{assert.equal(f.residency.prepareRetainedRevision(payload(),2,'other',{publicationOrder:2}),null);}finally{f.close();}
});

test('unknown custom material factories cannot reuse terrain based only on canonical data',async()=>{
 const f=await fixture({materialFactory:()=>new THREE.MeshBasicMaterial()});try{assert.equal(f.residency.prepareRetainedRevision(payload(),2,'e',{publicationOrder:2}),null);}finally{f.close();}
});

test('in-place payload change after preparation rejects commit and preserves the old surface',async()=>{
 const f=await fixture();try{const next=payload(),batch=await f.prepare(next);next.terrain.positions[1]++;assert.throws(()=>batch.commit(),/stale/);assert.equal(f.residency.revisionAt(0,0).revision,1);assert.equal(f.residency.getVisible(0,0),f.mesh);assert.deepEqual(f.disposed,[]);}finally{f.close();}
});

test('pipeline tickets accept unchanged already-attached terrain and still reject changed inputs or parent',async()=>{
 const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(),group=new THREE.Group(),mesh=new THREE.Mesh(new THREE.PlaneGeometry(),new THREE.MeshBasicMaterial());group.add(mesh);scene.add(group);
 const renderer={backend:{isWebGPUBackend:true},compileAsync:async()=>{}},admission=createWebGpuPipelineAdmission({renderer,scene,camera});
 try{const ticket=await admission.prepareTicket(group);assert.equal(ticket.valid(),true);assert.equal(ticket.validAfterAttach(),true);mesh.material.side=THREE.DoubleSide;assert.equal(ticket.validAfterAttach(),false);mesh.material.side=THREE.FrontSide;assert.equal(ticket.validAfterAttach(),true);const other=new THREE.Group();scene.add(other);other.add(group);assert.equal(ticket.validAfterAttach(),false);}finally{admission.dispose();mesh.geometry.dispose();mesh.material.dispose();}
});

test('unchanged water and recorded mud survive props publication without running the mud preparer again',async()=>{
 const first=payload();first.water=new Float32Array([0,0,0,1,0,0,0,0,1]);first.mudInputs={version:1,triangles:[1,2,3]};
 const mud=new THREE.PlaneGeometry(),f=await fixture({initialPayload:first,initialMudGeometry:mud,materialFactory:()=>new THREE.MeshBasicMaterial(),materialUsesCanonicalTerrainOnly:true});
 let mudDisposals=0;mud.addEventListener('dispose',()=>mudDisposals++);
 try{const water=f.residency.getWater(0,0),waterGeometry=water.geometry,group=f.mesh.parent,next=structuredClone(first);next.instances[0].push({id:'prop'});
  const batch=await f.prepare(next,{mudPreparer:{prepare(){throw Error('unchanged mud must not be regenerated');}}});assert.equal(batch.commit(),true);assert.equal(f.residency.getWater(0,0),water);assert.equal(water.geometry,waterGeometry);assert.equal(water.userData.spatialTerrainRevision,2);assert.equal(f.mesh.parent,group);assert.equal(group.children[2].geometry,mud);assert.equal(mudDisposals,0);
 }finally{f.close();}assert.equal(mudDisposals,1);
});

test('a changed height takes the real replacement path and retires the old geometry once',async()=>{
 const f=await fixture();try{const next=payload();next.terrain.positions[1]+=2;const batch=await f.prepare(next);assert.equal(f.residency.getVisible(0,0),f.mesh);assert.equal(batch.commit(),true);assert.notEqual(f.residency.getVisible(0,0),f.mesh);assert.equal(f.residency.surface(-24,-24),next.terrain.positions[1]);assert.deepEqual(f.disposed,[f.mesh.geometry]);}finally{f.close();}assert.equal(f.disposed.length,1);
});

test('WebGPU-promoted Uint32 indices still represent the same canonical native topology',async()=>{
 const f=await fixture();try{f.mesh.geometry.index.array=new Uint32Array(f.mesh.geometry.index.array);const index=f.mesh.geometry.index,batch=await f.prepare();assert.equal(batch.commit(),true);assert.equal(f.residency.getVisible(0,0),f.mesh);assert.equal(f.mesh.geometry.index,index);assert(index.array instanceof Uint32Array);assert.notEqual(f.residency.canonicalSurface(0,0,f.mesh),null);}finally{f.close();}
});
