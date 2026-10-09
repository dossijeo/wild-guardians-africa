// Read-only terminal verification using the exact frozen producer modules.
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {resolve,join} from 'node:path';
import {pathToFileURL} from 'node:url';
import {gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
const [frozenPath,outputPath]=process.argv.slice(2),frozen=resolve(frozenPath),out=resolve(outputPath);
const sha=b=>createHash('sha256').update(b).digest('hex'),files={};
const raw=name=>{const b=readFileSync(join(out,name));files[name]=sha(b);return b;};
const matrix=JSON.parse(raw('matrix.json'));assert.notEqual(matrix.status,'running','Wait for native terminal');
const head=execFileSync('git',['rev-parse','HEAD'],{cwd:frozen,encoding:'utf8'}).trim();assert.equal(head,'d667b537096b620e212d1f635b9ee71d0e3ecff8');
assert.equal(execFileSync('git',['status','--porcelain','--untracked-files=no'],{cwd:frozen,encoding:'utf8'}).trim(),'');
assert.equal(matrix.provenance.gitHead,head);assert.deepEqual(matrix.provenance.trackedChanges,[]);
for(const [name,hash]of Object.entries(matrix.provenance.sourceHashes))assert.equal(sha(readFileSync(join(frozen,name))),hash,name);
const preflight=JSON.parse(raw('preflight.json'));assert.equal(preflight.poorProducerSha256,sha(execFileSync('git',['show',head+':tools/check_bad_management.mjs'],{cwd:frozen})));assert.deepEqual(preflight.provenance.sourceHashes,matrix.provenance.sourceHashes);
const module=path=>pathToFileURL(join(frozen,path)).href;
const {auditIntensiveFarm}=await import(module('tools/check_intensive_farm.mjs'));
const {summarizeIntensiveFarm}=await import(module('tools/summarize_intensive_farm.mjs'));
const {serialize,deserialize}=await import(module('src/persistence/snapshots.js'));
const {BIOMES}=await import(module('src/simulation/game.js'));
assert.deepEqual(matrix.policy,{days:10,seed:712,culture:'mapungubwe',reserveLabourGrowth:false,reserveMaintenance:false,burstPlanting:true,cameraEntry:true});
assert.deepEqual(matrix.cases.map(r=>r.biome),BIOMES);
const rows=[];
for(const row of matrix.cases){
 assert.equal(row.status,'audited',row.biome);const report=JSON.parse(raw(row.biome+'-report.json')),stateRaw=gunzipSync(raw(row.biome+'-state.json.gz')),state=deserialize(stateRaw.toString('utf8'));
 assert.equal(sha(stateRaw),row.snapshotSha256);assert.equal(serialize(deserialize(serialize(state))),stateRaw.toString('utf8'));
 auditIntensiveFarm({...report,state});assert.deepEqual(JSON.parse(raw(row.biome+'-summary.json')),summarizeIntensiveFarm({...report,state}));
 assert.equal(report.result,state.result);assert.equal(report.result,row.result);assert.equal(report.completedNights,state.completedNights);assert.equal(report.completedNights,row.completedNights);
 assert.equal(report.money,row.money);assert.equal(report.money,Number(state.ledger.balance.n)/Number(state.ledger.balance.d));assert.equal(state.raid,null);
 assert.equal(report.counts.RaidSpawned??0,report.counts.RaidEnded??0);assert.equal(report.counts.CampaignWon??0,0);assert.equal(report.counts.GameOver??0,report.result==='defeat'?1:0);
 assert.deepEqual(report.policy,{profile:'olderFemale',mixed:false,middayHiring:false,plantsPerWorker:12,defend:false,reserveLabourGrowth:false,reserveMaintenance:false,burstPlanting:true,cameraEntry:true});
 rows.push({biome:row.biome,result:row.result,completedNights:row.completedNights,money:row.money,paidCrates:row.delivered,inactivity:row.unoccupiedFraction,snapshotSha256:row.snapshotSha256,physicalLedgerAndFullSummaryVerified:true});
}
const defeats=rows.filter(r=>r.result==='defeat').length;assert.equal(matrix.defeats,defeats);assert.equal(matrix.sourcesUnchanged,true);
assert.equal(matrix.status,defeats>0?'passed':'failed');
const result={source:head,sourceHashesVerified:Object.keys(matrix.provenance.sourceHashes).length,producerStatus:matrix.status,defeats,rows,files,auditorSha256:sha(readFileSync(new URL(import.meta.url))),riskGateAccepted:matrix.status==='passed'&&defeats>0,scope:'Original poor policy six-biome ten-night terminals; exact frozen sources, ledger/hydration/physical crates and summaries. Survival is preserved, never converted into defeat. No longer-horizon risk proof, matrix30 or balance promotion.'};
writeFileSync(join(out,'bad6-terminal-audit.json'),JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result,null,2));
