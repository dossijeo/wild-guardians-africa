import test from 'node:test';
import assert from 'node:assert/strict';
import {BALANCE as B} from '../src/simulation/balance.js';
import {compositions,nextRandom,attraction} from '../src/simulation/rules.js';
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
test('night plans keep timing, physical cohorts and RNG stable across retries',()=>{
 for(const seed of [1,712,123,2026,4294967295])for(const count of [0,10,50,100,300]){
  const state={rng:seed,day:6,postgame:false,plants:Array.from({length:count},()=>({alive:true,species:'mijo'}))};
  const firstDraw=structuredClone(state),at=323+nextRandom(firstDraw)*225;
  const repeat=structuredClone(state);
  planNight(state);planNight(repeat);
  assert.equal(state.nightPlan.at,at);
  assert.equal(state.nightPlan.attraction,attraction(state.plants));
  assert.deepEqual(state.nightPlan.group,state.nightPlan.actors.map(actor=>actor.species));
  assert.deepEqual(state.nightPlan.waves[0],state.nightPlan.actors);
  assert(state.nightPlan.waves.flat().every(actor=>actor.hits>0));
  assert(state.nightPlan.waves.every(wave=>wave.length>0&&wave.length<=16));
  assert.deepEqual({plan:state.nightPlan,memory:state.raidPressureMemory,rng:state.rng},
   {plan:repeat.nightPlan,memory:repeat.raidPressureMemory,rng:repeat.rng});
  const committed=structuredClone({plan:state.nightPlan,memory:state.raidPressureMemory,rng:state.rng});
  planNight(state);
  assert.deepEqual({plan:state.nightPlan,memory:state.raidPressureMemory,rng:state.rng},committed);
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
