import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {gunzipSync} from 'node:zlib';
import {deserialize,serialize} from '../src/persistence/snapshots.js';
import {auditIntensiveFarm} from './check_intensive_farm.mjs';
import {summarizeIntensiveFarm} from './summarize_intensive_farm.mjs';
const [directory,f100]=process.argv.slice(2),read=name=>JSON.parse(readFileSync(join(directory,name),'utf8'));
const report=read('report.json'),summary=read('summary.json'),diagnostic=read('diagnostic.json');
const raw=readFileSync(join(directory,'state.json')),state=deserialize(raw.toString('utf8'));
assert.equal(readFileSync(join(directory,'exit-code.txt'),'utf8').trim(),'0');
assert.equal(report.provenance.gitHead,'9263721068782e19fbbe2b11f582f361fac89b8b');
assert.deepEqual(report.provenance.trackedChanges,[]);
const hashes=report.provenance.sourceHashes;
const archived=JSON.parse(execFileSync('python',['-c',`import sys,json,subprocess,tarfile,io,hashlib
r=json.load(sys.stdin)
b=subprocess.run(['git','archive','--format=tar',r['sha'],'--',*r['files']],check=True,stdout=subprocess.PIPE).stdout
t=tarfile.open(fileobj=io.BytesIO(b),mode='r:')
print(json.dumps({m.name:hashlib.sha256(t.extractfile(m).read()).hexdigest() for m in t.getmembers() if m.isfile()}))`],{input:JSON.stringify({sha:report.provenance.gitHead,files:Object.keys(hashes)}),encoding:'utf8',maxBuffer:16*1024*1024}));
assert.deepEqual(archived,hashes);
assert.equal(serialize(deserialize(serialize(state))),serialize(state));auditIntensiveFarm({...report,state});
assert.deepEqual(summarizeIntensiveFarm({...report,state}),summary);
assert.equal(report.completedNights,10);assert.equal(state.completedNights,10);assert.equal(state.day,11);
assert.equal(report.result,null);assert.equal(state.result,null);assert.equal(state.raid,null);
assert.equal(report.counts.GameOver??0,0);assert.equal(report.counts.RaidSpawned,report.counts.RaidEnded);
assert.equal(report.daily.length,10);assert.ok(report.daily.every(d=>d.staff>0&&d.delivered>0));
assert.equal(report.activity.unoccupiedSeconds,report.daily.reduce((n,d)=>n+d.idle.budget+d.idle.space+d.idle['shift-end'],0));
const sha=b=>createHash('sha256').update(b).digest('hex');assert.equal(sha(raw),diagnostic.snapshotSha256);
const baseline=JSON.parse(gunzipSync(readFileSync(f100)).toString('utf8')).daily.slice(0,10);
const band=rows=>({days:rows.map(d=>d.day),unoccupiedSeconds:rows.reduce((n,d)=>n+d.idle.budget+d.idle.space+d.idle['shift-end'],0),daylightSeconds:rows.length*300,delivered:rows.reduce((n,d)=>n+d.delivered,0),planted:rows.reduce((n,d)=>n+d.planted,0),lastMoney:rows.at(-1).money,lastTasks:rows.at(-1).pendingTasks});
const bands=[['1–3',0,3],['4–7',3,7],['8–10',7,10]].map(([name,a,b])=>({name,F:band(baseline.slice(a,b)),G:band(report.daily.slice(a,b))}));
const files=Object.fromEntries(['report.json','summary.json','diagnostic.json','state.json','exit-code.txt','process.log'].map(name=>[name,sha(readFileSync(join(directory,name)))]));
const audit={candidateSource:report.provenance.gitHead,verifiedSourceHashes:Object.keys(hashes).length,files,snapshotSha256:sha(raw),checks:{completeRequested10:true,noDefeat:true,everyDayPaidStaffAndPhysicalDelivery:true,nativeLedgerWaterCrateAudit:true,completeSummaryReproduced:true,snapshotRoundtrip:true,raidsClosed:true,activityBelow25:report.activity.unoccupiedFraction<.25},F10:band(baseline),G10:band(report.daily),bands,dailyComparison:report.daily.map((G,i)=>({day:G.day,F:baseline[i],G})),activity:report.activity,cashflow:summary.cashflow,scope:'One unchanged-policy G10. Terminal and source audit; no replay, 100-night acceptance, temporal route/FIFO proof or visual/GPU benchmark.'};
writeFileSync(join(directory,'terminal-audit.json'),JSON.stringify(audit,null,2)+'\n');
console.log(JSON.stringify({...audit,dailyComparison:undefined,files:undefined},null,2));
