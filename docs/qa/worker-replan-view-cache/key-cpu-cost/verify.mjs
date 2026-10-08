import assert from 'node:assert/strict';
import {readFileSync as read} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
const get=p=>read(new URL(p,import.meta.url)),hash=b=>createHash('sha256').update(b).digest('hex');
const receipt=JSON.parse(get('receipt.json')),pieces=new Map();
assert.equal(receipt.exitCode,0);assert.equal(receipt.productionChanged,false);
for(const piece of receipt.pieces){const bytes=gunzipSync(get(piece.path));assert.equal(bytes.length,piece.bytes);assert.equal(hash(bytes),piece.sha256);pieces.set(piece.source,bytes);}
assert.equal(hash(get(receipt.input)),receipt.inputSha256);
const report=JSON.parse(pieces.get('.cache/v6-key-cost-report.json'));
for(const [source,sha] of Object.entries(report.sources))assert.equal(hash(pieces.get(source)),sha);
assert.equal(report.runs.length,4);assert.deepEqual(report.runs.map(r=>r.mode),['base','key','key','base']);
const median=xs=>[...xs].sort((a,b)=>a-b)[Math.floor(xs.length/2)];
for(const run of report.runs){assert.equal(run.hashes.length,100);assert.deepEqual(run.hashes,report.runs[0].hashes);assert.deepEqual(run.refinement,report.runs[0].refinement);assert.deepEqual(run.movement,report.runs[0].movement);assert.equal(run.samplesMs.length,75);assert(run.samplesMs.every(ms=>Number.isFinite(ms)&&ms>=0));assert.equal(run.medianMs,median(run.samplesMs));}
assert.equal(report.baseMedianMs,median(report.runs.filter(r=>r.mode==='base').flatMap(r=>r.samplesMs)));
assert.equal(report.keyMedianMs,median(report.runs.filter(r=>r.mode==='key').flatMap(r=>r.samplesMs)));
assert.equal(report.deltaMs,report.keyMedianMs-report.baseMedianMs);assert(report.allCompleteStatesEqual);
console.log(JSON.stringify({archive:'PASS',baseMedianMs:report.baseMedianMs,keyMedianMs:report.keyMedianMs,deltaMs:report.deltaMs,deltaPercent:report.deltaPercent,allCompleteStatesEqual:true}));
