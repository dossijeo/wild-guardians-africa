import test from 'node:test';
import assert from 'node:assert/strict';
import {BALANCE as B} from '../src/simulation/balance.js';
import {compositions,nextRandom,randomInt,threatTier,attraction} from '../src/simulation/rules.js';
import {createRaidCompositionIndex} from '../src/simulation/raid-composition-index.js';
import {planNight} from '../src/simulation/raids.js';
import {estimateNativeHorde} from '../tools/estimate-native-horde-budgets.mjs';

test('every rank matches native enumeration, including species subsets and ordering',()=>{
 for(let mask=1;mask<32;mask++)for(let budget=1;budget<=24;budget++){
  const unlocked=B.animals.filter((a,i)=>mask&(1<<i)).map(a=>a.id);
  const original=compositions(budget,unlocked),index=createRaidCompositionIndex(budget,unlocked);
  assert.equal(index.count,original.length);
  for(let rank=0;rank<original.length;rank++)assert.deepEqual(index.at(rank),original[rank]);
 }
});
test('night plans keep exact uniform native enumeration, timing and final RNG state',()=>{
 for(const seed of [1,712,123,2026,4294967295])for(const count of [0,10,50,100,300]){
  const state={rng:seed,day:6,postgame:false,plants:Array.from({length:count},()=>({alive:true,species:'mijo'}))};
  const expected=structuredClone(state),at=323+nextRandom(expected)*225,tier=threatTier(attraction(expected.plants));
  // Independent candidate day6 budget table; the rank implementation does not select the interval.
  const [min,max]=[[1,2],[3,4],[6,9],[12,18],[24,36]][B.threat_tiers.findIndex(t=>t.attraction_min===tier.attraction_min)];
  const budget=randomInt(expected,min,max),groups=compositions(budget,tier.unlocked_species);
  const group=groups[randomInt(expected,0,groups.length-1)];
  planNight(state);assert.deepEqual(state.nightPlan,{at,attraction:attraction(expected.plants),group,done:false});assert.equal(state.rng,expected.rng);
 }
});
test('large budgets preserve exact counts without retaining all group arrays',()=>{
 const before=JSON.stringify(B),unlocked=B.animals.map(a=>a.id);
 for(const budget of [72,132]){
  const index=createRaidCompositionIndex(budget,unlocked);assert.equal(index.count,estimateNativeHorde(budget).compositions);
  for(const rank of [0,Math.floor(index.count/2),index.count-1]){
   const group=index.at(rank),cost=group.reduce((n,id)=>n+B.animals.find(a=>a.id===id).threat_cost,0);
   assert.ok(cost>=Math.ceil(.75*budget)&&cost<=budget);assert.ok(group.length>0);
  }
 }
 assert.equal(JSON.stringify(B),before);
});
test('invalid ranks and budgets are rejected; empty species produce zero groups',()=>{
 for(const budget of [0,-1,1.5])assert.throws(()=>createRaidCompositionIndex(budget,[]));
 const index=createRaidCompositionIndex(14,[]);assert.equal(index.count,0);assert.throws(()=>index.at(0));
 const valid=createRaidCompositionIndex(14,B.animals.map(a=>a.id));
 for(const rank of [-1,valid.count,.5])assert.throws(()=>valid.at(rank));
});
