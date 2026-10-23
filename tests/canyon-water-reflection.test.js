import test from 'node:test';
import assert from 'node:assert/strict';
import {canyonWaterReflectionEnabled as enabled,patchCanyonWaterReflection as patch} from '../src/rendering/canyon-water-reflection.js';
test('calm water remains explicit, lab-only and Canyon-only',()=>{
 const query='?visualLab=global-lighting&canyonWater=calm';
 assert.ok(enabled('gran-canon',query));
 for(const biome of ['sabana','gran-rio','manglares','volcanes','desierto',null])assert.equal(enabled(biome,query),false);
 for(const q of ['', '?canyonWater=calm','?visualLab=global-lighting&canyonWater=no'])assert.equal(enabled('gran-canon',q),false);
});
test('missing or changed shader contract fails explicitly',()=>{
 assert.throws(()=>patch(''),/anchors/);
 assert.throws(()=>patch('float f=.022+.978*pow(1.-max(dot(wn,V),0.),5.);'),/anchors/);
});
