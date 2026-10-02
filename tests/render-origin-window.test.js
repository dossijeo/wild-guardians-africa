import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {withRenderOrigin,renderOriginBounds} from '../src/rendering/render-origin.js';
import {installAssetShadows,createAssetShadow} from '../src/rendering/asset-shadows.js';
import {AfricanToon,paintedWaterMaterial,toonDestruction,toonDebris} from '../src/rendering/african-toon.js';
import {assetClipGeometry,assetClipMaterial} from '../src/rendering/asset-clip.js';
import {destructionFragment} from '../src/rendering/destruction-native.js';
import {destructionDebrisVertex,destructionDebrisFragment} from '../src/rendering/destruction-effects-native.js';

test('all passes see local camera/casters/bounds, returning globally identical transforms even on draw failure',()=>{
  const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(),root=new THREE.Group(),mesh=new THREE.Mesh(new THREE.BoxGeometry(),new THREE.MeshBasicMaterial());
  root.position.set(48_000_000,0,-48_000_000);root.add(mesh);scene.add(root);mesh.position.set(.1875,2,.3125);camera.position.set(48_000_000+5,10,-48_000_000+20);camera.lookAt(root.position);
  scene.updateMatrixWorld(true);camera.updateMatrixWorld(true);const matrix=mesh.matrixWorld.clone(),view=camera.matrixWorldInverse.clone(),eye=camera.position.clone();
  const detached=new THREE.Group();detached.position.copy(root.position);detached.updateMatrixWorld(true);const originalDetached=detached.matrixWorld.clone();
  const clip=new THREE.Vector4(47_999_976,-48_000_024,48_000_024,-47_999_976),contact=new THREE.Vector4(47_999_976,-48_000_024,48,48),saved=[clip.clone(),contact.clone()];
  const draw=()=>{
    assert.deepEqual(camera.position.toArray(),[5,10,20]);assert.deepEqual(mesh.getWorldPosition(new THREE.Vector3()).toArray(),[.1875,2,.3125]);
    assert.deepEqual(detached.matrixWorld.elements,new THREE.Matrix4().elements);
    assert.deepEqual(clip.toArray(),[-24,-24,24,24]);assert.deepEqual(contact.toArray(),[-24,-24,48,48]);
    const globalMV=view.clone().multiply(matrix),localMV=camera.matrixWorldInverse.clone().multiply(mesh.matrixWorld);
    for(let i=0;i<16;i++)assert.ok(Math.abs(globalMV.elements[i]-localMV.elements[i])<1e-8);
    throw Error('draw failed');
  };
  assert.throws(()=>withRenderOrigin({scene,camera,origin:{x:48_000_000,z:-48_000_000},detached:[detached],minMax:[clip,clip],minSize:[contact]},draw),/draw failed/);
  assert.deepEqual(scene.position.toArray(),[0,0,0]);assert.deepEqual(camera.position,eye);assert.deepEqual(mesh.matrixWorld,matrix);assert.deepEqual(detached.matrixWorld,originalDetached);assert.deepEqual([clip,contact],saved);
  mesh.geometry.dispose();mesh.material.dispose();
});

test('shadow staging preserves a source world matrix under a translated scene instead of applying its origin twice',()=>{
  const scene=new THREE.Scene(),chunk=new THREE.Group(),geometry=new THREE.BoxGeometry(),material=new THREE.MeshBasicMaterial();scene.position.set(-192,0,-48);chunk.position.set(240,0,96);scene.add(chunk);scene.updateMatrixWorld(true);
  const color=new THREE.InstancedMesh(geometry,material,1),shadow=createAssetShadow([{geometry,material}],1,0);color.count=shadow.count=1;shadow.setMatrixAt(0,new THREE.Matrix4());chunk.userData.lodBatches=[{meshes:[color],shadow}];
  const renderer={shadowMap:{enabled:true,autoUpdate:true,render(){assert.equal(shadow.matrixWorld.elements[12],48);assert.equal(shadow.matrixWorld.elements[14],48);}}},release=installAssetShadows(renderer,()=>new Map([[1,chunk]]));
  renderer.shadowMap.render([{}],scene,new THREE.PerspectiveCamera());assert.equal(shadow.parent,null);release();shadow.dispose();color.dispose();geometry.dispose();material.dispose();
});

test('global bounds are collected once without moving instances or changing material identities',()=>{
  const scene=new THREE.Scene(),material=paintedWaterMaterial('#336699',false,712,[0,0,48,48]),horizon=new THREE.Vector4(-24,-24,24,24);
  material.userData.horizonBounds=horizon;const a=new THREE.Mesh(new THREE.PlaneGeometry(),material),b=new THREE.Mesh(a.geometry,material);scene.add(a,b);
  assert.deepEqual(renderOriginBounds(scene),[horizon,material.userData.paintUniforms.uFluidBounds.value]);a.geometry.dispose();material.dispose();
});

test('local clip attributes retain half-open edges at remote chunk coordinates without global Float32 cancellation',()=>{
  const source=new THREE.BoxGeometry(),x=4_800_000_000,z=-4_800_000_000,bounds=[x-24,z-24,x+24,z+24];
  const geometry=assetClipGeometry(source,bounds,2,[x,z]),material=new THREE.MeshStandardMaterial();assetClipMaterial(material);
  assert.deepEqual(Array.from(geometry.attributes.nativeClipBounds.array),[-24,-24,24,24,-24,-24,24,24]);
  const shader={uniforms:{},vertexShader:THREE.ShaderLib.standard.vertexShader,fragmentShader:THREE.ShaderLib.standard.fragmentShader};material.onBeforeCompile(shader,{});
  assert.ok(shader.vertexShader.includes('vNativeClipWorld=nativeClipPosition.xyz;'));assert.ok(!shader.vertexShader.includes('vNativeClipWorld=(modelMatrix*'));
  geometry.dispose();source.dispose();material.dispose();
});

test('PCF and view vectors stay relative while pigment, ground detail, fluid phase and DEST receive anchored positions',()=>{
  const toon=new AfricanToon();toon.uniforms.uWorldOrigin.value.set(192,48);
  for(const ground of [false,true]){
    const material=new THREE.MeshStandardMaterial();material.userData.toonGround=ground;toon.material(material);const shader={uniforms:{},...THREE.ShaderLib.standard};material.onBeforeCompile(shader,{});
    assert.equal(shader.uniforms.uWorldOrigin,toon.uniforms.uWorldOrigin);assert.ok(shader.fragmentShader.includes('normalize(cameraPosition-vToonWorld)'));
    assert.ok(shader.fragmentShader.includes('nativeShadowOcclusion(inverseTransformDirection(normal,viewMatrix),vToonWorld)'));
    assert.ok(shader.fragmentShader.includes('worldPatternPosition(vToonWorld)'));
    if(ground)assert.ok(shader.fragmentShader.includes('materialNoise(worldPatternPosition(worldP)*.32)'));
    material.dispose();
  }
  const water=paintedWaterMaterial('#336699',false,712,null,{textures:[],uniforms:toon.uniforms,shadowUniforms:toon.shadowUniforms}),shader={uniforms:{},...THREE.ShaderLib.standard};water.onBeforeCompile(shader,{});
  assert.equal(shader.uniforms.uWorldOrigin,toon.uniforms.uWorldOrigin);assert.ok(!shader.fragmentShader.includes('vec2 uWorldOrigin=vec2(0.)'));assert.ok(shader.fragmentShader.includes('vWorld.zx+uWorldOrigin.yx'));
  assert.ok(shader.fragmentShader.includes('worldPatternPosition(worldP).x*.43'));assert.ok(shader.fragmentShader.includes('normalize(cameraPosition-vPaintWorld)'));water.dispose();
  const body=toonDestruction(destructionFragment),debris=toonDebris(destructionDebrisVertex,destructionDebrisFragment);
  assert.ok(body.includes('worldPatternPosition((uToonModel*vec4(vWorld,1.)).xyz)'));assert.ok(debris.fragment.includes('worldPatternPosition((uToonModel*vec4(vDebrisPosition,1.)).xyz)'));toon.shadowUniforms.fallback.dispose();
});
