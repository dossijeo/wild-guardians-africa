import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,existsSync} from 'node:fs';
const [a,b,c,d,output]=process.argv.slice(2);assert(a&&b&&c&&d&&output&&!existsSync(output));
const reports=[a,b,c,d].map(p=>JSON.parse(readFileSync(p))),first=reports[0];
assert.deepEqual(reports.map(r=>r.variant),['native','tiled','tiled','native']);
for(const r of reports){
 assert.equal(r.inputSha256,first.inputSha256);assert.equal(r.contourSha256,first.contourSha256);assert.deepEqual(r.sourceHashes,first.sourceHashes);
 assert.equal(r.stateUnchanged,true);assert.equal(r.proof.valid,true);assert.deepEqual(r.proof,first.proof);assert.equal(r.proofSha256,first.proofSha256);
 assert.equal(r.living,first.living);assert.equal(r.workers,first.workers);
 if(r.tileStats)assert(r.tileStats.typedArrayBytes<=r.tileStats.maximumTypedArrayBytes);
}
const costs=reports.map(r=>r.milliseconds),nativeMean=(costs[0]+costs[3])/2,tiledMean=(costs[1]+costs[2])/2;
const result={status:'verified-complete-perimeter-proof-equivalence',inputs:[a,b,c,d],sameRecordedSources:true,inputSha256:first.inputSha256,contourSha256:first.contourSha256,
 proofSha256:first.proofSha256,living:first.living,workers:first.workers,milliseconds:costs,nativeMean,tiledMean,observedReduction:1-tiledMean/nativeMean,
 tileStats:reports.filter(r=>r.tileStats).map(r=>r.tileStats),
 scope:'Fresh-process AB/BA complete retained 123-crop Canyon perimeter proof. Exact certificate and service-result equivalence; proof output does not encode every route vertex. Concurrent local CPU observations, not controlled hardware, GPU, total RAM, game frame time or economic acceptance.'};
writeFileSync(output,JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result));
