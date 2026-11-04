import test from 'node:test';
import assert from 'node:assert/strict';
import {createConfirmedTerrainReceiver} from '../src/rendering/confirmed-terrain-receiver.js';
test('holds future terrain until its state sequence is confirmed',()=>{
 const acks=[],applied=[],port={postMessage:m=>acks.push(m),close(){},start(){}},residency={replace:(payload,revision)=>applied.push({payload,revision})},r=createConfirmedTerrainReceiver({port,session:'s',residency});
 port.onmessage({data:{kind:'terrain',session:'s',id:1,sequence:5,revision:1,payload:{cx:0}}});assert.equal(applied.length,0);assert.equal(acks.length,0);r.confirm(4);assert.equal(applied.length,0);r.confirm(5);assert.equal(applied.length,1);assert.deepEqual(acks,[{kind:'terrainAck',session:'s',id:1}]);assert.throws(()=>r.confirm(4),/out of order/);r.dispose();
});
test('rejects unordered or overlapping publications without touching the scene',()=>{
 let error;const port={postMessage(){},close(){},start(){}},r=createConfirmedTerrainReceiver({port,session:'s',residency:{replace(){throw Error('unexpected');}},onError:e=>{error=e;}});
 port.onmessage({data:{kind:'terrain',session:'s',id:1,sequence:2,revision:1,payload:{}}});port.onmessage({data:{kind:'terrain',session:'s',id:2,sequence:3,revision:1,payload:{}}});assert.match(error.message,/Invalid terrain/);assert.equal(r.status().closed,true);
});
test('notifies presentation after applying a revision and before acknowledgement',()=>{
 const order=[],port={postMessage:()=>order.push('ack'),close(){},start(){}},r=createConfirmedTerrainReceiver({port,session:'s',residency:{replace:()=>{order.push('replace');return true;}},onApplied:()=>order.push('applied')});
 port.onmessage({data:{kind:'terrain',session:'s',id:1,sequence:0,revision:1,payload:{}}});assert.deepEqual(order,['replace','applied','ack']);r.dispose();
});
