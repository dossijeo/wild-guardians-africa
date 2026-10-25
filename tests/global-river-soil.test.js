import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {AfricanToon} from '../src/rendering/african-toon.js';
import {riverSoilEnabled} from '../src/rendering/global-river-soil.js';
test('river soil requires explicit laboratory option',()=>{
 for(const q of ['', '?riverSoil=1', '?riverSoil=full','?visualLab=global-lighting','?visualLab=global-lighting&riverSoil=full'])assert.equal(riverSoilEnabled(q),false);
 assert.equal(riverSoilEnabled('?visualLab=global-lighting&riverSoil=1'),true);
});
test('river soil has separate cache and both terrain material paths compile its recipe',()=>{
 for(const horizon of [false,true]){
  const keys=[];
  for(const full of [false,true]){
   const toon=new AfricanToon();toon.globalVisualLighting=true;
   const m=horizon?new THREE.MeshBasicMaterial():new THREE.MeshStandardMaterial();
   Object.assign(m.userData,{toonGround:true,groundBiome:'grand_river',riverSoil:full,biomeGround:{uGroundLayered:{value:0}}});
   toon.material(m);const shader={...(horizon?THREE.ShaderLib.basic:THREE.ShaderLib.standard),uniforms:{}};m.onBeforeCompile(shader,{});
   assert.equal(shader.fragmentShader.includes('textureGrad(uQaSoilBase,soilUV,soilDx,soilDy)'),full);
   assert.equal(shader.fragmentShader.includes('if(river)reliefMask*=1.-smoothstep(.12,.70,wear);'),full);
   keys.push(m.customProgramCacheKey());m.dispose();toon.shadowUniforms.fallback.dispose();
  }
  assert.notEqual(keys[0],keys[1]);
 }
});
