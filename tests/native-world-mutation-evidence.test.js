import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

test('real WASM/WebGPU audit covers conditioned overlays, residency, props and terrain during preparation stalls',()=>{
 const {result:r}=JSON.parse(readFileSync(new URL('../docs/guardian/performance/native-world-mutations-20261109.json',import.meta.url),'utf8'));
 assert.equal(r.checklistId,'A6-04.f-R2');assert.equal(r.backend,'webgpu');assert.equal(r.authorizedAutonomy,false);assert.equal(r.authorizedPassage,false);
 assert.deepEqual(r.cases.map(c=>c.kind),['polygon','residency-add','residency-remove','prop-remove','prop-restore','terrain']);
 for(const c of r.cases){
  assert(c.block.blockedMs>=500);assert(c.block.drawFramesBeforeQuiescence>=2);assert.equal(c.block.drawFramesAfterRelease,0);
  assert(c.mutation.stagedAt<=c.drawStats.quiescedAt);assert(c.drawStats.quiescedAt<=c.mutation.committedAt);
  assert(c.mutation.committedAt<=c.drawStats.releasedAt);assert(c.drawStats.releasedAt<c.block.end);
  assert.equal(c.mutation.result.status,'committed');assert.equal(c.drawStats.mutationEpoch,1);assert.equal(c.drawStats.floor,10.25);
  assert.equal(c.drawStats.packets,1);assert.equal(c.drawStats.failed,false);assert.equal(c.drawStats.gpuErrors,0);
  assert(c.mutation.worldChanged||c.mutation.residencyChanged);
 }
 assert(r.cases[0].mutation.changes.some(event=>event.type==='RouteInvalidated'));
});
