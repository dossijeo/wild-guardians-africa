import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
const read=p=>readFileSync(new URL(p,import.meta.url)),hash=b=>createHash('sha256').update(b).digest('hex');
const receipt=JSON.parse(read('receipt.json')),pieces=new Map();
assert.equal(receipt.exitCode,0);assert.equal(receipt.productionChanged,false);
for(const piece of receipt.pieces){const b=gunzipSync(read(piece.path));assert.equal(b.length,piece.bytes);assert.equal(hash(b),piece.sha256);pieces.set(piece.source,b);}
const report=JSON.parse(pieces.get('.cache/fluid-cost-report.json'));
for(const [source,sha]of Object.entries(report.sources))assert.equal(hash(pieces.get(source)),sha);
const median=values=>{const a=values.slice().sort((x,y)=>x-y),n=a.length;return n%2?a[n>>1]:(a[n/2-1]+a[n/2])/2;};
assert.deepEqual(report.arms.map(a=>a.current),[false,true,true,false]);
for(const a of report.arms){assert.equal(a.states.length,100);assert.deepEqual(a.states,report.arms[0].states);assert.deepEqual(a.refinement,report.arms[0].refinement);assert.deepEqual(a.movement,report.arms[0].movement);assert.equal(a.times.length,75);assert(a.times.every(x=>Number.isFinite(x)&&x>=0));assert.equal(a.median,median(a.times));}
assert.equal(report.base,median(report.arms.filter(a=>!a.current).flatMap(a=>a.times)));
assert.equal(report.current,median(report.arms.filter(a=>a.current).flatMap(a=>a.times)));
assert.equal(report.delta,report.current-report.base);assert.equal(report.percent,(report.current/report.base-1)*100);
assert.equal(report.referenceDrift,Math.abs(report.arms[0].median-report.arms[3].median));
console.log(JSON.stringify({archive:'PASS',statesPerArm:100,base:report.base,current:report.current,delta:report.delta,percent:report.percent}));
