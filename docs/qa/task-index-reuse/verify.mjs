import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
const dir=new URL('./',import.meta.url),manifest=JSON.parse(readFileSync(new URL('manifest.json',dir)));
const hash=raw=>createHash('sha256').update(raw).digest('hex');
for(const piece of manifest.pieces){const raw=gunzipSync(readFileSync(new URL(piece.path,dir)));assert.equal(raw.length,piece.rawBytes);assert.equal(hash(raw),piece.rawSha256);}
const read=file=>JSON.parse(gunzipSync(readFileSync(new URL(file,dir))));
const ab=read('ab.json.gz'),ba=read('ba.json.gz');assert.equal(ab.reverse,false);assert.equal(ba.reverse,true);assert.equal(ab.cases.length,4);assert.equal(ba.cases.length,4);
for(let i=0;i<4;i++){
 const a=ab.cases[i],b=ba.cases[i];assert.deepEqual(a.checkpoints,b.checkpoints);assert.deepEqual(a.events,b.events);assert.equal(a.pathSearches,b.pathSearches);
 for(const row of [a,b]){
  assert.equal(row.checkpoints.length,9);assert.equal(row.samples.length,200);assert.equal(row.cold.reference.length,150);assert.equal(row.cold.candidate.length,150);
  assert.equal(hash(gunzipSync(readFileSync(new URL('../'+row.source+'/state.json.gz',dir)))),row.inputSha256);
  for(const side of ['reference','candidate']){
   const v=row.samples.map(s=>s[side+'Ms']).sort((a,b)=>a-b),t=row.timing[side];assert.ok(v.every(n=>Number.isFinite(n)&&n>=0));
   assert.equal(t.medianMs,(v[99]+v[100])/2);assert.equal(t.totalMs,v.reduce((s,n)=>s+n,0));assert.equal(t.p95Ms,v[189]);assert.equal(t.maxMs,v[199]);
  }
 }
}
const reference=read('counts-reference.json.gz'),candidate=read('counts-candidate.json.gz');
for(const key of ['()=>s.plants','()=>s.crates'])assert.deepEqual(candidate[key],reference[key]);
assert.equal(reference['()=>s.tasks'].queries,5600);assert.equal(candidate['()=>s.tasks'].queries,5600);
assert.equal(reference['()=>s.tasks'].builds,52);assert.equal(candidate['()=>s.tasks'].builds,17);
const a=read('native-reference.json.gz'),b=read('native-candidate.json.gz');assert.equal(a.stateSha256,b.stateSha256);assert.equal(a.pathSearches,142);assert.equal(b.pathSearches,142);
console.log(JSON.stringify({pieces:manifest.pieces.length,checkpoints:72,taskBuilds:[52,17],scope:'Archive integrity/coherence only; no full-suite or release acceptance'}));
