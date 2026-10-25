import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {paintedWaterMaterial} from '../src/rendering/african-toon.js';
import {createWaterSlopeTexture} from '../src/rendering/global-water-surface.js';
const lighting=enabled=>({globalWaterSurface:enabled,textures:[],uniforms:{uWorldOrigin:{value:new THREE.Vector2()}},yaw:{value:0}});
const compile=m=>{const s={...THREE.ShaderLib.standard,uniforms:{}};m.onBeforeCompile(s,{});return s};
test('experimental water uses shared slope data while default and lava retain their shader',()=>{
 const l=lighting(true),a=paintedWaterMaterial('#258eaa',false,712,null,l),b=paintedWaterMaterial('#258eaa',false,712,[0,0,48,48],l),lava=paintedWaterMaterial('#ee5522',true,712,null,l),base=paintedWaterMaterial('#258eaa',false,712,null,lighting(false));
 const shader=compile(a),plain=compile(base),molten=compile(lava);
 assert.equal(a.userData.globalWaterSlope,b.userData.globalWaterSlope);
 assert.equal(shader.uniforms.uGlobalWaterSlope,a.userData.globalWaterSlope);
 assert.ok(shader.fragmentShader.includes('vec3 base=uInk0*.72;'));
 assert.ok(!shader.fragmentShader.includes('vec3 paint=paintedWater(wp,.001);'));
 assert.ok(plain.fragmentShader.includes('vec3 paint=paintedWater(wp,.001);'));
 assert.ok(!molten.fragmentShader.includes('uGlobalWaterSlope'));
 assert.notEqual(a.customProgramCacheKey(),base.customProgramCacheKey());
 assert.equal(compile(b).uniforms.uFluidClip.value,1);
 assert.equal(shader.uniforms.uTime,a.userData.paintUniforms.uTime);
 let releases=0;a.userData.globalWaterSlope.value.addEventListener('dispose',()=>releases++);
 a.dispose();assert.equal(releases,0);a.dispose();assert.equal(releases,0);b.dispose();assert.equal(releases,1);
 lava.dispose();base.dispose();
});
test('numerical slope maps are deterministic, filtered and bounded',()=>{
 const a=createWaterSlopeTexture(),b=createWaterSlopeTexture();
 assert.deepEqual(a.image.data,b.image.data);assert.equal(a.image.data.byteLength,131072);assert.equal(a.format,THREE.RGFormat);assert.equal(a.wrapS,THREE.RepeatWrapping);assert.equal(a.minFilter,THREE.LinearMipmapLinearFilter);assert.equal(a.generateMipmaps,true);
 a.dispose();b.dispose();
});
