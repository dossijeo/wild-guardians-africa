// Bounded diagnostic of the unchanged responsible policy. The callback reads
// native state; it never changes simulation, navigation, commands or balances.
import assert from 'node:assert/strict';
import {mkdirSync,writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {gzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {simulateIntensiveFarm,auditIntensiveFarm} from './check_intensive_farm.mjs';
import {summarizeIntensiveFarm} from './summarize_intensive_farm.mjs';
import {intensiveRunProvenance} from './intensive-run-provenance.mjs';
import {serialize} from '../src/persistence/snapshots.js';

const [directory,daysText='5']=process.argv.slice(2),days=Number(daysText);
assert.ok(directory,'Usage: OUTPUT_DIRECTORY [1..5 DAYS]');
assert.ok(Number.isSafeInteger(days)&&days>=1&&days<=5,'Diagnostic is bounded to at most five native days');
mkdirSync(directory,{recursive:true});
const provenance=intensiveRunProvenance(process.argv.slice(2));
assert.deepEqual(provenance.trackedChanges,[],'Commit preparation before collecting source-pinned evidence');
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const write=(name,value)=>writeFileSync(join(directory,name),JSON.stringify(value,null,2)+'\n');
const snapshots=[],samples=[],statusSecondsApprox={};
const captured=new Set(),delivered=new Set();
let previous=null,lastState=null,observedDaylightSeconds=0,movedMetresLowerBound=0;
const remainingPathLength=w=>{
 let x=w.x,z=w.z,total=0;
 for(const point of w.path??[]){total+=Math.hypot(point.x-x,point.z-z);x=point.x;z=point.z;}
 return total;
};
const onTick=(state,nav)=>{
 lastState=state;
 if(state.day>days)return;
 const newDeliveries=state.events.filter(e=>e.type==='CrateDelivered'&&!delivered.has(e.id));
 for(const event of newDeliveries)delivered.add(event.id);
 const daylight=state.time<300&&!state.raid;
 if(!daylight){previous=null;return;}
 const tasks=new Map(state.tasks.map(t=>[t.id,t]));
 const people=state.workers.map(w=>({id:w.id,personId:w.personId,profile:w.profile,
  contractDay:w.contractDay,status:w.status,x:w.x,z:w.z,centerId:w.centerId,
  taskId:w.taskId,taskKind:tasks.get(w.taskId)?.kind??null,crateId:w.crateId,
  actionRemaining:w.actionRemaining,runRemaining:w.runRemaining,running:!!w.running,
  recovering:!!w.recovering,incapacitated:!!w.incapacitated,
  pathVersion:w.pathVersion,destinationId:w.destinationId,
  path:w.path?.map(p=>({x:p.x,z:p.z}))??null,
  remainingPathMetres:remainingPathLength(w)}));
 const statusCounts={};
 for(const w of people){const key=w.status+(w.taskKind?':'+w.taskKind:'');statusCounts[key]=(statusCounts[key]??0)+1;}
 const queue={};for(const t of state.tasks){const row=queue[t.kind]??={total:0,assigned:0,blocked:0};row.total++;row.assigned+=Number(!!t.workerId);row.blocked+=Number(!!t.blocked);}
 const living=state.plants.filter(p=>p.alive);
 const sample={day:state.day,time:state.time,elapsed:state.elapsed,
  money:state.ledger.balance,living:living.length,
  firstWaterPending:living.filter(p=>p.water[0].status==='due').length,
  statusCounts,queue,people,navigationVersion:nav.version,
  workerMotionStats:nav.workerMotionStats?{...nav.workerMotionStats}:null,
  newPhysicalDeliveries:newDeliveries.map(e=>({id:e.id,workerId:e.workerId,crateId:e.targetId}))};
 if(previous&&previous.day===sample.day){
  const dt=sample.elapsed-previous.elapsed;
  // The ordinary responsible loop observes once per simulated second during
  // daylight. These are left-endpoint estimates, not substep-perfect timings.
  assert.ok(dt>0&&dt<=1.000001,'Unexpected diagnostic sampling interval');
  observedDaylightSeconds+=dt;
  for(const [key,count] of Object.entries(previous.statusCounts))statusSecondsApprox[key]=(statusSecondsApprox[key]??0)+count*dt;
  const old=new Map(previous.people.map(w=>[w.id,w]));
  for(const w of people){const before=old.get(w.id);if(before)movedMetresLowerBound+=Math.hypot(w.x-before.x,w.z-before.z);}
 }
 samples.push(sample);previous=sample;
 for(const targetTime of [100,200]){
  const key=`day-${state.day}-time-${targetTime}`;
  if(state.time>=targetTime&&!captured.has(key)){
   captured.add(key);const bytes=Buffer.from(serialize(state));
   writeFileSync(join(directory,key+'-state.json.gz'),gzipSync(bytes,{level:9}));
   snapshots.push({file:key+'-state.json.gz',day:state.day,time:state.time,
    elapsed:state.elapsed,sha256:sha(bytes),result:state.result,
    money:state.ledger.balance,workers:people.length,navigationVersion:nav.version});
  }
 }
};

// Explicitly preserve every strategy option from the original pilot. These
// values equal its defaults; listing them provides a reviewable scope receipt.
const policy={profile:'olderFemale',mixed:true,middayHiring:false,plantsPerWorker:12,
 defend:false,reserveLabourGrowth:true,reserveMaintenance:true,burstPlanting:false,cameraEntry:true};
let result;
try{
 result=simulateIntensiveFarm({days,seed:712,biome:'gran-canon',culture:'mapungubwe',...policy,onTick});
 auditIntensiveFarm(result,{victory:false});
 assert.equal(result.completedNights,days,'Incomplete diagnostic is retained as failure, never acceptance');
 assert.equal(result.result,null,'Five-day diagnostic must not claim campaign victory');
 assert.deepEqual(result.policy,policy);
}catch(error){
 write('failure.json',{status:'failed',provenance,error:{name:error.name,message:error.message},snapshots,
  scope:'Original failure retained without state/result correction, retry or replacement.'});
 writeFileSync(join(directory,'partial-daylight-trace.jsonl.gz'),gzipSync(Buffer.from(samples.map(s=>JSON.stringify(s)).join('\n')+'\n'),{level:9}));
 if(lastState)try{writeFileSync(join(directory,'failure-state.json.gz'),gzipSync(Buffer.from(serialize(lastState)),{level:9}));}
 catch(snapshotError){write('failure-state-unvalidated.json',{state:lastState,validationError:snapshotError.message});}
 throw error;
}
const {state,nav,...report}=result;
write('report.json',{...report,provenance});
write('native-summary.json',summarizeIntensiveFarm({...result,provenance}));
const finalBytes=Buffer.from(serialize(state));writeFileSync(join(directory,'final-state.json.gz'),gzipSync(finalBytes,{level:9}));
const traceBytes=Buffer.from(samples.map(s=>JSON.stringify(s)).join('\n')+'\n');
writeFileSync(join(directory,'daylight-trace.jsonl.gz'),gzipSync(traceBytes,{level:9}));
write('diagnostic.json',{status:'native-diagnostic-completed',provenance,
 tool:'tools/diagnose_early_farm_service.mjs',days,world:{seed:'712',biome:'gran-canon',culture:'mapungubwe'},policy,
 samples:samples.length,observedDaylightSeconds,statusSecondsApprox,movedMetresLowerBound,
 snapshots,finalSnapshotSha256:sha(finalBytes),traceSha256:sha(traceBytes),
 releaseAcceptance:'not-evaluated',
 scope:'At most five unchanged-policy native days on current source. No injected actors, money, crops, result or camera; no geography/domain changes. Original 100-night pilot remains rejected and separate. Status durations use one-second left-endpoint observations; movement is endpoint-chord lower bound. Source callbacks read/write diagnostics only; no GPU or rendering.'});
console.log(JSON.stringify({status:'native-diagnostic-completed',completedNights:result.completedNights,
 samples:samples.length,snapshots:snapshots.length,result:result.result,source:provenance.gitHead}));
