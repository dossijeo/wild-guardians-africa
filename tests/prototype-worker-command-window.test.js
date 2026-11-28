import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createCommandWindow} from '../tools/trees/prototype_worker_command_window.mjs';

test('bounded sends, priority pause, strict acknowledgments and retry',()=>{
 const sent=[],w=createCommandWindow('s',x=>sent.push(x));
 assert.equal(w.advance(40).sequence,1);
 for(let i=0;i<10000;i++) assert.deepEqual(w.advance(1),{accepted:false,reason:'busy'});
 assert.equal(w.pause().sequence,2);assert.equal(sent.length,2);
 assert.equal(w.ack({kind:'advance-result',session:'wrong',request:1,sequence:1,performed:1}).accepted,false);
 assert.equal(w.ack({kind:'advance-result',session:'s',request:1,sequence:1,performed:41}).accepted,false);
 assert.equal(w.ack({kind:'pause-result',session:'s',request:2,sequence:2,state:{pauses:['diagnostic']}}).accepted,true);
 assert.equal(w.resume().accepted,false);
 assert.deepEqual(w.ack({kind:'advance-result',session:'s',request:1,sequence:1,performed:1}),{accepted:true,remaining:39});
 assert.equal(w.ack({kind:'advance-result',session:'s',request:1,sequence:1,performed:1}).accepted,false);
 assert.equal(w.advance(1).reason,'paused');assert.equal(w.resume().sequence,3);
 assert.equal(w.ack({kind:'resume-result',session:'s',request:3,sequence:3,state:{pauses:[]}}).accepted,true);
 assert.equal(w.advance(39).sequence,4);
 assert.deepEqual(w.ack({kind:'advance-result',session:'s',request:4,sequence:4,performed:39}),{accepted:true,remaining:0});
 assert.equal(w.state().nextSequence,5);
});
test('failed send does not consume sequence',()=>{let fail=true;const w=createCommandWindow('s',()=>{if(fail)throw Error('failed');});assert.throws(()=>w.advance(1));assert.equal(w.state().nextSequence,1);fail=false;assert.equal(w.advance(1).sequence,1);});
