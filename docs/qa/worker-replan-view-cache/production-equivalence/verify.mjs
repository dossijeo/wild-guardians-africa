import assert from 'node:assert/strict';
import {readFileSync as read} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
const get=p=>read(new URL(p,import.meta.url)),hash=b=>createHash('sha256').update(b).digest('hex');
const receipt=JSON.parse(get('receipt.json')),pieces=new Map();
assert.equal(receipt.nativeExitCode,0);assert.equal(receipt.directedExitCode,0);assert.equal(receipt.directedPassed,52);assert.equal(receipt.buildPackageExitCode,0);assert.equal(receipt.productionChanged,true);
for(const p of receipt.pieces){const bytes=gunzipSync(get(p.path));assert.equal(bytes.length,p.bytes);assert.equal(hash(bytes),p.sha256);pieces.set(p.source,bytes);}
assert.equal(hash(get(receipt.input)),receipt.inputSha256);
const report=JSON.parse(pieces.get('.cache/worker-guard-integration-report.json'));
for(const [source,sha] of Object.entries(report.sources))assert.equal(hash(pieces.get(source)),sha);
assert.equal(report.statesCompared,100);assert.equal(report.pairs.length,100);assert.equal(report.paidReplants,2);
assert.equal(report.blocked.statesCompared,70);assert.equal(report.blocked.hashes.length,70);assert.equal(report.blocked.restoredStates,63);assert.equal(report.blocked.avoidancePoints,1);assert(report.blocked.reached);
assert.match(pieces.get('.cache/worker-guard-build.log').toString(),/built in 16\.20s/);
assert.match(pieces.get('.cache/worker-guard-package.log').toString(),/PASS: 701 files/);
console.log('PASS: production source bindings,100 normalized candidate-equivalent states,70 connector states and63 exact warm/cold continuations. No CI/timing claim.');
