import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

test('retained real WASM/WebGPU clock evidence proves finite native frontiers, direct policy changes and no rewind during preparation stalls',()=>{
 const {result:r}=JSON.parse(readFileSync(new URL('../docs/guardian/performance/native-causal-clock-20261109.json',import.meta.url),'utf8'));
 assert.equal(r.checklistId,'A6-04.f-R1');assert.equal(r.backend,'webgpu');assert.equal(r.drawStats.packets,1);
 assert.equal(r.drawStats.computePackets,0);assert.equal(r.drawStats.failed,false);assert.equal(r.drawStats.gpuErrors,0);
 assert.equal(r.blocks.length,3);assert(r.blocks.every(b=>b.blockedMs>=500&&b.drawFrames>=2));
 assert.equal(r.blocks[0].minClock,10);assert.equal(r.blocks[0].maxClock,10);
 assert(r.blocks[1].maxClock-r.blocks[1].minClock>.4);assert.equal(r.blocks[2].minClock,r.blocks[2].maxClock);
 assert.equal(r.blocks[2].maxClock,r.clock.committedThrough);
 assert(r.revoked.receivedAt>=r.revoked.appliedAt&&r.revoked.receivedAt<r.blocks[2].end);
 assert.equal(r.revoked.receipt.clockSequence,r.clock.clockSequence);assert.equal(r.revoked.receipt.sequence,r.clock.intentSequence);
 assert.equal(r.revoked.receipt.effectiveTime,r.clock.committedThrough);assert.deepEqual(r.countersBefore,r.countersAfter);
 assert(r.readbacks.every(row=>row.gpu.every(Number.isFinite)&&row.cpu.every(Number.isFinite)&&row.maxError<3e-5));
 assert.equal(r.authorizedAutonomy,false);assert.equal(r.authorizedPassage,false);
 let sequence=0,through=-Infinity,previous=-Infinity;
 for(const permit of r.watermarks){assert.equal(permit.clockSequence,++sequence);assert(permit.committedThrough>=through);through=permit.committedThrough;}
 for(const frame of r.safeClockSamples){const permit=r.watermarks.findLast(p=>p.authorizedAt<=frame.at);
  assert(permit);assert(frame.elapsed<=permit.committedThrough+1e-9);assert(frame.elapsed<=frame.safeUntil);
  assert(frame.elapsed>=previous);previous=frame.elapsed;
 }
});
