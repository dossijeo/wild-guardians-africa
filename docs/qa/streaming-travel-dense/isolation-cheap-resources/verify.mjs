import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {gunzipSync} from 'node:zlib';
const root=new URL('./',import.meta.url),hash=bytes=>createHash('sha256').update(bytes).digest('hex');
const receipt=JSON.parse(await readFile(new URL('receipt.json',root),'utf8')),runs=[];
for(const entry of receipt.runs){
 const raw=gunzipSync(await readFile(new URL(`${entry.name}.json.gz`,root))),report=JSON.parse(raw);
 assert.equal(hash(raw),entry.sha256);assert.equal(hash(await readFile(new URL(`${entry.name}.png`,root))),entry.imageSha256);
 assert.equal(report.done,true);assert.equal(report.disposed,true);assert.deepEqual(report.errors,[]);
 assert.equal(report.logicalUnchanged,true);assert.equal(report.isolatedPreparation,entry.name==='B');
 assert.equal(report.duration,15);assert.equal(report.speed,12);assert.equal(report.distance,180);
 assert.equal(report.residentPreparation.mode,'programs');assert.equal(report.actorReadiness.awaited,34);
 assert.equal(report.residentTexturePreparation.textures,27);assert.equal(report.residentTexturePreparation.fenced,true);
 assert.equal(report.residentShadowPreparation.source,'Prop_FruitCrate_geometry_7');
 for(const stage of report.resourceStages){
  const b=stage.buffers;assert.equal(b.unattributed,0);assert.equal(b.liveBytes,b.requestedBytes-b.replacedBytes-b.deletedBytes);assert.ok(b.peakBytes>=b.liveBytes);
 }
 const shutdown=report.resourceStages.at(-1);assert.equal(shutdown.name,'after-world-dispose');assert.equal(shutdown.buffers.liveBytes,0);assert.equal(shutdown.buffers.liveBuffers,0);
 runs.push(report);
}
const [a,b]=runs;
for(const key of ['farm','device','initialEye','initialTarget','finalEye','finalTarget','initialStream'])assert.deepEqual(a[key],b[key],key);
for(const name of ['after-resident-preparation','after-resident-textures','after-crate-shadow','after-travel']){
 const x=a.resourceStages.find(s=>s.name===name),y=b.resourceStages.find(s=>s.name===name);assert.ok(x&&y);
 for(const field of ['liveBytes','liveBuffers','peakBytes'])assert.equal(x.buffers[field],y.buffers[field],`${name}:${field}`);
 assert.deepEqual(x.renderer,y.renderer);
}
assert.equal(a.resourceStages.find(s=>s.name==='after-crate-shadow').buffers.liveBytes,80_424_806);
assert.equal(a.resourceStages.find(s=>s.name==='after-travel').buffers.peakBytes,89_372_116);
assert.equal(a.resourceStages.find(s=>s.name==='after-travel').buffers.liveBytes,68_823_874);
console.log('PASS: paired resource identity/accounting/cleanup; equal observed buffer peaks. Not physical memory or frametime acceptance.');
