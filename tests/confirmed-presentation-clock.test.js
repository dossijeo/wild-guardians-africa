import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {deserialize,serialize} from '../src/persistence/snapshots.js';
import {createConfirmedPresentationClock} from '../src/rendering/confirmed-presentation-clock.js';
import {createConfirmedPresentationStream} from '../src/rendering/confirmed-presentation-stream.js';

test('GPU clock follows only committed simulation time, including a held publication',()=>{
 const state=deserialize(gunzipSync(readFileSync('tests/fixtures/manglares-123-d10-raid-state.json.gz')).toString()),next=deserialize(serialize(state)),initial=state.elapsed,clock=createConfirmedPresentationClock(initial),acks=[],port={postMessage:m=>acks.push(m.sequence),start(){},close(){}};
 const stream=createConfirmedPresentationStream({port,session:'s',state,allowPresentationHold:true,terrain:{confirm(){}},onConfirmed:()=>clock.commit(state.elapsed)});
 try{stream.holdPresentation();next.elapsed+=.05;port.onmessage({data:{kind:'publication',session:'s',publication:{session:'s',sequence:1,snapshot:serialize(next),events:[]}}});assert.equal(clock.elapsed,initial);assert.equal(clock.node.value,initial);assert.deepEqual(acks,[]);
  stream.releasePresentation();assert.equal(clock.elapsed,next.elapsed);assert.equal(clock.node.value,next.elapsed);assert.deepEqual(acks,[1]);
  const paused=deserialize(serialize(next));paused.pauses.push('menu');port.onmessage({data:{kind:'publication',session:'s',publication:{session:'s',sequence:2,snapshot:serialize(paused),events:[]}}});assert.equal(clock.elapsed,next.elapsed);assert.equal(clock.node.value,next.elapsed);
  assert.throws(()=>clock.commit(initial),/Invalid confirmed/);assert.equal(clock.elapsed,next.elapsed);
 }finally{stream.dispose();clock.dispose();}
 assert.throws(()=>clock.commit(next.elapsed),/Invalid confirmed/);
});
