import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {gunzipSync,gzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {performance} from 'node:perf_hooks';
import {pathToFileURL} from 'node:url';
import assert from 'node:assert/strict';
import {serialize,deserialize} from '../src/persistence/snapshots.js';
import {Navigation,BIOME_IDS} from '../src/world/navigation.js';
import {repairRoute} from '../src/world/work-points.js';
import {contractExpired} from '../src/simulation/workforce.js';
import * as Game from '../src/simulation/game.js';
import {createRepairSettlementEvidence} from './repair-settlement-evidence.mjs';
const hash=x=>createHash('sha256').update(x).digest('hex');
const kinds=tasks=>tasks.reduce((o,t)=>(o[t.kind]=(o[t.kind]??0)+1,o),{});
export function diagnoseRepairSnapshot(path,output){
 mkdirSync(output,{recursive:true});const started=performance.now(),input=readFileSync(path),raw=gunzipSync(input).toString('utf8'),s=deserialize(raw);assert.equal(serialize(s),raw);
 assert.equal(s.day,21);assert.equal(s.time,0);assert.equal(s.result,null);assert.deepEqual(s.pauses,['hiring']);
 const profile=JSON.parse(readFileSync(new URL('../public/content/biome-'+BIOME_IDS[s.biome]+'.json',import.meta.url))).profile,nav=new Navigation(s.seed,s.biome,profile);nav.setState(s);
 const observer=createRepairSettlementEvidence(s),center=s.structures.find(c=>c.kind==='center'&&c.status==='intact');assert.ok(center.hp<center.maxHp);
 const count=Math.max(1,Math.min(Math.ceil(s.plants.filter(p=>p.alive).length/12),Math.floor(Number(s.ledger.balance.n)/30)));
 const ledgerBefore=structuredClone(s.ledger);Game.hire(s,'repair-diagnostic-hire',{olderFemale:count});observer.observe(s);assert.equal(s.pauses.length,0);assert.equal(s.ledger.entries['repair-diagnostic-hire'].n,String(-count*30));
 const queuedBefore=structuredClone(s.tasks),beforeRequest=serialize(s),ledgerAtRequest=JSON.stringify(s.ledger);Game.requestRepair(s,'repair-diagnostic-request',center.id);observer.observe(s);
 assert.equal(JSON.stringify(s.ledger),ledgerAtRequest,'Request must not charge repair');const task=s.tasks.find(t=>t.kind==='repair'&&t.targetId===center.id);assert.ok(task);assert.equal(task.workerId,null);
 assert.deepEqual(s.tasks.filter(t=>t.id!==task.id),queuedBefore,'Do not clear or reorder preceding tasks');
 const preceding=s.tasks.filter(t=>t.created<task.created),nearest=[...s.workers].sort((a,b)=>Math.hypot(a.x-center.x,a.z-center.z)-Math.hypot(b.x-center.x,b.z-center.z)||a.id.localeCompare(b.id)).slice(0,3);
 const beforeProbes=serialize(s),routes=nearest.map(w=>{const began=performance.now(),route=repairRoute(w,center,nav);return {id:w.id,status:w.status,taskId:w.taskId,contractDay:w.contractDay,expired:contractExpired(w,s),idleReservationEligible:w.status==='idle'&&!w.taskId&&!w.incapacitated&&!contractExpired(w,s),x:w.x,z:w.z,reachable:!!route,pathPoints:route?.path.length??0,destination:route?.destination??null,queryMilliseconds:performance.now()-began};});assert.equal(serialize(s),beforeProbes,'Read-only route probes changed state');
 const observations=[];for(let i=0;i<4;i++){Game.tick(s,.25,nav);observer.observe(s);const repair=s.tasks.find(t=>t.id===task.id),assigned=s.workers.find(w=>w.taskId===task.id);observations.push({elapsed:s.elapsed,time:s.time,repairExists:!!repair,reservedWorkerId:repair?.workerId??null,blocked:repair?.blocked??null,assignedWorker:assigned?{id:assigned.id,status:assigned.status,pathPoints:assigned.path?.length??null}:null,precedingRemaining:s.tasks.filter(t=>t.created<task.created).length,queueKinds:kinds(s.tasks),workerStates:s.workers.reduce((o,w)=>(o[w.status]=(o[w.status]??0)+1,o),{})});}
 const final=serialize(s),settlement=observer.report(s),report={scope:'New legal day21 snapshot sequence, one simulated second; not reconstruction of original fourteen requests or campaign acceptance',inputSHA256:hash(input),initialSnapshotSHA256:hash(raw),beforeRequestSHA256:hash(beforeRequest),finalSnapshotSHA256:hash(final),commands:{hire:{count,paidCoins:count*30},repair:{id:'repair-diagnostic-request',targetId:center.id,taskId:task.id,createdSequence:task.created,noChargeAtRequest:true}},initial:{day:21,time:0,centerHp:center.hp,precedingTasks:preceding.length,queueKinds:kinds(preceding),ledgerBefore},routes,observations,repairSettlements:settlement,missingMeasurements:['Historical intraday repair task IDs/reservations/cancellation receipts','Complete-day repair outcome; this bounded fixture stops after one simulated second'],milliseconds:performance.now()-started};
 for(const [name,value] of [['initial-state',raw],['before-request-state',beforeRequest],['final-state',final]])writeFileSync(output+'/'+name+'.json.gz',gzipSync(value));writeFileSync(output+'/report.json',JSON.stringify(report,null,2)+'\n');return report;
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){try{const r=diagnoseRepairSnapshot(process.argv[2],process.argv[3]);console.log(JSON.stringify({preceding:r.initial.precedingTasks,routes:r.routes.map(r=>r.reachable),last:r.observations.at(-1),paid:r.repairSettlements.paidRepairs,milliseconds:r.milliseconds}));}catch(e){console.error(e);process.exitCode=1;}}
