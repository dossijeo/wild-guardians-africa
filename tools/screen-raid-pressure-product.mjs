import {writeFileSync,mkdirSync,readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {BALANCE as B} from '../src/simulation/balance.js';
import {agriculturalRaidValue,updateRaidPressureMemory,raidPressureSummary,raidCompositionCounts,raidProductEnvelope,selectBudgetedRaid} from '../src/simulation/raid-pressure-budget.js';
const out=process.argv[2];if(!out)throw Error('Output path required');mkdirSync(out,{recursive:true});
const rows=[];
for(const night of [6,14,21,58,100])for(const count of [60,200,353,600])for(const crop of ['mijo','mixed']){
 const plants=Array.from({length:count},(_,i)=>({alive:true,species:crop==='mixed'?B.crops[i%8].id:crop})),value=agriculturalRaidValue(plants),memory=updateRaidPressureMemory(null,night,value),summary=raidPressureSummary(night,value,memory);
 const tier=B.threat_tiers.find(t=>value>=t.attraction_min&&(t.attraction_max_exclusive===null||value<t.attraction_max_exclusive)),counts=raidCompositionCounts(summary.targetAnimals,summary.pressure,tier.unlocked_species),envelope=raidProductEnvelope(counts,summary.pressure),selected=selectBudgetedRaid({night,pressure:summary.pressure,unlocked:tier.unlocked_species,rng:712});
 rows.push({night,crop,count,value,summary,unlocked:tier.unlocked_species,counts,referenceQ:envelope.q,q:selected.plan.q,qRaisedForRangeSafety:selected.plan.qRaisedForRangeSafety,minimumLegalWorstCase:selected.plan.minimumLegalWorstCase,adjustments:selected.plan.adjustments,selectedCounts:selected.counts,minProduct:envelope.min,meanProduct:envelope.mean,maxProduct:envelope.max,selectedMaxProduct:selected.envelope.max,structureEnvelope:envelope.structure,areas:Object.fromEntries(envelope.rows.map(r=>[r.id,r.area])),actualDescriptorProduct:selected.spentProduct,actorCount:selected.actors.length,waveSizes:selected.waves.map(w=>w.length),draws:selected.draws});
}
const paths=['src/simulation/raid-pressure-budget.js','content/balance/raid_pressure_candidate.json','src/simulation/balance.js','tools/screen-raid-pressure-product.mjs'];
writeFileSync(out+'/reference-envelopes-fullrange.json',JSON.stringify({scope:'Analytical reference lattice and pure descriptors only; no spawn, travel, damage, deaths, campaign or performance acceptance. EMA bootstrapped to static agricultural value; not historic day58 state.',sourceHashes:Object.fromEntries(paths.map(p=>[p,createHash('sha256').update(readFileSync(p)).digest('hex')])),rows},null,2)+'\n');
console.log(JSON.stringify(rows.filter(r=>r.count===353).map(r=>({night:r.night,crop:r.crop,p:r.summary.pressure,N:r.actorCount,Q:r.q,spent:r.actualDescriptorProduct,waves:r.waveSizes}))));
