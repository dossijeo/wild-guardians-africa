// Pure observations; never issues an extra command or changes decision policy.
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {gzipSync} from 'node:zlib';
import {join} from 'node:path';
import {createHash} from 'node:crypto';
import {simulateIntensiveFarm,auditIntensiveFarm} from './check_intensive_farm.mjs';
import {intensiveRunProvenance} from './intensive-run-provenance.mjs';
import {serialize} from '../src/persistence/snapshots.js';
import {hiringCost} from '../src/simulation/workforce.js';
import {numberOf} from '../src/simulation/money.js';
import {HIRING_RESERVE} from '../src/simulation/budget.js';
import {permission,operational} from '../src/simulation/rules.js';
const directory=process.argv[2];assert.ok(directory);mkdirSync(directory,{recursive:true});
const provenance=intensiveRunProvenance(process.argv.slice(2));assert.deepEqual(provenance.trackedChanges,[]);
const hash=x=>createHash('sha256').update(x).digest('hex');provenance.observerSha256=hash(readFileSync(new URL(import.meta.url)));
const policy={profile:'olderFemale',mixed:true,middayHiring:false,plantsPerWorker:12,defend:false,reserveLabourGrowth:true,reserveMaintenance:true,burstPlanting:false,cameraEntry:true};
const decisions=[],states=[];
const result=simulateIntensiveFarm({biome:'gran-canon',culture:'saheliana',days:10,seed:712,...policy,
 onDecision(row){if(row.time>=300)return;
  const category=row.reason!=='budget'||row.actions?null:row.balance<row.seedCost+HIRING_RESERVE?'minimumHiring':row.balance<row.seedCost+row.nextWages?'currentTeam':row.balance<row.seedCost+row.labourReserve?'growingTeam':row.balance<row.seedCost+row.labourReserve+row.maintenanceReserve?'maintenance':'other';
  const extraCost=hiringCost({olderFemale:1},{time:row.time});
  decisions.push({...row,category,extraWorkerCostNow:extraCost,
   seedPlusMinimum100Affordable:row.balance>=row.seedCost+100,
   seedPlusCurrentTomorrowTeamAffordable:row.balance>=row.seedCost+row.nextWages,
   seedPlusFullControlReservesAffordable:row.balance>=row.seedCost+row.labourReserve+row.maintenanceReserve+row.defenseReserve,
   extraWorkerCashAffordable:row.balance>=extraCost,
   extraWorkerMaintainingExpandedTomorrowReservesAffordable:row.balance>=extraCost+Math.max(row.labourReserve,row.nextWages+30)+row.maintenanceReserve+row.defenseReserve});
 },
 onTick(s){if(s.day>10||s.time>=300||s.raid)return;
  const tasks=new Map(s.tasks.map(t=>[t.id,t])),phases={};
  for(const w of s.workers){if(w.contractDay!==s.day)continue;const key=w.status+':'+(tasks.get(w.taskId)?.kind??(w.crateId?'crate':'none'));phases[key]=(phases[key]??0)+1;}
  states.push({day:s.day,time:s.time,balance:numberOf(s.ledger.balance),
   living:s.plants.filter(p=>p.alive).length,firstWaterPending:s.plants.filter(p=>p.alive&&p.water[0].status==='due').length,
   initialTasks:s.tasks.filter(t=>t.kind==='initial').length,waterTasks:s.tasks.filter(t=>t.kind==='water').length,harvestTasks:s.tasks.filter(t=>t.kind==='harvest').length,
   phases,plantPermission:permission(s,'plant'),
   additionalHiringNativeAvailable:!s.result&&!s.raid&&s.hiringPaidDay===s.day&&s.time<300&&!s.pauses.some(p=>!['menu','tutorial-action'].includes(p))&&s.structures.some(operational),
   deliveredTotal:s.crates.filter(c=>c.delivered).length});
 }});
auditIntensiveFarm(result,{victory:false});const raw=serialize(result.state);assert.equal(raw,readFileSync('docs/qa/economic-candidates-a518/harvest-triple-half-structure-damage/state.json','utf8'));
const daily=[];
for(let day=1;day<=10;day++){
 const rows=decisions.filter(x=>x.day===day),idle=rows.filter(x=>x.reason==='budget'&&!x.actions),categories={};for(const x of idle)categories[x.category]=(categories[x.category]??0)+x.seconds;
 assert.equal(idle.reduce((n,x)=>n+x.seconds,0),result.daily[day-1].idle.budget);
 const tally=field=>idle.filter(x=>x[field]).reduce((n,x)=>n+x.seconds,0);
 daily.push({day,nativeDay:result.daily[day-1],categories,budgetIdle:tally('reason'),
  idleWithSeedPlusMinimum100Cash:tally('seedPlusMinimum100Affordable'),
  idleWithCurrentTeamSeedCash:tally('seedPlusCurrentTomorrowTeamAffordable'),
  idleWithFullControlReservesSeedCash:tally('seedPlusFullControlReservesAffordable'),
  idleWithNativeExtraWorkerCash:tally('extraWorkerCashAffordable'),
  idleWithExtraWorkerAndExpandedTomorrowReservesCash:tally('extraWorkerMaintainingExpandedTomorrowReservesAffordable'),
  budgetStartExamples:idle.slice(0,3),budgetEndExamples:idle.slice(-3)});
}
writeFileSync(join(directory,'decisions.jsonl.gz'),gzipSync(Buffer.from(decisions.map(x=>JSON.stringify(x)).join('\n')+'\n')));
writeFileSync(join(directory,'service-states.jsonl.gz'),gzipSync(Buffer.from(states.map(x=>JSON.stringify(x)).join('\n')+'\n')));
writeFileSync(join(directory,'diagnostic.json'),JSON.stringify({provenance,policy,fullStateParity:true,finalStateSha256:hash(raw),daily,
 gates:{completed10:result.completedNights===10&&result.result===null,paidStaffPhysicalDeliveryEveryDay:result.daily.every(x=>x.staff>0&&x.delivered>0),activityBelow25:result.activity.unoccupiedFraction<.25},
 scope:'Read-only native F control; no additional hiring/plant commands. Opportunity affordability is arithmetic at pre-tick decision time; native permission/availability sampled after tick separately, not guaranteed physical placement or a proposed altered policy. One employee at proportional native wage, tomorrow team expanded by30, all original control reserves retained. Counterfactual cash arithmetic never changes this middayHiring:false strategy. No100/matrix/acceptance.'},null,2)+'\n');
console.log(JSON.stringify({source:provenance.gitHead,parity:true,decisions:decisions.length,states:states.length,activity:result.activity.unoccupiedFraction}));
