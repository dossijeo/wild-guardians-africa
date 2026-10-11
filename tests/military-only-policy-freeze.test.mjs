import test from 'node:test';
import assert from 'node:assert/strict';
import {frozenPolicies,frozenMilitaryOptions} from '../tools/run-military-only-calibration.mjs';
const location={seed:123,biome:'sabana',culture:'mapungubwe',out:'.cache-policy-test'};
test('all profiles retain 100 nights and reject economic stop controls',()=>{
 for(const profile of ['good','normal','bad']){
  const o=frozenMilitaryOptions(profile,{...location,days:7,'stop-cash':1});
  assert.equal(o.days,100);assert.equal(o['stop-cash'],undefined);assert.equal(o['stop-file'],undefined);
  assert.equal(o.labourPolicy,'q15');assert.equal(o.profile,'olderFemale');assert.equal(o.cropPolicy,'cashflow');
 }
 assert.equal(frozenPolicies.cropHitPoints,1);
});
test('normal mistakes are fixed before results, not outcome-dependent',()=>{
 const good=frozenMilitaryOptions('good',location),normal=frozenMilitaryOptions('normal',location),bad=frozenMilitaryOptions('bad',location);
 assert.equal(good.defenseStartDay,6);assert.equal(normal.defenseStartDay,10);
 assert.equal(normal.reserveMaintenance,false);assert.equal(good.reserveMaintenance,true);
 assert.equal(normal.strategy,'good');assert.equal(bad.strategy,'bad');
 assert.throws(()=>frozenMilitaryOptions('perfect',location));
});
