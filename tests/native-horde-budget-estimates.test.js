import test from 'node:test';
import assert from 'node:assert/strict';
import {BALANCE as B} from '../src/simulation/balance.js';
import {compositions,animalSpec} from '../src/simulation/rules.js';
import {estimateNativeHorde} from '../tools/estimate-native-horde-budgets.mjs';
test('dynamic capacity counts match native uniform compositions across all current budgets',()=>{
 for(const tier of B.threat_tiers)for(let b=tier.threat_min;b<=tier.threat_max;b++){
  const groups=compositions(b,tier.unlocked_species),r=estimateNativeHorde(b,tier.unlocked_species),hits=g=>g.reduce((n,id)=>n+animalSpec(id).hit_budget_max,0);
  assert.equal(r.compositions,groups.length);assert.equal(r.maxAnimals,Math.max(...groups.map(g=>g.length)));assert.equal(r.maxHits,Math.max(...groups.map(hits)));
  assert.ok(Math.abs(r.meanAnimals-groups.reduce((n,g)=>n+g.length,0)/groups.length)<1e-9);
  const rolled=g=>g.reduce((n,id)=>{const a=animalSpec(id);return n+(a.hit_budget_min+a.hit_budget_max)/2;},0);
  assert.ok(Math.abs(r.meanRolledHits-groups.reduce((n,g)=>n+rolled(g),0)/groups.length)<1e-9);
  assert.ok(Math.abs(r.meanMaximumHits-groups.reduce((n,g)=>n+hits(g),0)/groups.length)<1e-9);
 }
});
test('larger budget estimate has no implicit group cap and does not alter balance',()=>{
 const before=JSON.stringify(B),r=estimateNativeHorde(72);assert.equal(r.maxAnimals,72);assert.equal(r.maxHits,288);assert.ok(r.compositions>10000);assert.equal(JSON.stringify(B),before);
});
