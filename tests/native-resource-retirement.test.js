import test from 'node:test';import assert from 'node:assert/strict';
import {pair,flush} from './helpers/remote-webgpu-fixture.js';
import {createNativeResourcePreparationConnection} from '../src/simulation/native-resource-preparation-connection.js';
import {attachNativeResourcePreparationEndpoint} from '../src/rendering/native-resource-preparation-receiver.js';
const closed={kind:'nativeResourcesClosed',session:'s',retirementVersion:2},retired={kind:'nativeResourcesRetired',session:'s',retirementVersion:2,callbacksSettled:true};
async function raw(timeoutMs=1000){const [a,b]=pair(),connection=createNativeResourcePreparationConnection({port:a,session:'s',timeoutMs});b.postMessage({kind:'nativeResourcesReady',session:'s',version:1,retirementVersion:2});await connection.ready;return {a,b,connection,receive:a.onmessage,dispose:()=>connection.dispose()};}
test('Closed rejects an outstanding flush immediately; only Retired settles recovery later',async()=>{
 const f=await raw();try{const waiting=f.connection.flush(),reject=assert.rejects(waiting,/closed/i);await flush();f.b.postMessage(closed);await reject;
  assert.equal(f.connection.status().phase,'failed');let done=false;const recovery=f.connection.settleForRecovery().then(r=>{done=true;return r;});await flush();assert.equal(done,false);
  await assert.rejects(f.connection.flush(),/unavailable/);f.b.postMessage(retired);assert.equal((await recovery).terminal,true);assert.equal(f.connection.status().phase,'failed');
 }finally{f.dispose();}
});
for(const [label,message] of [['late flush ACK',{kind:'nativeResourcesFlushed',session:'s',id:1,version:1}],['wrong session',{...retired,session:'other'}],['failed cleanup',{...retired,callbacksSettled:false}],['duplicate Closed',closed],['wrong version',{...retired,retirementVersion:1}]])test(label+' cannot certify terminal settlement or be repaired by a later receipt',async()=>{
 const f=await raw();try{f.b.postMessage(closed);await flush();const waiting=f.connection.settleForRecovery(),reject=assert.rejects(waiting,/invalid|session/i);f.b.postMessage(message);await reject;
  f.receive({data:retired});await assert.rejects(f.connection.settleForRecovery(),/unavailable/);assert.equal(f.connection.status().phase,'failed');
 }finally{f.dispose();}
});
test('a terminal receipt before Closed is rejected',async()=>{const f=await raw();try{f.b.postMessage(retired);await flush();assert.equal(f.connection.status().phase,'failed');await assert.rejects(f.connection.settleForRecovery(),/unavailable/);}finally{f.dispose();}});
test('terminal timeout rejects recovery and a late receipt cannot revive it',async()=>{
 const f=await raw(25);try{f.b.postMessage(closed);await flush();const reject=assert.rejects(f.connection.settleForRecovery(),/retirement timed out/);await Promise.all([reject,new Promise(r=>setTimeout(r,40))]);f.receive({data:retired});await assert.rejects(f.connection.settleForRecovery(),/unavailable/);}finally{f.dispose();}
});
test('local disposal rejects terminal wait and refuses a late receipt',async()=>{
 const f=await raw();try{f.b.postMessage(closed);await flush();const reject=assert.rejects(f.connection.settleForRecovery(),/disposed/);await flush();f.dispose();await reject;f.receive({data:retired});await assert.rejects(f.connection.settleForRecovery(),/unavailable/);}finally{f.dispose();}
});
test('late cleanup failure after immediate Closed produces no successful terminal receipt',async()=>{
 const [a,b]=pair(),messages=[];let finish,started;const gate=new Promise(r=>finish=r),entered=new Promise(r=>started=r);
 const send=b.postMessage;b.postMessage=m=>{messages.push(m);send(m);};
 const endpoint=attachNativeResourcePreparationEndpoint({port:b,session:'s',isRunning:()=>true,prepare:async()=>{started();await gate;return {abort(){throw Error('late cleanup broken');}};}}),connection=createNativeResourcePreparationConnection({port:a,session:'s',timeoutMs:1000});
 try{await connection.ready;const preparing=connection.prepareNativeGateResources({version:1,kind:1,worldBoundary:{}}),reject=assert.rejects(preparing,/closed/i);await entered;endpoint.dispose();await reject;
  assert.equal(messages.at(-1).kind,'nativeResourcesClosed');assert.equal(endpoint.status().inflight,1);
  const rejection=assert.rejects(connection.settleForRecovery(),/Invalid native resource retirement/);finish();await rejection;
  assert.equal(messages.at(-1).kind,'nativeResourcesRetired');assert.equal(messages.at(-1).callbacksSettled,false);assert.equal(endpoint.status().inflight,0);
 }finally{finish();await flush();connection.dispose();endpoint.dispose();}
});
