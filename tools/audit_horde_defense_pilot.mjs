import {readFileSync,writeFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
import {pathToFileURL} from 'node:url';
import {serialize,deserialize} from '../src/persistence/snapshots.js';
import {auditHordeComparison} from './horde-defense-comparison.mjs';
import {summarizeIntensiveFarm} from './summarize_intensive_farm.mjs';
import {ownedWallStateCounts} from './horde-defense-terminal-derivative.mjs';
const hash=b=>createHash('sha256').update(b).digest('hex');
const json=p=>JSON.parse(readFileSync(p,'utf8').replace(/^\uFEFF/,''));
const unzip=p=>gunzipSync(readFileSync(p)).toString('utf8');
export function auditHordePilot(original){
 const archive=original.replace(/[\\/]native-original[\\/]?$/,'');assert.notEqual(archive,original,'Expected archived native-original directory');
 for(const entry of json(archive+'/payload-hashes.json')){const bytes=readFileSync(archive+'/'+entry.path);assert.equal(bytes.length,entry.bytes);assert.equal(hash(bytes),entry.sha256,'Archive manifest mismatch: '+entry.path);}
 const status=json(original+'/status.json');assert.equal(status.status,'paired-pilot-terminal');assert.equal(status.results.length,2);
 const provenance=json(original+'/provenance.json');for(const [path,expected] of Object.entries(provenance.sourceHashes))assert.equal(hash(readFileSync(new URL('../'+path,import.meta.url))),expected,'Frozen source mismatch: '+path);
 const rows=[];for(const arm of ['responsible','neglect']){
  const dir=original+'/'+arm,receipt=json(dir+'/status.json');assert.equal(receipt.status,'native-terminal-audited');assert.equal(receipt.error,null);assert.equal(receipt.sourceUnchanged,true);
  for(const [file,expected] of Object.entries(receipt.payloadHashes))assert.equal(hash(readFileSync(dir+'/'+file)),expected,'Payload hash mismatch');
  const nativeReport=JSON.parse(unzip(dir+'/native-report.json.gz')),report=JSON.parse(unzip(dir+'/report.json.gz')),raw=unzip(dir+'/state.json.gz');assert.equal(raw,unzip(dir+'/native-state.json.gz'));assert.equal(nativeReport.gates,undefined);
  const state=deserialize(raw);assert.equal(serialize(state),raw);report.state=state;assert.equal(report.seed,'712');assert.equal(state.seed,'712');assert.equal(report.biome,'gran-canon');assert.equal(report.culture,'saheliana');assert.equal(report.completedNights,20);assert.equal(state.completedNights,20);assert.equal(state.result,null);
  assert.deepEqual(auditHordeComparison(report,20),report.gates);assert.deepEqual(summarizeIntensiveFarm(report),report.summary);
  for(const [key,value] of Object.entries(nativeReport))assert.deepEqual(value,report[key],'Native pre-audit report changed: '+key);
  const daylight=report.decisions.reduce((n,d)=>n+d.daylightSeconds,0),idle=report.decisions.reduce((n,d)=>n+(!d.actions&&['budget','space','shift-end'].includes(d.reason)?d.daylightSeconds:0),0);assert.ok(Math.abs(daylight-report.observedActivity.daylightSeconds)<1e-6);assert.ok(Math.abs(idle-report.observedActivity.unoccupiedSeconds)<1e-6);
  const bands=[[1,5],[6,15],[16,20]].map(([start,end])=>{const ds=report.decisions.filter(d=>d.day>=start&&d.day<=end),daylight=ds.reduce((n,d)=>n+d.daylightSeconds,0),idle=ds.reduce((n,d)=>n+(!d.actions&&['budget','space','shift-end'].includes(d.reason)?d.daylightSeconds:0),0);return {start,end,daylight,idle,fraction:idle/daylight};});
  const repair=report.repairSettlements,repairCommands=report.commands.filter(c=>c.kind==='repair').length,wallCommands=report.commands.filter(c=>c.kind==='wall');
  const paidWalls=wallCommands.reduce((n,c)=>n-Number(state.ledger.entries[c.id].n),0);if(report.defense?.built)assert.equal(paidWalls,report.defense.built.cost);
  const owned=ownedWallStateCounts(state,report.defense?.built),allocations=report.gates.strikeEvidence.raids.reduce((n,r)=>n+r.actors.reduce((n,a)=>n+a.hitsAllocated,0),0),unused=report.gates.strikeEvidence.raids.reduce((n,r)=>n+r.actors.reduce((n,a)=>n+a.hitsRemaining,0),0);
  rows.push({arm,result:report.result,completedNights:report.completedNights,money:report.money,sourceHashCount:Object.keys(provenance.sourceHashes).length,snapshotSHA256:hash(Buffer.from(raw)),roundtrip:true,summaryReproduced:true,gates:report.gates,observedActivity:report.observedActivity,bands,counts:report.counts,cashflow:report.summary.cashflow,paidWallCoins:paidWalls,repair:{requestedCommands:repairCommands,nativeRequests:report.counts.RepairRequested??0,completed:repair.completedRepairs,paid:repair.paidRepairs,paidCoins:repair.paidCoins,restoredHp:repair.restoredHp,pendingFinal:state.tasks.filter(t=>t.kind==='repair').length,coverageStatus:repair.status,interruptionScope:'No per-task cancellation receipt exists. Native spawn removes repair tasks; requests without arrivals are not labelled individually completed or cancelled.'},defense:{original:report.defense,correctedOwnedWallStates:owned,completeEnclosureClaim:false},raids:{spawned:report.counts.RaidSpawned,ended:report.counts.RaidEnded,allocatedHits:allocations,spentHits:report.gates.spentStrikes,unusedHits:unused,actors:report.gates.strikeEvidence.raids.reduce((n,r)=>n+r.actors.length,0),maximumSimultaneousOwners:Math.max(...report.raids.map(r=>r.maxOwners)),allEnded:report.gates.allRaidsPhysicallyEnded},scope:'Twenty-night paired diagnostic; no100night/matrix acceptance. Raw erroneous wall report preserved; this correction is read-only.'});
 }
 return {status:'read-only-terminal-audit',source:provenance.gitHead,rows,auditorHashes:Object.fromEntries(['tools/audit_horde_defense_pilot.mjs','tools/horde-defense-terminal-derivative.mjs'].map(p=>[p,hash(readFileSync(new URL('../'+p,import.meta.url)))])),inputHashes:Object.fromEntries(['provenance.json','status.json',...['responsible','neglect'].flatMap(a=>['report.json.gz','state.json.gz','native-report.json.gz','native-state.json.gz','status.json'].map(f=>a+'/'+f))].map(p=>[p,hash(readFileSync(original+'/'+p))])),scope:'Exit0 verifies original receipts and preserves false gates, not economic acceptance'};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){const result=auditHordePilot(process.argv[2]);writeFileSync(process.argv[3],JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result.rows.map(r=>({arm:r.arm,idle:r.observedActivity.unoccupiedFraction,paidRepairs:r.repair.paid,paidWalls:r.paidWallCoins,neglectDefeat:r.gates.nativeNeglectDefeat}))));}
