import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import * as THREE from 'three';
import {AfricanToon} from '../src/rendering/african-toon.js';
import {environmentFunctions} from '../src/rendering/fluid-lighting-source.js';
import {nativeAssetMaterial} from '../src/rendering/asset-surface.js';
import {obstructionMaterial} from '../src/rendering/obstruction.js';
const original=readFileSync('content/shaders/1-African_Toon_Shader_V4_1_4.frag.glsl','utf8').replaceAll('\r\n','\n');
const compile=(toon,material)=>{toon.material(material);const shader={uniforms:{},vertexShader:THREE.ShaderLib.standard.vertexShader,fragmentShader:THREE.ShaderLib.standard.fragmentShader};material.onBeforeCompile(shader,{});return shader;};

test('world reflections retain the supplied equirectangular HDR sampling, roughness LOD and night fill',()=>{
  assert.equal(environmentFunctions,'const float PI4=3.14159265359;\n'+original.slice(original.indexOf('vec3 environment4('),original.indexOf('vec3 brdf4(')));
  const toon=new AfricanToon(),shader=compile(toon,new THREE.MeshStandardMaterial());
  assert.ok(shader.fragmentShader.includes(environmentFunctions));assert.ok(shader.fragmentShader.includes('environment4(reflect(-toonV,toonN),roughnessFactor)'));
  assert.equal(shader.fragmentShader.split('vec3 environment4(').length,2);
});

test('already compiled world materials share radiance textures, simulated night and changing sky yaw without texture clones',()=>{
  const toon=new AfricanToon(),a=compile(toon,new THREE.MeshStandardMaterial()),b=compile(toon,new THREE.MeshStandardMaterial()),textures=[new THREE.Texture(),new THREE.Texture()],yaw={value:.25};
  assert.equal(a.uniforms.uNativeEnvEnabled.value,0);toon.environment(textures,yaw);assert.equal(a.uniforms.uNativeEnvEnabled.value,1);
  for(const shader of [a,b]){assert.equal(shader.uniforms.uEnvDay.value,textures[0]);assert.equal(shader.uniforms.uEnvNight.value,textures[1]);assert.equal(shader.uniforms.uNight,toon.uniforms.uNight);assert.equal(shader.uniforms.uEnvYaw,toon.environmentUniforms.uEnvYaw);}
  const sun=new THREE.DirectionalLight();sun.position.set(-30,55,25);yaw.value=-.5;toon.update(.5,sun,'manglares');
  assert.equal(a.uniforms.uNight.value,.5);assert.equal(b.uniforms.uEnvYaw.value,-.5);toon.environment(null,null);assert.equal(a.uniforms.uNativeEnvEnabled.value,0);assert.equal(a.uniforms.uEnvDay.value,null);
});

test('native wet prop material composes reflected radiance with tangent normals, roughness, cel and coverage',()=>{
  const pack=JSON.parse(readFileSync('public/content/biome-mangrove.json')),geometry=new THREE.BoxGeometry();geometry.computeBoundingBox();
  const material=nativeAssetMaterial(pack,pack.assets[0],0,{baseColor:new THREE.Texture(),normal:new THREE.Texture(),metallicRoughness:new THREE.Texture()},geometry.boundingBox);
  obstructionMaterial(material);const toon=new AfricanToon();toon.environment([new THREE.Texture(),new THREE.Texture()],{value:0});const shader=compile(toon,material);
  assert.ok(shader.fragmentShader.includes('float nativeWet='));assert.ok(shader.fragmentShader.includes('coverageThreshold(gl_FragCoord.xy)'));
  assert.ok(shader.fragmentShader.includes('toonReflection,roughnessFactor,toonVisibility,toonLeaf,nativeWet'));
  assert.equal(material.toneMapped,false);assert.ok(shader.fragmentShader.indexOf('vec3 environment4(')<shader.fragmentShader.indexOf('void main() {'));
  assert.ok(shader.fragmentShader.includes('#include <normal_fragment_maps>'));
});
