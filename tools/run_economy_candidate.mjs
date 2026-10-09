// Small native economic diagnostics. Only canonical runtime parameter commits
// differ between candidates; strategy, seed and activity policy never change.
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {join} from 'node:path';
import {createHash} from 'node:crypto';
import {simulateIntensiveFarm,auditIntensiveFarm} from './check_intensive_farm.mjs';
import {summarizeIntensiveFarm} from './summarize_intensive_farm.mjs';
import {intensiveRunProvenance} from './intensive-run-provenance.mjs';
import {serialize} from '../src/persistence/snapshots.js';
import {HIRING_RESERVE} from '../src/simulation/budget.js';
import {BALANCE} from '../src/simulation/balance.js';
const [biome,culture,daysText,directory,baselineState]=process.argv.slice(2),days=Number(daysText);
assert.ok(directory&&Number.isSafeInteger(days)&&days>=1&&days<=10,'Usage: BIOME CULTURE 1..10_DAYS OUTPUT [BASELINE_STATE]');
mkdirSync(directory,{recursive:true});
const provenance=intensiveRunProvenance(process.argv.slice(2));
assert.deepEqual(provenance.trackedChanges,[],'Commit candidate runtime before recording evidence');
const sha=b=>createHash('sha256').update(b).digest('hex');
const write=(name,value)=>writeFileSync(join(directory,name),JSON.stringify(value,null,2)+'\n');
const observations=new Map(),examples=[];
let lastState=null;
const policy={profile:'olderFemale',mixed:true,middayHiring:false,plantsPerWorker:12,defend:false,
 reserveLabourGrowth:true,reserveMaintenance:true,burstPlanting:false,cameraEntry:true};
let result;
try{
 result=simulateIntensiveFarm({biome,culture,days,seed:712,...policy,
  onTick(state){lastState=state;},
  onDecision(row){
   if(row.time>=300||row.actions||row.reason!=='budget')return;
   const category=row.balance<row.seedCost+HIRING_RESERVE?'belowMinimumHiringReserve':
    row.balance<row.seedCost+row.nextWages?'belowCurrentTeamReserve':
    row.balance<row.seedCost+row.labourReserve?'belowGrowingTeamReserve':
    row.balance<row.seedCost+row.labourReserve+row.maintenanceReserve?'maintenanceReserve':
    row.balance<row.seedCost+row.labourReserve+row.maintenanceReserve+row.defenseReserve?'defenseReserve':'other';
   const day=observations.get(row.day)??{day:row.day,seconds:0,categories:{}};
   day.seconds+=row.seconds;day.categories[category]=(day.categories[category]??0)+row.seconds;
   observations.set(row.day,day);
   if(examples.filter(e=>e.day===row.day&&e.category===category).length<2)examples.push({...row,category});
  }});
 auditIntensiveFarm(result,{victory:false});
 assert.deepEqual(result.policy,policy);
 const {state,nav,...report}=result,raw=serialize(state);
 const baseline=baselineState?readFileSync(baselineState,'utf8'):null;
 if(baseline!==null)assert.equal(raw,baseline,'Observer changed the complete original baseline state');
 const categories={};for(const day of observations.values())for(const [key,value]of Object.entries(day.categories))categories[key]=(categories[key]??0)+value;
 assert.equal([...observations.values()].reduce((n,d)=>n+d.seconds,0),result.daily.reduce((n,d)=>n+d.idle.budget,0));
 write('report.json',{...report,provenance});writeFileSync(join(directory,'state.json'),raw);
 write('summary.json',summarizeIntensiveFarm({...result,provenance}));
 write('diagnostic.json',{provenance,policy,completedNights:result.completedNights,result:result.result,
  candidateParameters:{initialMoney:BALANCE.initial_money,workers:BALANCE.workers,
   crops:BALANCE.crops.map(c=>({id:c.id,seedCost:c.plant_cost,harvestValue:c.base_harvest_value,growthSeconds:c.growth_seconds}))},
  activity:result.activity,categories,daily:[...observations.values()],examples,
  snapshotSha256:sha(raw),completeBaselineParity:baseline===null?'not-applicable':true,
  scope:'At most10 unchanged-policy native nights. Real runtime parameters; no free money/crops, policy/seed/domain changes, FIFO bypass or activity-gate relaxation. Budget scalar observer only. Not100-night/matrix/release acceptance.'});
 assert.ok(result.daily.every(day=>day.staff>0&&day.delivered>0),'Working day without paid staff or physical deliveries');
 console.log(JSON.stringify({source:provenance.gitHead,completedNights:result.completedNights,result:result.result,
  inactivity:result.activity.unoccupiedFraction,money:result.money,categories,snapshotSha256:sha(raw)}));
}catch(error){
 write('failure.json',{provenance,error:{name:error.name,message:error.message},policy,
  scope:'Unmodified observed failure retained; no retry or outcome correction.'});
 if(lastState)try{writeFileSync(join(directory,'failure-state.json'),serialize(lastState));}
 catch(snapshotError){write('failure-state-unvalidated.json',{state:lastState,validationError:snapshotError.message});}
 throw error;
}
