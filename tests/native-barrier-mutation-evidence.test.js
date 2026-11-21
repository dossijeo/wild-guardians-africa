import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

test('retained WASM/WebGPU evidence shows an uncommitted barrier, GPU drain, native revocation and frozen old packet',()=>{
 const {result:r}=JSON.parse(readFileSync(new URL('../docs/guardian/performance/native-barrier-mutation-20261109.json',import.meta.url),'utf8'));
 assert.equal(r.checklistId,'A6-04.f-R2');assert.equal(r.status,'partial');assert.equal(r.backend,'webgpu');
 assert(r.block.blockedMs>=500&&r.block.drawFramesBeforeQuiescence>=2);assert.equal(r.block.drawFramesAfterRelease,0);
 assert(r.mutation.stagedAt<=r.drawStats.quiescedAt&&r.drawStats.quiescedAt<=r.mutation.committedAt);
 assert(r.mutation.committedAt<=r.drawStats.releasedAt&&r.drawStats.releasedAt<r.block.end);
 assert.equal(r.mutation.afterCount,r.mutation.beforeCount+1);assert(r.mutation.barrierId>0);
 assert(r.mutation.changes.some(e=>e.type==='RouteInvalidated'&&e.effectiveTime===r.mutation.receipt.effectiveTime));
 assert.equal(r.drawStats.mutationEpoch,1);assert.equal(r.drawStats.floor,r.mutation.receipt.effectiveTime);
 assert.equal(r.drawStats.packets,1);assert.equal(r.drawStats.failed,false);assert.equal(r.drawStats.gpuErrors,0);
 assert.equal(r.authorizedAutonomy,false);assert.equal(r.authorizedPassage,false);
});
