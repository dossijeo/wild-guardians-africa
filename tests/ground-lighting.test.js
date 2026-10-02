import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import * as THREE from 'three';
import {groundLightingFunctions,GROUND_SHADER_SHA256} from '../src/rendering/ground-lighting-source.js';
import {AfricanToon} from '../src/rendering/african-toon.js';
const source=readFileSync('content/shaders/1-African_Toon_Shader_V4_1_4.frag.glsl','utf8').replaceAll('\r\n','\n');

test('ground surface, Fresnel and BRDF preserve the supplied shader recipes',()=>{
 assert.equal(createHash('sha256').update(source).digest('hex'),GROUND_SHADER_SHA256);
 assert.ok(groundLightingFunctions.includes(source.slice(source.indexOf('  float greenery='),source.indexOf('  objAO=contact4();'))));
 assert.ok(groundLightingFunctions.includes(source.slice(source.indexOf('vec3 brdf4('),source.indexOf('float contact4('))));
 assert.ok(groundLightingFunctions.includes('return direct+albedo*ambient*objAO*(1.-metal)+specAmbient*objAO;'));
});

test('both ground quality paths share surface, HDR and native wet lighting without altering object surfaces',()=>{
 const toon=new AfricanToon(),textures=[new THREE.Texture(),new THREE.Texture()];toon.environment(textures,{value:.25});
 for(const Material of [THREE.MeshBasicMaterial,THREE.MeshStandardMaterial]){
  const material=new Material({vertexColors:true});Object.assign(material.userData,{toonGround:true,nativeGroundColor:true});toon.material(material);
  const output={uniforms:{},...THREE.ShaderLib[material.isMeshBasicMaterial?'basic':'standard']};material.onBeforeCompile(output,{});
  const f=output.fragmentShader;
  assert.equal(output.uniforms.uGroundDetail,toon.uniforms.uGroundDetail);assert.equal(output.uniforms.uEnvDay.value,textures[0]);
  assert.equal(f.split('nativeGroundSurface4(vToonWorld,').length,2);assert.equal(f.split('nativeGroundLight4(groundAlbedo,').length,2);
  assert.ok(f.includes('environment4(reflect(-toonV,toonN),groundRough)'));assert.ok(f.includes('groundVisibility,0.,groundWet,0.'));
  assert.ok(!f.includes('uWet*(1.-toonLeaf*.35)'));
  if(material.isMeshBasicMaterial)assert.ok(!f.includes('getShadowMask()'));else assert.ok(f.includes('groundVisibility=1.-(1.-getShadowMask())*.93'));
  material.dispose();
 }
 const object=new THREE.MeshStandardMaterial();toon.material(object);const output={uniforms:{},...THREE.ShaderLib.standard};object.onBeforeCompile(output,{});
 assert.ok(!output.fragmentShader.includes('nativeGroundSurface4'));assert.ok(output.fragmentShader.includes('toonVisibility=getShadowMask()'));
 object.dispose();textures.forEach(t=>t.dispose());
});
