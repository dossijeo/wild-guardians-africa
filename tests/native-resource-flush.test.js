import test from 'node:test';
import assert from 'node:assert/strict';
import {MessageChannel} from 'node:worker_threads';
import {createNativeResourcePreparationConnection} from '../src/simulation/native-resource-preparation-connection.js';
import {attachNativeResourcePreparationEndpoint} from '../src/rendering/native-resource-preparation-receiver.js';

const boundary={version:1,authorityEpoch:'source',nativeSession:1,ticket:3,effectiveTime:10};
const resources=()=>({version:1,kind:12,phase:'proposal',worldBoundary:{...boundary}});
const turn=()=>new Promise(resolve=>setImmediate(resolve));
async function until(predicate){const end=Date.now()+3000;while(!predicate()){if(Date.now()>end)throw Error('Resource flush fixture timed out');await turn();}}
function fixture({prepare,timeoutMs=1000,onCommit=()=>{}}={}){
 const {port1,port2}=new MessageChannel(),calls=[],errors=[],requests=[],replies=[];
 const sendRequest=port1.postMessage.bind(port1),sendReply=port2.postMessage.bind(port2);
 let holdRequests=false,holdReplies=false;
 port1.postMessage=message=>{if(holdRequests&&['commitNativeGateResources','flushNativeResources'].includes(message.kind))requests.push(message);else sendRequest(message);};
 port2.postMessage=message=>{if(holdReplies&&message.kind==='nativeResourcesFlushed')replies.push(message);else sendReply(message);};
 const endpoint=attachNativeResourcePreparationEndpoint({port:port2,session:'flush-test',isRunning:()=>true,onError:e=>errors.push(e),onCommit,prepare:prepare??(async(kind,r)=>({preparedWorldBoundary:r.worldBoundary,valid:()=>true,commit(data){calls.push(data);return true;},abort(){}}))});
 const connection=createNativeResourcePreparationConnection({port:port1,session:'flush-test',timeoutMs,onError:e=>errors.push(e)});
 connection.ready.catch(()=>{});
 return {connection,endpoint,calls,errors,requests,replies,sendRequest,sendReply,holdRequests:()=>{holdRequests=true;},holdReplies:()=>{holdReplies=true;},releaseRequests(){holdRequests=false;for(const message of requests.splice(0))sendRequest(message);},close(){connection.dispose();endpoint.dispose();port1.close();port2.close();}};
}

test('same-port flush waits for the actual remote commit despite empty local counters',async()=>{
 const f=fixture();try{
  await f.connection.ready;const handle=await f.connection.prepareNativeGateResources(resources());f.holdRequests();assert(handle.commit({worldBoundary:boundary}));
  assert.equal(f.connection.status().retained,0);assert.equal(f.connection.status().pending,0);assert.notEqual(f.endpoint.status().pending,null);assert.equal(f.calls.length,0);
  let settled=false;const waiting=f.connection.flush();waiting.then(()=>{settled=true;},()=>{});await turn();
  assert.deepEqual(f.requests.map(m=>m.kind),['commitNativeGateResources','flushNativeResources']);assert.equal(settled,false);
  await assert.rejects(f.connection.flush(),/pending|unavailable/i);await assert.rejects(f.connection.prepareNativeGateResources(resources()),/pending/i);
  f.releaseRequests();assert.deepEqual(await waiting,{version:1});assert.deepEqual(f.calls,[{worldBoundary:boundary}]);assert.equal(f.endpoint.status().pending,null);
  const next=await f.connection.prepareNativeGateResources(resources());next.abort();assert.deepEqual(await f.connection.flush(),{version:1});assert.deepEqual(f.errors,[]);
 }finally{f.releaseRequests();f.close();}
});

test('flush refuses both asynchronous preparation and a ready retained handle without disturbing either',async()=>{
 let release,started=false;const gate=new Promise(resolve=>{release=resolve;});
 const f=fixture({prepare:async(kind,r)=>{started=true;await gate;return {preparedWorldBoundary:r.worldBoundary,valid:()=>true,commit:()=>true,abort(){}};}});
 try{await f.connection.ready;const preparing=f.connection.prepareNativeGateResources(resources());preparing.catch(()=>{});await until(()=>started);await assert.rejects(f.connection.flush(),/pending|unavailable/i);release();const handle=await preparing;await assert.rejects(f.connection.flush(),/pending|unavailable/i);assert(handle.valid());handle.abort();await f.connection.flush();assert.deepEqual(f.errors,[]);}finally{release();f.close();}
});

test('an endpoint cannot acknowledge a forged barrier over an asynchronous preparation',async()=>{
 let release,started=false;const gate=new Promise(resolve=>{release=resolve;});
 const f=fixture({prepare:async(kind,r)=>{started=true;await gate;return {preparedWorldBoundary:r.worldBoundary,abort(){}};}});
 try{await f.connection.ready;const preparing=f.connection.prepareNativeGateResources(resources()),rejected=assert.rejects(preparing,/pending|flush|unavailable|closed/i);rejected.catch(()=>{});await until(()=>started);f.sendRequest({kind:'flushNativeResources',session:'flush-test',id:2});await rejected;assert.equal(f.connection.status().phase,'failed');assert.equal(f.endpoint.status().closed,true);}finally{release();f.close();}
});

test('an earlier flush response cannot settle a later barrier on the same live connection',async()=>{
 const f=fixture();try{await f.connection.ready;f.holdReplies();const first=f.connection.flush();await until(()=>f.replies.length===1);const old=f.replies.shift();f.sendReply(old);await first;
  let settled=false;const second=f.connection.flush();second.then(()=>{settled=true;},()=>{});await until(()=>f.replies.length===1);f.sendReply(old);await turn();await turn();assert.equal(settled,false);f.sendReply(f.replies.shift());await second;assert.equal(f.connection.status().phase,'running');assert.deepEqual(f.errors,[]);
 }finally{f.close();}
});

for(const stage of ['prepare','refresh'])test(`flush rejects an aborted ${stage} whose asynchronous callback has not actually finished`,async()=>{
 let release,started=false;const gate=new Promise(resolve=>{release=resolve;});
 const f=fixture({prepare:async(kind,r)=>{if(stage==='prepare'){started=true;await gate;}return {preparedWorldBoundary:r.worldBoundary,valid:()=>true,async refresh(){started=true;await gate;return true;},abort(){}};}});
 try{await f.connection.ready;const controller=new AbortController(),r=stage==='prepare'?resources():{kind:'native-route-resume-proposal',worldBoundary:boundary};let waiting;
  if(stage==='prepare')waiting=f.connection.prepareNativeGateResources(r,{signal:controller.signal});
  else{const handle=await f.connection.prepareNativeResumeResources(r,{signal:controller.signal});waiting=handle.refresh(r);}
  const rejected=assert.rejects(waiting,{name:'AbortError'});rejected.catch(()=>{});await until(()=>started);controller.abort();await rejected;await until(()=>f.endpoint.status().pending===null);
  assert.equal(f.connection.status().pending,0);assert.equal(f.connection.status().retained,0);await assert.rejects(f.connection.flush(),/pending|unavailable|closed/i);assert.equal(f.connection.status().phase,'failed');
 }finally{release();f.close();}
});

for(const [label,change] of [['version',m=>({...m,version:2})],['kind',m=>({...m,kind:'nativeGateResourcesResult',result:{version:1}})],['future identity',m=>({...m,id:m.id+1})],['session',m=>({...m,session:'foreign'})]])test(`a malformed flush ${label} fails the connection and cannot certify the barrier`,async()=>{
 const f=fixture();try{await f.connection.ready;f.holdReplies();const waiting=f.connection.flush(),rejected=assert.rejects(waiting,/invalid|response|session|flush/i);rejected.catch(()=>{});await until(()=>f.replies.length===1);f.sendReply(change(f.replies.shift()));await rejected;assert.equal(f.connection.status().phase,'failed');assert.equal(f.errors.length,1);await assert.rejects(f.connection.flush(),/closed|failed|unavailable|invalid|response|session|flush/i);}finally{f.close();}
});

test('a missing flush response times out terminally instead of declaring the endpoint drained',async()=>{
 const f=fixture({timeoutMs:30});try{await f.connection.ready;f.holdReplies();await assert.rejects(f.connection.flush(),/timed out/i);assert.equal(f.connection.status().phase,'failed');assert.equal(f.connection.status().pending,0);assert.equal(f.errors.length,1);await assert.rejects(f.connection.prepareNativeGateResources(resources()),/unavailable/i);}finally{f.close();}
});

test('disposal rejects a pending flush and late acknowledgements cannot revive its connection',async()=>{
 const f=fixture();try{await f.connection.ready;f.holdReplies();const waiting=f.connection.flush(),rejected=assert.rejects(waiting,/disposed/i);rejected.catch(()=>{});await until(()=>f.replies.length===1);const receive=f.connection.status().phase==='running'&&f.sendReply;f.connection.dispose();receive(f.replies.shift());await rejected;assert.equal(f.connection.status().phase,'closed');assert.equal(f.connection.status().pending,0);await assert.rejects(f.connection.flush(),/closed|unavailable/i);}finally{f.close();}
});

for(const failure of ['false','throw','notification'])test(`flush cannot certify a previous failed commit (${failure}) even if onError only records it`,async()=>{
 const f=fixture({prepare:async(kind,r)=>({preparedWorldBoundary:r.worldBoundary,valid:()=>true,commit(){if(failure==='throw')throw Error('commit fixture failure');return failure!=='false';},abort(){}}),onCommit(){if(failure==='notification')throw Error('notification fixture failure');}});
 try{await f.connection.ready;const handle=await f.connection.prepareNativeGateResources(resources());assert(handle.commit({worldBoundary:boundary}));await assert.rejects(f.connection.flush(),/commit|flush|closed|unavailable|notification/i);assert.equal(f.connection.status().phase,'failed');assert.equal(f.endpoint.status().closed,true);assert(f.errors.length>=1);}finally{f.close();}
});
