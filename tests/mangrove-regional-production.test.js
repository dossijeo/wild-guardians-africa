import test from 'node:test';
import assert from 'node:assert/strict';
import {approvedVisualSearch} from '../src/rendering/approved-visual-profile.js';
import {farGroundReviewOverrides,farVegetationProfile} from '../src/rendering/far-vegetation-profile.js';
test('normal Manglares selects the tested regional surface without densifying terrain or replacing ferns',()=>{
 const search=approvedVisualSearch('manglares'),q=new URLSearchParams(search);
 assert.equal(q.get('farAngularLod'),'1');assert.equal(q.get('mangroveFerns'),'holly');assert.equal(q.get('groundCache'),'fixed512');
 for(const quality of ['muy_baja','baja','media','alta']){
  const profile=farVegetationProfile({quality,biome:'mangrove'},farGroundReviewOverrides('mangrove',search));
  assert.equal(profile.regionalWaterBed,true);assert.equal(profile.groundColorStep,2);assert.equal(profile.groundStep,32);
 }
});
test('explicit old-surface control and other biomes remain independent',()=>{
 assert.deepEqual(farGroundReviewOverrides('mangrove',approvedVisualSearch('manglares','farWaterSurface=0')),{});
 for(const biome of ['savanna','grand_river','volcanoes','canyons','desert'])assert.deepEqual(farGroundReviewOverrides(biome,'farWaterSurface=1'),{});
});
