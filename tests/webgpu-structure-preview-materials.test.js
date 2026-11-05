import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createWebGpuStructurePreviewMaterials} from '../src/rendering/webgpu-structure-preview-materials.js';
import {createWebGpuPipelineAdmission} from '../src/rendering/webgpu-pipeline-admission.js';

const turn=()=>new Promise(resolve=>setImmediate(resolve));
test('construction tool admits shared provisional variants before publication',async()=>{
 const submitted=[],scene=new THREE.Scene(),source=new THREE.Group(),geometry=new THREE.BoxGeometry(),original=new THREE.MeshBasicMaterial({side:THREE.FrontSide});source.add(new THREE.Mesh(geometry,original));
 const admission={async prepare(group){assert.equal(group.parent,null);submitted.push(group.children.map(child=>child.isInstancedMesh?child:child.children[0]));}},library=createWebGpuStructurePreviewMaterials({pipelineAdmission:admission});
 try{const center=library.prepare('center','mapungubwe',{group:source});assert.equal(center,library.prepare('center','mapungubwe',{group:source}));await center;assert.equal(library.ready('center','mapungubwe'),true);assert.equal(submitted[0][0].material,library.center());assert.equal(scene.children.length,0);
  const assets={piedra_intacto:new THREE.Mesh(geometry,original),piedra_puerta:new THREE.Mesh(geometry,original)};await library.prepare('wall','piedra',assets);assert.equal(library.ready('wall','piedra'),true);assert.equal(submitted[1].length,2);assert.ok(submitted[1].every(mesh=>mesh.material===library.wall(assets.piedra_intacto)));assert.equal(scene.children.length,0);
 }finally{library.dispose();geometry.dispose();original.dispose();}
});

test('cancelled preparation retains shared materials until the driver settles',async()=>{
 const scene=new THREE.Scene(),source=new THREE.Group(),geometry=new THREE.BoxGeometry(),original=new THREE.MeshBasicMaterial();source.add(new THREE.Mesh(geometry,original));let finish,released=0;const renderer={backend:{isWebGPUBackend:true},compileAsync:()=>new Promise(resolve=>{finish=resolve;})},admission=createWebGpuPipelineAdmission({renderer,scene,camera:new THREE.PerspectiveCamera()}),controller=new AbortController(),library=createWebGpuStructurePreviewMaterials({pipelineAdmission:admission,signal:controller.signal}),paint=library.center();paint.addEventListener('dispose',()=>released++);
 try{const pending=library.prepare('center','mapungubwe',{group:source});await turn();assert.equal(typeof finish,'function');const rejected=assert.rejects(pending,{name:'AbortError'});controller.abort();library.dispose();await rejected;assert.equal(released,0);finish();await turn();assert.equal(released,1);}finally{library.dispose();admission.dispose();geometry.dispose();original.dispose();}
});
