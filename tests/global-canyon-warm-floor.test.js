import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {AfricanToon} from '../src/rendering/african-toon.js';
import {canyonWarmFloorEnabled,canyonWarmFloorColor,patchCanyonWarmFloor} from '../src/rendering/global-canyon-warm-floor.js';

test('warm canyon floor is explicit and preserves the retained ambient luminance',()=>{
 assert.equal(canyonWarmFloorEnabled('?visualLab=global-lighting&canyonFloor=warm'),true);
 for(const query of ['', '?canyonFloor=warm','?visualLab=global-lighting'])assert.equal(canyonWarmFloorEnabled(query),false);
 const lum=a=>a.reduce((sum,v,i)=>sum+v*[.2126,.7152,.0722][i],0);assert.ok(Math.abs(lum(canyonWarmFloorColor)-lum([.22,.27,.36]))<1e-14);
 assert.throws(()=>patchCanyonWarmFloor('missing'),/anchor missing/);
});
test('warm floor applies to mapped resident and horizon ground, with independent program keys',()=>{
 for(const horizon of [false,true])for(const biome of ['canyons','savanna']){
  const keys=[];
  for(const enabled of [false,true]){
   const toon=new AfricanToon();toon.globalVisualLighting=true;toon.canyonWarmFloor=enabled;
   const m=horizon?new THREE.MeshBasicMaterial():new THREE.MeshStandardMaterial();Object.assign(m.userData,{toonGround:true,groundBiome:biome,biomeGround:{uGroundLayered:{value:0}}});
   toon.material(m);const shader={...(horizon?THREE.ShaderLib.basic:THREE.ShaderLib.standard),uniforms:{}};m.onBeforeCompile(shader,{});
   const expected=enabled&&biome==='canyons';assert.equal(shader.fragmentShader.includes('float qaWarmWeight='),expected);
   if(expected){assert.ok(shader.fragmentShader.includes('(1.-uNight)*smoothstep(.74,.96,toonN.y)'));assert.equal(shader.fragmentShader.includes('uQAWarmFloor'),false);}
   keys.push(m.customProgramCacheKey());m.dispose();toon.shadowUniforms.fallback.dispose();
  }
  assert.equal(keys[0]===keys[1],biome!=='canyons');
 }
});
