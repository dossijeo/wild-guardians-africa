import test from 'node:test';
import assert from 'node:assert/strict';
import {createNativeResourcePreparationReceiver} from '../src/rendering/native-resource-preparation-receiver.js';

function fixture(){
 let running=true,drain=true,prepareGate=null,prepared=0,aborted=0;const messages=[];
 const receiver=createNativeResourcePreparationReceiver({isRunning:()=>running,canFlush:()=>drain,postMessage:m=>messages.push(m),prepare:async()=>{prepared++;if(prepareGate)await prepareGate;return {abort(){aborted++;},commit:()=>true};}});
 return {receiver,messages,running:v=>running=v,drain:v=>drain=v,gate:v=>prepareGate=v,counts:()=>({prepared,aborted})};
}
const prepare=id=>({kind:'prepareNativeGateResources',id,resources:{kind:1}});
const flush=id=>({kind:'flushNativeResources',id});

test('retained failure permits a drain acknowledgement without permitting new preparation',async()=>{
 const f=fixture();f.running(false);
 assert.equal(await f.receiver.accept(flush(1)),true);
 assert.deepEqual(f.messages,[{kind:'nativeResourcesFlushed',id:1,version:1}]);
 await f.receiver.accept(prepare(2));assert.equal(f.counts().prepared,0);
 f.receiver.dispose();
});

test('retained drain waits for a cancelled preparation callback and cannot bypass a live handle',async()=>{
 const f=fixture();let release;f.gate(new Promise(r=>release=r));const preparing=f.receiver.accept(prepare(1));
 assert.throws(()=>f.receiver.accept(flush(2)),/preparation pending/);
 f.receiver.accept({kind:'abortNativeGateResources',id:1});f.running(false);
 const draining=f.receiver.accept(flush(2));assert.equal(f.receiver.status().flushing,2);assert.equal(f.messages.length,0);
 release();await preparing;assert.equal(await draining,true);assert.equal(f.counts().aborted,1);assert.equal(f.receiver.status().inflight,0);assert.equal(f.messages.at(-1).kind,'nativeResourcesFlushed');f.receiver.dispose();
});

for(const terminal of ['lost-owner','disposed'])test('retained drain rechecks '+terminal+' after callbacks settle',async()=>{
 const f=fixture();let release;f.gate(new Promise(r=>release=r));const preparing=f.receiver.accept(prepare(1));f.receiver.accept({kind:'abortNativeGateResources',id:1});f.running(false);
 const draining=f.receiver.accept(flush(2));const rejected=assert.rejects(draining,/flush unavailable/);
 if(terminal==='disposed')f.receiver.dispose();else f.drain(false);
 release();await preparing;await rejected;assert.equal(f.messages.length,0);assert.equal(f.receiver.status().flushing,null);f.receiver.dispose();
});

test('flush capability does not bypass closed receivers or monotonic request identities',async()=>{
 const f=fixture();f.running(false);await f.receiver.accept(flush(2));assert.throws(()=>f.receiver.accept(flush(2)),/flush unavailable/);assert.throws(()=>f.receiver.accept(flush(1)),/flush unavailable/);f.receiver.dispose();assert.throws(()=>f.receiver.accept(flush(3)),/flush unavailable/);
});

test('callers without retained capability keep the original running-only drain contract',()=>{
 const r=createNativeResourcePreparationReceiver({isRunning:()=>false,prepare:()=>{},postMessage:()=>assert.fail('Unexpected receipt')});assert.throws(()=>r.accept(flush(1)),/flush unavailable/);r.dispose();
});
