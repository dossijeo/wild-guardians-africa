import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {AfricanToon} from '../src/rendering/african-toon.js';
import {ART_PROFILES} from '../src/rendering/biome-material-source.js';
import {patchDaylightGround,patchDaylightFernLod} from '../src/rendering/final-daylight.js';

test('daylight updates are stable and leave desert/canyon profiles unchanged',()=>{
 const on=new AfricanToon(),off=new AfricanToon({visualSearch:'?finalDaylight=0'}),sun=new THREE.DirectionalLight();sun.position.set(-30,55,25);
 const snapshot=JSON.stringify(ART_PROFILES);
 for(const biome of ['sabana','gran-rio','manglares','volcanes','desierto','gran-canon']){
  on.update(0,sun,biome);off.update(0,sun,biome);const first=on.artUniforms.uArtSun.value.toArray();
  for(let i=0;i<20;i++)on.update(0,sun,biome);
  assert.deepEqual(on.artUniforms.uArtSun.value.toArray(),first);
  if(['desierto','gran-canon'].includes(biome))assert.deepEqual(first,off.artUniforms.uArtSun.value.toArray());
  else assert.ok(first[0]>off.artUniforms.uArtSun.value.x);
 }
 assert.equal(JSON.stringify(ART_PROFILES),snapshot);
});
test('ground patch retains nighttime endpoints and fern LOD has identity night tint',()=>{
 const source='mix(vec3(3.65,3.30,2.78),vec3(.22,.36,.66)*uNightLight,uNight); mix(vec3(.55,.63,.67),vec3(.095,.17,.32)*uNightLight,uNight);';
 const result=patchDaylightGround(source);
 assert.ok(result.includes('vec3(.22,.36,.66)*uNightLight,uNight'));
 assert.ok(result.includes('vec3(.095,.17,.32)*uNightLight,uNight'));
 assert.ok(patchDaylightFernLod('result=vec4(c.rgb,1.);').includes('vec3(1.),uNight)'));
});
