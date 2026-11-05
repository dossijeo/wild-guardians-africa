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

test('checkpoint discards late terrain through its boundary and preserves later updates',()=>{
 const applied=[],acks=[],port={postMessage:m=>acks.push(m.id),close(){},start(){}},r=createConfirmedTerrainReceiver({port,session:'s',confirmedSequence:5,residency:{replace:(payload,revision)=>applied.push([payload.id,revision])}});
 assert.throws(()=>r.checkpoint(4),/boundary/);r.checkpoint(5);
 port.onmessage({data:{kind:'terrain',session:'s',id:1,sequence:5,revision:2,payload:{id:'old'}}});
 port.onmessage({data:{kind:'terrain',session:'s',id:2,sequence:6,revision:3,payload:{id:'new'}}});assert.deepEqual(acks,[1]);assert.deepEqual(applied,[]);r.confirm(6);assert.deepEqual(acks,[1,2]);assert.deepEqual(applied,[['new',3]]);r.dispose();
});

test('manifest cannot match future revisions until state confirmation applies them',()=>{
 const chunks=new Map(),port={postMessage(){},close(){},start(){}},residency={replace(payload,revision,epoch){chunks.set(payload.cx,{revision,epoch});},matchesManifest(manifest){return manifest.chunks.every(c=>chunks.get(c.cx)?.revision===c.revision&&chunks.get(c.cx)?.epoch===manifest.epoch);}},receiver=createConfirmedTerrainReceiver({port,session:'s',residency});const manifest={epoch:'a',chunks:[{cx:0,revision:1}]};port.onmessage({data:{kind:'terrain',session:'s',epoch:'a',id:1,sequence:2,revision:1,payload:{cx:0}}});assert.equal(receiver.matchesManifest(manifest),false);receiver.confirm(2);assert.equal(receiver.matchesManifest(manifest),true);assert.equal(receiver.matchesManifest({...manifest,epoch:'b'}),false);receiver.dispose();assert.equal(receiver.matchesManifest(manifest),false);
});

test('one channel cannot mix terrain epochs',()=>{let error;const port={postMessage(){},close(){},start(){}},receiver=createConfirmedTerrainReceiver({port,session:'s',residency:{replace(){}},onError:e=>error=e});port.onmessage({data:{kind:'terrain',session:'s',epoch:'a',id:1,sequence:0,revision:1,payload:{}}});port.onmessage({data:{kind:'terrain',session:'s',epoch:'b',id:2,sequence:0,revision:1,payload:{}}});assert.match(error.message,/epoch/);assert.equal(receiver.status().closed,true);});
