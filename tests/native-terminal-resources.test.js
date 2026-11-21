import test from 'node:test';import assert from 'node:assert/strict';import {MessageChannel} from 'node:worker_threads';
import {pair,flush} from './helpers/remote-webgpu-fixture.js';
import {attachNativeResourcePreparationEndpoint} from '../src/rendering/native-resource-preparation-receiver.js';
import {createNativeResourcePreparationConnection} from '../src/simulation/native-resource-preparation-connection.js';
import {nativeProductionAuthority} from './helpers/native-production-authority.js';
import {nativeIdleStrollGameSave} from './helpers/native-idle-stroll-restoration-game.js';
const resource={version:1,kind:1,phase:'proposal',worldBoundary:{version:1,authorityEpoch:'test',nativeSession:1,ticket:1,effectiveTime:10}};
function setup(prepare=async()=>({abort(){},commit:()=>true})){
 const [a,b]=pair(),faults=[];
 const endpoint=attachNativeResourcePreparationEndpoint({port:b,session:'retirement',isRunning:()=>true,prepare,onError:e=>faults.push(e.message)});
 const connection=createNativeResourcePreparationConnection({port:a,session:'retirement',timeoutMs:1000,onError:e=>faults.push(e.message)});
 return {a,b,endpoint,connection,faults,close(){connection.dispose();endpoint.dispose();}};
}
test('terminal callback receipt permits recovery settlement but never a live flush or new preparation',async()=>{
 const f=setup();try{await f.connection.ready;f.endpoint.dispose();await flush();
  await assert.rejects(f.connection.flush(),/flush unavailable/);
  const receipt=await f.connection.settleForRecovery();assert.deepEqual(receipt,{version:1,session:'retirement',terminal:true,callbacksSettled:true});
  assert.equal(Object.hasOwn(receipt,'drained'),false);assert.equal(Object.hasOwn(receipt,'holdId'),false);
  await assert.rejects(f.connection.prepareNativeGateResources(resource),/unavailable/);
 }finally{f.close();}
});
test('terminal settlement waits for the cancelled callback and its late handle cleanup',async()=>{
 let finish,entered,aborts=0;const started=new Promise(r=>entered=r),gate=new Promise(r=>finish=r),controller=new AbortController();
 const f=setup(async()=>{entered();await gate;return {abort(){aborts++;}};});
 try{await f.connection.ready;const preparing=f.connection.prepareNativeGateResources(resource,{signal:controller.signal});const rejected=assert.rejects(preparing,/cancelled|aborted/i);await started;
  controller.abort();await rejected;await flush();f.endpoint.dispose();let settled=false;
  const retiring=f.connection.settleForRecovery().then(r=>{settled=true;return r;});await flush();assert.equal(settled,false);assert.equal(aborts,0);
  finish();const receipt=await retiring;assert.equal(receipt.terminal,true);assert.equal(aborts,1);assert.equal(f.endpoint.status().inflight,0);
 }finally{controller.abort();finish();await flush();f.close();}
});
for(const kind of ['legacy','wrong-session','unnegotiated'])test(kind+' close cannot provide terminal settlement',async()=>{
 const [a,b]=pair(),f=createNativeResourcePreparationConnection({port:a,session:'s',timeoutMs:1000});
 try{b.postMessage({kind:'nativeResourcesReady',session:'s',version:1,...(kind==='wrong-session'?{retirementVersion:1}:{})});await f.ready;
  b.postMessage({kind:'nativeResourcesClosed',session:kind==='wrong-session'?'other':'s',...(kind!=='legacy'?{retirementVersion:1,callbacksSettled:true}:{})});await flush();
  await assert.rejects(f.settleForRecovery(),/unavailable/);
 }finally{f.dispose();}
});
test('cleanup failure cannot be upgraded into a terminal receipt',async()=>{
 const f=setup(async()=>({preparedWorldBoundary:resource.worldBoundary,abort(){throw Error('cleanup failed');}}));
 try{await f.connection.ready;await f.connection.prepareNativeGateResources(resource);assert.throws(()=>f.endpoint.dispose(),/cleanup failed/);await flush();await assert.rejects(f.connection.settleForRecovery(),/unavailable/);}finally{f.close();}
});
test('actual native authority requires suspended production',async()=>{
 const f=await nativeProductionAuthority(nativeIdleStrollGameSave().state,{attach:false});
 try{await assert.rejects(f.authority.flushNativeResourcePreparation({allowRetired:true}),/suspended production/);}finally{await f.close();}
});
test('actual native authority accepts terminal callbacks while preserving the separate GPU boundary',async()=>{
 const f=await nativeProductionAuthority(nativeIdleStrollGameSave().state,{attach:false}),[a,b]=pair();let endpoint;
 try{const hold=await f.authority.quiesceNativeIntentProduction();
  endpoint=attachNativeResourcePreparationEndpoint({port:b,session:'terminal-authority',isRunning:()=>true,prepare:async()=>assert.fail('unexpected preparation')});
  await f.authority.attachNativeResourcePreparation(a,'terminal-authority');endpoint.dispose();await flush();
  await assert.rejects(f.authority.flushNativeResourcePreparation(),/flush unavailable/);
  assert.equal((await f.authority.flushNativeResourcePreparation({allowRetired:true})).terminal,true);
  assert.equal(f.authority.nativeIntentProductionStatus().phase,'suspended');
  assert.equal(f.authority.nativeIntentControlStatus().current,null,'resource retirement never installs or drains a GPU control consumer');
  assert(hold);assert.equal(f.records.length,0);
 }finally{endpoint?.dispose();await f.close();}
});
test('real MessagePorts deliver terminal callback settlement before closing',async()=>{
 const {port1,port2}=new MessageChannel();
 const endpoint=attachNativeResourcePreparationEndpoint({port:port2,session:'real-port',isRunning:()=>true,prepare:async()=>assert.fail('unexpected preparation')});
 const connection=createNativeResourcePreparationConnection({port:port1,session:'real-port',timeoutMs:1000});
 try{await connection.ready;endpoint.dispose();assert.equal((await connection.settleForRecovery()).terminal,true);await assert.rejects(connection.flush(),/unavailable/);}finally{connection.dispose();endpoint.dispose();port1.close();port2.close();}
});
