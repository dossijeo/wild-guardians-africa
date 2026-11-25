import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {MeshStandardNodeMaterial} from 'three/webgpu';
import {createWebGpuSettlements} from '../src/rendering/webgpu-settlements.js';
import {createNativeDestruction} from '../src/rendering/destruction-native.js';
import * as destruction from '../src/rendering/webgpu-center-destruction.js';

test('a center strike prepares copied geometry, can cancel and retry, and emits only on confirmed damage',async t=>{
 const source=new THREE.Group(),geometry=new THREE.BoxGeometry(),material=new MeshStandardNodeMaterial();
 source.add(new THREE.Mesh(geometry,material));
 const jobs=[];
 t.mock.method(globalThis,'fetch',async url=>({ok:true,json:async()=>String(url).includes('destruction')?{buildings:[{culture:'mapungubwe',seed:4}]}:[]}));
 const oldWorker=Object.getOwnPropertyDescriptor(globalThis,'Worker');
 class BuildingWorker{
  postMessage(message,transfer){this.input=structuredClone(message,{transfer});jobs.push(this);}
  terminate(){this.terminated=true;}
  reply(){this.onmessage({data:createNativeDestruction(this.input.building,this.input.input)});}
 }
 Object.defineProperty(globalThis,'Worker',{value:BuildingWorker,configurable:true});
 t.after(()=>{if(oldWorker)Object.defineProperty(globalThis,'Worker',oldWorker);else delete globalThis.Worker;});
 const ground=new THREE.Mesh(new THREE.PlaneGeometry(20,20),new THREE.MeshBasicMaterial({side:THREE.DoubleSide}));
 ground.rotation.x=-Math.PI/2;ground.updateMatrixWorld(true);
 const center={id:'structure-2',kind:'center',culture:'mapungubwe',status:'intact',x:0,z:0,hp:600,maxHp:600};
 const state={culture:center.culture,elapsed:1,villages:[],structures:[center]},scene=new THREE.Scene();
 const view=createWebGpuSettlements({scene,state,residency:{get:()=>ground},renderer:{backend:{isWebGPUBackend:true},library:{}},
  loadProgressiveCenter:async()=>({preview:{scene:source},start(){},tick(){},dispose(){}})});
 try{
  view.sync();
  for(let i=0;i<10&&!scene.children.length;i++)await new Promise(resolve=>setImmediate(resolve));
  const group=scene.children[0],intact=group.children[0],attribute=geometry.attributes.position;
  await view.prepareCenterStrike(99);
  assert.equal(jobs.length,0);
  const controller=new AbortController(),cancelled=view.prepareCenterStrike(2,controller.signal);
  assert.equal(jobs.length,1);
  controller.abort();await assert.rejects(cancelled,/cancel/i);jobs[0].reply();
  const ready=view.prepareCenterStrike(2);
  assert.equal(jobs.length,2);assert.equal(jobs[0].terminated,true);
  jobs[1].reply();await ready;await view.prepareCenterStrike(2);
  assert.equal(jobs.length,2);assert.equal(group.children.length,1);assert.equal(intact.visible,true);
  assert.equal(center.hp,600);assert.equal(attribute,geometry.attributes.position);assert(attribute.array.byteLength>0);
  center.hp=580;state.elapsed+=.05;view.sync();
  assert.equal(group.children.length,2);assert.equal(intact.visible,false);
  assert.equal(view.status().destruction[0].emitted,0);
  const damaged=group.children[1];await view.prepareCenterStrike(2);
  center.hp=560;state.elapsed+=.05;view.sync();
  assert.equal(jobs.length,2);assert.equal(group.children[1],damaged);
  center.hp=540;state.elapsed+=.05;view.sync();
  assert(view.status().destruction[0].emitted>0);
 }finally{view.dispose();ground.geometry.dispose();ground.material.dispose();geometry.dispose();material.dispose();}
});

test('the prepared center follows the original geometry generation and restores damage without replaying the hit',async()=>{
 const scene=new THREE.Group(),mesh=new THREE.Mesh(new THREE.BoxGeometry(),new MeshStandardNodeMaterial());
 scene.add(mesh);const gltf={scene},building={seed:4},renderer={library:{}};
 const prepared=await destruction.prepareWebGpuCenterDestructionData(gltf,building,{workerAvailable:false});
 assert(prepared.matches(mesh,building));assert(!prepared.matches(mesh,{...building}));
 const colors=new Float32Array(mesh.geometry.attributes.position.count*4).fill(.75);
 mesh.geometry.setAttribute('wgOriginalColor',new THREE.BufferAttribute(colors,4));
 const template=destruction.createWebGpuCenterDestructionTemplate({gltf,building,renderer,prepared});
 const recovered=template.instantiate();recovered.update({status:'intact',hp:540,maxHp:600},2);
 const geometry=recovered.group.children[0].geometry;
 assert.equal(geometry.attributes.position.data.array,prepared.data.vertices);
 assert.equal(geometry.attributes.wgOriginalColor.getX(0),.75);
 assert.equal(recovered.status().emitted,0);
 const attr=mesh.geometry.attributes.position;attr.setX(0,attr.getX(0)+1);attr.needsUpdate=true;
 assert(!prepared.matches(mesh,building));
 const current=destruction.createWebGpuCenterDestructionTemplate({gltf,building,renderer,prepared}),expected=destruction.createWebGpuCenterDestructionTemplate({gltf,building,renderer});
 try{
  const vertices=t=>t.instantiate().group.children[0].geometry.attributes.position.data.array;
  assert.deepEqual(vertices(current),vertices(expected));assert.notDeepEqual(vertices(current),vertices(template));
 }finally{current.dispose();expected.dispose();template.dispose();mesh.geometry.dispose();mesh.material.dispose();}
});
