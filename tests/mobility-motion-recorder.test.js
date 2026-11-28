import test from 'node:test';
import assert from 'node:assert/strict';
import {observeCoordinateWrites} from './browser/mobility-motion-recorder.js';

test('diagnostic coordinate recorder keeps values and serialization while distinguishing repeated writes',()=>{
 const actor={id:'a',x:1,z:2},recorder=observeCoordinateWrites([actor]);
 recorder.begin();actor.x=3;actor.z=4;actor.x=5;actor.x=6;const records=recorder.end();
 assert.deepEqual(records,[{id:'a',from:{x:1,z:2},to:{x:3,z:4},axes:'xz'},{id:'a',from:{x:3,z:4},to:{x:5,z:4},axes:'x'},{id:'a',from:{x:5,z:4},to:{x:6,z:4},axes:'x'}]);
 assert.equal(JSON.stringify(actor),'{"id":"a","x":6,"z":4}');
 recorder.begin();assert.deepEqual(recorder.end(),[]);
});
