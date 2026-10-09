// Terminal-only reconstruction using the producer's own frozen modules. No replay.
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {pathToFileURL,fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
const [frozenPath,outputPath]=process.argv.slice(2);
assert.ok(frozenPath&&outputPath,'Usage: node audit_economy_f100_native.mjs FROZEN_CHECKOUT OUTPUT_DIR');
const frozen=resolve(frozenPath),out=resolve(outputPath),key='gran-canon-saheliana';
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const head=execFileSync('git',['rev-parse','HEAD'],{cwd:frozen,encoding:'utf8'}).trim();
assert.equal(head,'83b1c1eaa0235f9a9b34966f88b496f42eeb161b');
assert.equal(execFileSync('git',['status','--porcelain','--untracked-files=no'],{cwd:frozen,encoding:'utf8'}).trim(),'');
const files={},read=name=>{const bytes=readFileSync(resolve(out,key+'-'+name+'.json'));files[key+'-'+name+'.json']=sha(bytes);return JSON.parse(bytes);};
const status=read('status');assert.notEqual(status.status,'running','Wait for native terminal');
assert.equal(status.provenance.gitHead,head);assert.deepEqual(status.provenance.trackedChanges,[]);
const report=read('report');assert.deepEqual(report.provenance,status.provenance);
for(const [path,expected] of Object.entries(report.provenance.sourceHashes)){
 const bytes=readFileSync(resolve(frozen,path));assert.equal(sha(bytes),expected,path);
}
const moduleURL=path=>pathToFileURL(resolve(frozen,path)).href;
const {auditIntensiveFarm}=await import(moduleURL('tools/check_intensive_farm.mjs'));
const {summarizeIntensiveFarm}=await import(moduleURL('tools/summarize_intensive_farm.mjs'));
const {serialize,deserialize}=await import(moduleURL('src/persistence/snapshots.js'));
const raw=readFileSync(resolve(out,key+'-state.json'));files[key+'-state.json']=sha(raw);
const state=deserialize(raw.toString('utf8'));
assert.equal(serialize(deserialize(serialize(state))),raw.toString('utf8'),'Exact serialized roundtrip');
assert.equal(report.result,state.result);assert.equal(report.completedNights,state.completedNights);
assert.equal(report.money,Number(state.ledger.balance.n)/Number(state.ledger.balance.d));
for(const field of ['biome','culture','seed'])assert.equal(report[field],state[field]);
assert.equal(status.biome,report.biome);assert.equal(status.culture,report.culture);assert.equal(status.days,100);
if(status.status==='passed'){
 for(const field of ['result','completedNights','money','maximumLiving'])assert.equal(status[field],report[field]);
 assert.equal(status.unoccupiedFraction,report.activity.unoccupiedFraction);
}
auditIntensiveFarm({...report,state},{victory:state.result==='victory'});
const recomputed=summarizeIntensiveFarm({...report,state});
let summaryMatches=false;
try {assert.deepEqual(read('summary'),recomputed);summaryMatches=true;}
catch(error){if(error.code!=='ENOENT')throw error;}
if(status.status==='passed'){
 assert.ok(summaryMatches,'Passed producer must have complete reproducible summary');
 assert.deepEqual(status.activityAcceptance,recomputed.activity.acceptance);
 assert.equal(status.speciesObserved,recomputed.speciesObserved);
}
const gates={nativePassed:status.status==='passed',summaryFullyReproduced:summaryMatches,
 campaignVictory:report.result==='victory'&&report.completedNights===100&&state.day===101&&state.raid===null,
 nativeWinCounts:report.counts.CampaignWon===1&&(report.counts.GameOver??0)===0,
 allSpawnedRaidsEnded:(report.counts.RaidSpawned??0)===(report.counts.RaidEnded??0),
 everyDayPhysicalDelivery:report.daily.length===100&&report.daily.every(row=>row.staff>0&&row.delivered>0),
 globalActivityBelow25:report.daily.length===100&&recomputed.activity.unoccupiedFraction<.25};
const auditFiles={};
for(const path of [fileURLToPath(import.meta.url),resolve(fileURLToPath(new URL('.',import.meta.url)),'audit_economy_f100_terminal.py')])auditFiles[path]=sha(readFileSync(path));
const result={source:head,sourceHashesVerified:Object.keys(report.provenance.sourceHashes).length,
 files,auditFiles,gates,responsibleCaseAccepted:Object.values(gates).every(Boolean),
 terminal:{status:status.status,result:report.result,completedNights:report.completedNights,counts:report.counts},
 activity:recomputed.activity,
 scope:'One frozen terminal native case. Exact summary and validated snapshot reconstruction; no simulation or replay. Temporal FIFO/routes derive from unchanged producer protocol, sources and separate tests, not a terminal snapshot. No poor-management, matrix30 or current-main compatibility approval.'};
writeFileSync(resolve(out,'f100-native-terminal-audit.json'),JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify(result));
