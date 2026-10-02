import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import * as THREE from 'three';
import {buildEnvironmentPixels,fluidLightingFunctions,FLUID_SHADER_SHA256} from '../src/rendering/fluid-lighting-source.js';
import {decodeRadiance} from '../src/rendering/sky-source.js';
import {NativeSky} from '../src/rendering/sky.js';
import {paintedWaterMaterial,AfricanToon} from '../src/rendering/african-toon.js';
const lab=readFileSync('references/extracted/Bioma_Lab_V4_0_Materiales_Luz_Optimizado/script-8.js','utf8').replaceAll('\r\n','\n');
const shader=readFileSync('content/shaders/1-African_Toon_Shader_V4_1_4.frag.glsl','utf8').replaceAll('\r\n','\n');
test('HDR environment bytes match original radiance compression for both panoramas',()=>{
 const body=lab.slice(lab.indexOf('  const w=256,h=128,bytes='),lab.indexOf('  const t=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,t);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA8,w,h'));
 const reference=Function('data','index','SKY_EXPOSURES','clamp',body+';return bytes;');
 const panoramas=JSON.parse(readFileSync('public/content/skies.json')).panoramas;
 for(const [index,p] of panoramas.entries()){
  const data=decodeRadiance(readFileSync('public'+p.url)),result=buildEnvironmentPixels(data,index);
  assert.equal(result.width,256);assert.equal(result.height,128);assert.deepEqual(result.pixels,reference(data,index,[1.33,.62],(v,a,b)=>Math.max(a,Math.min(b,v))));
  assert.ok(result.pixels.some((v,i)=>i%4!==3&&v>0));assert.ok(result.pixels.every((v,i)=>i%4!==3||v===255));
 }
});
test('complete Fresnel, environment BRDF and fluid branch retain user shader constants',()=>{
 assert.equal(createHash('sha256').update(shader).digest('hex'),FLUID_SHADER_SHA256);
 const start=shader.indexOf(' if(uKind>.5&&uKind<1.5){\n  vec2 wp=');
 assert.ok(fluidLightingFunctions.includes(shader.slice(start,shader.indexOf(' if(uVolcanicGlow>.5',start))));
 assert.ok(fluidLightingFunctions.includes(shader.slice(shader.indexOf('vec3 toLinear4('),shader.indexOf('float contact4('))));
 const grade=shader.slice(shader.indexOf('vec3 africanToon4(')).match(/if\(uKind>\.5&&uKind<1\.5\)\{\s*([\s\S]*?)\n \}/)[1];
 assert.ok(fluidLightingFunctions.replace(/\s+/g,' ').includes(grade.trim().replace(/\s+/g,' ')));
});
test('water binds common night and yaw, keeps native exposure and avoids a second tone curve',()=>{
 const toon=new AfricanToon(),sky=new NativeSky(),textures=[new THREE.Texture(),new THREE.Texture()],lighting={textures,uniforms:toon.uniforms,yaw:sky.uniforms.uSkyYaw};
 for(const lava of [false,true]){
  const material=paintedWaterMaterial('#49aeb6',lava,712,null,lighting),u=material.userData.paintUniforms;
  assert.equal(u.uEnvDay.value,textures[0]);assert.equal(u.uEnvNight.value,textures[1]);assert.equal(u.uNight,toon.uniforms.uNight);assert.equal(u.uEnvYaw,sky.uniforms.uSkyYaw);assert.equal(u.uExposure.value,1);assert.equal(material.toneMapped,false);
  const output={uniforms:{},vertexShader:THREE.ShaderLib.standard.vertexShader,fragmentShader:THREE.ShaderLib.standard.fragmentShader};material.onBeforeCompile(output);
  assert.ok(output.fragmentShader.includes('sRGBTransferEOTF(vec4(nativeFluid4'));assert.ok(output.fragmentShader.includes('fluidVisibility=1.-(1.-getShadowMask())*.93'));assert.ok(!output.fragmentShader.includes('totalEmissiveRadiance+=diffuseColor.rgb*1.4'));
  material.dispose();
 }
 let disposed=0;sky.environmentTextures=textures;for(const t of textures)t.addEventListener('dispose',()=>disposed++);sky.dispose();assert.equal(disposed,2);
});
