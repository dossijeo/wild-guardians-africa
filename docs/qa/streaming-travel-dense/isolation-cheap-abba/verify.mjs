import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
const sha=b=>createHash('sha256').update(b).digest('hex');
const receipt=JSON.parse(await readFile(new URL('receipt.json',import.meta.url),'utf8'));
assert.deepEqual(receipt.order,['A1','B1','B2','A2']);assert.equal(receipt.runs.length,4);
const q=(a,p)=>a.slice().sort((x,y)=>x-y)[Math.ceil(a.length*p)-1];
const reports=[];let control;
for(const entry of receipt.runs){
 const raw=gunzipSync(await readFile(new URL(entry.name+'.json.gz',import.meta.url)));assert.equal(sha(raw),entry.sha256);
 assert.equal(sha(await readFile(new URL(entry.name+'.jpg',import.meta.url))),entry.imageSha256);
 const r=JSON.parse(raw),isolated=entry.name.startsWith('B');control??=r;reports.push(r);
 assert.equal(r.done,true);assert.equal(r.disposed,true);assert.equal(r.logicalUnchanged,true);assert.deepEqual(r.errors,[]);
 assert.equal(r.isolatedPreparation,isolated);assert.equal(r.duration,15);assert.equal(r.speed,12);assert.equal(r.distance,180);
 assert.equal(r.actorReadiness.awaited,34);assert.equal(r.residentPreparation.mode,'programs');
 assert.equal(r.residentTexturePreparation.textures,27);assert.equal(r.residentTexturePreparation.fenced,true);
 assert.equal(r.residentShadowPreparation.source,'Prop_FruitCrate_geometry_7');
 for(const field of ['resourceStages','segments','programEvents'])assert.equal(r[field].length,0);
 assert.deepEqual(r.farm,control.farm);assert.deepEqual(r.device,control.device);assert.equal(r.seed,control.seed);
 for(const field of ['initialEye','initialTarget','finalEye','finalTarget'])assert.deepEqual(r[field],control[field]);
 for(const [field,value] of Object.entries({chunks:25,geometries:234,textures:101,programs:82}))assert.equal(r.frames[0][field],value);
 assert.equal(r.finalStream.created-r.initialStream.created,15);assert.ok(r.frames.every(f=>!f.hidden));
 assert.equal(r.gpu.supported,true);assert.equal(r.gpu.disjointEvents,0);assert.equal(r.gpu.pending,0);
 assert.equal(r.gpu.samples.length,r.frames.length);assert.equal(new Set(r.gpu.samples.map(s=>s.frame)).size,r.frames.length);
 const intervals=r.frames.map(f=>f.intervalMs).filter(Number.isFinite);
 assert.equal(intervals.length,r.frameSummary.count);assert.equal(q(intervals,.95),r.frameSummary.p95);
 assert.equal(Math.max(...intervals),r.frameSummary.max);assert.equal(intervals.filter(v=>v>100).length,r.frameSummary.over100);
 assert.equal(Math.max(...r.frames.map(f=>f.cpuMs)),r.cpuSummary.max);
 console.log(JSON.stringify({arm:entry.name,intervalP95:r.frameSummary.p95,intervalMax:r.frameSummary.max,
  over100:r.frameSummary.over100,cpuMax:r.cpuSummary.max,gpuP95:q(r.gpu.samples.map(s=>s.ms),.95)}));
}
const a=[reports[0],reports[3]],b=[reports[1],reports[2]];
assert.ok(Math.max(...b.map(r=>r.frameSummary.p95))<Math.min(...a.map(r=>r.frameSummary.p95)));
assert.ok(Math.max(...b.map(r=>r.frameSummary.over100))<Math.min(...a.map(r=>r.frameSummary.over100)));
console.log('PASS: complete AB/BA, equal reported readiness/resources/camera, no full-resident draw primer, lower p95/slow counts in both isolated runs. Single-device evidence; memory and visual regression remain open.');
