import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {MeshStandardNodeMaterial} from 'three/webgpu';
import {nativeTaskConsequenceFixture} from './helpers/native-task-consequence.js';
import {createWebGpuTerrainResidency} from '../src/rendering/webgpu-terrain-residency.js';
import {createWebGpuCropRoster} from '../src/rendering/webgpu-crop-roster.js';
import {createWebGpuResourceRegistry} from '../src/rendering/webgpu-resource-registry.js';

// Geometry/pipeline doubles isolate the real crop-owner instance transaction;
// native proposals and source bindings are actual WASM, not GPU acceptance.
async function fixture({visible=true}={}){
 const f=nativeTaskConsequenceFixture(),scene=new THREE.Scene(),ground=new THREE.MeshBasicMaterial({side:THREE.DoubleSide}),residency=createWebGpuTerrainResidency({scene,material:ground}),registry=createWebGpuResourceRegistry(),model=new THREE.Group(),geometry=new THREE.BoxGeometry(),material=new THREE.MeshStandardMaterial(),previous=globalThis.fetch;
 for(let z=-1;z<=1;z++)for(let x=-1;x<=1;x++){f.session.core.selectChunk(x,z);residency.replace(f.session.core.chunkPayload(),1,'consequence-crops');}
 for(let crop=0;crop<8;crop++)for(let stage=1;stage<=5;stage++){const mesh=new THREE.Mesh(geometry,material);mesh.userData={cropIndex:crop,stage,height:1,foliageRadius:1};model.add(mesh);}
 globalThis.fetch=async()=>({ok:true,json:async()=>[{source:'Cultivos',url:'/crop.glb'}]});
 const renderer={backend:{isWebGPUBackend:true},library:{fromMaterial:source=>new MeshStandardNodeMaterial().copy(source)}},admission={async prepare(){},async prepareTicket(){return {valid:()=>true};}},crops=createWebGpuCropRoster({scene,state:f.state,residency:visible?residency:{get:()=>null},renderer,resourceRegistry:registry,pipelineAdmission:admission,loadCropModel:async()=>({scene:model})});
 try{await crops.prepare();const proposed=f.prepare();assert.equal(proposed.status,'proposed');return {...f,scene,crops,registry,proposal:proposed.proposal,close(){crops.dispose();registry.dispose();residency.dispose();ground.dispose();globalThis.fetch=previous;f.close();}};}catch(error){crops.dispose();registry.dispose();residency.dispose();ground.dispose();globalThis.fetch=previous;f.close();throw error;}
}

test('Harvest removes only its crop instance, preserves batch resources and can restore the preceding presentation',async()=>{
 const f=await fixture();let part;try{const count=f.crops.status().plants,batches=f.scene.children.filter(mesh=>mesh.isInstancedMesh),old=batches.map(mesh=>({mesh,geometry:mesh.geometry,material:mesh.material,array:mesh.instanceMatrix.array,data:mesh.instanceMatrix.array.slice(),count:mesh.count})),state=JSON.stringify(f.state);assert(count>0);part=await f.crops.prepareNativeTaskConsequence(f.proposal.nativeConsequence);assert(part.valid());assert(part.requests.every(r=>batches.includes(r.object)));assert.equal(f.crops.status().plants,count);assert.equal(JSON.stringify(f.state),state);part.activate();assert.equal(f.crops.status().plants,count-1);part.rollback();assert(part.valid());for(const b of old){assert.equal(b.mesh.geometry,b.geometry);assert.equal(b.mesh.material,b.material);assert.equal(b.mesh.instanceMatrix.array,b.array);assert.deepEqual(b.mesh.instanceMatrix.array,b.data);assert.equal(b.mesh.count,b.count);}part.activate();assert.equal(f.crops.status().plants,count-1);assert.equal(f.commitSourceOnly(f.proposal),1);part.finalize({nativeTaskConsequenceBinding:f.planner.nativeTaskConsequenceBinding(f.actor)});assert(part.retire());f.target.alive=false;f.crops.sync();assert.equal(f.crops.status().plants,count-1);assert.equal(f.scene.children.filter(mesh=>mesh.isInstancedMesh).length,batches.length);for(const b of old){assert.equal(b.mesh.geometry,b.geometry);assert.equal(b.mesh.material,b.material);}assert.equal(part.cancel(),false);
 }finally{part?.cancel();f.close();}
});

test('a cancelled crop consequence neither consumes source state nor removes the live crop batch',async()=>{
 const f=await fixture();let part;try{const count=f.crops.status().plants,source=JSON.stringify(f.state);part=await f.crops.prepareNativeTaskConsequence(f.proposal.nativeConsequence);part.activate();assert.equal(f.crops.status().plants,count-1);assert(part.cancel());assert.equal(f.crops.status().plants,count);assert.equal(JSON.stringify(f.state),source);assert(f.target.alive);}finally{part?.cancel();f.close();}
});

test('an offscreen crop consequence retains an absence proof without allocating GPU batches',async()=>{
 const f=await fixture({visible:false});let part;try{assert.equal(f.crops.status().plants,0);part=await f.crops.prepareNativeTaskConsequence(f.proposal.nativeConsequence);assert.equal(part.requests.length,0);assert(part.valid());part.activate();assert.equal(f.commitSourceOnly(f.proposal),1);part.finalize({nativeTaskConsequenceBinding:f.planner.nativeTaskConsequenceBinding(f.actor)});assert(part.retire());assert.equal(f.crops.status().plants,0);}finally{part?.cancel();f.close();}
});
