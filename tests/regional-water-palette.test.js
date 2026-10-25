import test from 'node:test';
import assert from 'node:assert/strict';
import {waterPalette,regionalWaterEnabled} from '../src/rendering/world-atmosphere.js';
test('regional water requires both opt-in flags',()=>{
 for(const q of ['', '?waterPalette=regional','?visualLab=global-lighting'])assert.equal(regionalWaterEnabled(q),false);
 assert.equal(regionalWaterEnabled('?visualLab=global-lighting&waterPalette=regional'),true);
});
test('regional colors preserve lava, unknown biomes and independent palette ownership',()=>{
 const original=waterPalette('#3aadb6');
 for(const b of ['desierto','volcanes','unknown',null])assert.deepEqual(waterPalette('#3aadb6',false,b),original);
 for(const b of ['sabana','gran-rio','manglares','gran-canon']){
  assert.deepEqual(waterPalette('#e85522',true,b),waterPalette('#e85522',true));
  const a=waterPalette('#3aadb6',false,b),before=a[0][0];a[0][0]=999;
  assert.equal(waterPalette('#3aadb6',false,b)[0][0],before);
 }
});
