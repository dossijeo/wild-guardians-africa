import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {deserialize,serialize} from '../src/persistence/snapshots.js';
import {threatTier} from '../src/simulation/rules.js';
import {applyCropImpact} from '../src/simulation/crop-impact-health.js';
import {preparePressureNight} from '../src/simulation/raid-pressure-plan.js';
import {raidPressureSummary,raidPressureCandidateForVersion,updateRaidPressureMemory,raidSpeciesPressure,selectBudgetedRaid} from '../src/simulation/raid-pressure-budget.js';

const memory=value=>({version:1,lastDay:33,sample:value,ema:25000});
const ids=['warthog','hyena','buffalo','lion','rhino'];
test('losses immediately lower the next-plan pressure despite a high historical EMA',()=>{
 let previous=null;
 for(const value of [25000,10000,4000,1000,100,22,0]){
  const summary=raidPressureSummary(33,value,memory(value));
  assert.equal(summary.effectiveValue,value);
  if(previous){assert(summary.pressure<previous.pressure);assert(summary.targetAnimals<=previous.targetAnimals);}
  previous=summary;
 }
 assert.equal(previous.pressure,0);assert.equal(previous.targetAnimals,1);
});
test('a late-night small farm does not inherit an absolute temporal intensity floor',()=>{
 const m={version:1,lastDay:100,sample:22,ema:25000};
 const next=raidPressureSummary(100,22,m),old=raidPressureSummary(100,22,m,raidPressureCandidateForVersion(4));
 assert(next.pressure<.02);assert(old.pressure>.99);assert.equal(next.targetAnimals,1);
 for(const id of ids){const a=raidSpeciesPressure(id,next.pressure),b=raidSpeciesPressure(id,old.pressure);assert(a.cropDamage<=b.cropDamage);assert(a.structureDamage<=b.structureDamage);assert(a.attackRadius<=b.attackRadius);}
});
test('high-value farms retain substantial pressure; repeated same-day sampling cannot reset memory',()=>{
 const m={version:1,lastDay:100,sample:25000,ema:25000};
 const next=raidPressureSummary(100,25000,m);assert(next.pressure>.98);assert(next.targetAnimals>=32);
 assert.deepEqual(updateRaidPressureMemory(m,100,0),m);
});
test('historical v4 plan remains reproducible after deployment of v5, without rerolling actors',()=>{
 const state=deserialize(readFileSync(new URL('./fixtures/raid-pressure-v1/planned.json',import.meta.url),'utf8'));
 state.day=100;state.nightPlan=null;
 const next=preparePressureNight(state),v=next.plan.pressureFacts.observedValue,c=raidPressureCandidateForVersion(4);
 const summary=raidPressureSummary(100,v,next.memory,c),unlocked=threatTier(summary.effectiveValue).unlocked_species;
 const selected=selectBudgetedRaid({night:100,pressure:summary.pressure,agriculturalValue:v,unlocked,rng:123,config:c});
 const actors=selected.actors.map(a=>({species:a.species,hits:a.hits,damageProfile:{cropDamage:a.cropDamage,structureDamage:a.structureDamage,attackRadius:a.attackRadius,areaCap:a.areaCap,peripheralWeight:.5}}));
 const waves=Array.from({length:Math.ceil(actors.length/16)},(_,i)=>actors.slice(i*16,(i+1)*16));
 state.nightPlan={...next.plan,group:waves[0].map(a=>a.species),actors:waves[0],waves,pressureFacts:{...summary,candidateVersion:4,budget:selected.plan.q,potential:selected.spentProduct,composition:selected.counts,referenceEnvelope:selected.envelope,compositionAdjustments:selected.plan.adjustments,qRaisedForRangeSafety:selected.plan.qRaisedForRangeSafety}};
 state.raidPressureMemory=next.memory;state.rng=selected.rng;
 const raw=serialize(state),loaded=deserialize(raw),retry=preparePressureNight(loaded);
 assert.equal(retry.reused,true);assert.equal(serialize(loaded),raw);assert.deepEqual(retry.plan,state.nightPlan);
});
test('native crop impacts leave the committed raid intact but lower the following night plan',()=>{
 const state={day:32,rng:123,plants:Array.from({length:100},(_,i)=>({id:'plant-'+i,alive:true,species:'mijo'})),postgame:false,events:[]};
 const prepared=preparePressureNight(state);state.nightPlan=prepared.plan;state.raidPressureMemory=prepared.memory;state.rng=prepared.rng;
 const before=JSON.stringify(state.nightPlan);
 for(const plant of state.plants.slice(0,98))applyCropImpact(state,plant,10);
 assert.equal(state.plants.filter(p=>p.alive).length,2);
 assert.equal(JSON.stringify(preparePressureNight(state).plan),before);
 state.day=33;state.nightPlan=null;
 const after=preparePressureNight(state);
 assert(after.plan.pressureFacts.pressure<prepared.plan.pressureFacts.pressure);
 assert.equal(after.plan.waves.flat().length,1);
 assert.equal(after.plan.pressureFacts.effectiveValue,22);
});
