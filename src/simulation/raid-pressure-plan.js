import candidate from '../../content/balance/raid_pressure_candidate.json' assert {type:'json'};
import {BALANCE as B} from './balance.js';
import {nextRandom,threatTier} from './rules.js';
import {agriculturalRaidValue,updateRaidPressureMemory,raidPressureSummary,selectBudgetedRaid,validateRaidPressureConfiguration,RAID_PRESSURE_CANDIDATE} from './raid-pressure-budget.js';

validateRaidPressureConfiguration(candidate);

// Transactional preparation only. The scheduler commits RNG/memory together
// with the plan; neither a readiness retry nor a save reload may reroll it.
export function preparePressureNight(state) {
  if(state.nightPlan?.pressureVersion===1 && state.nightPlan.night===state.day && !!state.nightPlan.peaceful===!!state.postgame)
    return {plan:structuredClone(state.nightPlan),memory:structuredClone(state.raidPressureMemory),rng:state.rng,reused:true};
  const random={rng:state.rng},at=323+nextRandom(random)*225;
  const value=agriculturalRaidValue(state.plants);
  if(state.postgame)return {plan:{pressureVersion:1,night:state.day,at,attraction:value,group:[],actors:[],waves:[],done:false,peaceful:true},memory:state.raidPressureMemory?structuredClone(state.raidPressureMemory):null,rng:random.rng,reused:false};
  const memory=updateRaidPressureMemory(state.raidPressureMemory??null,state.day,value);
  const summary=raidPressureSummary(state.day,value,memory);
  const selection=selectBudgetedRaid({night:state.day,pressure:summary.pressure,unlocked:threatTier(summary.effectiveValue).unlocked_species,rng:random.rng});
  if(selection.status==='infeasible-budget')throw Error('Pressure composition is infeasible');
  // Introductory profiles retain original damage and single-target behaviour.
  const actors=selection.actors.map(a=>({species:a.species,hits:a.hits,...(!summary.introductory?{damageProfile:{cropDamage:a.cropDamage,structureDamage:a.structureDamage,attackRadius:a.attackRadius,areaCap:a.areaCap,peripheralWeight:RAID_PRESSURE_CANDIDATE.peripheralWeight}}:{})}));
  const waves=Array.from({length:Math.ceil(actors.length/16)},(_,i)=>actors.slice(i*16,(i+1)*16));
  return {memory,rng:selection.rng,reused:false,plan:{pressureVersion:1,night:state.day,at,attraction:value,group:waves[0].map(a=>a.species),actors:waves[0],waves,done:false,...(summary.introductory?{introductory:true}:{}),pressureFacts:{...summary,budget:selection.plan?.q??actors.reduce((n,a)=>n+a.hits,0),potential:selection.spentProduct??actors.reduce((n,a)=>n+a.hits,0),composition:selection.counts??{[B.animals[state.day-1].id]:1},referenceEnvelope:selection.envelope??null,compositionAdjustments:selection.plan?.adjustments??[],qRaisedForRangeSafety:selection.plan?.qRaisedForRangeSafety??false}}};
}

// Next wave becomes due only after every existing actor has physically left.
// This never removes actors or manufactures an entry certificate.
export function nextPressureWave(raid,time) {
  if(!raid?.waves||raid.animals.some(a=>a.status!=='gone'))return null;
  const index=raid.waveIndex+1,actors=raid.waves[index];
  if(!actors)return null;
  if(!Number.isFinite(time)||time<0||time>600)throw Error('Invalid wave time');
  return {index,at:time,group:actors.map(a=>a.species),actors:structuredClone(actors),done:false};
}
