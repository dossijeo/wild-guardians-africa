import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {endpointEnvironment,endpointGuard} from '../src/rendering/environment-endpoints.js';
import {environmentFunctions,fluidLightingFunctions} from '../src/rendering/fluid-lighting-source.js';
import {AfricanToon,paintedWaterMaterial,toonDestruction,toonDebris} from '../src/rendering/african-toon.js';
import {destructionFragment} from '../src/rendering/destruction-native.js';
import {destructionDebrisVertex,destructionDebrisFragment} from '../src/rendering/destruction-effects-native.js';

test('endpoint guard leaves the complete received mix, UVs, LOD, scale and fill intact',()=>{
 for(const source of [environmentFunctions,fluidLightingFunctions]){
  const adapted=endpointEnvironment(source);assert.equal(adapted.replace(endpointGuard,''),source);
  assert.equal(adapted.split(endpointGuard).length,2);
 }
 assert.ok(endpointGuard.includes('uNight==0.'));assert.ok(endpointGuard.includes('uNight==1.'));
 assert.throws(()=>endpointEnvironment(environmentFunctions.replace('rough*7.','rough*6.')),/authored/);
 assert.throws(()=>endpointEnvironment(environmentFunctions.replace('.025,.045,.10','.02,.04,.1')),/authored/);
});

test('Standard, Basic and painted fluid share a live endpoint switch without changing depth or recompiling',()=>{
 const toon=new AfricanToon();assert.equal(toon.uniforms.uEnvEndpoints.value,1);
 const standard=new THREE.MeshStandardMaterial(),basic=new THREE.MeshBasicMaterial();basic.userData.toonGround=true;
 const water=paintedWaterMaterial('#49aeb6',false,712,null,{uniforms:toon.uniforms,textures:[new THREE.Texture(),new THREE.Texture()]});
 for(const material of [standard,basic,water]){
  if(material!==water)toon.material(material);
  const lib=material.isMeshBasicMaterial?THREE.ShaderLib.basic:THREE.ShaderLib.standard,shader={uniforms:{},vertexShader:lib.vertexShader,fragmentShader:lib.fragmentShader};
  material.onBeforeCompile(shader,{});assert.equal(shader.uniforms.uEnvEndpoints,toon.uniforms.uEnvEndpoints);assert.ok(shader.fragmentShader.includes(endpointGuard));
  const version=material.version,key=material.customProgramCacheKey();toon.uniforms.uEnvEndpoints.value=0;
  assert.equal(shader.uniforms.uEnvEndpoints.value,0);assert.equal(material.version,version);assert.equal(material.customProgramCacheKey(),key);material.dispose();
 }
});

test('native destruction and debris also use one guarded HDR recipe with the original mixed path',()=>{
 for(const fragment of [toonDestruction(destructionFragment),toonDebris(destructionDebrisVertex,destructionDebrisFragment).fragment]){
  assert.ok(fragment.includes(endpointGuard));assert.ok(fragment.includes('uEnvEndpoints'));
  assert.equal(fragment.split('vec3 environment4(').length,2);assert.ok(fragment.includes('return mix(day,night+vec3(.025,.045,.10),uNight);'));
 }
});
