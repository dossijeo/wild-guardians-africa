import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
const dir=new URL('./',import.meta.url),m=JSON.parse(readFileSync(new URL('manifest.json',dir))),hash=b=>createHash('sha256').update(b).digest('hex');
for(const p of m.pieces){const raw=gunzipSync(readFileSync(new URL(p.path,dir)));assert.equal(raw.length,p.rawBytes);assert.equal(hash(raw),p.rawSha256);}
const read=p=>JSON.parse(gunzipSync(readFileSync(new URL(p,dir))));
const helper=read('helper-check.json.gz');assert.equal(helper.queries,519);assert.equal(helper.tailPreviousMemberIdReads,0);assert.equal(helper.baselineStaleIndexReproduced,true);assert.equal(helper.candidateSmallCollectionRegrowthSafe,true);
const native=read('native-check.json.gz');assert.equal(native.cases.length,4);
for(const r of native.cases){assert.equal(r.checkpoints.length,9);assert.equal(hash(gunzipSync(readFileSync(new URL('../'+r.source+'/state.json.gz',dir)))),r.inputSha256);assert.equal(r.samples.length,200);assert.equal(r.cold.reference.length,150);assert.equal(r.cold.candidate.length,150);}
assert.equal(m.promoted,false);assert.equal(m.performanceAcceptance,false);
const ab=read('final-ab.json.gz'),ba=read('final-ba.json.gz');
assert.equal(ab.reverse,false);assert.equal(ba.reverse,true);assert.equal(ab.cases.length,4);assert.equal(ba.cases.length,4);
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
const small=read('small-opening.json.gz');assert.deepEqual(small.cases.map(c=>c.profile),['olderMale','olderFemale','youngMale','youngFemale']);
let checkpoints=0;
for(const c of small.cases){
 assert.equal(c.samples.length,8);assert.match(c.finalSha256,/^[a-f0-9]{64}$/);assert.equal(c.paidOpeningMoney,c.profile.startsWith('older')?630:620);
 for(const [i,s] of c.samples.entries()){assert.equal(s.trial,i);assert.equal(s.steps,1200);assert.equal(s.checkpoints,49);checkpoints+=s.checkpoints;}
 for(const side of ['reference','candidate']){const v=c.samples.map(s=>s[side].totalMs).sort((a,b)=>a-b);assert.ok(v.every(n=>Number.isFinite(n)&&n>=0));assert.equal(c.medianMs[side],(v[3]+v[4])/2);}
 assert.equal(c.candidateWins,c.samples.filter(s=>s.candidate.totalMs<s.reference.totalMs).length);
}
assert.equal(checkpoints,1568);
console.log('PASS: archive integrity, 519 helper queries, 72 final native and 1568 small-opening checkpoint pairs; full integrated suite pending');
