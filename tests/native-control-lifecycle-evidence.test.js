import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

test('WASM/WebGPU lifecycle receipt covers a blocked preparer, replacement, device loss and silent control',()=>{
 const {result:r,errors,httpFailures}=JSON.parse(readFileSync(new URL('../docs/guardian/performance/native-control-lifecycle-20261113.json',import.meta.url),'utf8'));
 assert.equal(r.checklistId,'A6-04.f-R3');assert.equal(r.backend,'webgpu');assert.equal(r.adapter.vendor,'nvidia');
 assert.equal(r.authorizedAutonomy,false);assert.equal(r.authorizedPassage,false);assert.deepEqual(errors,[]);
 assert(httpFailures.every(f=>f.url.endsWith('/favicon.ico')));
 assert(r.block.blockedMs>=500);assert(r.block.retiredAt>=r.block.start);assert(r.block.handoffAt>=r.block.retiredAt);
 assert(r.block.handoffAt<r.block.end);assert(r.block.oldFrames>0);assert.equal(r.block.afterRetirementFrames,0);
 assert.equal(r.temporaryConsumer.mutation,'control-failed');assert.equal(r.temporaryConsumer.worldUnchanged,true);
 assert.equal(r.replacement.mutation,'committed');assert.equal(r.replacement.consumers,1);assert.equal(r.deviceLoss.drained,true);
 assert.equal(r.silentChannel.mutation,'control-failed');assert.equal(r.silentChannel.worldUnchanged,true);assert.equal(r.silentChannel.closed,true);
 assert(r.silentChannel.presentedThrough<=r.silentChannel.committedThrough);
});
