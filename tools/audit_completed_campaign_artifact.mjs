// Independent read-only terminal evidence audit. Never replay or reprice crates.
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,readdirSync} from 'node:fs';
import {join} from 'node:path';
import {createHash} from 'node:crypto';
import {gunzipSync} from 'node:zlib';
import {execFileSync} from 'node:child_process';
import {BALANCE} from '../src/simulation/balance.js';
import {deserialize} from '../src/persistence/snapshots.js';
import {summarizeIntensiveFarm} from './summarize_intensive_farm.mjs';
const [directory,poorDirectory,source,key,output]=process.argv.slice(2);
assert.ok(output,'Usage: RESPONSIBLE_DIR POOR_DIR IMMUTABLE_HEAD CASE_KEY OUTPUT.json');
const sha=b=>createHash('sha256').update(b).digest('hex');
const bytes=(dir,file)=>readFileSync(join(dir,file));
const json=(dir,file)=>JSON.parse(bytes(dir,file));
const report=json(directory,key+'-report.json'),summary=json(directory,key+'-summary.json');
const status=json(directory,key+'-status.json'),job=json(directory,'job.json');
assert.equal(job.sha,source);assert.equal(report.provenance.gitHead,source);
assert.deepEqual(report.provenance.trackedChanges,[]);
const hashes=Object.entries(report.provenance.sourceHashes);
const batch=execFileSync('git',['cat-file','--batch'],{
 input:hashes.map(([path])=>`${source}:${path}\n`).join(''),maxBuffer:32*1024*1024});
let cursor=0;
for(const [path,hash] of hashes){
 const end=batch.indexOf(10,cursor),[,type,sizeText]=batch.subarray(cursor,end).toString().split(' ');
 assert.equal(type,'blob',path);const size=Number(sizeText),start=end+1;
 assert.equal(sha(batch.subarray(start,start+size)),hash,path);cursor=start+size+1;
}
assert.equal(cursor,batch.length);
const oldBalanceText=execFileSync('git',['show',`${source}:src/simulation/balance.js`],{encoding:'utf8'});
const oldBalance=(await import('data:text/javascript;base64,'+Buffer.from(oldBalanceText).toString('base64'))).BALANCE;
// The native retained-summary audit attributes only purchase costs and growth
// thresholds from crop specs. Do not use different contemporary values for them.
assert.deepEqual(oldBalance.crops.map(c=>[c.id,c.plant_cost,c.growth_seconds]),BALANCE.crops.map(c=>[c.id,c.plant_cost,c.growth_seconds]));
assert.equal(oldBalance.initial_money,1500);
const snapshot=bytes(directory,key+'-state.json'),state=deserialize(snapshot.toString('utf8'));
assert.deepEqual(summarizeIntensiveFarm({...report,state}),summary);
assert.equal(status.status,'passed');assert.equal(state.result,'victory');
assert.equal(state.completedNights,100);assert.equal(state.day,101);assert.equal(state.raid,null);
assert.equal(report.daily.length,100);assert.ok(report.daily.every(d=>d.staff>0&&d.delivered>0));
assert.equal(summary.activity.acceptance.policy.comparison,'strictly-less-than');
assert.equal(summary.activity.acceptance.policy.maximumFraction,.25);
assert.equal(summary.activity.unoccupiedFraction,summary.activity.unoccupiedSeconds/30000);
assert.equal(summary.activity.acceptance.status,summary.activity.unoccupiedFraction<.25?'accepted':'not-accepted');
const matrix=json(poorDirectory,'matrix.json');
assert.equal(matrix.provenance.gitHead,source);assert.equal(matrix.status,'passed');
assert.deepEqual(matrix.provenance.sourceHashes,report.provenance.sourceHashes);
assert.deepEqual(matrix.provenance.trackedChanges,[]);
assert.equal(matrix.sourcesUnchanged,true);assert.equal(matrix.cases.length,6);
const poor=matrix.cases.map(row=>{
 assert.equal(row.status,'audited');const raw=gunzipSync(bytes(poorDirectory,row.biome+'-state.json.gz'));
 assert.equal(sha(raw),row.snapshotSha256);const s=deserialize(raw.toString('utf8'));
 const r=json(poorDirectory,row.biome+'-report.json'),saved=json(poorDirectory,row.biome+'-summary.json');
 // Per-case poor reports use the matrix-level source receipt; they do not
 // contain a second provenance object. The complete matrix source hashes above
 // are independently verified against the responsible receipt/Git blobs.
 assert.equal(s.result,row.result);
 assert.equal(s.completedNights,row.completedNights);assert.equal(s.raid,null);
 assert.deepEqual(summarizeIntensiveFarm({...r,state:s}),saved);
 return {biome:row.biome,result:s.result,completedNights:s.completedNights,money:s.ledger.balance.n,
  delivered:r.counts.CrateDelivered??0,snapshotSha256:sha(raw)};
});
assert.equal(poor.filter(r=>r.result==='defeat').length,matrix.defeats);assert.ok(matrix.defeats>0);
const result={status:'verified',source,runId:job.runId,sourceHashesVerified:hashes.length,
 snapshotSha256:sha(snapshot),files:Object.fromEntries(readdirSync(directory).sort().map(file=>[file,sha(bytes(directory,file))])),
 poorFiles:Object.fromEntries(readdirSync(poorDirectory).sort().map(file=>[file,sha(bytes(poorDirectory,file))])),
 responsible:{biome:report.biome,culture:report.culture,seed:report.seed,result:state.result,
 completedNights:100,raid:null,physicalDelivered:report.counts.CrateDelivered,physicalPicked:report.counts.CropPicked,
 pendingCrates:state.crates.filter(c=>!c.delivered).length,policy:report.policy,
 cashflow:summary.cashflow,activity:summary.activity},poorManagement:{defeats:matrix.defeats,cases:poor},
 acceptance:summary.activity.unoccupiedFraction<.25?'this-case-survival-physical-accounting-activity-and-poor-loss-verified':'this-case-activity-rejected',
 scope:'One responsible biome/culture/seed on immutable recorded source plus six poor-management cases. No replay, GPU, human activity, whole 30-case responsible matrix or current-main equivalence. Earlier rejected Canyon candidate remains separate.'};
writeFileSync(output,JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify({status:result.status,source,sourceHashesVerified:hashes.length,
 result:state.result,inactivity:summary.activity.unoccupiedFraction,acceptance:result.acceptance,poorDefeats:matrix.defeats}));
