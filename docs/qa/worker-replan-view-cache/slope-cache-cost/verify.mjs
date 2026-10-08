import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
const read=path=>readFileSync(new URL(path,import.meta.url));
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
const receipt=JSON.parse(read('receipt.json')),pieces=new Map();
assert.equal(receipt.exitCode,0);assert.equal(receipt.productionChanged,false);
for(const piece of receipt.pieces){const bytes=gunzipSync(read(piece.path));assert.equal(bytes.length,piece.bytes);assert.equal(hash(bytes),piece.sha256);pieces.set(piece.source,bytes);}
const report=JSON.parse(pieces.get('.cache/slope-cache-report.json'));
for(const [source,sha] of Object.entries(report.sources))assert.equal(hash(pieces.get(source)),sha);
const median=values=>{const a=values.slice().sort((x,y)=>x-y),n=a.length;return n%2?a[n>>1]:(a[n/2-1]+a[n/2])/2;};
assert.deepEqual(report.arms.map(a=>a.candidate),[false,true,true,false]);
for(const arm of report.arms){
 assert.equal(arm.states.length,100);assert.deepEqual(arm.states,report.arms[0].states);
 assert.deepEqual(arm.refinement,report.arms[0].refinement);assert.deepEqual(arm.movement,report.arms[0].movement);
 assert.equal(arm.times.length,75);assert(arm.times.every(x=>Number.isFinite(x)&&x>=0));assert.equal(arm.median,median(arm.times));
 if(arm.candidate){assert.equal(arm.cache.size,8192);assert.equal(arm.cache.capacity,8192);assert.equal(arm.cache.requests,arm.cache.hits+arm.cache.misses);assert.equal(arm.cache.evictions,arm.cache.misses-arm.cache.size);}
}
assert.equal(report.base,median(report.arms.filter(a=>!a.candidate).flatMap(a=>a.times)));
assert.equal(report.candidate,median(report.arms.filter(a=>a.candidate).flatMap(a=>a.times)));
assert.equal(report.delta,report.candidate-report.base);assert.equal(report.percent,(report.candidate/report.base-1)*100);
assert.equal(report.referenceDrift,Math.abs(report.arms[0].median-report.arms[3].median));
console.log(JSON.stringify({archive:'PASS',statesPerArm:100,base:report.base,candidate:report.candidate,delta:report.delta,referenceDrift:report.referenceDrift,productionChanged:false}));
