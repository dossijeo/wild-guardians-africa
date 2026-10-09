// Read-only service observation. Task ages are first-observed ages, not native timestamps.
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {join} from 'node:path';
import {createHash} from 'node:crypto';
import {gzipSync} from 'node:zlib';
import {simulateIntensiveFarm,auditIntensiveFarm} from './check_intensive_farm.mjs';
import {intensiveRunProvenance} from './intensive-run-provenance.mjs';
import {serialize} from '../src/persistence/snapshots.js';
import {cropSpec} from '../src/simulation/rules.js';
const [directory,referenceFile]=process.argv.slice(2);
assert.ok(directory&&referenceFile,'Usage: OUTPUT REFERENCE_FULL_STATE');
mkdirSync(directory,{recursive:true});
const provenance=intensiveRunProvenance(process.argv.slice(2));
assert.deepEqual(provenance.trackedChanges,[]);
const hash=x=>createHash('sha256').update(x).digest('hex');
provenance.observerSha256=hash(readFileSync(new URL(import.meta.url)));
const policy={profile:'olderFemale',mixed:true,middayHiring:false,plantsPerWorker:12,defend:false,reserveLabourGrowth:true,reserveMaintenance:true,burstPlanting:false,cameraEntry:true};
const samples=[],seenEvents=new Set(),taskFirstSeen=new Map(),workerPhaseFirstSeen=new Map();
let previous=null;
const cohort=new Set(),cohortTransitions=[],previousPlants=new Map();
const onTick=s=>{
 for(const p of s.plants)if(s.day===1&&cohort.size<8)cohort.add(p.id);
 for(const p of s.plants)if(cohort.has(p.id)){
  const crate=s.crates.find(c=>c.sourcePlantId===p.id);
  const view={id:p.id,species:p.species,alive:p.alive,growth:p.growth,
   mature:p.growth>=cropSpec(p.species).growth_seconds,harvestRequested:p.harvestRequested,
   water:p.water.map(w=>({...w})),toleranceBonus:p.toleranceBonus,
   crate:crate?{id:crate.id,delivered:crate.delivered,carrierId:crate.carrierId}:null};
  const key=JSON.stringify({alive:view.alive,mature:view.mature,harvestRequested:view.harvestRequested,
   water:view.water.map(w=>w.status),crate:view.crate});
  if(previousPlants.get(p.id)!==key){previousPlants.set(p.id,key);cohortTransitions.push({day:s.day,time:s.time,elapsed:s.elapsed,...view});}
 }
 const fresh=s.events.filter(e=>!seenEvents.has(e.id));for(const e of fresh)seenEvents.add(e.id);
 if(s.day>10||s.time>=300||s.raid){previous=null;return;}
 const tasks=new Map(s.tasks.map(t=>[t.id,t]));
 for(const t of s.tasks)if(!taskFirstSeen.has(t.id))taskFirstSeen.set(t.id,s.elapsed);
 const people=s.workers.map(w=>{
  const task=tasks.get(w.taskId),phase=w.status+':'+(task?.kind??(w.crateId?'crate':'none'));
  const key=w.id+':'+phase,old=workerPhaseFirstSeen.get(w.id);
  if(old?.key!==key)workerPhaseFirstSeen.set(w.id,{key,elapsed:s.elapsed});
  let x=w.x,z=w.z,pathMetres=0;
  for(const p of w.path??[]){pathMetres+=Math.hypot(p.x-x,p.z-z);x=p.x;z=p.z;}
  return {id:w.id,phase,x:w.x,z:w.z,taskId:w.taskId,crateId:w.crateId,pathMetres,
   phaseObservedAge:s.elapsed-workerPhaseFirstSeen.get(w.id).elapsed,
   taskObservedAge:task?s.elapsed-taskFirstSeen.get(task.id):null,
   actionRemaining:w.actionRemaining,pathVersion:w.pathVersion};
 });
 const living=s.plants.filter(p=>p.alive),day=s.day,time=s.time,elapsed=s.elapsed;
 const row={day,time,elapsed,people,intervalFromPrevious:previous?.day===day?elapsed-previous.elapsed:0,
  living:living.length,firstWaterPending:living.filter(p=>p.water[0].status==='due').length,
  mature:living.filter(p=>p.growth>=cropSpec(p.species).growth_seconds).length,
  cohortPlants:s.plants.filter(p=>cohort.has(p.id)).map(p=>({id:p.id,alive:p.alive,growth:p.growth,water:p.water.map(w=>({...w})),toleranceBonus:p.toleranceBonus})),
  tasks:s.tasks.map(t=>({id:t.id,targetId:t.targetId,kind:t.kind,workerId:t.workerId,blocked:t.blocked,observedAge:elapsed-taskFirstSeen.get(t.id)})),
  newEvents:fresh.filter(e=>['CropPlaced','HarvestRequested','CrateDelivered'].includes(e.type)),
  deliveredTotal:s.crates.filter(c=>c.delivered).length};
 samples.push(row);previous=row;
};
const result=simulateIntensiveFarm({biome:'gran-canon',culture:'saheliana',days:10,seed:712,...policy,onTick});
auditIntensiveFarm(result,{victory:false});
const raw=serialize(result.state),reference=readFileSync(referenceFile,'utf8');
assert.equal(raw,reference,'Observer changed complete state or reference does not match these runtime parameters');
assert.equal(result.completedNights,10);assert.equal(result.result,null);assert.deepEqual(result.policy,policy);
writeFileSync(join(directory,'service-trace.jsonl.gz'),gzipSync(Buffer.from(samples.map(x=>JSON.stringify(x)).join('\n')+'\n')));
const write=(name,x)=>writeFileSync(join(directory,name),JSON.stringify(x,null,2)+'\n');
const rows=[];
for(let day=1;day<=10;day++){
 const observed=samples.filter(s=>s.day===day),phaseSeconds={},firstDelivery=observed.find(s=>s.newEvents.some(e=>e.type==='CrateDelivered'));
 // Left endpoint actor-seconds; global elapsed and actor-seconds are distinct.
 for(let i=1;i<observed.length;i++)for(const w of observed[i-1].people)phaseSeconds[w.phase]=(phaseSeconds[w.phase]??0)+observed[i].intervalFromPrevious;
 const longestTasks=new Map();for(const s of observed)for(const t of s.tasks){const old=longestTasks.get(t.id);if(!old||old.observedAge<t.observedAge)longestTasks.set(t.id,{...t,time:s.time});}
 rows.push({day,staff:result.daily[day-1].staff,delivered:result.daily[day-1].delivered,
  planted:result.daily[day-1].planted,firstDeliveryTime:firstDelivery?.time??null,
  paidPlantsBeforeFirstDelivery:observed.filter(s=>firstDelivery?s.elapsed<firstDelivery.elapsed:true).reduce((n,s)=>n+s.newEvents.filter(e=>e.type==='CropPlaced').length,0),
  firstWaterPendingAtDaylightEnd:observed.at(-1)?.firstWaterPending,
  globalObservedSeconds:observed.reduce((n,s)=>n+s.intervalFromPrevious,0),phaseActorSeconds:phaseSeconds,
  longestObservedTasks:[...longestTasks.values()].sort((a,b)=>b.observedAge-a.observedAge).slice(0,8)});
}
write('first-cohort-transitions.json',{provenance,plantIds:[...cohort],transitions:cohortTransitions,scope:'First eight observed plants. Transition times are first-observed at native one-second/daytime and five-second/night cadence, not substep-perfect. Water wait/tolerance data and growth retained in trace; no invented event timestamps.'});
write('service-summary.json',{provenance,policy,completeFinalStateParity:true,finalStateSha256:hash(raw),referenceStateSha256:hash(reference),
 gates:{requestedNightsAndNoDefeat:true,eachDayPaidStaffAndDelivery:result.daily.every(d=>d.staff>0&&d.delivered>0),physicalLedgerHydration:true,shortWindowIdleBelow25:result.activity.unoccupiedFraction<.25,responsible100NightAndMatrix30:'not-tested'},
 activity:result.activity,rows,scope:'Read-only observation of an already retained ten-night case, exact final-state parity. Task and phase ages are first-observed lower bounds; durations one-second left endpoint actor-seconds. No service/FIFO/policy/runtime changes. Events are timestamped at their first observation; the initial seed predates that callback but its retained event is included. No substep-perfect event timing is claimed.'});
console.log(JSON.stringify({source:provenance.gitHead,parity:true,samples:samples.length,gates:result.daily.every(d=>d.staff>0&&d.delivered>0),activity:result.activity.unoccupiedFraction}));
