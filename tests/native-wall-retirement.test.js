import test from 'node:test';import assert from 'node:assert/strict';
import {InterleavedBuffer,InterleavedBufferAttribute} from 'three';
import Attributes from 'three/src/renderers/common/Attributes.js';
import Geometries from 'three/src/renderers/common/Geometries.js';
import WebGPUAttributeUtils from 'three/src/renderers/webgpu/utils/WebGPUAttributeUtils.js';
import {NativeWall} from '../src/rendering/walls.js';
import {createWebGpuAdmittedWall} from '../src/rendering/webgpu-wall-admission.js';
import {gateMeshPrototype} from '../tests/helpers/gate-mesh-source.js';
const turn=()=>new Promise(resolve=>setImmediate(resolve));
function fixture(){
 const stored=new WeakMap(),allocated=[];const backend={isWebGPUBackend:true,has:a=>stored.has(a),get(a){if(!stored.has(a))stored.set(a,{});return stored.get(a);},delete:a=>stored.delete(a),device:{createBuffer(d){const b={destructionCount:0,size:d.size,getMappedRange:()=>new ArrayBuffer(d.size),unmap(){},destroy(){this.destructionCount++;assert.equal(this.destructionCount,1,'one physical destroy per backing');}};allocated.push(b);return b;}}};
 const utils=new WebGPUAttributeUtils(backend);backend.createAttribute=a=>utils.createAttribute(a,32);backend.destroyAttribute=a=>utils.destroyAttribute(a);
 const attributes=new Attributes(backend),metrics={memory:{geometries:0},render:{calls:1}},manager=new Geometries(attributes,metrics),renderer={backend,_attributes:attributes};
 const prototypes={zarzas_puerta:gateMeshPrototype('zarzas')},entity={id:'gate',kind:'wall',gate:true,material:'zarzas',hp:60,maxHp:60,status:'intact',gateOpen:0};
 function wall(){return new NativeWall(prototypes,entity,0,{renderer});}
 function draw(value,{late=true,firstMorph=false}={}){
  const geometry=value.parts[0].mesh.geometry,primary=geometry.attributes.position,packed=new InterleavedBuffer(new Float32Array(primary.count*6),6),a=new InterleavedBufferAttribute(packed,3,0),b=new InterleavedBufferAttribute(packed,3,3);geometry.setAttribute('wgMorphTarget',a);geometry.setAttribute('wgMorphTargetNormal',b);
  const initial=firstMorph?[primary,a,b]:[primary];manager.updateForRender({geometry,material:{},getAttributes:()=>initial});
  if(late&&!firstMorph){metrics.render.calls++;manager.updateForRender({geometry,material:{},getAttributes:()=>[primary,a,b]});}
  return {geometry,primary,packed,views:[a,b],buffers:allocated.slice(-((late||firstMorph)?2:1))};
 }
 return {backend,attributes,metrics,renderer,prototypes,entity,wall,draw,allocated,close(){for(const p of Object.values(prototypes)){p.geometry.dispose();p.material.dispose();}}};
}
test('late material attributes retire with their own wall, once per backing, leaving another live owner intact',()=>{
 const f=fixture(),a=f.wall(),b=f.wall();try{
  const first=f.draw(a),other=f.draw(b);assert.equal(f.metrics.memory.geometries,2);assert.equal(f.allocated.length,4);
  a.dispose();assert.deepEqual(first.buffers.map(x=>x.destructionCount),[1,1]);assert.deepEqual(other.buffers.map(x=>x.destructionCount),[0,0]);
  for(const view of [first.primary,...first.views])assert.equal(f.attributes.has(view),false);assert.equal(f.backend.has(first.packed),false);assert.equal(f.backend.has(other.packed),true);assert.equal(f.metrics.memory.geometries,1);
  a.dispose();assert.deepEqual(first.buffers.map(x=>x.destructionCount),[1,1]);
  b.dispose();assert.deepEqual(other.buffers.map(x=>x.destructionCount),[1,1]);assert.equal(f.metrics.memory.geometries,0);
 }finally{a.dispose();b.dispose();f.close();}
});
test('a first material already using the interleaved fields does not cause duplicate backend destruction',()=>{
 const f=fixture(),wall=f.wall();try{const used=f.draw(wall,{firstMorph:true});wall.dispose();assert.deepEqual(used.buffers.map(b=>b.destructionCount),[1,1]);assert.equal(f.metrics.memory.geometries,0);}finally{wall.dispose();f.close();}
});
test('unused attributes allocate nothing during retirement and unrendered walls can be cancelled',()=>{
 const f=fixture(),wall=f.wall(),never=f.wall();try{const used=f.draw(wall,{late:false});assert.equal(f.allocated.length,1);never.dispose();assert.equal(f.allocated.length,1);wall.dispose();assert.equal(f.allocated.length,1);assert.deepEqual(used.buffers.map(b=>b.destructionCount),[1]);assert.equal(f.backend.has(used.packed),false);assert.equal(f.metrics.memory.geometries,0);}finally{wall.dispose();never.dispose();f.close();}
});
test('admitted wall forwards the renderer and destroys attributes only at the existing deferred retirement callback',async()=>{
 const f=fixture(),releases=[],pipelineAdmission={prepare:async()=>{},deferRelease:(_,release)=>releases.push(release)};let view;
 try{view=createWebGpuAdmittedWall({prototypes:f.prototypes,entity:f.entity,elapsed:0,renderer:f.renderer,pipelineAdmission});await turn();const wall=view.group.children[0],used=f.draw(wall);view.dispose();assert.deepEqual(used.buffers.map(b=>b.destructionCount),[0,0]);assert.equal(releases.length,1);releases.shift()();assert.deepEqual(used.buffers.map(b=>b.destructionCount),[1,1]);assert.equal(f.metrics.memory.geometries,0);}finally{view?.dispose();for(const release of releases)release();f.close();}
});
