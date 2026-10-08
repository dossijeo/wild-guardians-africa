import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
const get=p=>readFileSync(new URL(p,import.meta.url));
const hash=b=>createHash('sha256').update(b).digest('hex');
const receipt=JSON.parse(get('receipt.json')),pieces=new Map();
assert.deepEqual(receipt.exitCodes,{native:0,directed:0,buildPackage:0});
assert.equal(receipt.directedPass,48);
for(const piece of receipt.pieces){const b=gunzipSync(get(piece.path));assert.equal(b.length,piece.bytes);assert.equal(hash(b),piece.sha256);pieces.set(piece.source,b);}
const report=JSON.parse(pieces.get('.cache/actor-fluid-native-report.json'));
assert.equal(report.statesCompared,100);assert.equal(report.pairs.length,100);assert.equal(report.paidReplants,2);
assert.equal(report.blocked.statesCompared,70);assert.equal(report.blocked.hashes.length,70);
assert.equal(report.blocked.reached,true);assert.equal(report.blocked.restoredStates,63);
for(const [source,sha]of Object.entries(receipt.sources))assert.equal(hash(get('../../../'+source)),sha);
assert(pieces.get('.cache/actor-fluid-build.log').toString().includes('built in'));
assert(pieces.get('.cache/actor-fluid-package.log').toString().includes('PASS: 701 files'));
console.log(JSON.stringify({archive:'PASS',directed:48,nativeStates:100,connector:70,restored:63}));
