import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
const receipt=JSON.parse(await readFile(new URL('receipt.json',import.meta.url),'utf8'));
const raw=gunzipSync(await readFile(new URL('dense-closed.json.gz',import.meta.url)));
assert.equal(createHash('sha256').update(raw).digest('hex'),receipt.sha256);
const report=JSON.parse(raw),stages=new Map(report.resourceStages.map(stage=>[stage.name,stage]));
assert.equal(report.done,true);assert.equal(report.disposed,true);assert.equal(report.logicalUnchanged,true);
assert.deepEqual(report.errors,[]);assert.equal(report.speed,0);assert.equal(report.duration,5);
assert.equal(report.farm.livingPlants,1257);assert.equal(report.farm.workers,34);
for(const stage of stages.values()){
 const b=stage.buffers;assert.equal(b.unattributed,0);
 assert.equal(b.liveBytes,b.requestedBytes-b.replacedBytes-b.deletedBytes);
 assert.ok(b.peakBytes>=b.liveBytes);
}
const before=stages.get('before-resident-preparation').buffers,after=stages.get('after-resident-preparation').buffers;
assert.equal(after.liveBytes-before.liveBytes,receipt.bufferDelta);
assert.equal(receipt.bufferDelta,209374896);
assert.equal(stages.get('after-world-dispose').buffers.liveBytes,0);
assert.equal(stages.get('after-world-dispose').buffers.liveBuffers,0);
console.log('PASS: archived resource stages, hash, requested storage arithmetic and reported tracked-buffer cleanup. Not physical memory or performance acceptance.');
