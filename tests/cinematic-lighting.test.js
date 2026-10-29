import test from 'node:test';
import assert from 'node:assert/strict';
import {cinematicGroundBounce,patchCinematicLighting,patchCinematicVegetation} from '../src/rendering/cinematic-lighting.js';
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


test('ground fill runs after the profile shadow override and preserves night/direct light',()=>{
 const source='vec3 biomeAmbient=vec3(.4); biomeAmbient=mix(biomeAmbient,vec3(.1),weight); vec3 biomeDirect=sun*groundVisibility; #include <opaque_fragment>';
 const result=patchCinematicLighting(source,{ground:true});
 assert.ok(result.indexOf('biomeAmbient+=')>result.indexOf('biomeAmbient=mix'));
 assert.ok(result.includes('vec3(.30,.35,.40)*(1.-uNight)*(1.-groundVisibility)'));
 assert.ok(result.includes('vec3 biomeDirect=sun*groundVisibility;'));
 assert.ok(!patchCinematicLighting(source).includes('biomeAmbient+='));
});

test('vegetation fill supports grass, river and fern without changing night or sun terms',()=>{
 for(const day of ['.17,.28,.34','.15,.25,.31','.14,.26,.32'])assert.equal(patchCinematicVegetation('dayShade=vec3('+day+')'),'dayShade=vec3(.38,.48,.54)');
 const fern='mix(vec3(.17,.28,.34),vec3(.095,.17,.32)*uNightLight,uNight); leafSun*mix(.07,1.,visibility)';
 const result=patchCinematicVegetation(fern);
 assert.ok(result.includes('vec3(.38,.48,.54)'));
 assert.ok(result.includes('vec3(.095,.17,.32)*uNightLight,uNight)'));
 assert.ok(result.includes('leafSun*mix(.07,1.,visibility)'));
});
