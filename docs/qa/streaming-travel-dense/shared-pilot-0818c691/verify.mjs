import {readFileSync} from 'node:fs';import {gunzipSync} from 'node:zlib';import {createHash} from 'node:crypto';import assert from 'node:assert/strict';
const read=n=>readFileSync(new URL(n,import.meta.url)),hash=b=>createHash('sha256').update(b).digest('hex');
const receipt=JSON.parse(read('receipt.json')),raw=gunzipSync(read('report.json.gz')),r=JSON.parse(raw);
assert.equal(hash(raw),receipt.rawSha256);assert.equal(hash(read('fixture.html')),receipt.fixtureSha256);
assert.equal(r.sharedPreparation,true);assert.equal(r.preparationInterval,0);assert.equal(r.done,true);assert.equal(r.disposed,true);assert.equal(r.contextLost,true);assert.equal(r.logicalUnchanged,true);assert.deepEqual(r.errors,[]);
assert.equal(r.gpu.pending,0);assert.equal(r.frames.length,r.gpu.samples.length);
const roots={};for(const s of r.segments.filter(s=>s.name==='compileAsync'))roots[s.preparationRoot.kind]=(roots[s.preparationRoot.kind]??0)+1;
assert.deepEqual(roots,receipt.roots);assert.deepEqual(roots,{'native-merged':72,standby:109,other:12});assert.equal(receipt.accepted,false);
console.log('PASS: shared pilot preserved, hashes, query resolution and disposal');
