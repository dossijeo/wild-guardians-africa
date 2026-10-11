import {readFileSync,writeFileSync} from 'node:fs';
import assert from 'node:assert/strict';
const [baselinePath,tiledPath,output]=process.argv.slice(2);
if(!baselinePath||!tiledPath||!output)throw Error('BASELINE_JSON TILED_JSON FRESH_OUTPUT required');
const baseline=JSON.parse(readFileSync(baselinePath)),tiled=JSON.parse(readFileSync(tiledPath));
assert.equal(baseline.mode,'baseline');assert.equal(tiled.mode,'baseline-tiled');
for(const key of ['snapshotSha256','day','time','plants','sourceDifferences'])assert.deepEqual(tiled[key],baseline[key]);
assert.equal(baseline.stateUnchanged,true);assert.equal(tiled.stateUnchanged,true);
const comparisons=baseline.runs.map((a,index)=>{
 const b=tiled.runs[index];assert.equal(b.temperature,a.temperature);
 assert.deepEqual(b.proof,a.proof,'Terrain tile reuse must preserve every proof field exactly');
 return {temperature:a.temperature,baselineMs:a.milliseconds,tiledMs:b.milliseconds,reductionPercent:100*(1-b.milliseconds/a.milliseconds),proofExactlyEqual:true,valid:a.proof.valid,reason:a.proof.reason};
});
const report={scope:'Sequential isolated cold/warm observations, not ABBA statistical acceptance or full campaign performance',snapshotSha256:baseline.snapshotSha256,comparisons};
writeFileSync(output,JSON.stringify(report,null,2)+'\n',{flag:'wx'});console.log(JSON.stringify(report,null,2));
