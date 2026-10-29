import test from 'node:test';
import assert from 'node:assert/strict';
import {cinematicGroundBounce,patchCinematicLighting} from '../src/rendering/cinematic-lighting.js';
import {toonDestruction} from '../src/rendering/african-toon.js';
import {destructionFragment} from '../src/rendering/destruction-native.js';

test('ground bounce has bounded immutable endpoints for every game biome',()=>{
 for(const biome of ['sabana','gran-rio','manglares','volcanes','gran-canon','desierto']){
  const rgb=cinematicGroundBounce(biome);
  assert.ok(Object.isFrozen(rgb));assert.ok(rgb.every(x=>Number.isFinite(x)&&x>0&&x<.25));
 }
 assert.equal(cinematicGroundBounce('unknown'),cinematicGroundBounce('sabana'));
 assert.ok(cinematicGroundBounce('desierto')[0]>cinematicGroundBounce('manglares')[0]);
});
test('real destruction shader keeps AO on indirect light, bypasses caps and fades on damage',()=>{
 const shader=toonDestruction(destructionFragment,'?cinematicLight=1');
 assert.match(shader,/uniform vec3 uCinemaGround/);
 assert.match(shader,/mix\(mix\(uCinemaGround,/);
 assert.match(shader,/uMode==0&&uInner<\.5&&vUV.x>=0/);
 assert.match(shader,/smoothstep\(\.02,\.30,uDamage\)/);
 assert.match(shader,/base\*\(\(ambient\+rim\)\*localAO\+direct\)\+spec\+emit/);
 assert.doesNotMatch(toonDestruction(destructionFragment,''),/uCinemaGround/);
});
test('standard material emission is excluded from reflected-light grading',()=>{
 const shader=patchCinematicLighting('#include <opaque_fragment>');
 assert.match(shader,/outgoingLight-totalEmissiveRadiance/);
 assert.match(shader,/uNight\)\+totalEmissiveRadiance/);
 assert.doesNotMatch(patchCinematicLighting('#include <opaque_fragment>',{ground:true}),/totalEmissiveRadiance/);
});
