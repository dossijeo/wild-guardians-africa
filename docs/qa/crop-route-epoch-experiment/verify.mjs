import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
const dir=new URL('./',import.meta.url),hash=b=>createHash('sha256').update(b).digest('hex');
const receipt=JSON.parse(readFileSync(new URL('receipt.json',dir)));
const raw=p=>gunzipSync(readFileSync(new URL(p,dir))),json=p=>JSON.parse(raw(p));
for(const p of receipt.pieces){const b=raw(p.path);assert.equal(b.length,p.rawBytes);assert.equal(hash(b),p.sha256);}
assert.equal(receipt.productionChanged,false);assert.equal(receipt.benchmarkExitCode,0);assert.equal(receipt.diagnosticExitCode,0);
assert.equal(hash(readFileSync(new URL('../../../'+receipt.input.path,dir))),receipt.input.compressedSha256);
const b=json('benchmark.json.gz'),d=json('diagnosis.json.gz');
assert.equal(b.sites.length,10);assert.deepEqual(b.sites,d.sites);
assert.deepEqual(b.runs.map(r=>r.mode),['reference','candidate','candidate','reference']);
assert.deepEqual(b.firstFullDivergence,[-1,0,0,-1]);assert.deepEqual(b.firstPhysicalDivergence,[-1,10,10,-1]);
for(const [i,j] of [[0,3],[1,2]]){assert.deepEqual(b.runs[i].hashes,b.runs[j].hashes);assert.deepEqual(b.runs[i].physicalHashes,b.runs[j].physicalHashes);assert.deepEqual(b.runs[i].violations,b.runs[j].violations);}
for(const r of b.runs){assert.equal(r.samplesMs.length,75);assert.equal(r.pathCalls.length,100);assert.equal(r.plantSamplesMs.length,10);assert.equal(r.violations.length,2);assert.equal(r.totalPathCalls,r.mode==='reference'?1539:299);}
assert(b.candidateMedian<b.referenceMedian);assert(b.candidateMedian>b.referenceMedian*.8);
for(const [source,archive] of [['.cache/no-crop-epoch-navigation.mjs','candidate-navigation.mjs.gz'],['src/world/navigation.js','production-navigation.js.gz'],['src/simulation/game.js','production-game.js.gz']])assert.equal(b.sourceHashes[source],hash(raw(archive)));
assert.deepEqual(d.checkpoints.map(c=>c.tick),[10,20,50,99]);assert.deepEqual(d.checkpoints.map(c=>c.workerDifferences.length),[25,57,101,118]);
assert(d.checkpoints[0].differences.some(x=>x.path==='.workers.22.path.0.x'));
const last=d.checkpoints.at(-1);assert(last.differences.some(x=>x.path==='.plants.21119.water.5.status'&&x.reference==='manual'&&x.candidate==='due'));
assert(Math.max(...last.workerDifferences.map(w=>w.distance??0))>1.6);
assert.notDeepEqual(d.final.reference,d.final.candidate);
console.log('PASS archived CPU/query result and real movement/watering divergence; no production acceptance');
assert.equal(receipt.restoreTests.exitCode,0);assert.equal(receipt.restoreTests.passed,5);assert.equal(receipt.restoreTests.coldPairs,50);
const tap=raw('restore-tests.tap.gz').toString();assert(tap.includes('# pass 5'));assert(tap.includes('# fail 0'));assert(tap.includes('# skipped 0'));
const testSource=raw('restore.test.mjs.gz').toString();assert(testSource.includes('assert.equal(serialize(s),serialize(loaded))'));assert(testSource.includes('assert(movingTicks>0'));assert(testSource.includes('Worker must physically move before restore'));
console.log('PASS five native candidate contracts, including 50 moving-worker cold-state pairs; broader acceptance remains open');
