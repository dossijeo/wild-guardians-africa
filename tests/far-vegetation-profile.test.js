import test from 'node:test';import assert from 'node:assert/strict';
import {FAR_TREE_DISTANCES,farVegetationProfile} from '../src/rendering/far-vegetation-profile.js';
test('quality profile changes native tree range while preserving exact terrain and bounded prewarm',()=>{
 for(const [quality,distances]of Object.entries(FAR_TREE_DISTANCES))for(const biome of ['savanna','grand_river','mangrove','volcanoes','canyons','desert']){
  const p=farVegetationProfile({quality,biome});assert.deepEqual([p.start,p.end],distances);assert.equal(p.preserveTerrain,true);assert.equal(p.residentRange,undefined);assert.equal(p.logicalPreloadMargin,16);assert.equal(p.logicalStandbyPreload,true);assert.equal(p.logicalSizePreload,true);assert.equal(p.nativeWaterMask,true);assert.equal(p.includeFarGround,!['canyons','desert'].includes(biome));assert.ok(p.densityStart>=p.transitionHeight.end);assert.ok(p.transitionHeight.start>=p.start);assert.ok(p.fadeEnd<400-64);
 }
});
test('profile overrides are explicit, independent, and do not mutate subsequent calls',()=>{
 const input={quality:'media',biome:'savanna'},p=farVegetationProfile(input,{start:100,end:140,fogEnd:400});assert.equal(p.start,100);assert.equal(p.end,140);p.transitionHeight.start=220;assert.equal(farVegetationProfile(input).transitionHeight.start,200);assert.equal(farVegetationProfile(input).start,90);assert.throws(()=>farVegetationProfile({...input,quality:'auto'}),/quality/);assert.throws(()=>farVegetationProfile({...input,biome:'other'}),/biome/);
});
