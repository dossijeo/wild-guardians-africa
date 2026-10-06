import assert from 'node:assert/strict';
import {performance} from 'node:perf_hooks';
import {enqueue, taskEnqueuer} from '../src/simulation/tasks.js';
const rows = [];
for (const plants of [32, 256, 1024, 4096]) {
 const base = {nextId: plants + 1, sequence: plants, tasks: Array.from({length: plants}, (_, i) => ({id: 'task-' + i, created: i, centerId: 'center', kind: i % 2 ? 'initial' : 'water', targetId: 'plant-' + i, workerId: i % 3 ? null : 'worker-' + i, blocked: false}))};
 const timings = {reference: [], indexed: []};
 for (let trial = 0; trial < 14; trial++) {
  const states = {reference: structuredClone(base), indexed: structuredClone(base)};
  for (const mode of trial % 2 ? ['indexed', 'reference'] : ['reference', 'indexed']) {
   const state = states[mode], start = performance.now();
   const queue = mode === 'indexed' ? taskEnqueuer(state) : (...args) => enqueue(state, ...args);
   // One due-water request per crop, then newly matured crops in the same pass.
   for (let i = 0; i < plants; i++) queue('center', i % 2 ? 'initial' : 'water', 'plant-' + i);
   for (let i = 0; i < plants / 8; i++) {queue('center', 'harvest', 'mature-' + i); queue('center', 'harvest', 'mature-' + i);}
   if (trial >= 4) timings[mode].push(performance.now() - start);
  }
  assert.deepEqual(states.indexed, states.reference, 'Full queue state differs');
 }
 const summarize = values => {const v = [...values].sort((a, b) => a - b); return {samples: v.length, minMs: v[0], medianMs: (v[4] + v[5]) / 2, maxMs: v.at(-1)};};
 rows.push({plants, reference: summarize(timings.reference), indexed: summarize(timings.indexed)});
}
console.log(JSON.stringify({node: process.version, scope: 'Synthetic CPU only; per-pass deduplication of due-water and maturity tasks. Setup excluded, alternating order, full result state equivalence checked. Does not measure frame, GPU, route searches or mobile performance.', rows}, null, 2));
