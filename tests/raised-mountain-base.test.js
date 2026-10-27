import test from 'node:test';
import assert from 'node:assert/strict';
import {withRaisedMountainBase} from '../src/rendering/raised-mountain-base.js';
import {mountainBackdropProfile} from '../src/rendering/mountain-backdrop-profile.js';
test('raised skyline is explicit, limited to reviewed biomes and leaves source profiles intact',()=>{
 const query='?visualLab=global-lighting&mountainBase=raised';
 for(const biome of ['savanna','grand_river','mangrove','desert','volcanoes','canyons']){
  const profile=mountainBackdropProfile(biome,712),saved=structuredClone(profile);
  for(const search of ['', '?mountainBase=raised','?visualLab=global-lighting','?visualLab=global-lighting&mountainBase=other'])assert.equal(withRaisedMountainBase(profile,biome,search),profile);
  const result=withRaisedMountainBase(profile,biome,query);
  if(['savanna','grand_river'].includes(biome)){
   assert.deepEqual(result,{...profile,arcLayout:profile.arcLayout.map(a=>({...a,baseY:a.baseY+25}))});
   assert.notEqual(result,profile);
  }else assert.equal(result,profile);
  assert.deepEqual(profile,saved);
 }
 assert.equal(withRaisedMountainBase(null,'savanna',query),null);
});
