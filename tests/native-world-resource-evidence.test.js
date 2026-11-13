import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

test('real native/WebGPU resource evidence distinguishes late old packets from explicitly rebuilt generations',()=>{
 const {result:r,errors}=JSON.parse(readFileSync(new URL('../docs/guardian/performance/native-world-resources-20261113.json',import.meta.url),'utf8'));
 assert.equal(r.checklistId,'A6-04.f-R4');assert.equal(r.backend,'webgpu');assert.deepEqual(errors,[]);
 assert.equal(r.authorizedAutonomy,false);assert.equal(r.authorizedPassage,false);
 assert(r.block.blockedMs>=500);assert(r.mutation.committedAt<r.block.end);assert.equal(r.mutation.result.status,'committed');
 assert.equal(r.block.drawFramesAfterRelease,0);assert.equal(r.drawStats.gpuErrors,0);assert.equal(r.drawStats.failed,false);
 const i=r.resourceIdentity;assert.equal(i.latePacket,'obsolete');assert.equal(i.freshPacket,'presented');
 assert.equal(i.activeSequence,3);assert.equal(i.packets,2);assert.equal(i.presentedTime,i.worldBoundary.effectiveTime);
 assert.equal(i.worldBoundary.authorityEpoch,r.mutation.result.receipt.authorityEpoch);
 assert.equal(i.worldBoundary.nativeSession,1);assert(i.worldBoundary.ticket>0);
 assert.match(i.scope,/no characters or visible mutation projection/);
});
