import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createStructureWaitIndicator} from '../src/rendering/webgpu-structure-wait-indicator.js';
import {createWebGpuSettlements} from '../src/rendering/webgpu-settlements.js';
import {structureWaitIndicatorRecipe} from '../src/rendering/webgpu-material-graph-catalog.js';

test('the shared placement indicator stays hidden until admission and removes individual requests',()=>{
 const scene=new THREE.Scene(),owned=[];const indicator=createStructureWaitIndicator({scene,capacity:2,own:value=>(owned.push(value),value)});
 try{
  assert.equal(indicator.show('one',{x:3,y:4,z:5}),true);assert.equal(indicator.mesh.visible,false);
  indicator.ready();assert.equal(indicator.mesh.visible,true);
  const recipe=structureWaitIndicatorRecipe();for(const [key,value] of Object.entries(recipe.structural.state))assert.equal(indicator.mesh.material[key],value);assert.equal(indicator.mesh.castShadow,false);assert.equal(recipe.passes.shadow,'mesh-does-not-cast');
  const matrix=new THREE.Matrix4();indicator.mesh.getMatrixAt(0,matrix);assert.deepEqual(new THREE.Vector3().setFromMatrixPosition(matrix).toArray(),[3,4.099999904632568,5]);
  assert.equal(indicator.show('two',{x:0,y:0,z:0,width:3,depth:4}),true);assert.equal(indicator.show('three',{x:0,y:0,z:0}),false);
  indicator.remove('one');assert.equal(indicator.mesh.visible,true);indicator.mesh.getMatrixAt(0,matrix);assert.equal(matrix.elements[0],0);
  indicator.remove('two');assert.equal(indicator.mesh.visible,false);assert.equal(indicator.show('three',{x:1,y:0,z:0}),true);
  indicator.dispose();assert.equal(scene.children.length,0);assert.equal(indicator.show('late',{x:0,y:0,z:0}),false);
 }finally{indicator.dispose();for(const item of owned)item.dispose();}
});

test('the admitted indicator bridges asset loading and disappears when the preview is published or rejected',async()=>{
 const turn=()=>new Promise(resolve=>setImmediate(resolve)),oldFetch=globalThis.fetch;
 globalThis.fetch=async url=>({ok:true,json:async()=>String(url).includes('destruction')?{buildings:[{culture:'mapungubwe',url:'/center.glb'}]}:[]});
 const root=new THREE.Group(),sourceGeometry=new THREE.BoxGeometry(),sourceMaterial=new THREE.MeshBasicMaterial();root.add(new THREE.Mesh(sourceGeometry,sourceMaterial));const terrain=new THREE.Mesh(new THREE.PlaneGeometry(20,20),new THREE.MeshBasicMaterial({side:THREE.DoubleSide}));terrain.rotation.x=-Math.PI/2;terrain.updateMatrixWorld(true);const scene=new THREE.Scene(),jobs=[];let finish;
 const admission={prepare:async()=>{},prepareAndPublish(object,options,publish){return new Promise(resolve=>jobs.push(()=>{publish();resolve();}));}},view=createWebGpuSettlements({scene,state:{culture:'mapungubwe',elapsed:0,villages:[],structures:[]},residency:{get:()=>terrain},renderer:{backend:{isWebGPUBackend:true}},pipelineAdmission:admission,enableStructurePreviews:true,enableStructureIndicator:true,loadProgressiveCenter:()=>new Promise(resolve=>{finish=()=>resolve({preview:{scene:root},start(){},tick(){},dispose(){}});})});
 try{await view.prepareIndicator();const marker=scene.children[0];assert.equal(marker.visible,false);assert.equal(view.beginPreview({id:'one',kind:'center',culture:'mapungubwe',x:0,z:0}),true);assert.equal(marker.visible,true);for(let i=0;i<10&&!finish;i++)await turn();finish();for(let i=0;i<10&&!jobs.length;i++)await turn();assert.equal(marker.visible,true);assert.equal(scene.children[1].visible,false);jobs[0]();await turn();assert.equal(marker.visible,false);assert.equal(scene.children[1].visible,true);view.rejectPreview('one');assert.equal(scene.children.length,1);assert.equal(view.beginPreview({id:'two',kind:'center',culture:'mapungubwe',x:1,z:0}),true);assert.equal(marker.visible,true);view.rejectPreview('two');assert.equal(marker.visible,false);}
 finally{view.dispose();terrain.geometry.dispose();terrain.material.dispose();sourceGeometry.dispose();sourceMaterial.dispose();globalThis.fetch=oldFetch;}
});

test('startup cancellation is forwarded to indicator admission',async()=>{
 const controller=new AbortController();let received;
 const admission={prepare(object,{signal}){received=signal;return new Promise((resolve,reject)=>signal.addEventListener('abort',()=>reject(new DOMException('cancelled','AbortError')),{once:true}));}};
 const view=createWebGpuSettlements({scene:new THREE.Scene(),state:{villages:[],structures:[]},residency:{get:()=>null},pipelineAdmission:admission,enableStructurePreviews:true,enableStructureIndicator:true});
 try{const pending=view.prepareIndicator(controller.signal);assert.equal(received,controller.signal);controller.abort();await assert.rejects(pending,{name:'AbortError'});}finally{view.dispose();}
});
