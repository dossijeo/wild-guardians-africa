import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {deserialize,serialize} from '../src/persistence/snapshots.js';
import {preparePressureNight} from '../src/simulation/raid-pressure-plan.js';
import {RAID_PRESSURE_CANDIDATE as C,raidPressureCandidateForVersion,raidCompositionCounts,planRaidProductComposition} from '../src/simulation/raid-pressure-budget.js';
const original=kind=>readFileSync(new URL(`./fixtures/raid-pressure-v1/${kind}.json`,import.meta.url),'utf8').trim();
test('historical untagged planned and active multi-wave saves retain actors, RNG, EMA and paid state',()=>{
 for(const kind of ['planned','active']){
  const raw=original(kind),state=deserialize(raw),before=serialize(state),retry=preparePressureNight(state);
  assert.equal(retry.reused,true);assert.equal(retry.rng,state.rng);assert.deepEqual(retry.plan,state.nightPlan);assert.deepEqual(retry.memory,state.raidPressureMemory);
  assert.equal(serialize(state),before);assert.equal(before,raw);assert.equal(state.nightPlan.pressureFacts.candidateVersion,undefined);
  assert.equal(state.nightPlan.pressureFacts.budget,119);assert.equal(state.nightPlan.waves.flat().length,19);
  if(kind==='active')assert.equal(state.raid.animals.length,16);
 }
});
test('following night adopts candidate 3 once; tagged saved plan reuses with no reroll',()=>{
 const state=deserialize(original('planned'));state.day=100;state.nightPlan=null;
 const next=preparePressureNight(state);assert.equal(next.reused,false);assert.equal(next.plan.pressureFacts.candidateVersion,3);assert.equal(next.memory.version,1);assert.equal(next.memory.lastDay,100);
 state.rng=next.rng;state.nightPlan=next.plan;state.raidPressureMemory=next.memory;
 const loaded=deserialize(serialize(state)),retry=preparePressureNight(loaded);
 assert.equal(retry.reused,true);assert.equal(retry.rng,next.rng);assert.deepEqual(retry.plan,next.plan);assert.deepEqual(retry.memory,next.memory);
});
test('unknown provenance and changing a historical budget recipe are rejected',()=>{
 for(const version of [null,0,4,'1',{},Infinity]){
  assert.throws(()=>raidPressureCandidateForVersion(version));
  const state=JSON.parse(original('planned'));state.nightPlan.pressureFacts.candidateVersion=version;
  assert.throws(()=>deserialize(JSON.stringify(state)));assert.throws(()=>preparePressureNight(state));
 }
 const state=JSON.parse(original('planned'));state.nightPlan.pressureFacts.candidateVersion=2;
 assert.throws(()=>deserialize(JSON.stringify(state)));
});
test('1.5 budget preserves intended species composition and full maximum-hit envelope across pressures',()=>{
 const ids=['warthog','hyena','buffalo','lion','rhino'];assert.equal(C.qMeanMultiplier,1.5);assert.equal(C.version,3);
 for(let i=0;i<=100;i++)for(const unlocked of [ids.slice(0,1),ids.slice(0,2),ids]){
  const pressure=i/100,count=Math.round(4+30*pressure),plan=planRaidProductComposition(count,pressure,unlocked);
  assert.deepEqual(plan.counts,raidCompositionCounts(count,pressure,unlocked));assert.equal(plan.adjustments.length,0);assert(plan.maximumProduct<=plan.q+1e-9);
 }
 assert(Object.isFrozen(raidPressureCandidateForVersion()));assert.equal(raidPressureCandidateForVersion().qMeanMultiplier,1);
});

for(const kind of ['planned','active'])test(`candidate-2 ${kind} save retains its complete historical count/hit recipe`,()=>{
 const raw=readFileSync(new URL(`./fixtures/raid-pressure-v2/${kind}.json`,import.meta.url),'utf8').trim(),state=deserialize(raw);
 assert.equal(serialize(state),raw);assert.equal(state.nightPlan.pressureFacts.candidateVersion,2);assert.equal(state.nightPlan.pressureFacts.budget,141);
 const retry=preparePressureNight(state);assert.deepEqual(retry.plan,state.nightPlan);assert.equal(retry.rng,state.rng);assert.deepEqual(retry.memory,state.raidPressureMemory);
 if(kind==='active')assert.equal(state.raid.animals.length,16);
 const altered=JSON.parse(raw);delete altered.nightPlan.pressureFacts.candidateVersion;assert.throws(()=>deserialize(JSON.stringify(altered)));
 if(kind==='planned'){
  state.day=100;state.nightPlan=null;const next=preparePressureNight(state);
  assert.equal(next.plan.pressureFacts.candidateVersion,3);assert(next.plan.waves.flat().length>19);
  state.nightPlan=next.plan;state.rng=next.rng;state.raidPressureMemory=next.memory;assert.doesNotThrow(()=>deserialize(serialize(state)));
 }
});
