import test from 'node:test';
import assert from 'node:assert/strict';
import {enqueue, taskEnqueuer} from '../src/simulation/tasks.js';

const state = () => ({tasks: [], nextId: 7, sequence: 10});
test('crop pass preserves exact FIFO IDs and deduplication across kinds and centers', () => {
 const a = state(), b = state(), queue = taskEnqueuer(b);
 const commands = [['a', 'initial', 'plant'], ['b', 'initial', 'plant'], ['a', 'water', 'plant'], ['a', 'harvest', 'plant'], [null, 'water', 'other'], ['a', 'water', 'other'], ['b', 'water', 'other']];
 for (const args of commands) assert.deepEqual(queue(...args), enqueue(a, ...args));
 assert.deepEqual(b, a); assert.equal(a.tasks.length, 4); assert.equal(a.nextId, 11);
});
test('existing reserved tasks remain deduplicated and no stale index survives queue reconstruction', () => {
 const a = state(); enqueue(a, 'a', 'water', 'plant'); a.tasks[0].workerId = 'worker';
 const b = structuredClone(a), queue = taskEnqueuer(b);
 assert.equal(queue('b', 'water', 'plant'), null); assert.deepEqual(a, b);
 b.tasks = []; const next = taskEnqueuer(b);
 assert(next('b', 'water', 'plant')); assert.equal(b.tasks[0].id, 'task-8');
});
test('unused crop pass avoids reading the task collection', () => {
 const s = {get tasks() {throw Error('No pending crop request should inspect tasks');}};
 const queue = taskEnqueuer(s); assert.equal(queue(null, 'water', 'plant'), null);
});
test('varied append-only passes match every original result and full queue state', () => {
 let seed = 762;
 const random = n => {seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed % n;};
 for (let run = 0; run < 300; run++) {
  const a = state();
  for (let i = 0; i < 40; i++) enqueue(a, 'center-' + random(3), ['initial', 'water', 'harvest'][random(3)], 'plant-' + random(20));
  const b = structuredClone(a), queue = taskEnqueuer(b);
  for (let i = 0; i < 100; i++) {
   const args = [random(8) ? 'center-' + random(3) : null, ['initial', 'water', 'harvest'][random(3)], 'plant-' + random(60)];
   assert.deepEqual(queue(...args), enqueue(a, ...args));
  }
  assert.deepEqual(b, a, 'pass ' + run);
 }
});
