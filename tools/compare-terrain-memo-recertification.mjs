import {readFileSync,writeFileSync} from 'node:fs';
import assert from 'node:assert/strict';
const [baselinePath,candidatePath,output]=process.argv.slice(2);
if(!baselinePath||!candidatePath||!output)throw Error('BASELINE_JSON CANDIDATE_JSON FRESH_OUTPUT required');
const a=JSON.parse(readFileSync(baselinePath)),b=JSON.parse(readFileSync(candidatePath));
assert.equal(a.mode,'candidate');assert.equal(b.mode,'candidate-terrain-memo');
for(const key of ['snapshotSha256','day','time','plants','stateUnchanged'])assert.deepEqual(a[key],b[key]);
assert.equal(a.stateUnchanged,true);
const physical=proof=>{const {terrainTileDiagnostics,terrainMemoDiagnostics,...rest}=proof;return rest;};
assert.equal(a.runs.length,b.runs.length);
const rows=b.runs.map((run,i)=>{
 assert.deepEqual(physical(run.proof),physical(a.runs[i].proof));
 assert(run.proof.terrainMemoDiagnostics.maxEntries<=65536);
 return {temperature:run.temperature,baselineMs:a.runs[i].milliseconds,candidateMs:run.milliseconds,physicalCertificateExactlyEqual:true,memo:run.proof.terrainMemoDiagnostics};
});
const report={scope:'Exact physical certificate comparison; excludes only terrain execution counters. Sequential observations are not statistical ABBA or campaign acceptance.',snapshotSha256:b.snapshotSha256,rows,campaignMayRestart:false,limitation:'Cold certification and evolving native targets still need short representative workload measurement before restarting the campaign.'};
writeFileSync(output,JSON.stringify(report,null,2)+'\n',{flag:'wx'});console.log(JSON.stringify(report,null,2));
