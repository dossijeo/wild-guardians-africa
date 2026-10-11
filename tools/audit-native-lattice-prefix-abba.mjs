import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,existsSync} from 'node:fs';
const [a,b,c,d,output]=process.argv.slice(2);assert(a&&b&&c&&d&&output&&!existsSync(output));
const reports=[a,b,c,d].map(p=>JSON.parse(readFileSync(p))),reference=reports[0];
assert.deepEqual(reports.map(r=>r.variant),['native','tiled','tiled','native']);
for(const report of reports){
 assert.equal(report.inputSha256,reference.inputSha256);assert.deepEqual(report.sourceHashes,reference.sourceHashes);
 assert.equal(report.requestedPrefix,reference.requestedPrefix);assert.equal(report.visitedPrefix,reference.visitedPrefix);
 assert.equal(report.pathCalls,reference.pathCalls);assert.equal(report.stateUnchanged,true);
 const geometry=r=>r.rows.map(({wateringMilliseconds,returnMilliseconds,...row})=>row);
 assert.deepEqual(geometry(report),geometry(reference),'Route/service hashes or coverage differ');
}
const costs=reports.map(r=>r.wateringMilliseconds+r.returnMilliseconds),nativeMean=(costs[0]+costs[3])/2,tiledMean=(costs[1]+costs[2])/2;
const result={status:'verified-prefix-route-equivalence',inputs:[a,b,c,d],inputSha256:reference.inputSha256,
 sameRecordedSources:true,identicalRouteHashes:true,visitedPrefix:reference.visitedPrefix,pathCalls:reference.pathCalls,
 milliseconds:costs,nativeMeanMilliseconds:nativeMean,tiledMeanMilliseconds:tiledMean,observedReduction:1-tiledMean/nativeMean,
 typedArrayBytes:reports.filter(r=>r.tileCache).map(r=>r.tileCache.typedArrayBytes),
 scope:'AB/BA order with fresh processes over the same retained 64-crop prefix and exact route/service hashes. Concurrent instrumented CPU observation, not controlled hardware, full-farm performance, GPU/frame time, total memory or economic campaign acceptance.'};
writeFileSync(output,JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result));
