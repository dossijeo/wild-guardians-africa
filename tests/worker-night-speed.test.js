import test from 'node:test';
import assert from 'node:assert/strict';
import {createWorkerNightSpeedBridge} from '../src/app/worker-night-speed.js';

test('night-speed policy sends only changes and initializes each runtime',()=>{
 const sync=createWorkerNightSpeedBridge(),a=[],b=[],first={setNightFastForward:v=>a.push(v)},second={setNightFastForward:v=>b.push(v)};
 sync(null,false);sync(first,false);sync(first,false);sync(first,true);sync(first,true);sync(first,false);sync(second,true);
 assert.deepEqual(a,[true,false,true]);assert.deepEqual(b,[false]);
});
test('a failed policy delivery can be retried',()=>{
 const sync=createWorkerNightSpeedBridge();let calls=0;const runtime={setNightFastForward(){if(++calls===1)throw Error('not ready');}};
 assert.throws(()=>sync(runtime,true),/not ready/);sync(runtime,true);assert.equal(calls,2);
});
