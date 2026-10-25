import test from 'node:test';
import assert from 'node:assert/strict';
import {approvedVisualProfile,approvedVisualSearch} from '../src/rendering/approved-visual-profile.js';
import {globalCurrentReviewQuery} from '../tools/experiments/global-current-review-recipe.mjs';
const biomes=['sabana','gran-rio','manglares','desierto','volcanes','gran-canon'];
test('production selection matches the reviewed six-biome recipe without obsolete round-leaf preparation',()=>{
 for(const biome of biomes){
  const reviewed=new URLSearchParams(globalCurrentReviewQuery(biome));
  reviewed.delete('mangroveLeaves'); // Holly replaces the legacy source geometry.
  assert.deepEqual(approvedVisualProfile(biome),Object.fromEntries(reviewed));
 }
});
test('Mangrove always selects approved ferns and fixed cache, not round-leaf alternatives',()=>{
 const p=approvedVisualProfile('manglares');assert.equal(p.mangroveFerns,'holly');assert.equal(p.groundCache,'fixed512');assert.equal(p.mangroveLeaves,undefined);assert.ok(Object.isFrozen(p));
 assert.equal(approvedVisualProfile('sabana').mangroveFerns,undefined);
});
test('biome-specific water and ground options do not leak to other worlds',()=>{
 for(const biome of biomes){const p=approvedVisualProfile(biome);assert.equal(p.waterCore,biome==='gran-canon'?'opaque':undefined);assert.equal(p.horizonHandoff,biome==='gran-canon'?'atomic':undefined);}
 assert.throws(()=>approvedVisualProfile('unknown'),/Unknown/);
});
test('explicit laboratory and legacy queries remain exact controls',()=>{
 for(const search of ['visualLab=off','visualLab=global-lighting&groundCache=off','visualLab=grass'])assert.equal(approvedVisualSearch('manglares',search),search);
 const p=new URLSearchParams(approvedVisualSearch('manglares','lang=es&frameScheduler=0'));
 assert.equal(p.get('mangroveFerns'),'holly');assert.equal(p.get('lang'),'es');assert.equal(p.get('frameScheduler'),'0');
});
