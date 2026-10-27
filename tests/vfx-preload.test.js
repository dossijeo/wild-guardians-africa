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

test('stable light slots preserve isolated effect illumination and scene-relative coordinates without changing light count',()=>{
 const {library,pipeline,camera,world}=setup();library.enableStableWorldLights(world);
 const fx=library.create('spirit',pipeline);world.add(fx);world.position.set(-144,0,96);fx.position.set(150,2,-90);fx.scale.setScalar(2);fx.seek(2);fx.prepare(camera,world);library.updateWorldLights(camera);world.updateMatrixWorld(true);
 let count=0;world.traverse(o=>{if(o.isPointLight)count++;});assert.equal(count,4);
 const active=library.worldLights.filter(l=>l.intensity>0);assert.equal(active.length,2);
 for(const source of fx.localLights){const expected=source.position.clone().applyMatrix4(fx.matrixWorld);assert(active.some(l=>l.getWorldPosition(new Vector3()).distanceTo(expected)<1e-8&&l.color.equals(source.color)&&l.intensity===source.intensity));}
 fx.clear();library.updateWorldLights(camera);assert(library.worldLights.every(l=>l.visible&&l.intensity===0));
 fx.dispose();library.updateWorldLights(camera);assert.equal(world.children.length,4);library.dispose();assert.equal(world.children.length,0);pipeline.dispose();
});

test('smoke preparation submits its own lightless scene and restores renderer state before compilation resolves',async()=>{
 const {pipeline,renderer,camera}=setup();let resolve,seen;const target={id:'loading'};let current=target;
 Object.assign(renderer,{getRenderTarget:()=>current,setRenderTarget:t=>{current=t;},getViewport:v=>v.set(0,0,800,600),getScissor:v=>v.set(0,0,800,600),getScissorTest:()=>true,setViewport:()=>{},setScissor:()=>{},setScissorTest:()=>{},compileAsync:(scene,c)=>{seen={scene,c,target:current,shadows:renderer.shadowMap.enabled};return new Promise(r=>{resolve=r;});}});
 renderer.shadowMap.enabled=true;const pending=pipeline.prepareSmokePrograms(camera);
 assert.equal(seen.scene,pipeline.smokeScene);assert.equal(seen.target,null);assert.equal(seen.shadows,false);assert.equal(current,target);assert.equal(renderer.shadowMap.enabled,true);
 resolve();await pending;pipeline.dispose();
});


test('stable slots ignore effects hidden by ancestors or detached from their scene',()=>{
 const {library,pipeline,camera,world}=setup();library.enableStableWorldLights(world);
 const group=new Scene();world.add(group);const fx=library.create('spirit',pipeline);group.add(fx);
 fx.seek(2);fx.prepare(camera,world);library.updateWorldLights(camera);
 assert(library.worldLights.some(l=>l.intensity>0));
 group.visible=false;library.updateWorldLights(camera);
 assert(library.worldLights.every(l=>l.visible&&l.intensity===0));
 group.visible=true;group.removeFromParent();library.updateWorldLights(camera);
 assert(library.worldLights.every(l=>l.visible&&l.intensity===0));
 world.add(group);library.updateWorldLights(camera);assert(library.worldLights.some(l=>l.intensity>0));
 library.dispose();pipeline.dispose();
});


test('stable lights retain near-equal sources but admit a clearly stronger challenger',()=>{
 const {library,pipeline,camera,world}=setup();library.enableStableWorldLights(world,1);
 const first=library.create('spirit',pipeline),second=library.create('spirit',pipeline);world.add(first,second);
 for(const fx of [first,second]){fx.stopped=false;fx.localLights[0].visible=true;fx.localLights[0].position.set(0,0,0);fx.localLights[0].color.setRGB(1,1,1);fx.localLights[1].visible=false;}
 first.localLights[0].intensity=1;second.localLights[0].intensity=.99;
 library.updateWorldLights(camera);assert(library.retainedLightSources.has(first.localLights[0]));
 second.localLights[0].intensity=1.1;library.updateWorldLights(camera);assert(library.retainedLightSources.has(first.localLights[0]));
 second.localLights[0].intensity=1.3;library.updateWorldLights(camera);assert(library.retainedLightSources.has(second.localLights[0]));
 assert.equal(library.worldLights[0].intensity,1.3,'ranking hysteresis must not change authored intensity');
 second.visible=false;library.updateWorldLights(camera);assert(library.retainedLightSources.has(first.localLights[0]));
 first.visible=false;library.updateWorldLights(camera);assert.equal(library.worldLights[0].intensity,0);assert.equal(library.retainedLightSources.size,0);
 library.dispose();pipeline.dispose();
});
