import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {motionGraphBaseline,motionGraphCandidate} from '../tools/experiments/motion-graph-baseline.mjs';

test('QA candidate round-trips the original graph and rejects missing anchors',()=>{
 const current=readFileSync(new URL('../src/rendering/confirmed-gpu-motion.js',import.meta.url),'utf8');assert.equal(motionGraphBaseline(motionGraphCandidate(current)),current);assert.throws(()=>motionGraphCandidate('unexpected'),/anchor/);
});
