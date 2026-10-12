import {raidPressureSummary,raidPressureCandidateForVersion,raidSpeciesPressure,selectBudgetedRaid} from '../src/simulation/raid-pressure-budget.js';
import {threatTier} from '../src/simulation/rules.js';
import {writeFileSync,mkdirSync} from 'node:fs';
const rows=[];
for(const night of [33,50,100])for(const value of [25000,4000,1000,100,22,0])for(const version of [3,4,5]){
 const memory={version:1,lastDay:night,sample:value,ema:25000},config=raidPressureCandidateForVersion(version);
 const summary=raidPressureSummary(night,value,memory,config),selection=selectBudgetedRaid({night,pressure:summary.pressure,agriculturalValue:value,unlocked:threatTier(summary.effectiveValue).unlocked_species,rng:123,config});
 rows.push({night,value,version,pressure:summary.pressure,animals:summary.targetAnimals,composition:selection.counts,potential:selection.spentProduct,budget:selection.plan.q});
}
mkdirSync('docs/qa/integrated-spiritual-survival/loss-pressure-response-v5',{recursive:true});
writeFileSync('docs/qa/integrated-spiritual-survival/loss-pressure-response-v5/plan-comparison.json',JSON.stringify({scope:'Deterministic native plan comparison only; not a campaign or actual damage measurement',seed:123,historicalEMA:25000,rows},null,2)+'\n');
console.log(JSON.stringify(rows.filter(r=>r.night===33&&[4000,22].includes(r.value))));
