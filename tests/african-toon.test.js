import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import * as THREE from 'three';
import {AfricanToon,paintedWaterMaterial,toonDestruction} from '../src/rendering/african-toon.js';
import {toonFunctions,waterFunctions} from '../src/rendering/african-toon-source.js';
import {prepareAnimalModel} from '../src/rendering/animal-actions.js';

test('all beasts receive isolated material lighting while global and non-beast shaders remain unchanged',()=>{
 const toon=new AfricanToon(),materials=[];
 for(const species of ['warthog','hyena','buffalo','lion','rhino']){
  const material=new THREE.MeshStandardMaterial(),mesh=new THREE.Mesh(new THREE.BoxGeometry(),material),root=new THREE.Group();root.add(mesh);
  prepareAnimalModel(root,species);toon.apply(root);
  const shader={uniforms:{},vertexShader:THREE.ShaderLib.standard.vertexShader,fragmentShader:THREE.ShaderLib.standard.fragmentShader};material.onBeforeCompile(shader,{});materials.push({material,shader});
 }
 const shaders=[];
 for(const visualSearch of ['', '?beastLighting=legacy']){
  const regular=new THREE.MeshStandardMaterial(),style=new AfricanToon({visualSearch});style.material(regular);
  const shader={uniforms:{},vertexShader:THREE.ShaderLib.standard.vertexShader,fragmentShader:THREE.ShaderLib.standard.fragmentShader};regular.onBeforeCompile(shader,{});shaders.push(shader);
 }
 assert.equal(shaders[0].fragmentShader,shaders[1].fragmentShader);assert.equal(shaders[0].uniforms.uBeastStyle,undefined);
 for(const {material,shader} of materials){
  assert.match(material.customProgramCacheKey(),/beast-contrast/);assert.match(shader.fragmentShader,/legacyBeastToon4/);
  assert.equal(shader.uniforms.uBeastStyle,toon.beastUniforms.uBeastStyle);assert.equal(shader.uniforms.uNight,toon.uniforms.uNight);
 }
 toon.beastUniforms.uBeastStyle.value=0;assert.equal(materials[2].shader.uniforms.uBeastStyle.value,0);
 assert.equal(toon.uniforms.uExposure.value,1);
});
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
  assert.ok(shader.fragmentShader.includes('toonVisibility=receiveShadow?nativeDirectVisibility:1.'));assert.equal(mesh.customDepthMaterial,depth);
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

test('matte worker body has an isolated shader without changing maps or tool materials',()=>{
 const toon=new AfricanToon(),body=new THREE.MeshStandardMaterial(),tool=new THREE.MeshStandardMaterial();
 body.userData.matteWorkerBody=true;const normal=new THREE.Texture();body.normalMap=normal;
 const shaders=[body,tool].map(material=>{toon.material(material);const shader={uniforms:{},vertexShader:THREE.ShaderLib.standard.vertexShader,fragmentShader:THREE.ShaderLib.standard.fragmentShader};material.onBeforeCompile(shader,{});return shader;});
 assert.notEqual(body.customProgramCacheKey(),tool.customProgramCacheKey());
 assert.match(shaders[0].fragmentShader,/rough\*\.40\)\*\.04/);
 assert.doesNotMatch(shaders[1].fragmentShader,/rough\*\.40\)\*\.04/);
 assert.equal(body.normalMap,normal);
});

test('authored fur mask is opt-in per buffalo geometry and separates shader caches',()=>{
 const keys=[];
 for(const [species,masked] of [['buffalo',true],['buffalo',false],['lion',true]]){
  const geometry=new THREE.BoxGeometry(),material=new THREE.MeshStandardMaterial(),root=new THREE.Group();
  if(masked)geometry.setAttribute('_fur_light',new THREE.Uint8BufferAttribute(new Uint8Array(geometry.attributes.position.count),1,true));
  root.add(new THREE.Mesh(geometry,material));prepareAnimalModel(root,species);new AfricanToon().apply(root);
  const shader={uniforms:{},vertexShader:THREE.ShaderLib.standard.vertexShader,fragmentShader:THREE.ShaderLib.standard.fragmentShader};material.onBeforeCompile(shader,{});
  const enabled=species==='buffalo'&&masked;
  assert.equal(shader.vertexShader.includes('attribute float _fur_light;'),enabled);
  assert.equal(shader.fragmentShader.includes('#define GUARDIAN_FUR_MASK'),enabled);
  keys.push(material.customProgramCacheKey());
 }
 assert.notEqual(keys[0],keys[1]);assert.equal(keys[1],keys[2]);
});
