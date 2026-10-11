import {readFileSync,writeFileSync} from 'node:fs';
import assert from 'node:assert/strict';
const [beforePath,afterPath,output]=process.argv.slice(2);
if(!beforePath||!afterPath||!output)throw Error('PREVIOUS_CANDIDATE_JSON CACHED_JSON FRESH_OUTPUT required');
const before=JSON.parse(readFileSync(beforePath)),after=JSON.parse(readFileSync(afterPath));
assert.equal(before.mode,'candidate');assert.equal(after.mode,'candidate');
for(const key of ['snapshotSha256','day','time','plants'])assert.deepEqual(after[key],before[key]);
assert.equal(before.stateUnchanged,true);assert.equal(after.stateUnchanged,true);
// Only execution counters for terrain tiles differ. Every physical certificate,
// target/pose diagnostic and worker-route result is still compared exactly.
const physical=proof=>{const {terrainTileDiagnostics,...rest}=proof;return rest;};
assert.deepEqual(physical(after.runs[0].proof),physical(before.runs[0].proof));
assert.deepEqual(physical(after.runs[1].proof),physical(after.runs[0].proof));
const report={scope:'Exact physical certificate comparison on stopped snapshot, ignoring only terrain execution counters; not whole-campaign acceptance',snapshotSha256:after.snapshotSha256,coldPhysicalCertificateExactlyEqual:true,warmPhysicalCertificateExactlyEqual:true,beforeWarmMs:before.runs[1].milliseconds,afterWarmMs:after.runs[1].milliseconds,firstCallMs:after.runs[0].milliseconds,probeSourceHashes:after.probeSourceHashes};
writeFileSync(output,JSON.stringify(report,null,2)+'\n',{flag:'wx'});console.log(JSON.stringify(report,null,2));
