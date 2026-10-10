import {contractExpired,PROFILES} from '../src/simulation/workforce.js';
const fifo=(a,b)=>a.created-b.created||a.id.localeCompare(b.id);
export function observeRepairQueue(s,taskId){
 const task=s.tasks.find(t=>t.id===taskId),sorted=[...s.tasks].sort(fifo),rank=sorted.findIndex(t=>t.id===taskId),preceding=rank<0?[]:sorted.slice(0,rank),assigned=s.workers.find(w=>w.taskId===taskId);
 const availability={workers:0,expired:0,shiftEnded:0,incapacitated:0,idleWithoutTask:0,reservationCandidatesBeforeRoute:0},phases={};
 for(const w of s.workers){availability.workers++;phases[w.status]=(phases[w.status]??0)+1;const expired=contractExpired(w,s),end=PROFILES.find(p=>p.id===w.profile)?.end??null,ended=end===null||s.time>=end;
  if(expired)availability.expired++;if(ended)availability.shiftEnded++;if(w.incapacitated)availability.incapacitated++;
  if(w.status==='idle'&&!w.taskId){availability.idleWithoutTask++;if(task&&w.centerId===task.centerId&&!expired&&!ended&&!w.incapacitated)availability.reservationCandidatesBeforeRoute++;}
 }
 return {day:s.day,time:s.time,elapsed:s.elapsed,taskExists:!!task,fifoRank:rank,precedingKinds:preceding.reduce((o,t)=>(o[t.kind]=(o[t.kind]??0)+1,o),{}),task:task?{id:task.id,createdSequence:task.created,targetId:task.targetId,centerId:task.centerId,workerId:task.workerId,blocked:task.blocked}:null,assigned:assigned?{id:assigned.id,status:assigned.status,x:assigned.x,z:assigned.z,taskId:assigned.taskId,profile:assigned.profile,contractDay:assigned.contractDay,pathPoints:assigned.path?.length??null,pathVersion:assigned.pathVersion??null}:null,availability,phases,raidId:s.raid?.id??null,scope:'Candidate counts omit repairRoute; sequence is FIFO ordering, never a creation timestamp'};
}
export function classifyRepairTransition(taskId,before,after,events){
 if(!before.taskExists)return {status:'incomplete',reason:'Task was already missing before interval',eventIds:[]};
 const applied=events.filter(e=>e.type==='RepairApplied'&&e.repair?.taskId===taskId);
 if(applied.length>1)return {status:'incomplete',reason:'Duplicate repair completion',eventIds:applied.map(e=>e.id)};
 if(applied.length){if(after.taskExists)return {status:'incomplete',reason:'Completion event conflicts with live task',eventIds:[applied[0].id]};return {status:'completed',eventIds:[applied[0].id],repair:structuredClone(applied[0].repair)};}
 if(!after.taskExists){const raid=events.find(e=>e.type==='RaidSpawned');return raid?{status:'removed-at-native-raid-onset',eventIds:[raid.id],raidId:raid.raidId,scope:'Repair existed before tick and disappeared during the interval that emitted RaidSpawned; native spawn removes repair tasks. No paid completion inferred.'}:{status:'disappeared-unexplained',eventIds:events.map(e=>e.id),scope:'No completion or raid-onset event explains removal; do not infer success or cancellation'};}
 return {status:'pending',eventIds:[]};
}
