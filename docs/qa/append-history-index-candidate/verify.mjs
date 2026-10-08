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
console.log('PASS: 519 helper queries and 36 native checkpoints archived; no production/performance acceptance');
