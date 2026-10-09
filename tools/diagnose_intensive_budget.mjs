// Observe the unchanged responsible strategy; never change prices or reserves
// merely to satisfy an activity gate. Compare its complete state with a prior run.
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {simulateIntensiveFarm,auditIntensiveFarm} from './check_intensive_farm.mjs';
import {intensiveRunProvenance} from './intensive-run-provenance.mjs';
import {serialize} from '../src/persistence/snapshots.js';
import {HIRING_RESERVE} from '../src/simulation/budget.js';
import {BIOMES,CULTURES} from '../src/simulation/game.js';
import assert from 'node:assert/strict';

const [biome,culture,daysText,baselineState,output]=process.argv.slice(2),days=Number(daysText);
if(!BIOMES.includes(biome)||!CULTURES.includes(culture)||!Number.isSafeInteger(days)||days<1||days>100||!baselineState||!output)
 throw Error('Usage: node tools/diagnose_intensive_budget.mjs BIOME CULTURE DAYS BASELINE_STATE OUTPUT_DIRECTORY');
mkdirSync(output,{recursive:true});
const provenance=intensiveRunProvenance(process.argv.slice(2));
const daily=new Map(),samples=[];
const r=simulateIntensiveFarm({biome,culture,days,seed:712,mixed:true,onDecision(row){
 if(row.time>=300||row.actions||row.reason!=='budget')return;
 const category=row.balance<row.seedCost+HIRING_RESERVE?'belowMinimumHiringReserve':
  row.balance<row.seedCost+row.nextWages?'belowCurrentTeamReserve':
  row.balance<row.seedCost+row.labourReserve?'belowGrowingTeamReserve':
  row.balance<row.seedCost+row.labourReserve+row.maintenanceReserve?'maintenanceReserve':
  row.balance<row.seedCost+row.labourReserve+row.maintenanceReserve+row.defenseReserve?'defenseReserve':'other';
 const day=daily.get(row.day)??{day:row.day,seconds:0,categories:{},minimumBalance:Infinity,maximumBalance:-Infinity};
 day.seconds+=row.seconds;day.categories[category]=(day.categories[category]??0)+row.seconds;
 day.minimumBalance=Math.min(day.minimumBalance,row.balance);day.maximumBalance=Math.max(day.maximumBalance,row.balance);daily.set(row.day,day);
 if(samples.filter(s=>s.day===row.day&&s.category===category).length<2)samples.push({...row,category});
}});
auditIntensiveFarm(r,{victory:days===100});
const actual=serialize(r.state),baseline=readFileSync(baselineState,'utf8');
assert.equal(actual,baseline,'Budget observer changed the complete native simulation state');
const totals={};for(const day of daily.values())for(const [key,value]of Object.entries(day.categories))totals[key]=(totals[key]??0)+value;
assert.equal([...daily.values()].reduce((n,d)=>n+d.seconds,0),r.daily.reduce((n,d)=>n+d.idle.budget,0),'Attribution must cover all recorded budget idle seconds');
const result={provenance,policy:r.policy,completedNights:r.completedNights,activity:r.activity,
 baselineStateSha256:createHash('sha256').update(baseline).digest('hex'),completeStateParity:true,
 categories:totals,daily:[...daily.values()],samples,
 scope:'Scalar observations after native decisions. Reserve categories explain this strategy, not a counterfactual policy, physical player activity or rendered performance. No gate or gameplay parameter changed.'};
writeFileSync(output+'/budget-attribution.json',JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify({completeStateParity:true,completedNights:r.completedNights,categories:totals,activity:r.activity}));
