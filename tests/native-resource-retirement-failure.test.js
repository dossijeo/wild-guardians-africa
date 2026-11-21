import test from 'node:test';import assert from 'node:assert/strict';
import {pair,flush} from './helpers/remote-webgpu-fixture.js';
import {createNativeResourcePreparationConnection} from '../src/simulation/native-resource-preparation-connection.js';
import {attachNativeResourcePreparationEndpoint} from '../src/rendering/native-resource-preparation-receiver.js';

for(const defect of ['session','unknown-request','invalid-flush','transfer'])test(`protocol ${defect} cannot become successful recovery after callbacks settle`,async()=>{
 const [a,b]=pair(),messages=[],send=b.postMessage;b.postMessage=m=>{messages.push(m);send(m);};
 const endpoint=attachNativeResourcePreparationEndpoint({port:b,session:'s',isRunning:()=>true,prepare:()=>{throw Error('Unexpected preparation');}}),connection=createNativeResourcePreparationConnection({port:a,session:'s',timeoutMs:1000});
 try{
  await connection.ready;const post=a.postMessage;a.postMessage=m=>{
   if(m.kind!=='flushNativeResources')return post(m);
   if(defect==='transfer'){b.onmessageerror();return;}
   post(defect==='session'?{...m,session:'wrong'}:defect==='unknown-request'?{...m,kind:'not-a-resource-request'}:{...m,id:0});
  };
  await assert.rejects(connection.settleForRecovery(),/session|request|transfer/i);await flush();
  assert.equal(messages.find(m=>m.kind==='nativeResourcesClosed').retirementVersion,undefined);
  assert.equal(messages.find(m=>m.kind==='nativeResourcesRetired').callbacksSettled,false);
  assert.equal(endpoint.status().inflight,0);assert.equal(connection.status().phase,'failed');
  await assert.rejects(connection.settleForRecovery(),/unavailable/);
 }finally{connection.dispose();endpoint.dispose();}
});

test('protocol failure cancels immediately but still waits for late original cleanup',async()=>{
 const [a,b]=pair(),messages=[],send=b.postMessage;b.postMessage=m=>{messages.push(m);send(m);};let release,entered,aborts=0;
 const gate=new Promise(r=>release=r),started=new Promise(r=>entered=r);
 const endpoint=attachNativeResourcePreparationEndpoint({port:b,session:'s',isRunning:()=>true,prepare:async()=>{entered();await gate;return {abort(){aborts++;}};}}),connection=createNativeResourcePreparationConnection({port:a,session:'s',timeoutMs:1000});
 try{await connection.ready;const rejection=assert.rejects(connection.prepareNativeGateResources({version:1,kind:1,worldBoundary:{}}),/session/);await started;
  a.postMessage({kind:'flushNativeResources',session:'wrong',id:2});await rejection;assert.equal(endpoint.status().inflight,1);assert.equal(messages.some(m=>m.kind==='nativeResourcesRetired'),false);
  const recovery=assert.rejects(connection.settleForRecovery(),/unavailable/);recovery.catch(()=>{});release();await recovery;await flush();await flush();assert.equal(aborts,1);assert.equal(endpoint.status().inflight,0);assert.equal(messages.at(-1).callbacksSettled,false);
 }finally{release();await flush();connection.dispose();endpoint.dispose();}
});

test('explicit retirement during an aborted callback flush remains a valid terminal receipt',async()=>{
 const [a,b]=pair(),messages=[],send=b.postMessage;b.postMessage=m=>{messages.push(m);send(m);};let release,entered,aborts=0;
 const gate=new Promise(r=>release=r),started=new Promise(r=>entered=r);
 const endpoint=attachNativeResourcePreparationEndpoint({port:b,session:'s',isRunning:()=>true,prepare:async()=>{entered();await gate;return {abort(){aborts++;}};}}),connection=createNativeResourcePreparationConnection({port:a,session:'s',timeoutMs:1000});
 try{await connection.ready;const controller=new AbortController(),cancelled=assert.rejects(connection.prepareNativeGateResources({version:1,kind:1,worldBoundary:{}},{signal:controller.signal}),{name:'AbortError'});await started;controller.abort();await cancelled;await flush();await flush();assert.equal(endpoint.status().pending,null);
  const draining=assert.rejects(connection.flush(),/closed/);await flush();await flush();assert.notEqual(endpoint.status().flushing,null);endpoint.dispose();await draining;
  let done=false;const recovery=connection.settleForRecovery().then(r=>{done=true;return r;});await flush();assert.equal(done,false);release();const receipt=await recovery;
  assert.equal(receipt.terminal,true);assert.equal(aborts,1);assert.equal(messages.some(m=>m.kind==='nativeResourcesFlushed'),false);assert.equal(messages.at(-1).callbacksSettled,true);
 }finally{release();await flush();connection.dispose();endpoint.dispose();}
});
