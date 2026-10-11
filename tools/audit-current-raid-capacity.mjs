// Current native plan descriptors, not a campaign or realized crop destruction.
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdirSync,existsSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {pathToFileURL} from 'node:url';
import {BALANCE} from '../src/simulation/balance.js';
import {CROP_HIT_POINTS} from '../src/simulation/crop-impact-health.js';
import {preparePressureNight} from '../src/simulation/raid-pressure-plan.js';
import {raidAnimalCount,RAID_PRESSURE_CANDIDATE} from '../src/simulation/raid-pressure-budget.js';

export function currentRaidCapacityAudit(){
 const rows=[];
 const describe=(night,inventory,cropLabel,ema=null)=>{
  const state={day:night,plants:inventory,rng:712,postgame:false};
  if(ema!==null)state.raidPressureMemory={version:1,lastDay:night,sample:295,ema};
  const before=JSON.stringify(state),prepared=preparePressureNight(state);
  assert.equal(JSON.stringify(state),before,'Planning must not mutate the audit input');
  assert.deepEqual(preparePressureNight(state),prepared,'Native plan must reproduce');
  const plan=prepared.plan,actors=plan.waves.flat(),facts=plan.pressureFacts;
  const bySpecies=Object.fromEntries(BALANCE.animals.map(a=>[a.id,actors.filter(v=>v.species===a.id).length]));
  return {night,cropLabel,plants:inventory.length,currentHarvestValue:facts.observedValue,effectiveHarvestValue:facts.effectiveValue,pressure:facts.pressure,
   preRecoveryAnimals:raidAnimalCount(night,facts.pressure),animals:actors.length,bySpecies,waveSizes:plan.waves.map(w=>w.length),
   strikes:actors.reduce((sum,a)=>sum+a.hits,0),centralRequestedDamageHP:actors.reduce((sum,a)=>sum+a.hits*(a.damageProfile?.cropDamage??1),0),
   alternativeStructureRequestedDamage:actors.reduce((sum,a)=>sum+a.hits*(a.damageProfile?.structureDamage??BALANCE.animals.find(v=>v.id===a.species).structure_hit_damage),0),
   referenceBudgetHP:facts.budget,selectedReferenceCapacityHP:facts.potential,referenceEnvelope:facts.referenceEnvelope,
   introductory:!!plan.introductory,actors,rngAfter:prepared.rng};
 };
 for(const night of [1,5,6,21,50,100])for(const count of [0,23,50,200,500])for(const kind of ['mijo','mixed']){
  const inventory=Array.from({length:count},(_,i)=>({alive:true,species:kind==='mixed'?BALANCE.crops[i%8].id:'mijo'}));
  rows.push(describe(night,inventory,kind));
 }
 const lossCase=describe(36,Array.from({length:23},(_,i)=>({alive:true,species:i<16?'mijo':'maiz'})),'value-295-after-loss',675.7898549476145);
 return {scope:'Current native pressure-plan descriptors and reference geometry only. No spawn, routes, contact, Shield, destruction, ledger or campaign outcome is simulated.',
  candidateVersion:RAID_PRESSURE_CANDIDATE.version,cropHitPoints:CROP_HIT_POINTS,
  caveats:['Reference capacity is requested HP on the configured lattice, not realized damage or a count of dead plants. Overkill, half-point peripheral hits and overlapping targets affect efficiency.',
   'Agricultural and structural capacities are alternative uses of the same strikes, never additive.',
   'Static rows initialize EMA to current value; only the explicitly labelled loss case includes retained historical EMA.',
   'The first five nights retain native introductory restrictions; descriptor capacity does not bypass their destruction cap.'],rows,lossCase};
}
export const CURRENT_CAPACITY_SOURCES=['tools/audit-current-raid-capacity.mjs','src/simulation/raid-pressure-budget.js','src/simulation/raid-pressure-plan.js','src/simulation/crop-impact-health.js','src/simulation/balance.js','src/simulation/rules.js','content/balance/raid_pressure_candidate.json'];
export const currentCapacitySourceHashes=()=>Object.fromEntries(CURRENT_CAPACITY_SOURCES.map(p=>[p,createHash('sha256').update(readFileSync(new URL('../'+p,import.meta.url))).digest('hex')]));
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 const out=process.argv[2];assert(out,'Output directory required');assert(!existsSync(out+'/capacity.json'),'Never overwrite earlier evidence');mkdirSync(out,{recursive:true});
 const report={...currentRaidCapacityAudit(),sourceHashes:currentCapacitySourceHashes()};
 writeFileSync(out+'/capacity.json',JSON.stringify(report,null,2)+'\n');
 writeFileSync(out+'/capacity.md',['# Current native military capacity descriptors','',report.scope,'',`Candidate ${report.candidateVersion}; crop HP ${report.cropHitPoints}.`,
  '', '| Night | Inventory | Plants | Harvest value | Animals | Strikes | Reference Q | Selected reference HP |', '|---:|---|---:|---:|---:|---:|---:|---:|',
  ...[...report.rows,report.lossCase].map(r=>`| ${r.night} | ${r.cropLabel} | ${r.plants} | ${r.currentHarvestValue} | ${r.animals} | ${r.strikes} | ${r.referenceBudgetHP} | ${r.selectedReferenceCapacityHP} |`),'',...report.caveats.map(v=>'- '+v),''].join('\n'));
 console.log(JSON.stringify({rows:report.rows.length,cropHitPoints:report.cropHitPoints,lossCase:{before:report.lossCase.preRecoveryAnimals,after:report.lossCase.animals,value:report.lossCase.currentHarvestValue}}));
}
