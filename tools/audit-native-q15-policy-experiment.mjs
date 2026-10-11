// Explicitly different player-policy experiment, never identical-source replay.
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,existsSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
const [oldDirectory,newDirectory,output]=process.argv.slice(2);
if(!oldDirectory||!newDirectory||!output||existsSync(output))throw Error('Q14, Q15 terminal directories and fresh output required');
const read=(dir,name)=>JSON.parse(readFileSync(dir+'/'+name,'utf8'));
const sources=[oldDirectory,newDirectory].map(d=>read(d,'source.json'));
const reports=[oldDirectory,newDirectory].map(d=>read(d,'report.json'));
for(const [i,d] of [oldDirectory,newDirectory].entries()){
 const receipt=read(d,'receipt.json'),report=reports[i];
 assert(['observed-horizon','observed-native-defeat'].includes(receipt.status));
 assert.equal(report.result,receipt.result);assert.equal(report.completedNights,receipt.completedNights);
 assert.equal(report.nativeEvidence.status,'verified');assert.equal(report.nativeEvidence.coverageLost,false);
 assert.equal(report.raidEvidence.status,'verified');assert.deepEqual(report.raidEvidence.issues,[]);
 for(const row of report.daily)assert.equal(row.finance.reconciliationDifference,0);
}
assert.equal(reports[0].labourPolicy,'q14');assert.equal(reports[1].labourPolicy,'q15');
const inputs=s=>Object.fromEntries(Object.entries(s.arguments).filter(([k])=>!['labourPolicy','days','out','stop-file'].includes(k)));
assert.deepEqual(inputs(sources[0]),inputs(sources[1]),'No strategy, seed, biome, profile or economic setting changes allowed');
assert.equal(reports[0].completedNights,reports[1].completedNights,'Equal observed night horizons required');
const before=sources[0].sourceHashes,after=sources[1].sourceHashes;
const added=Object.keys(after).filter(k=>!Object.hasOwn(before,k));assert.deepEqual(added,['tools/native-q15-labour-policy.mjs']);
assert.deepEqual(Object.keys(before).filter(k=>!Object.hasOwn(after,k)),[]);
const changed=Object.keys(before).filter(k=>before[k]!==after[k]).sort();
assert.deepEqual(changed,['tools/native-campaign-protocol.mjs','tools/native-campaign-runner.mjs','tools/run_native_campaign.mjs']);
const cwd=fileURLToPath(new URL('../',import.meta.url));
const gitHash=(revision,path)=>createHash('sha256').update(execFileSync('git',['show',revision+':'+path],{cwd,maxBuffer:4*1024*1024})).digest('hex');
for(const path of changed){assert.equal(before[path],gitHash('e3d48df4',path));assert.equal(after[path],gitHash('03e0e083',path));}
assert.equal(after[added[0]],gitHash('03e0e083',added[0]));
const summary=(r,d)=>({directory:d,labourPolicy:r.labourPolicy,result:r.result,completedNights:r.completedNights,
 money:r.money,living:r.daily.at(-1).living,totalDestroyed:r.daily.reduce((n,x)=>n+x.destroyed,0),
 totals:Object.fromEntries(['income','wages','seeds','walls','repairs'].map(k=>[k,r.daily.reduce((n,x)=>n+x.finance[k],0)])),
 centerHp:r.daily.at(-1).centerHp,paidWallPieces:r.defense.paidPieces,
 firstRecordedCompleteContour:read(d,'defense-cost-audit.json').firstRecordedCompleteContour,
 decisionIdleProxy:r.activity.unoccupiedFraction,humanManualTimeMeasured:r.activity.humanManualTimeMeasured});
const result={status:'verified-declared-qa-policy-experiment',oldDirectory,newDirectory,
 identicalRecordedGameRulesAndManifests:true,identicalNonPolicyInputs:true,addedSources:added.map(path=>({path,after:after[path]})),
 changedSources:changed.map(path=>({path,before:before[path],after:after[path]})),
 summary:reports.map((r,i)=>summary(r,[oldDirectory,newDirectory][i])),
 scope:'Q14 versus Q15 player decisions under identical recorded game rules and manifests; binary assets are not checksummed by this audit. Source deltas are exact opt-in QA runner/protocol edits plus the new policy. Different decisions may alter production, RNG consumption and pressure through real farm state. Not an identical-action replay, causal wall/magic isolation, human activity, performance or long-term balance acceptance.'};
writeFileSync(output,JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result));
