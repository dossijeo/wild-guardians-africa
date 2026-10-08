import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
async function report(name){
 const receipt=JSON.parse(await readFile(new URL(name+'-receipt.json',import.meta.url),'utf8'));
 const raw=gunzipSync(await readFile(new URL(name+'-closed.json.gz',import.meta.url)));
 assert.equal(createHash('sha256').update(raw).digest('hex'),receipt.sha256);return JSON.parse(raw);
}
const before=await report('textures'),after=await report('crate');
for(const r of [before,after]){assert.equal(r.done,true);assert.equal(r.disposed,true);assert.equal(r.logicalUnchanged,true);assert.deepEqual(r.errors,[]);assert.equal(r.duration,15);assert.equal(r.speed,12);assert.equal(r.gpu.pending,0);assert.equal(r.actorReadiness.awaited,34);}
assert.deepEqual(after.farm,before.farm);assert.deepEqual(after.device,before.device);
assert.deepEqual(after.finalEye,before.finalEye);assert.deepEqual(after.finalTarget,before.finalTarget);
const missing=before.programEvents.filter(p=>p.stage==='travel');assert.equal(missing.length,1);
assert.ok(after.programEvents.some(p=>p.stage==='ready'&&p.cacheKey===missing[0].cacheKey));
assert.equal(after.programEvents.filter(p=>p.stage==='travel').length,0);
assert.equal(after.residentShadowPreparation.source,'Prop_FruitCrate_geometry_7');
const intervals=after.frames.map(f=>f.intervalMs).filter(Number.isFinite).sort((a,b)=>a-b);
assert.equal(intervals.length,after.frameSummary.count);assert.equal(intervals[Math.ceil(intervals.length*.95)-1],after.frameSummary.p95);
assert.equal(intervals.at(-1),after.frameSummary.max);assert.equal(intervals.filter(v=>v>100).length,33);
console.log('PASS: archived identity/state/camera/query cleanup and exact native depth key ready before travel. One diagnostic comparison, not causal ABBA or stable-travel acceptance.');
