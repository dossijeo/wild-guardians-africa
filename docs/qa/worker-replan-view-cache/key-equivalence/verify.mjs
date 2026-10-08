import assert from 'node:assert/strict';
import {readFileSync as read} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
const get=p=>read(new URL(p,import.meta.url));
const hash=b=>createHash('sha256').update(b).digest('hex');
const receipt=JSON.parse(get('receipt.json')),pieces=new Map();
assert.equal(receipt.exitCode,0);assert.equal(receipt.productionChanged,false);
for(const piece of receipt.pieces){const bytes=gunzipSync(get(piece.path));assert.equal(bytes.length,piece.bytes);assert.equal(hash(bytes),piece.sha256);pieces.set(piece.source,bytes);}
assert.equal(hash(get(receipt.input)),receipt.inputSha256);
const report=JSON.parse(pieces.get('.cache/v6-key-equivalence-report.json'));
for(const [source,sha] of Object.entries(report.sources))assert.equal(hash(pieces.get(source)),sha);
assert.equal(report.statesCompared,100);assert.equal(report.pairs.length,100);assert.equal(report.paidReplants,2);
assert.equal(report.blocked.statesCompared,70);assert.equal(report.blocked.hashes.length,70);assert(report.blocked.reached);assert.equal(report.blocked.avoidancePoints,1);
for(const value of [...report.pairs,...report.blocked.hashes])assert.match(value,/^[a-f0-9]{64}$/);
console.log('PASS: source-bound100 equal complete states, two paid plants and70 blocked-connector states. Archive verification only; no timing/production acceptance.');
