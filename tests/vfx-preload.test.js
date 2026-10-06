import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {Scene,Texture,PerspectiveCamera,Vector3} from 'three';
import {VfxLibrary} from '../src/rendering/vfx.js';
import {VfxGpuPreload} from '../src/rendering/vfx-preload.js';
import {BuildingDestructionPass} from '../src/rendering/buildings.js';
import {LocomotionVfx} from '../src/rendering/locomotion-vfx.js';
import {vfxDefinitions} from '../src/rendering/vfx-native.js';
const catalog=JSON.parse(fs.readFileSync(new URL('../public/content/vfx.json',import.meta.url)));
function setup(){
 const renderer={shadowMap:{enabled:false},getDrawingBufferSize:v=>v.set(1280,720)};
 const library=new VfxLibrary(catalog,new Texture({width:4096,height:2048})),pipeline=new BuildingDestructionPass(renderer),camera=new PerspectiveCamera(43,16/9,.2,400),world=new Scene();
 camera.position.set(4,3,8);camera.lookAt(0,1,0);camera.updateMatrixWorld();return {renderer,library,pipeline,camera,world};
}
const materials=fx=>[fx.rigidMaterial,fx.depthMaterial,fx.sprites.material,fx.ribbons.material];

test('the loading primer owns only four retained materials after every private geometry is released',()=>{
 const {library,pipeline,camera,world}=setup(),primer=new VfxGpuPreload(library,pipeline,camera,world,new Vector3(3,0,7));world.add(primer);
 const fx=primer.effect,held=materials(fx);let geometryDisposals=0,materialDisposals=0;
 for(const mesh of [...fx.rigids.values(),fx.sprites,fx.ribbons])mesh.geometry.addEventListener('dispose',()=>geometryDisposals++);
 for(const material of held)material.addEventListener('dispose',()=>materialDisposals++);
 assert.ok(fx.ribbons.geometry.drawRange.count>0);assert.ok(fx.sprites.geometry.instanceCount>0);assert.ok(fx.localLights.every(l=>!l.visible));
 primer.dispose({retainPrograms:true});assert.equal(world.children.length,0);assert.equal(library.instances.size,0);assert.equal(geometryDisposals,9);assert.equal(materialDisposals,0);
 assert.deepEqual([...library.preparedMaterials],held);assert.equal(fx.buffers.size,0);assert.equal(fx.children.length,0);assert.equal(fx.native.parts.length,0);assert.equal(fx.native.rigids.length,0);
 primer.dispose({retainPrograms:true});assert.equal(geometryDisposals,9);
 library.dispose();assert.equal(materialDisposals,4);assert.equal(library.preparedMaterials.size,0);library.dispose();assert.equal(materialDisposals,4);pipeline.dispose();
});

test('all native compositions use the prepared recipes without sharing mutable effect uniforms or particles',()=>{
 const {library,pipeline,camera,world}=setup(),primer=new VfxGpuPreload(library,pipeline,camera,world,new Vector3()),held=materials(primer.effect);
 primer.dispose({retainPrograms:true});held[0].uniforms.uTime.value=123;
 for(const definition of vfxDefinitions){
  const fx=library.create(definition.id,pipeline);for(const [i,material] of materials(fx).entries()){
   assert.notEqual(material,held[i]);assert.notEqual(material.uniforms,held[i].uniforms);assert.equal(material.vertexShader,held[i].vertexShader);assert.equal(material.fragmentShader,held[i].fragmentShader);assert.equal(material.customProgramCacheKey(),held[i].customProgramCacheKey());
  }
  fx.seek(definition.duration*.5);fx.prepare(camera,world);assert.notEqual(fx.uniforms.uTime.value,123);fx.dispose();
 }
 assert.equal(library.preparedMaterials.size,4);assert.equal(library.instances.size,0);library.dispose();pipeline.dispose();
});

test('failed preparation releases its partially created effect instead of retaining shader owners',()=>{
 const {renderer,library,pipeline,camera,world}=setup();let created;const create=library.create.bind(library);library.create=(...args)=>(created=create(...args));
 renderer.getDrawingBufferSize=()=>{throw Error('lost drawing buffer');};
 assert.throws(()=>new VfxGpuPreload(library,pipeline,camera,world,new Vector3()),/lost drawing buffer/);
 assert.equal(created.disposed,true);assert.equal(created.children.length,0);assert.equal(library.instances.size,0);assert.equal(library.preparedMaterials.size,0);library.dispose();pipeline.dispose();
});

test('disposal during asynchronous preparation cannot retain materials into a closed library',()=>{
 const {library,pipeline,camera,world}=setup(),primer=new VfxGpuPreload(library,pipeline,camera,world,new Vector3());let count=0;
 for(const material of materials(primer.effect))material.addEventListener('dispose',()=>count++);
 library.dispose();primer.dispose({retainPrograms:true});assert.equal(count,4);assert.equal(library.preparedMaterials.size,0);assert.equal(primer.children.length,0);pipeline.dispose();
});

test('preparing water steps is idempotent and does not invent contacts, elapsed time or visible rings',()=>{
 const {library,pipeline,world}=setup(),locomotion=new LocomotionVfx(library,pipeline,world,()=>0);
 const mesh=locomotion.prepareWaterSteps();assert.equal(locomotion.prepareWaterSteps(),mesh);assert.equal(mesh.visible,false);assert.equal(mesh.count,0);assert.deepEqual(locomotion.ripples.contacts,[]);assert.equal(locomotion.elapsed,null);
 locomotion.ripples.add(1,2,3,8);locomotion.ripples.update(8.1);assert.equal(mesh.count,1);assert.equal(mesh.visible,true);
 locomotion.dispose();assert.equal(world.children.length,0);library.dispose();pipeline.dispose();
});
