import assert from 'node:assert/strict';
import{readFileSync}from'node:fs';
import{gunzipSync}from'node:zlib';
import{createHash}from'node:crypto';
const dir=new URL('./',import.meta.url),receipt=JSON.parse(readFileSync(new URL('receipt.json',dir)));
const hash=b=>createHash('sha256').update(b).digest('hex');
for(const piece of receipt.pieces){const raw=gunzipSync(readFileSync(new URL(piece.path,dir)));assert.equal(raw.length,piece.rawBytes);assert.equal(hash(raw),piece.sha256);}
const read=name=>JSON.parse(gunzipSync(readFileSync(new URL(name+'.json.gz',dir))));
const before=read('before'),after=read('attribution'),probe=read('return-probe');
assert.equal(before.ticks,100);assert.equal(after.ticks,100);
assert.equal(before.trajectorySha256,after.trajectorySha256);
assert.deepEqual(before.final,after.final);
assert.deepEqual(before.watering,after.watering);
for(const key of ['queries','searches','failedMemoHits','failures','maxFailureKeys'])assert.equal(before.navigation[key],after.navigation[key]);
assert.deepEqual(after.navigation.failureDestinations,{home:{queries:3100,memoHits:3073}});
assert.equal(after.navigation.failureSamples.length,27);
assert.equal(after.watering.pathRejected,0);assert.equal(after.watering.reachable,122);
assert.equal(after.final.blocked,0);assert.equal(after.final.hired,112);
assert.equal(probe.homeWalkable,true);assert.equal(probe.rows.length,27);
assert(probe.rows.every(r=>!r.terrainValid&&!r.walkable&&r.obstacleOverlaps.length===0&&r.propOverlaps.length===0));
assert.deepEqual(receipt.exitCodes,[0,0]);assert.equal(receipt.productionChanged,false);
const terrain=read('terrain-classification'),escape=read('slope-exit-feasibility');
assert.equal(terrain.rows.length,27);assert.equal(escape.rows.length,27);
assert(terrain.rows.every(r=>r.rejection==='slope'&&r.samples.every(s=>!s.fluid)&&r.nearestValid));
for(const row of escape.rows){
 assert(row.candidate);assert(row.initialSlope>.5);assert(row.candidate.d<=.10000001);
 assert(row.candidate.tail.length>0);let prior=row.initialSlope;
 for(const sample of row.candidate.samples){assert(Math.max(0,sample.maxSlope-.5)<=Math.max(0,prior-.5)+1e-10);prior=sample.maxSlope;}
 assert(prior<=.5);
}
assert.deepEqual(escape.rows.map(r=>r.id),terrain.rows.map(r=>r.id));
assert.deepEqual(receipt.terrainFollowup.exitCodes,[0,0]);assert.equal(receipt.terrainFollowup.ticks,0);
console.log('PASS: two native large-farm observer replays match; failures attributed to home requests, not watering');
console.log('PASS: 27 dry slope rejections have sampled monotonic 0.1 m exits and ordinary native return paths; feasibility only');
