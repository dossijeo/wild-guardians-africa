import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import * as THREE from 'three';
import {volcanicFunctions,VOLCANIC_SHADER_SHA256} from '../src/rendering/volcanic-source.js';
import {nativeAssetMaterial} from '../src/rendering/asset-surface.js';
import {AfricanToon} from '../src/rendering/african-toon.js';
import {obstructionMaterial} from '../src/rendering/obstruction.js';
const source=readFileSync('content/shaders/1-African_Toon_Shader_V4_1_4.frag.glsl','utf8').replaceAll('\r\n','\n');

test('volcanic mask and radiance retain authored constants; only cel emission transport is adapted',()=>{
 assert.equal(createHash('sha256').update(source).digest('hex'),VOLCANIC_SHADER_SHA256);
 const start=source.lastIndexOf('  float hot='),glow=source.slice(start,source.indexOf('\n }',start)).replace('  lit+=','  return ');
 assert.ok(volcanicFunctions.includes(glow));
 const toon=volcanicFunctions.slice(volcanicFunctions.indexOf('vec3 africanToonEmission4(')).replace('africanToonEmission4(','africanToon4(').replace('vec3 worldP,vec3 emission){','vec3 worldP){').replace(' toon+=emission;\n','');
 const original=source.slice(source.indexOf('vec3 africanToon4('),source.indexOf('void main(){',source.indexOf('vec3 africanToon4(')));
 assert.equal(toon,original);assert.ok(volcanicFunctions.includes('toon*=pigment;\n toon+=emission;\n vec3 outC=filmic4(toon);'));
});

test('volcanic activation follows all six original manifests and composes with cel, textures and coverage',()=>{
 const textures={baseColor:new THREE.Texture(),normal:new THREE.Texture(),metallicRoughness:new THREE.Texture()},box=new THREE.BoxGeometry();box.computeBoundingBox();
 for(const id of ['savanna','grand_river','mangrove','volcanoes','canyons','desert']){
  const pack=JSON.parse(readFileSync('public/content/biome-'+id+'.json'));
  for(const [slot,asset]of pack.assets.entries()){
   const material=nativeAssetMaterial(pack,asset,slot,textures,box.boundingBox);obstructionMaterial(material);new AfricanToon().material(material);
   const s={uniforms:{},...THREE.ShaderLib.standard};material.onBeforeCompile(s,{});
   assert.equal(s.uniforms.uNativeVolcanicGlow.value,id==='volcanoes'?1:0);assert.equal(s.uniforms.uNativeVolcanicGlow,material.userData.nativeVolcanicGlow);
   assert.ok(s.fragmentShader.includes('nativeVolcanic4(nativeGlowTexel)'));assert.ok(s.fragmentShader.includes('worldPatternPosition(vToonWorld),nativeEmission)'));
   assert.ok(s.fragmentShader.indexOf('nativeGlowTexel=')<s.fragmentShader.indexOf('diffuseColor.rgb*=pow(mix'));
   assert.ok(s.fragmentShader.includes('sRGBTransferOETF(vec4(diffuseColor.rgb,1.)).rgb'));assert.ok(s.fragmentShader.includes('coverageThreshold(gl_FragCoord.xy)'));
   assert.equal(material.map,textures.baseColor);assert.equal(material.normalMap,textures.normal);assert.equal(material.transparent,false);assert.equal(material.toneMapped,false);material.dispose();
  }
 }
 const toon=new AfricanToon();for(const ground of [false,true]){
  const material=new THREE.MeshStandardMaterial();material.userData.toonGround=ground;toon.material(material);const s={uniforms:{},...THREE.ShaderLib.standard};material.onBeforeCompile(s,{});
  assert.ok(!s.fragmentShader.includes('nativeVolcanic4'));assert.ok(!s.fragmentShader.includes('africanToonEmission4'));material.dispose();
 }
 box.dispose();Object.values(textures).forEach(t=>t.dispose());
});
