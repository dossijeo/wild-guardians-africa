import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import * as THREE from 'three';
import {AfricanToon,paintedWaterMaterial,toonDestruction} from '../src/rendering/african-toon.js';
import {toonFunctions,waterFunctions} from '../src/rendering/african-toon-source.js';
test('user source is preserved byte-for-byte and extracted function bodies are authentic',()=>{
  const bytes=readFileSync('content/shaders/1-African_Toon_Shader_V4_1_4.frag.glsl');
  const provenance=JSON.parse(readFileSync('content/shaders/provenance.json'));
  assert.equal(createHash('sha256').update(bytes).digest('hex'),provenance.sha256);
  const source=bytes.toString().replaceAll("\r\n","\n");assert.ok(source.includes(waterFunctions));
  assert.ok(source.includes(toonFunctions.slice(toonFunctions.indexOf('float toonRamp4'))));
});
test('toon composes with native vertex deformation, preserves textures and depth materials',()=>{
  const toon=new AfricanToon(),material=new THREE.MeshStandardMaterial();
  material.onBeforeCompile=shader=>{shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>','vec3 transformed=position*2.0;');};
  const mesh=new THREE.Mesh(new THREE.BoxGeometry(),material);const depth=new THREE.MeshDepthMaterial();mesh.customDepthMaterial=depth;
  toon.apply(mesh);const shader={uniforms:{},vertexShader:THREE.ShaderLib.standard.vertexShader,fragmentShader:THREE.ShaderLib.standard.fragmentShader};material.onBeforeCompile(shader,{});
  assert.ok(shader.vertexShader.includes('vec3 transformed=position*2.0;'));assert.ok(shader.vertexShader.includes('instanceMatrix*toonPosition'));
  assert.ok(shader.fragmentShader.includes('#include <map_fragment>'));assert.ok(shader.fragmentShader.includes('#include <alphatest_fragment>'));
  assert.ok(shader.fragmentShader.includes('toonVisibility=receiveShadow?1.-nativeShadowOcclusion(toonN,vToonWorld):1.'));assert.equal(mesh.customDepthMaterial,depth);
  const object=new THREE.MeshStandardMaterial(),ground=new THREE.MeshStandardMaterial();
  assert.equal(object.customProgramCacheKey(),ground.customProgramCacheKey());ground.userData.toonGround=true;
  toon.material(object);toon.material(ground);assert.notEqual(ground.customProgramCacheKey(),object.customProgramCacheKey());
});
test('transparent VFX, basic overlays and painted water keep their native shader paths',()=>{
  const toon=new AfricanToon();for(const material of [new THREE.MeshStandardMaterial({transparent:true}),new THREE.MeshBasicMaterial(),paintedWaterMaterial('#345678')]){
    const compile=material.onBeforeCompile;toon.material(material);assert.equal(material.onBeforeCompile,compile);
  }
});

test('very low ground receives authentic toon bands without Three lighting or shadow dependencies',()=>{
 const material=new THREE.MeshBasicMaterial({vertexColors:true});material.userData.toonGround=true;new AfricanToon().material(material);
 const shader={uniforms:{},vertexShader:THREE.ShaderLib.basic.vertexShader,fragmentShader:THREE.ShaderLib.basic.fragmentShader};material.onBeforeCompile(shader,{});
 assert.ok(shader.fragmentShader.includes('toonRamp4(nl*visibility,4.)'));assert.ok(shader.vertexShader.includes('normalMatrix*normal'));
 assert.ok(!shader.fragmentShader.includes('roughnessFactor'));assert.ok(!shader.fragmentShader.includes('getShadowMask()'));
});
