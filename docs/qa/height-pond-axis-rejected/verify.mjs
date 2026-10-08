import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
const dir=new URL('./',import.meta.url),m=JSON.parse(readFileSync(new URL('manifest.json',dir)));
const hash=b=>createHash('sha256').update(b).digest('hex');
for(const p of m.pieces){const b=gunzipSync(readFileSync(new URL(p.path,dir)));assert.equal(b.length,p.rawBytes);assert.equal(hash(b),p.rawSha256);}
const read=p=>JSON.parse(gunzipSync(readFileSync(new URL(p,dir))));
const ab=read('ab.json.gz'),ba=read('ba.json.gz'),parity=read('parity.json.gz');
assert.equal(ab.reverse,false);assert.equal(ba.reverse,true);assert.equal(ab.cases.length,4);assert.equal(ba.cases.length,4);
assert.equal(parity.compared,46440);assert.equal(parity.boundaryQueries,3240);assert.equal(parity.rows.length,18);
assert.deepEqual(parity.overriddenMetricCalls,{reference:27,candidate:27});
let slower=0;
for(let i=0;i<4;i++){
 assert.equal(ab.cases[i].source,ba.cases[i].source);assert.deepEqual(ab.cases[i].checkpoints,ba.cases[i].checkpoints);
 assert.deepEqual(ab.cases[i].events,ba.cases[i].events);assert.equal(ab.cases[i].pathSearches,ba.cases[i].pathSearches);
 for(const r of [ab.cases[i],ba.cases[i]]){
  assert.equal(r.checkpoints.length,9);assert.equal(r.samples.length,200);assert.equal(r.cold.reference.length,150);assert.equal(r.cold.candidate.length,150);
  assert.equal(hash(gunzipSync(readFileSync(new URL('../'+r.source+'/state.json.gz',dir)))),r.inputSha256);
  for(const side of ['reference','candidate']){
   const a=r.samples.map(s=>s[side+'Ms']).sort((a,b)=>a-b),t=r.timing[side];
   assert.ok(a.every(n=>Number.isFinite(n)&&n>=0));assert.equal(t.medianMs,(a[99]+a[100])/2);
   assert.equal(t.p95Ms,a[189]);assert.equal(t.maxMs,a[199]);assert.equal(t.totalMs,a.reduce((x,y)=>x+y,0));
  }
  if(r.biome!=='manglares'&&r.timing.candidate.totalMs>r.timing.reference.totalMs)slower++;
 }
}
assert.equal(slower,6);
console.log(JSON.stringify({pieces:m.pieces.length,sourceFiles:Object.keys(m.sourceHashes).length,checkpoints:72,scalarComparisons:parity.compared,pondActivePairsSlower:slower,decision:'REJECTED; archive verification only, no production/GPU acceptance.'}));
