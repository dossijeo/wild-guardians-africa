import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {buildWebGpuVillage,createWebGpuVillagePreview,villagePreviewReconciled} from '../src/rendering/webgpu-village-preview.js';

const turn=()=>new Promise(resolve=>setImmediate(resolve));
function fixture(){
 const geometry=new THREE.BoxGeometry(),material=new THREE.MeshBasicMaterial(),assets=new Map([['house',{geometry,material,unit:{min:[-1,0,-1],max:[1,2,1]}}]]),scene=new THREE.Scene(),pending=[];
 const pipelineAdmission={prepare(group,{signal}){return new Promise((resolve,reject)=>{pending.push({group,signal,resolve});signal.addEventListener('abort',()=>reject(new DOMException('cancelled','AbortError')),{once:true});});}};
 const view=createWebGpuVillagePreview({scene,surface:()=>2,assetsFor:()=>assets,pipelineAdmission});
 const preview=(x,extra={})=>({culture:'mapungubwe',valid:true,buildings:[{key:'house',x,z:0}],...extra});
 return {geometry,material,assets,scene,pending,view,preview,cleanup(){view.dispose();geometry.dispose();material.dispose();}};
}

test('confirmed village and preview share authored positioning without sharing shadow settings',()=>{
 const f=fixture();try{const buildings=f.preview(3).buildings,solid=buildWebGpuVillage(f.assets,buildings,()=>2),transparent=new THREE.MeshBasicMaterial({transparent:true}),preview=buildWebGpuVillage(f.assets,buildings,()=>2,{material:transparent,castShadow:false});assert.deepEqual(solid.children[0].position.toArray(),preview.children[0].position.toArray());assert.equal(solid.children[0].castShadow,true);assert.equal(preview.children[0].castShadow,false);assert.equal(solid.children[0].geometry,preview.children[0].geometry);assert.equal(preview.children[0].material,transparent);transparent.dispose();}finally{f.cleanup();}
});

test('village preview admits the current layout and cancels stale placements',async()=>{
 const f=fixture();try{f.view.show(f.preview(1,{pending:true}));await turn();assert.equal(f.pending.length,1);assert.equal(f.view.visible,false);f.view.show(f.preview(2));await turn();assert.equal(f.pending[0].signal.aborted,true);assert.equal(f.pending.length,2);f.pending[0].resolve();await turn();assert.equal(f.view.visible,false);f.pending[1].resolve();await turn();assert.equal(f.view.visible,true);assert.equal(f.pending[1].group.children[0].position.x,2);f.view.clear();assert.equal(f.scene.children.length,0);}finally{f.cleanup();}
});

test('a delayed village bank publishes only the latest still-active preview',async()=>{
 const geometry=new THREE.BoxGeometry(),material=new THREE.MeshBasicMaterial(),assets=new Map([['house',{geometry,material,unit:{min:[-1,0,-1],max:[1,2,1]}}]]),scene=new THREE.Scene(),pending=[];let loaded=false;
 const pipelineAdmission={prepare(group,{signal}){return new Promise((resolve,reject)=>{pending.push({group,signal,resolve});signal.addEventListener('abort',()=>reject(new DOMException('cancelled','AbortError')),{once:true});});}},view=createWebGpuVillagePreview({scene,surface:()=>2,assetsFor:()=>loaded?assets:null,pipelineAdmission}),preview=x=>({culture:'mapungubwe',valid:true,buildings:[{key:'house',x,z:0}]});
 try{view.show(preview(1));view.show(preview(2));await turn();assert.equal(pending.length,0);loaded=true;view.assetsReady('other');await turn();assert.equal(pending.length,0);view.assetsReady('mapungubwe');await turn();assert.equal(pending.length,1);assert.equal(pending[0].group.children[0].position.x,2);view.clear();assert.equal(pending[0].signal.aborted,true);pending[0].resolve();await turn();assert.equal(view.visible,false);assert.equal(scene.children.length,0);view.assetsReady('mapungubwe');assert.equal(scene.children.length,0);}finally{view.dispose();geometry.dispose();material.dispose();}
});

test('changing validity recolors the existing preview without rebuilding its layout',async()=>{
 const f=fixture();try{f.view.show(f.preview(1,{pending:true}));await turn();f.pending[0].resolve();await turn();const mesh=f.pending[0].group.children[0];f.view.show(f.preview(1,{valid:false}));assert.equal(f.pending.length,1);assert.equal(mesh.material.color.getHexString(),'f4a198');assert.equal(f.view.visible,true);}finally{f.cleanup();}
});

test('terrain revisions rebuild the preview and disposal cancels pending work',async()=>{
 const f=fixture();try{f.view.show(f.preview(1));await turn();f.pending[0].resolve();await turn();f.view.terrainChanged();await turn();assert.equal(f.view.visible,false);assert.equal(f.pending.length,2);f.view.dispose();assert.equal(f.pending[1].signal.aborted,true);assert.equal(f.scene.children.length,0);}finally{f.cleanup();}
});

test('confirmed village replaces the preview only after its complete layout is visible',()=>{
 const confirmed={buildings:[{},{}]},entry={group:{visible:false,children:[]},village:{meshes:[{},{}],upToDate:true}};
 assert.equal(villagePreviewReconciled(entry,confirmed),false);entry.group.visible=true;entry.village.upToDate=false;assert.equal(villagePreviewReconciled(entry,confirmed),false);entry.village.upToDate=true;entry.village.meshes.pop();assert.equal(villagePreviewReconciled(entry,confirmed),false);entry.village.meshes.push({});assert.equal(villagePreviewReconciled(entry,confirmed),true);
});
import {createWebGpuResourceRegistry} from '../src/rendering/webgpu-resource-registry.js';
import {createWebGpuPipelineAdmission} from '../src/rendering/webgpu-pipeline-admission.js';
test('village preview material and candidate survive their in-flight compilation',async()=>{
 const registry=createWebGpuResourceRegistry(),scene=new THREE.Scene(),geometry=new THREE.BoxGeometry(),material=new THREE.MeshBasicMaterial(),assets=new Map([['house',{geometry,material,unit:{min:[-1,0,-1],max:[1,2,1]}}]]);let finish;const renderer={backend:{isWebGPUBackend:true},compileAsync:()=>new Promise(resolve=>{finish=resolve;})},admission=createWebGpuPipelineAdmission({renderer,scene,camera:new THREE.PerspectiveCamera()}),view=createWebGpuVillagePreview({scene,surface:()=>0,assetsFor:()=>assets,pipelineAdmission:admission,resourceRegistry:registry});
 try{view.show({culture:'mapungubwe',valid:true,buildings:[{key:'house',x:0,z:0}]});await turn();assert.equal(registry.status().owned.length,2);registry.dispose();view.dispose();assert.equal(registry.status().owned.length,2);finish();await turn();assert.equal(registry.status().owned.length,0);}finally{view.dispose();admission.dispose();registry.dispose();geometry.dispose();material.dispose();}
});
