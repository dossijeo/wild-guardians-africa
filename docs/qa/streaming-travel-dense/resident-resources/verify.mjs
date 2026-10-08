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

const programsReceipt=JSON.parse(await readFile(new URL('programs-receipt.json',import.meta.url),'utf8'));
const programsRaw=gunzipSync(await readFile(new URL('programs-closed.json.gz',import.meta.url)));
assert.equal(createHash('sha256').update(programsRaw).digest('hex'),programsReceipt.sha256);
const programs=JSON.parse(programsRaw),ps=new Map(programs.resourceStages.map(stage=>[stage.name,stage]));
assert.equal(programs.done,true);assert.equal(programs.disposed,true);assert.equal(programs.logicalUnchanged,true);
assert.deepEqual(programs.errors,[]);assert.equal(programs.residentPreparation.mode,'programs');
assert.deepEqual(programs.farm,report.farm);assert.deepEqual(programs.device,report.device);
assert.equal(programs.speed,0);assert.equal(programs.duration,5);
for(const stage of ps.values()){
 const b=stage.buffers;assert.equal(b.unattributed,0);
 assert.equal(b.liveBytes,b.requestedBytes-b.replacedBytes-b.deletedBytes);
 assert.ok(b.peakBytes>=b.liveBytes);
}
assert.equal(ps.get('before-resident-preparation').buffers.liveBytes,before.liveBytes);
assert.equal(ps.get('after-resident-preparation').buffers.liveBytes-before.liveBytes,programsReceipt.bufferDelta);
assert.equal(programsReceipt.bufferDelta,544994);
assert.equal(ps.get('after-world-dispose').buffers.liveBytes,0);
assert.equal(ps.get('after-world-dispose').buffers.liveBuffers,0);
assert.equal(ps.get('after-resident-preparation').renderer.textures,99);
console.log('PASS: program-only archived interval, identical reported farm/device and tracked-buffer cleanup. No paired performance or physical-memory proof.');

const textureReceipt=JSON.parse(await readFile(new URL('textures-receipt.json',import.meta.url),'utf8'));
const textureRaw=gunzipSync(await readFile(new URL('textures-closed.json.gz',import.meta.url)));
assert.equal(createHash('sha256').update(textureRaw).digest('hex'),textureReceipt.sha256);
const textureReport=JSON.parse(textureRaw),ts=new Map(textureReport.resourceStages.map(stage=>[stage.name,stage]));
assert.equal(textureReport.done,true);assert.equal(textureReport.disposed,true);assert.equal(textureReport.logicalUnchanged,true);
assert.deepEqual(textureReport.errors,[]);assert.equal(textureReport.speed,0);assert.equal(textureReport.duration,5);
assert.deepEqual(textureReport.farm,report.farm);assert.deepEqual(textureReport.device,report.device);
assert.equal(textureReport.residentTexturePreparation.fenced,true);assert.equal(textureReport.residentTexturePreparation.textures,27);
for(const stage of ts.values()){
 const b=stage.buffers;assert.equal(b.unattributed,0);assert.equal(b.liveBytes,b.requestedBytes-b.replacedBytes-b.deletedBytes);
}
assert.equal(ts.get('after-resident-textures').buffers.liveBytes-ts.get('after-resident-preparation').buffers.liveBytes,textureReceipt.bufferDelta);
assert.equal(textureReceipt.bufferDelta,0);
assert.equal(ts.get('after-resident-textures').renderer.textures-ts.get('after-resident-preparation').renderer.textures,textureReceipt.textureCountDelta);
assert.equal(textureReceipt.textureCountDelta,2);
assert.equal(ts.get('after-world-dispose').buffers.liveBytes,0);assert.equal(ts.get('after-world-dispose').buffers.liveBuffers,0);
console.log('PASS: resident texture interval, 27 initializations/fence, no additional tracked buffer bytes, two more texture allocations. Not physical memory or performance acceptance.');
