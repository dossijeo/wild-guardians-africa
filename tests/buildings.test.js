import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import * as THREE from 'three';
import {prepareNativeBuilding,NativeBuilding,BuildingDestructionPass,centerVisualDamage} from '../src/rendering/buildings.js';
import {WorldScene} from '../src/rendering/scene.js';
import {hitStructure} from '../src/simulation/rules.js';
import {numberOf} from '../src/simulation/money.js';
import * as Game from '../src/simulation/game.js';
import {serialize,deserialize} from '../src/persistence/snapshots.js';
import {terrainTriangleHeight} from '../src/rendering/hand-terrain.js';
import {AfricanToon} from '../src/rendering/african-toon.js';
import {withDepthCaptureMaterials} from '../src/rendering/depth-capture.js';
import {auxiliaryBuildingDepthFragment} from '../src/rendering/building-depth.js';
import {destructionFragment} from '../src/rendering/destruction-native.js';
import {cameraModelVolume} from '../src/rendering/camera-model-volume.js';
import {sweepCameraVolume} from '../src/rendering/camera-volume-sweep.js';
const catalogue=JSON.parse(readFileSync(new URL('../public/content/destruction.json',import.meta.url))).buildings;
function originalModel(building){
  const bytes=readFileSync(new URL('../public'+building.url,import.meta.url)),array=bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),view=new DataView(array);let json,bin;
  for(let at=12;at<array.byteLength;){const n=view.getUint32(at,true),type=view.getUint32(at+4,true);if(type===0x4e4f534a)json=JSON.parse(new TextDecoder().decode(new Uint8Array(array,at+8,n)));if(type===0x004e4942)bin=at+8;at+=n+8;}
  const attr=id=>{const a=json.accessors[id],v=json.bufferViews[a.bufferView],Type=({5126:Float32Array,5125:Uint32Array,5123:Uint16Array})[a.componentType],size=({SCALAR:1,VEC2:2,VEC3:3})[a.type],out=new Type(a.count*size),offset=bin+(v.byteOffset??0)+(a.byteOffset??0),stride=v.byteStride??size*Type.BYTES_PER_ELEMENT;for(let i=0;i<a.count;i++)out.set(new Type(array,offset+i*stride,size),i*size);return new THREE.BufferAttribute(out,size);};
  const primitive=json.meshes[0].primitives[0],geometry=new THREE.BufferGeometry();
  for(const [name,key] of [['position','POSITION'],['normal','NORMAL'],['uv','TEXCOORD_0']])geometry.setAttribute(name,attr(primitive.attributes[key]));geometry.setIndex(attr(primitive.indices));
  const scene=new THREE.Group(),material=new THREE.MeshStandardMaterial({map:new THREE.Texture(),normalMap:new THREE.Texture(),roughnessMap:new THREE.Texture()});scene.add(new THREE.Mesh(geometry,material));return {scene,geometry,material};
}
function fakeRenderer(){
  return {size:new THREE.Vector2(1280,720),color:new THREE.Color('#abccdd'),alpha:.6,target:null,autoClear:false,shadowMap:{enabled:true},renders:0,
    getDrawingBufferSize(out){return out.copy(this.size)},getRenderTarget(){return this.target},setRenderTarget(target){this.target=target},getClearColor(out){return out.copy(this.color)},getClearAlpha(){return this.alpha},setClearColor(color,alpha){this.color.set(color);this.alpha=alpha},render(){this.renders++;if(this.fail)throw new Error('fallo GPU de prueba');}};
}
const models=catalogue.map(b=>originalModel(b)),templates=catalogue.map((b,i)=>prepareNativeBuilding(models[i],b));

test('camera volumes retain all five native center scales, pivots and collapse envelopes',()=>{
 const pass=new BuildingDestructionPass(fakeRenderer()),point=new THREE.Vector3();
 for(const template of templates){
  const house=new NativeBuilding(template,{id:template.building.culture,hp:600,maxHp:600,status:'intact',yaw:.71},pass);
  house.position.set(170,12,-49);house.updateWorldMatrix(true,true);
  for(const state of ['still','fall','ash']){
   const bounds=template.culling.boxes[state],volume=cameraModelVolume(house.entityId,bounds,house.matrixWorld);
   for(const x of [bounds.min.x,bounds.max.x])for(const y of [bounds.min.y,bounds.max.y])for(const z of [bounds.min.z,bounds.max.z]){
    point.set(x,y,z).applyMatrix4(house.matrixWorld);
    assert.ok(sweepCameraVolume(point.toArray(),point.toArray(),volume,1e-7),`${house.entityId}/${state}: transformed corner must be enclosed`);
   }
   const above=volume.max[1]+1;
   assert.equal(sweepCameraVolume([150,above,-49],[190,above,-49],volume,.5),null);
   const split=cameraModelVolume(house.entityId,bounds,house.matrixWorld,{horizontal:6,vertical:.6}),uniform=cameraModelVolume(house.entityId,bounds,house.matrixWorld,6);
   assert.ok(Math.abs(split.max[1]-volume.max[1]-.6)<1e-9);
   assert.ok(Math.abs(split.max[0]-volume.max[0]-6)<1e-9);
   const splitRoof=split.max[1]+.4501;
   assert.equal(sweepCameraVolume([150,splitRoof,-49],[190,splitRoof,-49],split,.45),null);
   assert.ok(sweepCameraVolume([150,splitRoof,-49],[190,splitRoof,-49],uniform,.45),`${house.entityId}/${state}: scalar margin blocks the same roof path`);
  }
  house.dispose();
 }
 pass.dispose();
});

test('auxiliary depth preserves native shell/ash cuts, camera inputs and LessDepth in all five cultures',()=>{
  const shell=destructionFragment.slice(destructionFragment.indexOf('  if(uInner>.5){'),destructionFragment.indexOf('  float soot='));
  const ash=destructionFragment.slice(destructionFragment.indexOf('  if(uDamage<.235)discard;'),destructionFragment.indexOf('  base=mix(vec3(.025'));
  assert.ok(auxiliaryBuildingDepthFragment.includes(shell));assert.ok(auxiliaryBuildingDepthFragment.includes(ash));
  for(const forbidden of ['shadowFactor','environment4','cotangent','texture(uAlbedo','tonemap'])assert.ok(!auxiliaryBuildingDepthFragment.includes(forbidden));
  for(const template of templates){
    const pass=new BuildingDestructionPass(fakeRenderer());pass.auxiliaryDepth=true;const entity={id:'aux-depth',hp:240,maxHp:600,status:'intact'},house=new NativeBuilding(template,entity,pass),world=new THREE.Scene();world.add(house);
    assert.equal(house.inner.customDepthMaterial.depthFunc,THREE.LessDepth);
    assert.equal(house.ash.customDepthMaterial.depthFunc,THREE.LessEqualDepth);
    for(const mesh of [house.inner,house.ash]){
      assert.equal(mesh.customDepthMaterial.vertexShader,mesh.material.vertexShader);
      assert.equal(mesh.customDepthMaterial.uniforms,mesh.material.uniforms);
      assert.equal(mesh.customDepthMaterial.side,THREE.DoubleSide);
    }
    assert.equal(house.inner.customDepthMaterial.uniforms.uInner.value,1);assert.equal(house.ash.customDepthMaterial.uniforms.uMode.value,2);
    const original=house.inner.material,camera=new THREE.PerspectiveCamera(45,1,.1,100);camera.position.set(10,8,12);camera.lookAt(0,2,0);camera.updateWorldMatrix(true,false);house.updateWorldMatrix(true,true);
    assert.throws(()=>withDepthCaptureMaterials(world,()=>{
      assert.equal(house.inner.material,house.inner.customDepthMaterial);assert.equal(house.ash.material,house.ash.customDepthMaterial);
      house.inner.onBeforeRender(null,world,camera);assert.equal(house.inner.material.uniforms.uOpeningMask.value,pass.target.texture);assert.equal(house.inner.material.uniforms.uIntactDepth.value,pass.target.depthTexture);
      assert.ok(house.inner.material.uniforms.uVP.value.equals(new THREE.Matrix4().multiplyMatrices(camera.projectionMatrix,camera.matrixWorldInverse).multiply(house.inner.matrixWorld)));
      throw new Error('capture interrupted');
    }),/capture interrupted/);assert.equal(house.inner.material,original);assert.equal(house.inner.material.colorWrite,true);
    const defaultHouse=new NativeBuilding(template,{...entity,id:'default-depth'},pass);pass.auxiliaryDepth=false;const nativeHouse=new NativeBuilding(template,{...entity,id:'native-depth'},pass);assert.equal(nativeHouse.inner.customDepthMaterial,undefined);assert.equal(nativeHouse.ash.customDepthMaterial,undefined);nativeHouse.dispose();defaultHouse.dispose();
    const depths=[house.outer,house.inner,house.ash].map(m=>m.customDepthMaterial),disposed=[];depths.forEach(m=>m.addEventListener('dispose',()=>disposed.push(m)));
    house.dispose();assert.deepEqual(disposed,depths);pass.dispose();
  }
});

test('five native center envelopes contain intact/interior and falling vertices throughout collapse',()=>{
  const point=new THREE.Vector3();
  for(const template of templates){
    const {kernel,body,culling}=template,positions=body.attributes.aPos,anchors=body.attributes.aAnchor,normals=body.attributes.aNormal;
    for(const damage of [0,.79,.8,.85,.9,.95,1]){
      kernel.setDamage(damage);
      const sphere=damage>.79?culling.fall:culling.still;
      for(let i=0;i<positions.count;i++){
        const p=[positions.getX(i),positions.getY(i),positions.getZ(i)],g={anchor:[anchors.getX(i),anchors.getY(i),anchors.getZ(i)],seed:body.attributes.aSeed.getX(i)};
        for(const inner of [0,1]){
          const source=p.map((v,k)=>v-.21*inner*[normals.getX(i),normals.getY(i),normals.getZ(i)][k]);
          const collapsed=kernel.collapsedPoint(source,g);collapsed[1]=Math.max(collapsed[1],.035);
          point.fromArray(collapsed);assert.ok(sphere.containsPoint(point),`${template.building.id} damage ${damage} inner ${inner} vertex ${i}`);
          assert.ok(culling.boxes[damage>.79?'fall':'still'].containsPoint(point),`${template.building.id}: camera box excludes deformed vertex`);
        }
      }
    }
    for(const growth of [0,.25,.5,1])for(let i=0;i<template.ash.attributes.position.count;i++){
      point.fromBufferAttribute(template.ash.attributes.position,i);point.x*=.15+.85*growth;point.z*=.15+.85*growth;point.y*=.3+.7*growth;
      assert.ok(culling.ash.containsPoint(point),'ash contraction stays inside its independent envelope');
      assert.ok(culling.boxes.ash.containsPoint(point),'camera ash box contains contracted vertices');
    }
    kernel.setDamage(0);
    const pass=new BuildingDestructionPass(fakeRenderer()),entity={id:'bounds',hp:600,maxHp:600,status:'intact'},house=new NativeBuilding(template,entity,pass);
    for(const mesh of [house.outer,house.inner,house.opening,house.ash])assert.equal(mesh.frustumCulled,true);
    assert.equal(house.outer.boundingSphere,culling.still);assert.equal(house.ash.boundingSphere,culling.ash);
    house.update({...entity,status:'collapsing',collapseRemaining:1},1);assert.equal(house.outer.boundingSphere,culling.fall);assert.equal(house.opening.boundingSphere,culling.fall);
    house.update(entity,2);assert.equal(house.outer.boundingSphere,culling.still);
    const camera=new THREE.PerspectiveCamera(40,1,.1,100);camera.position.set(0,4,20);camera.lookAt(0,3,0);camera.updateMatrixWorld();
    const frustum=new THREE.Frustum().setFromProjectionMatrix(new THREE.Matrix4().multiplyMatrices(camera.projectionMatrix,camera.matrixWorldInverse));
    house.updateMatrixWorld(true);assert.ok(frustum.intersectsObject(house.outer));house.position.x=300;house.updateMatrixWorld(true);assert.equal(frustum.intersectsObject(house.outer),false);
    const lightCamera=new THREE.OrthographicCamera(-500,500,500,-500,.1,1000);lightCamera.position.set(0,500,0);lightCamera.lookAt(0,0,0);lightCamera.updateMatrixWorld();
    const lightFrustum=new THREE.Frustum().setFromProjectionMatrix(new THREE.Matrix4().multiplyMatrices(lightCamera.projectionMatrix,lightCamera.matrixWorldInverse));
    assert.ok(lightFrustum.intersectsObject(house.outer),'an offscreen center remains eligible inside the light volume');
    house.dispose();pass.dispose();
  }
});

test('all five DEST cultures share HDR resources with cel debris, retain native depth and use lab exposure',()=>{
  const toon=new AfricanToon(),renderer=fakeRenderer(),pass=new BuildingDestructionPass(renderer);pass.environmentUniforms=toon.environmentUniforms;pass.fineNoiseUniform=toon.uniforms.uFineNoise;toon.uniforms.uFineNoise.value=0;
  const textures=[new THREE.Texture(),new THREE.Texture()];toon.environment(textures,{value:.25});assert.equal(toon.uniforms.uExposure.value,1);
  for(const [index,template] of templates.entries()){
    const house=new NativeBuilding(template,{id:'hdr-'+index,hp:600,maxHp:600,status:'intact',yaw:.9},pass),camera=new THREE.PerspectiveCamera();house.position.set(20,3,-11);house.updateWorldMatrix(true,true);camera.position.set(29,8,-6);camera.lookAt(house.position);camera.updateWorldMatrix(true,false);house.cameraUniforms(house.outer,camera);
    for(const material of [house.outer.material,house.inner.material,house.ash.material,house.effects.debris.material]){
      assert.equal(material.uniforms.uEnvEndpoints,toon.uniforms.uEnvEndpoints);assert.equal(material.uniforms.uFineNoise,toon.uniforms.uFineNoise);assert.equal(material.uniforms.uFineNoise.value,0);assert.ok(material.fragmentShader.includes("if(uFineNoise>.5)"));assert.equal(material.uniforms.uEnvDay,pass.environmentUniforms.uEnvDay);assert.equal(material.uniforms.uEnvNight.value,textures[1]);assert.equal(material.uniforms.uEnvYaw.value,.25);assert.equal(material.uniforms.uExposure.value,1);assert.ok(material.fragmentShader.includes('environment4(normalize(mat3(uToonModel)*reflect(-V,N))'));
    }
    const localPoint=new THREE.Vector3(.3,1,-.2),normal=new THREE.Vector3(0,0,1),localV=house.uniforms.uEye.value.clone().sub(localPoint).normalize(),reflected=localV.clone().negate().reflect(normal).transformDirection(house.uniforms.uToonModel.value);
    const worldPoint=localPoint.clone().applyMatrix4(house.matrixWorld),worldNormal=normal.clone().transformDirection(house.matrixWorld),reference=camera.position.clone().sub(worldPoint).normalize().negate().reflect(worldNormal);
    assert.ok(reflected.distanceTo(reference)<1e-12);assert.ok(!house.outer.customDepthMaterial.fragmentShader.includes('environment4'));assert.ok(house.effects.debris.material.vertexShader.includes('vDebrisBase=aColor'));
    house.dispose();
  }
  pass.dispose();textures.forEach(t=>t.dispose());
});

test('removing world fog also removes it from DEST buildings, debris and smoke',()=>{
  const renderer=fakeRenderer(),pass=new BuildingDestructionPass(renderer),house=new NativeBuilding(templates[0],{id:'clear-world',hp:600,maxHp:600,status:'intact'},pass),world=new THREE.Scene(),camera=new THREE.PerspectiveCamera();
  world.add(house);world.fog=new THREE.Fog('#765b3b',130,250);pass.render(camera,world);assert.deepEqual(house.uniforms.uWorldFogRange.value.toArray(),[130,250]);
  world.fog=null;pass.render(camera,world);assert.deepEqual(house.uniforms.uWorldFogRange.value.toArray(),[1e8,1e9]);
  assert.equal(house.effects.smokeUniforms.uWorldFogRange,house.uniforms.uWorldFogRange);house.dispose();pass.dispose();
});
test('Five native center templates retain original textures, proportions, UVs and world footprint',()=>{
  for(let i=0;i<templates.length;i++){
    const template=templates[i],original=models[i];assert.equal(template.material,original.material);
    assert.equal(template.body.getAttribute('aPos'),template.body.getAttribute('position'));assert.equal(template.body.getAttribute('aPos').count,template.kernel.indices.length);assert.equal(template.body.getAttribute('aUV').count,template.kernel.indices.length);
    assert.equal(template.body.index,null);assert.equal(template.noise.format,THREE.RedFormat);assert.equal(template.noise.wrapR,THREE.RepeatWrapping);
    assert.equal(template.scale,1);
    const source=original.geometry.getAttribute('position');assert.notEqual(source.array,template.kernel.positions);
    const box=new THREE.Box3().setFromBufferAttribute(source);assert.equal(box.max.y-box.min.y,template.kernel.bounds.max[1]-template.kernel.bounds.min[1]);
  }
});
test('Collapse displays all native 3.2 seconds after an oversized hit and restores intact on repair',()=>{
  const pass=new BuildingDestructionPass(fakeRenderer()),entity={id:'center',kind:'center',hp:600,maxHp:600,status:'intact',collapseRemaining:0},house=new NativeBuilding(templates[0],entity,pass);
  assert.equal(hitStructure(entity,600),true);assert.equal(entity.hp,0);assert.equal(house.scale.y,templates[0].scale);
  for(let i=0;i<=32;i++){entity.collapseRemaining=3.2-i*.1;house.update(entity,i*.1);assert.ok(Math.abs(house.damage-(.79+.21*i/32))<1e-12);assert.equal(house.scale.y,templates[0].scale);}
  entity.status='ruined';house.update(entity,3.2);assert.equal(house.damage,1);assert.equal(house.outer.visible,false);assert.equal(house.inner.visible,false);assert.equal(house.ash.visible,true);
  entity.status='intact';entity.hp=600;entity.collapseRemaining=0;house.update(entity,7);assert.equal(house.damage,0);assert.equal(house.outer.visible,true);assert.equal(house.inner.visible,false);assert.equal(house.ash.visible,false);assert.ok(house.uniforms.uHoles.value.every(v=>v.w===0));
  house.dispose();pass.dispose();
});
test('Separate houses keep independent damage masks, shader time and interior depth guard',()=>{
  const pass=new BuildingDestructionPass(fakeRenderer()),a={id:'a',hp:600,maxHp:600,status:'intact'},b={id:'b',hp:390,maxHp:600,status:'intact'},first=new NativeBuilding(templates[0],a,pass),second=new NativeBuilding(templates[0],b,pass);
  first.update(a,42);second.update(b,42);const before=JSON.stringify(second.uniforms.uHoles.value);first.update({...a,hp:120,status:'collapsing',collapseRemaining:2},42);
  assert.equal(JSON.stringify(second.uniforms.uHoles.value),before);assert.equal(second.uniforms.uDamage.value,.35);assert.equal(first.uniforms.uTime.value,42);
  assert.notEqual(first.uniforms.uHoles.value,second.uniforms.uHoles.value);assert.equal(first.inner.material.depthFunc,THREE.LessDepth);assert.equal(first.outer.material.transparent,false);assert.equal(first.inner.material.transparent,false);
  pass.quality=0;second.update(b,42);assert.equal(second.uniforms.uQuality.value,0);assert.equal(JSON.stringify(second.uniforms.uHoles.value),before);
  assert.equal(first.uniforms.uIntactDepth.value,pass.target.depthTexture);assert.equal(first.uniforms.uOpeningMask.value,pass.target.texture);assert.match(first.inner.material.fragmentShader,/texelFetch\(uOpeningMask,pixel,0\)/);
  assert.match(first.outer.customDepthMaterial.fragmentShader,/packDepthToRGBA\(gl_FragCoord.z\)/);assert.equal(first.outer.castShadow,true);
  first.dispose();second.dispose();pass.dispose();
});
test('Opening pass invalidates on damage, view, transform and resolution and restores renderer on failure',()=>{
  const renderer=fakeRenderer(),pass=new BuildingDestructionPass(renderer),camera=new THREE.PerspectiveCamera(42,1280/720,.1,100),entity={id:'center',hp:390,maxHp:600,status:'intact'},house=new NativeBuilding(templates[0],entity,pass);camera.position.set(0,5,10);camera.updateMatrixWorld();
  const color=renderer.color.clone(),target={previous:true};renderer.target=target;pass.render(camera);assert.equal(renderer.renders,1);assert.equal(renderer.target,target);assert.equal(renderer.autoClear,false);assert.equal(renderer.shadowMap.enabled,true);assert.equal(renderer.alpha,.6);assert.ok(renderer.color.equals(color));assert.equal(pass.target.width,1280);
  pass.render(camera);assert.equal(renderer.renders,1);house.update({...entity,hp:380},0);pass.render(camera);assert.equal(renderer.renders,2);
  house.position.x=2;pass.render(camera);assert.equal(renderer.renders,3);camera.position.x=1;pass.render(camera);assert.equal(renderer.renders,4);
  renderer.size.set(640,480);pass.render(camera);assert.equal(renderer.renders,5);assert.equal(pass.target.width,640);assert.equal(house.uniforms.uResolution.value.x,640);
  house.position.x=3;renderer.fail=true;assert.throws(()=>pass.render(camera),/fallo GPU/);assert.equal(renderer.target,target);assert.equal(renderer.autoClear,false);assert.equal(renderer.shadowMap.enabled,true);assert.equal(renderer.alpha,.6);assert.ok(renderer.color.equals(color));renderer.fail=false;pass.render(camera);assert.equal(renderer.renders,7);
  house.dispose();pass.dispose();
});
test('Original visual raycast tracks displaced houses and leaves ruins selectable for reconstruction',()=>{
  const pass=new BuildingDestructionPass(fakeRenderer());
  for(const template of templates){
    const entity={id:template.building.culture,hp:600,maxHp:600,status:'intact'},house=new NativeBuilding(template,entity,pass);house.position.set(10,2,4);house.rotation.y=.4;house.updateMatrixWorld(true);
    const raycaster=new THREE.Raycaster(new THREE.Vector3(10,20,4),new THREE.Vector3(0,-1,0),0,100),hits=[];house.raycastBody(raycaster,hits);assert.ok(hits.length>0,entity.id);assert.equal(hits[0].object,house.outer);assert.ok(hits[0].point.y>=2);assert.equal(template.kernel.damage,0);
    house.update({...entity,status:'ruined',hp:0},4);const ruined=raycaster.intersectObject(house,true);assert.ok(ruined.length>0,entity.id);assert.ok(ruined.every(hit=>hit.object===house.ash));
    house.dispose();
  }
  pass.dispose();
});
test('Removing a center disposes private materials while shared native templates remain reusable',()=>{
  const renderer=fakeRenderer(),pass=new BuildingDestructionPass(renderer),house=new NativeBuilding(templates[0],{id:'a',hp:600,maxHp:600,status:'intact'},pass);let privateDisposed=0,bodyDisposed=0,targetDisposed=0;
  for(const material of [house.outer.material,house.inner.material,house.ash.material,house.opening.material,house.outer.customDepthMaterial])material.addEventListener('dispose',()=>privateDisposed++);
  templates[0].body.addEventListener('dispose',()=>bodyDisposed++);pass.target.addEventListener('dispose',()=>targetDisposed++);house.dispose();assert.equal(privateDisposed,5);assert.equal(bodyDisposed,0);assert.equal(pass.buildings.size,0);assert.equal(pass.scene.children.length,0);pass.dispose();assert.equal(targetDisposed,1);
  assert.equal(centerVisualDamage({hp:300,maxHp:600,status:'intact'}),.5);
});
const nav={placement:()=>({valid:true,suppress:[]}),setState:()=>{},terrainValid:()=>true,walkable:()=>true,path:(start,end)=>[{x:end.x,z:end.z}]};
function paidGame(culture){const s=Game.newGame({culture,seed:712,slotId:'native-center-'+culture});Game.resume(s,'intro');Game.placeStructure(s,'center',{x:4,z:0},nav);Game.plant(s,'seed','mijo',8,0,nav);Game.openInitialHiring(s);Game.hire(s,'hire',{olderMale:1});return s;}
test('Five paid centers clear their native damage only when the real rounded repair debit executes',()=>{
  for(const template of templates){
    const s=paidGame(template.building.culture),center=s.structures[0],pass=new BuildingDestructionPass(fakeRenderer()),house=new NativeBuilding(template,center,pass);
    assert.equal(numberOf(s.ledger.balance),665);hitStructure(center,40);house.update(center,s.elapsed);assert.ok(Math.abs(house.damage-40/600)<1e-12);
    Game.requestRepair(s,'repair',center.id);assert.equal(numberOf(s.ledger.balance),665);assert.equal(center.hp,560);
    for(let i=0;i<1000&&center.hp<600;i++){Game.tick(s,.1,nav);house.update(center,s.elapsed);if(!s.events.some(e=>e.type==='RepairApplied'))assert.ok(house.damage>0);}
    assert.equal(center.hp,600);assert.equal(house.damage,0);assert.equal(numberOf(s.ledger.balance),611);assert.equal(s.events.filter(e=>e.type==='RepairApplied').length,1);Game.tick(s,1,nav);assert.equal(numberOf(s.ledger.balance),611);
    house.dispose();pass.dispose();
  }
});
test('Real blocking pauses and a saved collapse retain identical native geometry phase and shader time',()=>{
  let state=paidGame('suajili');const pass=new BuildingDestructionPass(fakeRenderer()),house=new NativeBuilding(templates[0],state.structures[0],pass);hitStructure(state.structures[0],480);Game.tick(state,1.1,nav);house.update(state.structures[0],state.elapsed);
  const phase=house.damage,time=house.uniforms.uTime.value,holes=JSON.stringify(house.uniforms.uHoles.value);Game.pause(state,'qa');Game.tick(state,20,nav);house.update(state.structures[0],state.elapsed);assert.equal(house.damage,phase);assert.equal(house.uniforms.uTime.value,time);assert.equal(JSON.stringify(house.uniforms.uHoles.value),holes);
  state=deserialize(serialize(state));house.update(state.structures[0],state.elapsed);assert.equal(house.damage,phase);assert.equal(house.uniforms.uTime.value,time);assert.equal(JSON.stringify(house.uniforms.uHoles.value),holes);
  Game.resume(state,'qa');Game.tick(state,2.1,nav);house.update(state.structures[0],state.elapsed);assert.equal(state.structures[0].status,'ruined');assert.equal(house.damage,1);assert.equal(house.outer.visible,false);assert.equal(house.ash.visible,true);
  house.dispose();pass.dispose();
});
test('GPU particle instances preserve native shapes, upload layouts, softness scale and paused clocks',()=>{
  const renderer=fakeRenderer(),pass=new BuildingDestructionPass(renderer),entity={id:'fx',hp:600,maxHp:600,status:'intact',collapseRemaining:0},house=new NativeBuilding(templates[0],entity,pass),camera=new THREE.PerspectiveCamera(42,1,.25,500);
  house.position.set(10,3,4);camera.position.set(10,6,12);camera.updateMatrixWorld();hitStructure(entity,480);entity.collapseRemaining=2;house.update(entity,1.2);pass.smokeScene.updateMatrixWorld();
  assert.equal(house.effects.native.ashChips.length,175);assert.ok(house.effects.native.debris.length>0);assert.ok(house.effects.native.smoke.length>0);
  const smoke=house.effects.smoke,debris=house.effects.debris;assert.equal(debris.geometry.getAttribute('aPos').count,36);assert.equal(debris.geometry.getAttribute('aOffset').data.stride,12);assert.equal(smoke.geometry.getAttribute('aCorner').count,6);assert.equal(smoke.geometry.getAttribute('aPosSize').data.stride,11);
  assert.equal(smoke.material.depthWrite,false);assert.equal(smoke.material.depthTest,false);assert.equal(smoke.material.transparent,true);assert.equal(debris.material.transparent,false);assert.equal(smoke.material.uniforms.uDepth.value,pass.smokeDepth.depthTexture);
  house.effects.prepareSmoke(camera);smoke.onBeforeRender(renderer,pass.smokeScene,camera);assert.equal(smoke.material.uniforms.uClip.value.x,.25);assert.equal(smoke.material.uniforms.uClip.value.y,500);assert.equal(smoke.material.uniforms.uSoftness.value,.48*templates[0].scale);assert.equal(smoke.geometry.instanceCount,house.effects.native.smoke.length);
  const before=JSON.stringify({smoke:house.effects.native.smoke,debris:house.effects.native.debris,time:house.effects.native.time}),upload=[...house.effects.debrisBuffer.array];house.update(entity,1.2);assert.equal(JSON.stringify({smoke:house.effects.native.smoke,debris:house.effects.native.debris,time:house.effects.native.time}),before);assert.deepEqual([...house.effects.debrisBuffer.array],upload);
  assert.match(smoke.material.fragmentShader,/texelFetch\(uDepth,ivec2\(gl_FragCoord.xy\),0\)/);assert.match(smoke.material.fragmentShader,/float n=uClip.x,f=uClip.y/);house.dispose();pass.dispose();
});
test('Smoke captures actual opaque material shaders, excludes transparency, skips quiet scenes and restores failure state',()=>{
  const renderer=fakeRenderer(),pass=new BuildingDestructionPass(renderer),world=new THREE.Scene(),opaque=new THREE.Mesh(new THREE.BoxGeometry(),new THREE.MeshBasicMaterial()),transparent=new THREE.Mesh(new THREE.BoxGeometry(),new THREE.MeshBasicMaterial({transparent:true})),entity={id:'fx',hp:600,maxHp:600,status:'intact'},house=new NativeBuilding(templates[0],entity,pass),camera=new THREE.PerspectiveCamera();world.add(opaque,transparent,house);
  pass.renderSmoke(camera,world);assert.equal(renderer.renders,0);house.update({...entity,hp:390},.5);assert.ok(house.effects.native.smoke.length>0);
  const target={original:true};renderer.target=target;const render=renderer.render;let captured=false,overlaid=false;
  renderer.render=function(scene){if(scene===world){captured=true;assert.equal(opaque.material.colorWrite,false);assert.equal(transparent.material.visible,false);assert.equal(house.outer.material.colorWrite,false);assert.equal(house.inner.material.colorWrite,false);assert.equal(scene.overrideMaterial,null);}else{overlaid=true;assert.equal(scene,pass.smokeScene);assert.equal(this.autoClear,false);assert.equal(this.target,target);}render.call(this);};
  pass.renderSmoke(camera,world);assert.ok(captured&&overlaid);assert.equal(renderer.renders,2);assert.equal(opaque.material.colorWrite,true);assert.equal(transparent.material.visible,true);assert.equal(renderer.target,target);assert.equal(renderer.autoClear,false);assert.equal(renderer.shadowMap.enabled,true);assert.equal(pass.smokeDepth.width,1280);
  renderer.fail=true;assert.throws(()=>pass.renderSmoke(camera,world),/fallo GPU/);assert.equal(opaque.material.colorWrite,true);assert.equal(transparent.material.visible,true);assert.equal(renderer.target,target);assert.equal(renderer.autoClear,false);assert.equal(renderer.shadowMap.enabled,true);
  house.dispose();pass.dispose();
});
test('Native debris support follows Float32 rendered terrain triangles on both sides of grid diagonals',()=>{
  const surface=(x,z)=>Math.sin(x*.4)*.7+z*.03+x*x*.001,renderer=fakeRenderer(),pass=new BuildingDestructionPass(renderer);pass.surface=surface;
  for(const [x,z] of [[-23.9,-23.8],[-23,-23.2],[5.2,-2.1],[100.1,300.7]]){
    const step=1,loX=-24+Math.floor((x+24)/step)*step,loZ=-24+Math.floor((z+24)/step)*step,geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute([loX,Math.fround(surface(loX,loZ)),loZ,loX,Math.fround(surface(loX,loZ+step)),loZ+step,loX+step,Math.fround(surface(loX+step,loZ)),loZ,loX+step,Math.fround(surface(loX+step,loZ+step)),loZ+step],3));geometry.setIndex([0,1,2,2,1,3]);const mesh=new THREE.Mesh(geometry,new THREE.MeshBasicMaterial({side:THREE.DoubleSide}));mesh.updateMatrixWorld();
    const hits=new THREE.Raycaster(new THREE.Vector3(x,200,z),new THREE.Vector3(0,-1,0)).intersectObject(mesh);assert.ok(hits.length);assert.ok(Math.abs(hits[0].point.y-terrainTriangleHeight(x,z,surface))<1e-9);geometry.dispose();mesh.material.dispose();
  }
  const entity={id:'terrain-fx',hp:600,maxHp:600,status:'intact',collapseRemaining:0},house=new NativeBuilding(templates[0],entity,pass);house.position.set(10,3,4);hitStructure(entity,480);entity.collapseRemaining=0;house.update(entity,.1);
  for(let i=0;i<60;i++){house.update({...entity,status:'ruined'},.1+i/30);for(const fragment of house.effects.native.debris){const point=new THREE.Vector3(...fragment.p).applyMatrix4(house.matrixWorld),floor=terrainTriangleHeight(point.x,point.z,surface)+(.028+fragment.size[1]*.23)*house.template.scale;assert.ok(point.y>=floor-1e-9);}}
  assert.ok(house.effects.native.debris.some(p=>p.bounces>0));house.dispose();pass.dispose();
});
test('Particle meshes remain presentation only and release geometry, materials and emitters on center removal',()=>{
  const pass=new BuildingDestructionPass(fakeRenderer()),house=new NativeBuilding(templates[0],{id:'fx',hp:600,maxHp:600,status:'intact'},pass);house.update({hp:120,maxHp:600,status:'collapsing',collapseRemaining:2},1);let released=0;
  for(const mesh of [house.effects.smoke,house.effects.debris]){mesh.geometry.addEventListener('dispose',()=>released++);mesh.material.addEventListener('dispose',()=>released++);const hits=[];mesh.raycast(new THREE.Raycaster(),hits);assert.equal(hits.length,0);}
  house.dispose();assert.equal(released,4);assert.equal(pass.smokeScene.children.length,0);assert.equal(house.effects.native.smoke.length,0);assert.equal(house.effects.native.debris.length,0);assert.equal(house.effects.native.ashChips.length,0);pass.dispose();
});

test('centers consume shared fractional atmosphere rather than inferring night from sun intensity',()=>{
 const pass=new BuildingDestructionPass(fakeRenderer()),house=new NativeBuilding(templates[0],{id:'dusk',hp:600,maxHp:600,status:'intact'},pass),camera=new THREE.PerspectiveCamera();camera.updateMatrixWorld();
 for(const phase of [0,.25,.5,.75,1]){pass.night=phase;pass.nightLight=1.12;house.cameraUniforms(house.outer,camera);assert.equal(house.uniforms.uNight.value,phase);assert.equal(house.uniforms.uNightLight.value,1.12);}
 house.dispose();pass.dispose();
});


test('concurrent cancelled building requests release each shared native template only once in all cultures',async()=>{
 for(const descriptor of catalogue){
  const model=originalModel(descriptor),template=prepareNativeBuilding(model,descriptor);
  const resources=new Set([template.body,template.ash,template.noise,model.geometry,model.material,...Object.values(model.material).filter(v=>v?.isTexture)]),disposals=new Map();
  for(const resource of resources){disposals.set(resource,0);resource.addEventListener('dispose',()=>disposals.set(resource,disposals.get(resource)+1));}
  const world=Object.create(WorldScene.prototype);let finish;
  const shared=new Promise(resolve=>finish=resolve);world.buildingTemplates=new Map();world.buildingCatalogue=[descriptor];world.assets={building:()=>shared};
  const requests=[world.ensureBuilding(descriptor.culture),world.ensureBuilding(descriptor.culture),world.ensureBuilding(descriptor.culture)];
  world.disposed=true;finish(template);const results=await Promise.allSettled(requests);
  assert.ok(results.every(r=>r.status==='rejected'&&/cancelada/.test(r.reason.message)));
  assert.equal(world.buildingTemplates.size,0);assert.ok([...disposals.values()].every(n=>n===1),descriptor.culture+' template disposed repeatedly');
  template.dispose();assert.ok([...disposals.values()].every(n=>n===1));
 }
});
