import test from 'node:test';
import assert from 'node:assert/strict';
import {compositions,animalSpec} from '../src/simulation/rules.js';
import {estimateNativeHorde} from '../tools/estimate-native-horde-budgets.mjs';
import {intervalCapacity} from '../tools/screen-native-horde-pressure.mjs';
test('DP agrees with complete native enumeration on original and small candidate budgets',()=>{
 for(const budget of [1,2,3,4,5,7,10,14,18,24])for(const species of [['warthog'],['warthog','hyena'],['warthog','hyena','buffalo','lion','rhino']]){
  const groups=compositions(budget,species),r=estimateNativeHorde(budget,species);
  assert.equal(r.compositions,groups.length);
  const mean=f=>groups.reduce((n,g)=>n+f(g),0)/groups.length;
  assert.ok(Math.abs(r.meanAnimals-mean(g=>g.length))<1e-10);
  assert.ok(Math.abs(r.meanRolledHits-mean(g=>g.reduce((n,id)=>{const a=animalSpec(id);return n+(a.hit_budget_min+a.hit_budget_max)/2;},0)))<1e-10);
 }
});
test('interval averages budgets equally rather than weighting by composition count',()=>{
 const species=['warthog','hyena'],a=estimateNativeHorde(3,species),b=estimateNativeHorde(4,species),r=intervalCapacity(3,4,species);
 assert.equal(r.meanRolledHits,(a.meanRolledHits+b.meanRolledHits)/2);
 assert.equal(r.meanAnimals,(a.meanAnimals+b.meanAnimals)/2);
 assert.equal(r.meanFreshKillsIfEveryHitReachesHealthyCrop,r.meanRolledHits/2);
});
