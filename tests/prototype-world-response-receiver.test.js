import test from 'node:test';
import assert from 'node:assert/strict';
import {createWorldResponseReceiver} from '../tools/trees/prototype_world_response_receiver.mjs';

const response=(ticket,value)=>({...ticket,accepted:true,value});
test('stale, duplicate, foreign and superseded replies never reach the consumer',()=>{
 const receiver=createWorldResponseReceiver('world',{initialVersion:1}),seen=[];
 const first=receiver.begin(1,{key:'animal'});receiver.advance(2);
 assert.equal(receiver.deliver(response(first,'old'),v=>seen.push(v)).reason,'stale');
 const second=receiver.begin(2,{key:'animal'}),third=receiver.begin(3,{key:'animal'}),other=receiver.begin(4,{key:'worker'});
 assert.deepEqual(receiver.deliver(response(third,'new'),v=>seen.push(v)),{accepted:true});
 assert.equal(receiver.deliver(response(second,'out of order'),v=>seen.push(v)).reason,'superseded');
 assert.deepEqual(receiver.deliver(response(other,'other actor'),v=>seen.push(v)),{accepted:true});
 assert.equal(receiver.deliver(response(third,'duplicate'),v=>seen.push(v)).reason,'request');
 const foreign=receiver.begin(5);assert.equal(receiver.deliver({...response(foreign,'x'),session:'old'},v=>seen.push(v)).reason,'session');
 const wrongVersion=receiver.begin(6);assert.equal(receiver.deliver({...response(wrongVersion,'x'),version:3},v=>seen.push(v)).reason,'version');
 assert.throws(()=>receiver.begin(6),/identity/);
 assert.deepEqual(seen,['new','other actor']);
});
test('pending requests are bounded and cancellation consumes a ticket',()=>{
 const receiver=createWorldResponseReceiver('world',{maxPending:1});const first=receiver.begin(1);
 assert.throws(()=>receiver.begin(2),/saturated/);assert.equal(receiver.cancel(1),true);
 assert.equal(receiver.deliver(response(first,1),()=>{}).reason,'request');
 const second=receiver.begin(2);assert.equal(receiver.deliver({...response(second,2),accepted:false},()=>{}).reason,'worker');
 assert.throws(()=>receiver.advance(0),/advance/);
});
