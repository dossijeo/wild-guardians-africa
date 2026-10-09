import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {join} from 'node:path';
import {gzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {simulateIntensiveFarm,auditIntensiveFarm} from './check_intensive_farm.mjs';
import {intensiveRunProvenance} from './intensive-run-provenance.mjs';
import {serialize} from '../src/persistence/snapshots.js';
const directory=process.argv[2];assert.ok(directory);mkdirSync(directory,{recursive:true});
const provenance=intensiveRunProvenance(process.argv.slice(2));assert.deepEqual(provenance.trackedChanges,[]);
const hash=x=>createHash('sha256').update(x).digest('hex');provenance.observerSha256=hash(readFileSync(new URL(import.meta.url)));
const policy={profile:'olderFemale',mixed:true,middayHiring:false,plantsPerWorker:12,defend:false,reserveLabourGrowth:true,reserveMaintenance:true,burstPlanting:false,cameraEntry:true};
const records=[],seen=new Set(),snapshots=[];let previous=null;
const result=simulateIntensiveFarm({biome:'gran-canon',culture:'saheliana',days:10,seed:712,...policy,onTick(s){
 const centres=s.structures.filter(x=>x.kind==='center').map(x=>({id:x.id,hp:x.hp,status:x.status,collapseRemaining:x.collapseRemaining}));
 const events=s.events.filter(e=>!seen.has(e.id));for(const e of events)seen.add(e.id);
 const repairs=events.filter(e=>['RepairRequested','RepairApplied','StructureRuined','GameOver'].includes(e.type));
 const changed=JSON.stringify(centres)!==JSON.stringify(previous?.centres);
 if(s.raid||changed||repairs.length){
  records.push({day:s.day,time:s.time,elapsed:s.elapsed,balance:s.ledger.balance,centres,
   nightPlan:s.nightPlan?structuredClone(s.nightPlan):null,
   raid:s.raid?structuredClone(s.raid):null,
   spells:s.spells.map(a=>({...a})),cooldowns:{...s.cooldowns},living:s.plants.filter(p=>p.alive).length,
   repairTasks:s.tasks.filter(t=>t.kind==='repair').map(t=>({...t})),
   repairWorkers:s.workers.filter(w=>s.tasks.some(t=>t.kind==='repair'&&t.id===w.taskId)).map(w=>structuredClone(w)),events:repairs});
 }
 if(changed&&centres.some(c=>c.hp===0)&&!snapshots.length){
  const raw=Buffer.from(serialize(s)),file='first-zero-centre-state.json.gz';writeFileSync(join(directory,file),gzipSync(raw));snapshots.push({file,day:s.day,time:s.time,elapsed:s.elapsed,sha256:hash(raw)});
 }
 previous={centres};
}});
auditIntensiveFarm(result,{victory:false});const raw=serialize(result.state),reference=readFileSync('docs/qa/economic-candidates-a518/harvest-double/state.json','utf8');assert.equal(raw,reference);
writeFileSync(join(directory,'attack-trace.jsonl.gz'),gzipSync(Buffer.from(records.map(x=>JSON.stringify(x)).join('\n')+'\n')));
writeFileSync(join(directory,'diagnostic.json'),JSON.stringify({provenance,policy,completeFinalStateParity:true,finalStateSha256:hash(raw),snapshots,records:records.length,completedNights:result.completedNights,result:result.result,
 gates:{requested10WithoutDefeat:result.completedNights===10&&result.result!=='defeat',dailyPhysicalDelivery:result.daily.every(d=>d.staff>0&&d.delivered>0),activityBelow25:result.activity.unoccupiedFraction<.25},
 scope:'Read-only attack observation of preserved failed E control. defend:false disables optional wall construction/capital reserve, while native policy still attempts shield during attacks and ordinary repairs. Exact fullstate parity; no policy/seed/result/gameplay changes; failure remains rejected.'},null,2)+'\n');
console.log(JSON.stringify({source:provenance.gitHead,parity:true,completedNights:result.completedNights,result:result.result,snapshots,records:records.length}));
