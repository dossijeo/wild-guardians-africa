import test from 'node:test';
import assert from 'node:assert/strict';
import {coveredDuration,analyzeTravelSpans} from '../tools/experiments/travel-span-analysis.mjs';

test('nested and boundary-crossing renderer spans are counted once',()=>{
 const spans=[{at:5,cpuMs:80},{at:10,cpuMs:20},{at:75,cpuMs:50},{at:140,cpuMs:10}];
 assert.equal(coveredDuration(spans,0,100),95);
 assert.equal(coveredDuration(spans,100,150),35);
 assert.equal(coveredDuration(spans,150,200),0);
 assert.equal(coveredDuration([{at:-40,cpuMs:20}],-30,0),10);
});
test('a long RAF gap retains category overlap without declaring a GPU cause',()=>{
 const report={done:true,frames:[{at:120,intervalMs:120}],segments:[{name:'render',at:5,cpuMs:110},{name:'GL',at:10,cpuMs:80}]};
 const result=analyzeTravelSpans(report);
 assert.equal(result.gaps[0].traceCoveredMs,110);
 assert.deepEqual(result.gaps[0].categories,[{name:'render',coveredMs:110},{name:'GL',coveredMs:80}]);
 assert.match(result.scope,/not a GPU measurement/);
 assert.throws(()=>analyzeTravelSpans({...report,failed:true}),/Completed/);
});
