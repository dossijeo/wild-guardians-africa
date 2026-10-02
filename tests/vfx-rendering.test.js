import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as THREE from 'three';
import {VfxLibrary} from '../src/rendering/vfx.js';
import {BuildingDestructionPass} from '../src/rendering/buildings.js';
import {vfxDefinitions,vfxEnvironment,createVfxGeometries,packVfxSprites} from '../src/rendering/vfx-native.js';
const catalog=JSON.parse(fs.readFileSync(new URL('../public/content/vfx.json',import.meta.url))),texture=new THREE.Texture({width:4096,height:2048});texture.flipY=false;
function setup(){const renderer={shadowMap:{enabled:true},getDrawingBufferSize:v=>v.set(1280,720)},pipeline=new BuildingDestructionPass(renderer),library=new VfxLibrary(catalog,texture),camera=new THREE.PerspectiveCamera(43,1280/720,.2,400);camera.position.set(4,3,8);camera.lookAt(0,1,0);camera.updateMatrixWorld();return {pipeline,library,camera};}

test('All 18 Three.js VFX preserve native solid, ribbon and sprite uploads before drawing',()=>{
  const {library,pipeline,camera}=setup();
  for(const d of vfxDefinitions){const fx=library.create(d.id,pipeline);fx.seek(d.duration*.5);fx.prepare(camera);
    assert.ok(fx.sprites.geometry.isInstancedBufferGeometry);assert.equal(fx.sprites.geometry.getAttribute('iParams').offset,18);assert.equal(fx.sprites.geometry.getAttribute('iDirection').offset,22);assert.equal(fx.spriteBuffer.stride,25);
    const packed=packVfxSprites(fx.native.sprites(),library.rects,{eye:fx.uniforms.uEye.value.toArray(),forward:new THREE.Vector3().setFromMatrixColumn(camera.matrixWorld,2).negate().toArray()});assert.equal(fx.sprites.geometry.instanceCount,packed.count);assert.deepEqual([...fx.spriteBuffer.array.slice(0,packed.count*25)],[...packed.data.slice(0,packed.count*25)]);
    const solids=fx.native.rigidInstances();for(const [id,p] of Object.entries(solids)){const buffer=fx.buffers.get(id),mesh=fx.rigids.get(id);assert.equal(buffer.stride,23);assert.equal(mesh.geometry.getAttribute('iModel').itemSize,16);assert.equal(mesh.geometry.instanceCount,p.count);assert.deepEqual([...buffer.array.slice(0,p.count*23)],[...p.data.slice(0,p.count*23)]);}
    const vertices=fx.native.geometry();assert.equal(fx.ribbons.geometry.drawRange.count,vertices.length/11);assert.deepEqual([...fx.ribbonBuffer.array.slice(0,vertices.length)],[...vertices]);assert.ok(fx.ribbonCapacity<48000,'No maximum-sized per-effect ribbon allocation');fx.dispose();
  }
  library.dispose();pipeline.dispose();
});

test('Atlas upload preserves original flipped rows, linear sampling, straight alpha and shared ownership',()=>{
  const {library,pipeline}=setup();assert.equal(library.texture.image,texture.image);assert.notEqual(library.texture,texture);assert.equal(texture.flipY,false);assert.equal(library.texture.flipY,true);assert.equal(library.texture.colorSpace,THREE.NoColorSpace);assert.equal(library.texture.generateMipmaps,false);assert.equal(library.texture.minFilter,THREE.LinearFilter);
  const fx=library.create('water',pipeline);assert.equal(fx.sprites.material.blending,THREE.NormalBlending);assert.equal(fx.sprites.material.premultipliedAlpha,false);assert.equal(fx.sprites.material.depthTest,true);assert.equal(fx.sprites.material.depthWrite,false);assert.equal(fx.uniforms.uDepth.value,pipeline.smokeDepth.depthTexture);assert.ok(fx.sprites.renderOrder>fx.ribbons.renderOrder,'Native geometry draws before its sprites');
  const shapes=createVfxGeometries();for(const [id,g] of library.shapes)assert.deepEqual([...g.getAttribute('aPosition').data.array],[...shapes[id]]);library.dispose();pipeline.dispose();
});

test('Root transforms orient particles and carry world camera planes, scale, fog and shadows into shaders',()=>{
  const {library,pipeline,camera}=setup(),fx=library.create('shield',pipeline),world=new THREE.Scene();world.fog=new THREE.Fog('#735635',20,80);world.add(fx);fx.position.set(2,3,-4);fx.rotation.y=Math.PI/2;fx.scale.setScalar(4);fx.seek(2);fx.prepare(camera,world);
  const localEye=camera.position.clone().applyMatrix4(fx.matrixWorld.clone().invert());assert.ok(localEye.distanceTo(fx.uniforms.uEye.value)<1e-9);assert.equal(fx.uniforms.uScale.value,4);assert.equal(fx.uniforms.uNear.value,.2);assert.equal(fx.uniforms.uFar.value,400);assert.deepEqual(fx.uniforms.uFogRange.value.toArray(),[20,80]);assert.deepEqual(fx.uniforms.uViewport.value.toArray(),[1280,720]);
  assert.match(fx.sprites.material.fragmentShader,/vParams\.w\*uScale/);assert.match(fx.rigidMaterial.fragmentShader,/unpackRGBAToDepth/);assert.match(fx.depthMaterial.fragmentShader,/packDepthToRGBA\(gl_FragCoord.z\)/);assert.ok([...fx.rigids.values()].every(m=>m.castShadow&&m.customDepthMaterial===fx.depthMaterial));library.dispose();pipeline.dispose();
});

test('Paused VFX keep solid and ribbon buffers stable, clear stops static effects and source layers remain selective',()=>{
  const {library,pipeline,camera}=setup(),fx=library.create('dig',pipeline,{layers:{fragments:false}});fx.seek(1);fx.prepare(camera);assert.ok(fx.rigids.get('soil').geometry.instanceCount>0);assert.equal(fx.rigids.get('soil').visible,false);
  const time=fx.native.time,versions=[fx.ribbonBuffer.version,...[...fx.buffers.values()].map(b=>b.version)];fx.advance(0);fx.prepare(camera);assert.equal(fx.native.time,time);assert.deepEqual([fx.ribbonBuffer.version,...[...fx.buffers.values()].map(b=>b.version)],versions);
  const water=library.create('water',pipeline,{layers:{fragments:false}});water.seek(1);water.prepare(camera);assert.equal(water.rigids.get('water').visible,true);
  const shield=library.create('shield',pipeline);shield.seek(2);shield.prepare(camera);assert.equal(shield.ribbons.visible,true);shield.clear();assert.equal(shield.prepare(camera),false);assert.equal(shield.ribbons.visible,false);assert.equal(shield.sprites.visible,false);shield.seek(2);shield.prepare(camera);assert.equal(shield.ribbons.visible,true);library.dispose();pipeline.dispose();
});

test('Effects never participate in interaction raycasts and release private resources before the shared atlas',()=>{
  const {library,pipeline,camera}=setup(),scene=new THREE.Scene(),fx=library.create('dig',pipeline);scene.add(fx);fx.seek(1);fx.prepare(camera);const hits=[];fx.traverse(m=>{if(m.isMesh)m.raycast(new THREE.Raycaster(),hits);});assert.equal(hits.length,0);
  let materials=0,geometries=0,atlas=0;for(const m of [fx.rigidMaterial,fx.depthMaterial,fx.sprites.material,fx.ribbons.material])m.addEventListener('dispose',()=>materials++);for(const m of [...fx.rigids.values(),fx.sprites,fx.ribbons])m.geometry.addEventListener('dispose',()=>geometries++);library.texture.addEventListener('dispose',()=>atlas++);
  fx.dispose();assert.equal(scene.children.length,0);assert.equal(fx.children.length,0);assert.equal(library.instances.size,0);assert.equal(materials,4);assert.equal(geometries,9);assert.equal(atlas,0);assert.equal(fx.native.parts.length,0);assert.equal(fx.native.rigids.length,0);library.dispose();assert.equal(atlas,1);pipeline.dispose();
});

test('Native environment retains distinct day, sunset and night lighting for particles',()=>{
  const day=vfxEnvironment(0),sunset=vfxEnvironment(.43),night=vfxEnvironment(1);assert.equal(day.night,0);assert.equal(night.night,1);assert.ok(day.sun[0]>sunset.sun[0]&&sunset.sun[0]>night.sun[0]);assert.deepEqual(day.particle,day.sky.map((v,i)=>v*.95+day.sun[i]*.4));assert.ok(night.particle.every(v=>v>0&&v<.4));
});

test('Two native local lights retain source positions/colors on world materials and disappear when stopped',()=>{
  const {library,pipeline,camera}=setup(),fx=library.create('spirit',pipeline);fx.scale.setScalar(2);fx.seek(2);fx.prepare(camera);const native=fx.native.lights;
  assert.equal(fx.localLights.length,2);for(let i=0;i<2;i++){const light=fx.localLights[i];assert.deepEqual(light.position.toArray(),native.positions[i]);assert.deepEqual(light.color.toArray(),native.colors[i]);assert.equal(light.castShadow,false);assert.equal(light.intensity,4/2.2);assert.equal(light.visible,true);}
  fx.clear();assert.ok(fx.localLights.every(l=>!l.visible));const hidden=library.create('spirit',pipeline,{layers:{lights:false}});hidden.seek(2);hidden.prepare(camera);assert.ok(hidden.localLights.every(l=>!l.visible));library.dispose();pipeline.dispose();
});
