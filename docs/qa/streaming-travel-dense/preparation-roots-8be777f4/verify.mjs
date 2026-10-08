import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
const read=name=>readFileSync(new URL(name,import.meta.url));
const hash=b=>createHash('sha256').update(b).digest('hex');
const receipt=JSON.parse(read('receipt.json')),raw=gunzipSync(read('report.json.gz')),report=JSON.parse(raw);
assert.equal(hash(raw),receipt.rawSha256);assert.equal(hash(read('fixture.html')),receipt.fixtureSha256);
assert.equal(report.done,true);assert.equal(report.disposed,true);assert.equal(report.contextLost,true);
assert.equal(report.logicalUnchanged,true);assert.deepEqual(report.errors,[]);
assert.equal(report.gpu.pending,0);assert.equal(report.gpu.samples.length,report.frames.length);
const roots={};for(const row of report.segments.filter(r=>r.name==='compileAsync')){const k=row.preparationRoot.kind;roots[k]=(roots[k]??0)+1;}
assert.deepEqual(roots,receipt.roots);assert.deepEqual(roots,{standby:108,'native-merged':101,other:12});
assert.deepEqual(report.frameSummary,receipt.frame);assert.deepEqual(report.cpuSummary,receipt.cpu);
console.log('PASS: immutable source/report, root attribution, query resolution and disposal');
