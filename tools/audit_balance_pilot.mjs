// Read-only audit of the complete original pilot. No replay or policy changes.
import assert from 'node:assert/strict';
import {readFileSync,readdirSync,writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {deserialize} from '../src/persistence/snapshots.js';
import {summarizeIntensiveFarm} from './summarize_intensive_farm.mjs';
const [directory,output]=process.argv.slice(2);
assert.ok(directory&&output,'Usage: ARTIFACT_DIRECTORY OUTPUT.json');
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const bytes=name=>readFileSync(join(directory,name));
const json=name=>JSON.parse(bytes(name));
const report=json('gran-canon-mapungubwe-report.json');
const summary=json('gran-canon-mapungubwe-summary.json');
const status=json('gran-canon-mapungubwe-status.json');
const job=json('job.json');
const source='2bdac97e3439f6f9cf4b99b4f2ec1007f8bc2d5b';
assert.equal(job.sha,source);assert.equal(report.provenance.gitHead,source);
assert.equal(report.provenance.repositoryGitHead,source);
assert.deepEqual(report.provenance.trackedChanges,[]);
const entries=Object.entries(report.provenance.sourceHashes);
const batch=execFileSync('git',['cat-file','--batch'],{
 input:entries.map(([path])=>`${source}:${path}\n`).join(''),maxBuffer:32*1024*1024});
let cursor=0;
for(const [path,expected] of entries){
 const end=batch.indexOf(10,cursor),header=batch.subarray(cursor,end).toString('utf8');
 const [,type,sizeText]=header.split(' ');assert.equal(type,'blob',path);
 const size=Number(sizeText),start=end+1;assert.equal(sha(batch.subarray(start,start+size)),expected,path);
 cursor=start+size+1;
}
assert.equal(cursor,batch.length);
const state=deserialize(bytes('gran-canon-mapungubwe-state.json').toString('utf8'));
const actual=summarizeIntensiveFarm({...report,state});
assert.deepEqual(actual,summary,'Independent physical/accounting summary must match original');
assert.equal(status.status,'passed');assert.equal(state.result,'victory');
assert.equal(state.completedNights,100);assert.equal(state.day,101);assert.equal(state.raid,null);
assert.equal(report.daily.length,100);
assert.ok(report.daily.every(day=>day.staff>0&&day.delivered>0));
assert.equal(summary.activity.acceptance.policy.maximumFraction,.25);
assert.equal(summary.activity.acceptance.policy.comparison,'strictly-less-than');
assert.equal(summary.activity.acceptance.status,'not-accepted');
assert.equal(summary.activity.unoccupiedFraction,10829/30000);
const bands=Array.from({length:5},(_,i)=>{
 const rows=report.daily.slice(i*20,i*20+20);
 const idle=reason=>rows.reduce((n,r)=>n+(r.idle[reason]??0),0);
 const total=key=>rows.reduce((n,r)=>n+r[key],0);
 return {firstDay:rows[0].day,lastDay:rows.at(-1).day,
  unoccupiedFraction:(idle('budget')+idle('space')+idle('shift-end'))/6000,
  idle:{budget:idle('budget'),space:idle('space'),shiftEnd:idle('shift-end')},
  planted:total('planted'),delivered:total('delivered'),workerDays:total('staff'),
  deliveredPerWorkerDay:total('delivered')/total('staff')};
});
const living=state.plants.filter(p=>p.alive);
const plantedDay=new Map([[state.plants[0].id,1]]);let plantCursor=1;
for(const day of report.daily)for(let i=0;i<day.planted;i++)plantedDay.set(state.plants[plantCursor++].id,day.day);
assert.equal(plantCursor,state.plants.length);
const firstWater= living.filter(p=>p.water[0].status==='due');
const ages=firstWater.map(p=>state.day-plantedDay.get(p.id));
const taskKinds={};for(const task of state.tasks)taskKinds[task.kind]=(taskKinds[task.kind]??0)+1;
const windows=[[1,10],[11,30],[31,60],[61,100]].map(([first,last])=>{
 const rows=report.daily.filter(r=>r.day>=first&&r.day<=last);
 const idle=reason=>rows.reduce((n,r)=>n+(r.idle[reason]??0),0);
 const total=key=>rows.reduce((n,r)=>n+r[key],0);
 return {firstDay:first,lastDay:last,unoccupiedFraction:(idle('budget')+idle('space')+idle('shift-end'))/(rows.length*300),
  idle:{budget:idle('budget'),space:idle('space'),shiftEnd:idle('shift-end')},
  staff:{min:Math.min(...rows.map(r=>r.staff)),max:Math.max(...rows.map(r=>r.staff)),mean:total('staff')/rows.length},
  living:{opening:rows[0].living,closing:rows.at(-1).living},
  wages:total('wages'),planted:total('planted'),delivered:total('delivered'),
  cashAfterHiring:{opening:rows[0].before,closing:rows.at(-1).before},
  cashAfterDay:rows.at(-1).money};
});
const result={status:'verified',source,runId:job.runId,sourceHashesVerified:entries.length,
 files:Object.fromEntries(readdirSync(directory).sort().map(name=>[name,sha(bytes(name))])),
 outcome:{result:state.result,completedNights:state.completedNights,day:state.day,raid:state.raid,
  physicalDeliveries:report.counts.CrateDelivered,picked:report.counts.CropPicked,
  undeliveredCrates:state.crates.filter(c=>!c.delivered).length},
 cashflow:summary.cashflow,activity:summary.activity,bands,windows,
 capacity:{plots:report.plots,maximumLiving:report.maximumLiving,living:living.length,
  firstWaterPending:firstWater.length,firstWaterPendingFraction:firstWater.length/living.length,
  firstWaterAge:{maximumDays:Math.max(...ages),atLeastFiveDays:ages.filter(a=>a>=5).length,atLeastTwentyDays:ages.filter(a=>a>=20).length},
  taskKinds,workersAtTerminal:state.workers.length,centers:state.structures.filter(c=>c.kind==='center').map(c=>({id:c.id,x:c.x,z:c.z,hp:c.hp})),
  policyStaffBound:'ceil(living / 12), further limited by affordability; no hardcoded 220 cap',
  finiteSearch:'One center; 1.5m candidate grid inside original 240m activeChunkRegion; native placement and bidirectional routes required; no search expansion or second center'},
 releaseAcceptance:'rejected-activity',
 scope:'Original source before PR15. Native saved-crate hydration, maturity, paid delivery, integer ledger and summary audited without replay. CI success proves completion, not the separately rejected <25% activity gate or current-main/matrix coverage.'};
writeFileSync(output,JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify(result));
