import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
const dir=new URL('./',import.meta.url),receipt=JSON.parse(readFileSync(new URL('receipt.json',dir))),raw=name=>gunzipSync(readFileSync(new URL(name,dir))),read=name=>JSON.parse(raw(name+'.json.gz')),hash=bytes=>createHash('sha256').update(bytes).digest('hex');
for(const p of receipt.pieces){const bytes=raw(p.path);assert.equal(bytes.length,p.rawBytes);assert.equal(hash(bytes),p.sha256);}
assert.equal(receipt.productionChanged,false);assert(receipt.exitCodes.every(x=>x===0));assert.equal(receipt.metadataTests.pass,8);
const replan=read('replan');assert.equal(replan.reached,true);assert.equal(replan.steps,70);assert(replan.rows.every(x=>x.valid));assert.equal(replan.movement.rejected,1);
assert.deepEqual(read('quality').results.map(x=>x.violations),[2,0]);
const home=read('native-return');assert.equal(home.rows.length,27);assert(home.rows.every(x=>x.homeTick!==null));assert.equal(Math.max(...home.rows.map(x=>x.homeTick)),684);
assert.equal(read('restore').rows.length,40);const blocked=read('blocked-restore');assert.equal(blocked.rejectionTick,7);assert.equal(blocked.reached,true);assert.equal(blocked.steps,63);
const b=read('benchmark');assert.deepEqual(b.runs.map(x=>x.mode),['reference','candidate','candidate','reference']);assert.deepEqual(b.firstDivergence,[-1,-1,-1,-1]);for(const run of b.runs)assert.deepEqual(run.hashes,b.runs[0].hashes);
assert.equal(b.sourceHashes.candidate,hash(raw('candidate-navigation.mjs.gz')));assert.equal(b.sourceHashes.candidateGame,hash(raw('candidate-game.mjs.gz')));assert.equal(b.sourceHashes.guard,hash(raw('guard.mjs.gz')));
assert(b.candidateMedian>b.referenceMedian);assert(b.candidateMedian<b.referenceMedian*1.09);
assert(b.runs.filter(x=>x.mode==='candidate').every(x=>x.movement.classified===357&&x.movement.reused===326&&x.movement.fallback===31&&x.movement.guarded===1549&&x.movement.rejected===0));
console.log('PASS archived V5 integrity and scoped outcomes; further acceptance required');
