import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
const sha=b=>createHash('sha256').update(b).digest('hex');
const receipt=JSON.parse(await readFile(new URL('receipt.json',import.meta.url),'utf8'));
assert.deepEqual(receipt.order,['A1','B1','B2','A2']);
assert.equal(receipt.runs.length,4);
const q=(values,p)=>values.slice().sort((a,b)=>a-b)[Math.ceil(values.length*p)-1];
let control;
for(const entry of receipt.runs){
 const raw=gunzipSync(await readFile(new URL(entry.name+'.json.gz',import.meta.url)));
 assert.equal(sha(raw),entry.sha256);
 assert.equal(sha(await readFile(new URL(entry.name+'.jpg',import.meta.url))),entry.imageSha256);
 const r=JSON.parse(raw),candidate=entry.name.startsWith('B');control??=r;
 assert.equal(r.done,true);assert.equal(r.disposed,true);assert.equal(r.logicalUnchanged,true);assert.deepEqual(r.errors,[]);
 assert.equal(r.duration,15);assert.equal(r.speed,12);assert.equal(r.distance,180);
 assert.equal(r.actorReadiness.awaited,34);assert.equal(r.residentPreparation.mode,'programs');
 assert.equal(r.residentTexturePreparation.textures,27);assert.equal(r.residentTexturePreparation.fenced,true);
 assert.equal(r.resourceStages.length,0);assert.equal(r.segments.length,0);assert.equal(r.programEvents.length,0);
 assert.deepEqual(r.farm,control.farm);assert.deepEqual(r.device,control.device);assert.equal(r.seed,control.seed);
 for(const field of ['initialEye','initialTarget','finalEye','finalTarget'])assert.deepEqual(r[field],control[field]);
 assert.equal(r.frames[0].chunks,25);assert.equal(r.frames[0].geometries,234);assert.equal(r.frames[0].textures,101);
 assert.equal(r.frames[0].programs,candidate?82:81);
 assert.equal(r.finalStream.created-r.initialStream.created,15);
 assert.ok(r.frames.every(f=>!f.hidden));
 if(candidate)assert.equal(r.residentShadowPreparation.source,'Prop_FruitCrate_geometry_7');else assert.equal(r.residentShadowPreparation,null);
 assert.equal(r.gpu.supported,true);assert.equal(r.gpu.disjointEvents,0);assert.equal(r.gpu.pending,0);
 assert.equal(r.gpu.samples.length,r.frames.length);assert.equal(new Set(r.gpu.samples.map(s=>s.frame)).size,r.frames.length);
 const intervals=r.frames.map(f=>f.intervalMs).filter(Number.isFinite);
 assert.equal(intervals.length,r.frameSummary.count);assert.equal(q(intervals,.95),r.frameSummary.p95);
 assert.equal(Math.max(...intervals),r.frameSummary.max);assert.equal(intervals.filter(v=>v>100).length,r.frameSummary.over100);
 const cpu=r.frames.map(f=>f.cpuMs);assert.equal(q(cpu,.95),r.cpuSummary.p95);assert.equal(Math.max(...cpu),r.cpuSummary.max);
 console.log(JSON.stringify({arm:entry.name,intervalP95:r.frameSummary.p95,intervalMax:r.frameSummary.max,over100:r.frameSummary.over100,
 cpuMax:r.cpuSummary.max,gpuP95:q(r.gpu.samples.map(s=>s.ms),.95),gpuMax:Math.max(...r.gpu.samples.map(s=>s.ms))}));
}
console.log('PASS: complete AB/BA provenance, equal reported fixture/camera/actor/initial resources, native GPU queries and cleanup. Not stable-travel or production acceptance.');
