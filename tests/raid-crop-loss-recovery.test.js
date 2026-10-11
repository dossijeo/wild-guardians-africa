import test from 'node:test';
import assert from 'node:assert/strict';
import {raidRecoveryAnimalCount,raidAnimalCount,raidPressure,raidPressureSummary,raidPressureCandidateForVersion,updateRaidPressureMemory,selectBudgetedRaid,RAID_PRESSURE_CANDIDATE as C} from '../src/simulation/raid-pressure-budget.js';
import {preparePressureNight} from '../src/simulation/raid-pressure-plan.js';
import {validatePressureSnapshot} from '../src/persistence/raid-pressure-snapshot.js';

test('current agricultural value reduces count immediately despite high historical EMA',()=>{
 const memory={version:1,lastDay:36,sample:295,ema:675.7898549476145};
 const summary=raidPressureSummary(36,295,memory);
 assert.equal(summary.pressure,0.24624502862469372);
 assert.equal(raidAnimalCount(36,summary.pressure),19);
 assert.equal(summary.targetAnimals,4);
 assert.equal(raidPressureSummary(36,295,memory,raidPressureCandidateForVersion(3)).targetAnimals,19);
});

test('count is monotonic in current farm value, bounded and retains guaranteed introductory attacks',()=>{
 for(let d=1;d<=100;d++){
  let previous=0;
  for(const value of [0,11,100,253,500,1000,2000,10000,25000,1e8]){
   const p=raidPressure(d,value),n=raidRecoveryAnimalCount(d,p,value);
   assert(n>=previous&&n>=1&&n<=34);previous=n;
   if(d<=5)assert.equal(n,1);
  }
 }
 for(const value of [-1,NaN,Infinity,null])assert.throws(()=>raidRecoveryAnimalCount(36,.25,value));
 assert.throws(()=>selectBudgetedRaid({night:36,pressure:.25,unlocked:['warthog'],rng:712}));
});

test('quantity adjustment preserves individual profiles, exact budget and determinism',()=>{
 for(const value of [0,11,295,1000,25000]){
  const input={night:36,pressure:.25,agriculturalValue:value,unlocked:['warthog','hyena','buffalo'],rng:712};
  const a=selectBudgetedRaid(input),b=selectBudgetedRaid(structuredClone(input));
  assert.deepEqual(a,b);assert.equal(a.actors.length,raidRecoveryAnimalCount(36,.25,value));
  assert.equal(a.draws,a.actors.length*2);assert(a.spentProduct<=a.plan.q);
  for(const actor of a.actors){
   const original={warthog:[1,.7,20,2,4],hyena:[1,1.2,25,3,5],buffalo:[2,2,35,4,6]}[actor.species];
   assert.equal(actor.cropDamage,original[0]);assert.equal(actor.attackRadius,original[1]*1.075);
   assert.equal(actor.structureDamage,Math.round(original[2]*1.125));
   assert(actor.hits>=original[3]+1&&actor.hits<=original[4]+1);
  }
 }
});

test('new plan quantity survives validation and reload without reroll or EMA reset',()=>{
 const state={day:36,rng:712,postgame:false,plants:Array.from({length:23},()=>({alive:true,species:'mijo'})),raidPressureMemory:{version:1,lastDay:35,sample:400,ema:800},nightPlan:null};
 const next=preparePressureNight(state);
 Object.assign(state,{nightPlan:next.plan,raidPressureMemory:next.memory,rng:next.rng});
 validatePressureSnapshot(state);
 const loaded=JSON.parse(JSON.stringify(state));assert.deepEqual(preparePressureNight(loaded).plan,next.plan);
 assert.equal(preparePressureNight(loaded).rng,next.rng);
 const tampered=structuredClone(state);tampered.nightPlan.pressureFacts.targetAnimals++;
 assert.throws(()=>validatePressureSnapshot(tampered));
});

test('already committed candidate-3 plan retains its historical cohort after loading',()=>{
 const memory={version:1,lastDay:36,sample:295,ema:675.7898549476145},config=raidPressureCandidateForVersion(3);
 const summary=raidPressureSummary(36,295,memory,config);
 const selected=selectBudgetedRaid({night:36,pressure:summary.pressure,unlocked:['warthog','hyena','buffalo'],rng:712,config});
 const actors=selected.actors.map(a=>({species:a.species,hits:a.hits,damageProfile:{cropDamage:a.cropDamage,structureDamage:a.structureDamage,attackRadius:a.attackRadius,areaCap:a.areaCap,peripheralWeight:.5}}));
 const waves=[actors.slice(0,16),actors.slice(16)];
 const state={day:36,rng:selected.rng,postgame:false,raidPressureMemory:memory,nightPlan:{pressureVersion:1,night:36,at:400,done:false,group:waves[0].map(a=>a.species),actors:waves[0],waves,pressureFacts:{...summary,candidateVersion:3,budget:selected.plan.q,potential:selected.spentProduct}}};
 validatePressureSnapshot(state);
 const loaded=JSON.parse(JSON.stringify(state)),retry=preparePressureNight(loaded);
 assert.equal(retry.reused,true);assert.equal(retry.plan.waves.flat().length,19);
 assert.deepEqual(retry.plan,state.nightPlan);assert.equal(retry.rng,state.rng);
});
