import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createWebGpuBiomeProps} from '../src/rendering/webgpu-biome-props.js';
import {createWebGpuTerrainResidency} from '../src/rendering/webgpu-terrain-residency.js';
import {createWebGpuPipelineAdmission} from '../src/rendering/webgpu-pipeline-admission.js';
import {createChunkPublicationCoordinator} from '../src/rendering/webgpu-chunk-publication.js';
import {prepareWebGpuTemporalTerrain} from '../src/rendering/webgpu-temporal-terrain.js';

const turn=()=>new Promise(resolve=>setImmediate(resolve));
function pack(){const buffer=new ArrayBuffer(104);new Float32Array(buffer,0,9).set([0,0,0,1,0,0,0,1,0]);new Float32Array(buffer,36,9).set([0,0,1,0,0,1,0,0,1]);new Float32Array(buffer,72,6).set([0,0,1,0,0,1]);new Uint16Array(buffer,96,3).set([0,1,2]);const asset={lods:[{position:{type:'<f4',offset:0,count:9},normal:{type:'<f4',offset:36,count:9},uv:{type:'<f4',offset:72,count:6},index:{type:'<u2',offset:96,count:3}}]};return {buffer,manifest:{biomeId:'savanna',binary:{url:'/props.bin'},textures:['baseColor','normal','metallicRoughness'].map(role=>({role,base64:{url:'/'+role+'.png'}})),assets:Array.from({length:20},()=>asset),material:{baseColorFactor:[1,1,1,1]}}};}
function payload(){const positions=new Float32Array(49*49*3),colors=new Float32Array(positions.length),indices=new Uint16Array(48*48*6);for(let z=0;z<49;z++)for(let x=0;x<49;x++){const n=(z*49+x)*3;positions.set([x-24,0,z-24],n);colors.set([.2,.4,.6],n);}for(let z=0;z<48;z++)for(let x=0;x<48;x++){const n=(z*48+x)*6,a=z*49+x;indices.set([a,a+49,a+1,a+1,a+49,a+50],n);}const instances=Array.from({length:20},()=>[]);for(const [slot,x] of [[0,0],[1,3],[4,6]])instances[slot].push({id:'prop-'+slot,slot,x,y:0,z:0,yaw:0,sx:1,sy:1,sz:1});return {authority:'spatial-wasm',cx:0,cz:0,terrain:{positions,colors,indices},instances};}
async function fixture({contract='native',fluid=false,lod=false}={}){
 const {buffer,manifest}=pack();if(fluid)manifest.assets[19]={...manifest.assets[19],water:{level:.4,outline:[[0,0],[1,0],[0,1]]}};if(lod)manifest.assets[1]={...manifest.assets[1],lods:Array(3).fill(manifest.assets[1].lods[0])};const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(),compiled=[],errors=[],material=new THREE.MeshBasicMaterial(),renderer={backend:{isWebGPUBackend:true},async compileAsync(object){compiled.push(object);}},admission=createWebGpuPipelineAdmission({renderer,scene,camera}),coordinator=createChunkPublicationCoordinator({admission,onError:e=>errors.push(e.message)}),state={biome:'sabana',suppressed:[]};
 const residency=createWebGpuTerrainResidency({scene,material,pipelineAdmission:admission,coordinator}),biome=createWebGpuBiomeProps({scene,state,biomePack:manifest,initialSlots:[0,1,4,...(fluid?[19]:[])],...(lod?{initialLodEye:()=>[0,0,10]}:{}),pipelineAdmission:admission,coordinator,instanceContract:contract,imageLoader:async()=>({close(){}}),byteLoader:async()=>buffer.slice(0)});assert.equal(await biome.ready,true);let order=0,revision=0;
 const prepare=async(value,{sourceEpoch='e',...extra}={})=>prepareWebGpuTemporalTerrain([{payload:value,revision:++revision,sequence:revision,epoch:sourceEpoch}],{scene,residency,biome,coordinator,publicationEpoch:e=>e,publicationOrder:()=>++order,validateInstances(){},suppressed:state.suppressed,...extra});
 const initial=payload();if(fluid)initial.instances[19].push({id:'pond',slot:19,x:10,y:0,z:0,yaw:0,sx:1,sy:1,sz:1});assert.equal((await prepare(initial)).commit(),true);await turn();
 return {initial,scene,camera,renderer,compiled,errors,state,residency,biome,coordinator,prepare,meshes(){const result=[];scene.traverse(mesh=>{if(Number.isInteger(mesh.userData.nativePropSlot))result.push(mesh);});return result;},async close(){biome.dispose();residency.dispose();coordinator.dispose();admission.dispose();material.dispose();await turn();}};
}
const slot=(f,n)=>f.meshes().find(mesh=>mesh.userData.nativePropSlot===n);
function change(slotIndex=0){const next=payload();next.instances[slotIndex][0].x+=.5;return next;}

for(const contract of ['native','attributes'])test(`paired prop delta retains unchanged slot resources and exact selection with ${contract} instances`,async()=>{
 const f=await fixture({contract});try{
  const before=f.meshes(),old=slot(f,0),retained=slot(f,1),parent=retained.parent,geometry=retained.geometry,attributes={...geometry.attributes},matrix=retained.instanceMatrix,versions=Object.fromEntries(Object.entries(attributes).map(([k,a])=>[k,a.version]));let retired=0;retained.addEventListener('dispose',()=>retired++);
  const next=change(),batch=await f.prepare(next);assert.equal(slot(f,1),retained);assert.equal(retained.parent,parent);assert.equal(f.meshes().length,before.length);assert(f.compiled.includes(parent),'actual retained subtree was admitted');assert.equal(batch.commit(),true);await turn();
  assert.notEqual(slot(f,0),old);assert.equal(slot(f,1),retained);assert.equal(retained.geometry,geometry);assert.equal(retained.parent,parent);assert.equal(retained.instanceMatrix,matrix);for(const [name,a] of Object.entries(attributes)){assert.equal(geometry.attributes[name],a);assert.equal(a.version,versions[name]);}assert.equal(retired,0);assert.equal(f.biome.matchesCheckpoint(next,{epoch:'e',revision:2}),true);
  f.scene.updateMatrixWorld(true);const hits=new THREE.Raycaster(new THREE.Vector3(3.2,.2,5),new THREE.Vector3(0,0,-1)).intersectObject(f.scene,true);assert(hits.some(hit=>hit.object===retained));assert.deepEqual(f.errors,[]);
 }finally{await f.close();}
});

test('rollback after a later biome finalization failure preserves every old slot and its source identity',async()=>{
 const f=await fixture();try{const before=f.meshes(),original=f.biome.prepareRevision;f.biome.prepareRevision=(...args)=>{const token=original(...args),participant=token.participant;token.participant=()=>{const part=participant(),finalize=part.finalize;part.finalize=()=>{finalize();throw Error('late biome failure');};return part;};return token;};const batch=await f.prepare(change());assert.throws(()=>batch.commit(),/late biome failure/);await turn();assert.deepEqual(f.meshes(),before);assert.equal(f.biome.matchesCheckpoint(payload(),{epoch:'e',revision:1}),true);assert.equal(f.residency.revisionAt(0,0).revision,1);assert.equal(f.residency.visualReady(),true);assert.deepEqual(f.errors,[]);}finally{await f.close();}
});

test('aborting while a retained subtree compiles leaves visible instances alive and undisposed',async()=>{
 const f=await fixture();try{const before=f.meshes(),parent=before[0].parent,controller=new AbortController();let finish,started;const active=new Promise(resolve=>started=resolve);f.renderer.compileAsync=object=>{if(object===parent){started();return new Promise(resolve=>finish=resolve);}return Promise.resolve();};let disposed=0;for(const mesh of before)mesh.addEventListener('dispose',()=>disposed++);
  const preparing=f.prepare(change(),{signal:controller.signal});await active;controller.abort();finish();await assert.rejects(preparing,{name:'AbortError'});await turn();assert.deepEqual(f.meshes(),before);assert.equal(disposed,0);assert.equal(f.biome.matchesCheckpoint(payload(),{epoch:'e',revision:1}),true);
 }finally{await f.close();}
});

test('changed retained pipeline inputs reject the complete batch before publication',async()=>{
 const f=await fixture();try{const before=f.meshes(),batch=await f.prepare(change()),mesh=slot(f,1),side=mesh.material.side;mesh.material.side=THREE.DoubleSide;assert.equal(batch.valid(),false);assert.throws(()=>batch.commit(),/stale/);mesh.material.side=side;await turn();assert.deepEqual(f.meshes(),before);assert.equal(f.biome.matchesCheckpoint(payload(),{epoch:'e',revision:1}),true);}finally{await f.close();}
});

test('an in-place change to retained canonical instances cannot be published using the earlier proof',async()=>{
 const f=await fixture();try{const before=f.meshes(),next=change(),batch=await f.prepare(next);next.instances[1][0].yaw=1;assert.throws(()=>batch.commit(),/stale/);await turn();assert.deepEqual(f.meshes(),before);assert.equal(f.residency.revisionAt(0,0).revision,1);assert.equal(f.biome.matchesCheckpoint(payload(),{epoch:'e',revision:1}),true);}finally{await f.close();}
});

test('alternating changed slots retains a bounded forest and far sources validate every original parent',async()=>{
 const f=await fixture();try{
  let next=payload(),untouched=slot(f,4),disposed=0;untouched.addEventListener('dispose',()=>disposed++);
  for(let n=0;n<8;n++){next=structuredClone(next);next.instances[n%2][0].x+=.1;assert.equal((await f.prepare(next)).commit(),true);await turn();assert.equal(slot(f,4),untouched);assert.equal(f.meshes().length,3);const parents=new Set(f.meshes().map(mesh=>mesh.parent));assert(parents.size<=3);assert([...parents].every(parent=>parent.parent===f.scene));}
  assert.equal(disposed,0);const sources=f.biome.farChunkSources({cx:0,cz:0,sequence:0,instances:next.instances,slots:[0,1]},{isCurrent:()=>true});assert.notEqual(sources,'deferred');assert.equal(sources.entries.length,2);assert.equal(sources.isCurrent(),true);const source=sources.entries[0].source;f.scene.add(source);assert.equal(sources.isCurrent(),false);
 }finally{await f.close();}
});

test('externally overridden source groups conservatively use fresh meshes',async()=>{
 const f=await fixture();try{const before=f.meshes(),old=slot(f,1);old.layers.enable(3);const batch=await f.prepare(change());assert.equal(batch.commit(),true);await turn();assert(before.every(mesh=>!f.meshes().includes(mesh)));assert.equal(slot(f,1).layers.mask,1);}finally{await f.close();}
});

test('terrain-only revisions retain every prop without leaving empty groups or retiring leases early',async()=>{
 const f=await fixture(),before=f.meshes(),disposals=new Map(before.map(mesh=>[mesh,0]));for(const mesh of before)mesh.addEventListener('dispose',()=>disposals.set(mesh,disposals.get(mesh)+1));
 try{for(let n=0;n<8;n++){const next=payload();next.terrain.positions[1]=n+1;assert.equal((await f.prepare(next)).commit(),true);await turn();assert.deepEqual(f.meshes(),before);assert.equal(f.scene.children.filter(root=>root.userData.wgBiomeGroup).length,1);assert([...disposals.values()].every(n=>n===0));}}finally{await f.close();}assert([...disposals.values()].every(n=>n===1));
});

for(const contract of ['native','attributes'])test(`an unchanged pond retains both its solid and fluid instance resources with ${contract}`,async()=>{
 const f=await fixture({contract,fluid:true});try{const pond=f.meshes().filter(mesh=>mesh.userData.nativePropSlot===19);assert.equal(pond.length,2);const water=pond.find(mesh=>mesh.userData.nativeFluid),matrix=water.instanceMatrix,version=matrix.version,next=structuredClone(f.initial);next.instances[0][0].x++;assert.equal((await f.prepare(next)).commit(),true);await turn();assert.deepEqual(f.meshes().filter(mesh=>mesh.userData.nativePropSlot===19),pond);assert.equal(water.instanceMatrix,matrix);assert.equal(matrix.version,version);assert(pond.every(mesh=>mesh.parent?.parent===f.scene));}finally{await f.close();}
});

test('an unchanged authored LOD retains its admitted mesh and material while another slot changes',async()=>{
 const f=await fixture({lod:true});try{const before=slot(f,1),geometry=before.geometry,material=before.material,next=change();assert.equal((await f.prepare(next)).commit(),true);await turn();assert.equal(slot(f,1),before);assert.equal(before.geometry,geometry);assert.equal(before.material,material);assert.equal(f.biome.matchesCheckpoint(next,{epoch:'e',revision:2}),true);}finally{await f.close();}
});

test('a retained far source loses its certificate when its original group leaves the resident scene',async()=>{
 const f=await fixture();try{const next=change();assert.equal((await f.prepare(next)).commit(),true);const request={cx:0,cz:0,sequence:0,instances:next.instances,slots:[0,1]},source=f.biome.farChunkSources(request,{isCurrent:()=>true});assert.notEqual(source,'deferred');const parent=source.entries[0].source.parent;parent.removeFromParent();assert.equal(source.isCurrent(),false);assert.equal(f.biome.farChunkSources(request,{isCurrent:()=>true}),'deferred');f.scene.add(parent);}finally{await f.close();}
});

test('a new source epoch prepares fresh props even when their canonical instances are equal',async()=>{
 const f=await fixture();try{const before=f.meshes(),next=payload();assert.equal((await f.prepare(next,{sourceEpoch:'next-source'})).commit(),true);await turn();assert(before.every(mesh=>!f.meshes().includes(mesh)));assert.equal(f.biome.matchesCheckpoint(next,{epoch:'next-source',revision:2}),true);assert.equal(f.residency.revisionAt(0,0).epoch,'next-source');}finally{await f.close();}
});

test('a changed suppression mask prepares that slot even when its canonical instances are identical',async()=>{
 const f=await fixture();try{
  f.state.suppressed=['prop-1'];f.biome.sync(1);for(let n=0;n<30&&!f.biome.status().selectableReady;n++)await turn();assert.equal(f.biome.status().selectableReady,true);const hidden=slot(f,1),unchanged=slot(f,4);assert.equal(hidden.count,0);
  f.state.suppressed=[];const next=payload();assert.equal((await f.prepare(next)).commit(),true);await turn();assert.notEqual(slot(f,1),hidden);assert.equal(slot(f,1).count,1);assert.equal(slot(f,4),unchanged);assert.equal(f.biome.matchesCheckpoint(next,{epoch:'e',revision:2}),true);
 }finally{await f.close();}
});

test('composite admission rejects roots outside the declared transaction footprint',async()=>{
 const scene=new THREE.Scene(),calls=[],cancelled=[],admission={prepareManyAndPublish(){},async prepareTicket(object){calls.push(object);return {valid:()=>true};}},coordinator=createChunkPublicationCoordinator({admission});const part=side=>{const object=new THREE.Group();return {key:'0,0',revision:1,epoch:'e',publicationOrder:1,side,object,signal:new AbortController().signal,eventRoots:()=>[object],activate:()=>true,attach(){},rollback(){},finalize:()=>({retire(){},notify(){}}),rollbackFinalized(){},cancel(){cancelled.push(side);}};};
 try{const terrain=part('terrain'),biome=part('biome');biome.preparationObjects=()=>[biome.object,new THREE.Group()];await assert.rejects(coordinator.prepareBatch([terrain,biome],{scene}),/preparation roots/);assert.deepEqual(calls,[]);assert.deepEqual(cancelled,['biome','terrain']);}finally{coordinator.dispose();}
});
