import {readFileSync,writeFileSync} from 'node:fs';
import assert from 'node:assert/strict';
const [baselinePath,candidatePath,output]=process.argv.slice(2);
if(!baselinePath||!candidatePath||!output)throw Error('BASELINE_JSONL CANDIDATE_JSONL FRESH_OUTPUT required');
const read=path=>readFileSync(path,'utf8').trim().split('\n').map(line=>JSON.parse(line));
const baseline=read(baselinePath),candidate=read(candidatePath);
assert.equal(baseline[0].mode,'baseline');assert.equal(candidate[0].mode,'candidate');
assert.equal(baseline[0].referenceSourceHashes.commit,'3161e728');
assert.equal(baseline[0].snapshotSha256,candidate[0].snapshotSha256);
for(const path of ['src/simulation/game.js','src/world/navigation.js','src/world/building-route-shortcut.js'])assert.equal(baseline[0].sourceHashes[path],candidate[0].sourceHashes[path]);
assert.equal(baseline.length,candidate.length);
const rows=[];
for(let i=1;i<baseline.length-1;i++){
 const a=baseline[i],b=candidate[i];
 for(const key of ['step','simulatedSeconds','day','time','living','ledgerEntries','version','valid','reason','stateSha256'])assert.deepEqual(a[key],b[key],`Mismatch ${key} at step ${a.step}`);
 if(b.retainedCoverage){assert.equal(b.retainedCoverage.currentCropCount,b.living);assert.equal(b.retainedCoverage.certifiedCropCount-b.retainedCoverage.removedCropIds.length,b.living);}
 rows.push({step:a.step,living:a.living,nativeStateExactlyEqual:true,reason:a.reason,baselineProofMs:a.proofMs,candidateProofMs:b.proofMs,retainedCoverage:b.retainedCoverage});
}
for(const series of [baseline,candidate]){assert.equal(series.at(-1).status,'completed-short-native-probe');assert.equal(series.at(-1).result,null);}
const report={scope:'Sequential five-second native probe from stopped snapshot, with real worker harvests and no player commands. Timing observations are not AB/BA or whole-campaign acceptance.',snapshotSha256:baseline[0].snapshotSha256,baselineReference:baseline[0].referenceSourceHashes,rows,baselineTotalWallMs:baseline.at(-1).totalWallMs,candidateTotalWallMs:candidate.at(-1).totalWallMs,allNativeStatesExactlyEqual:true,campaignMayRestart:false,limitation:'Removing a certificate anchor still requires full recertification; new targets and geometry changes also invalidate the certificate.'};
writeFileSync(output,JSON.stringify(report,null,2)+'\n',{flag:'wx'});console.log(JSON.stringify(report,null,2));
