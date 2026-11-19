import test from 'node:test';
import assert from 'node:assert/strict';
import {createSimulationAuthorityClient} from '../src/simulation/simulation-authority-client.js';
import {createWorkerHostedRuntime} from '../src/simulation/worker-hosted-runtime.js';

function fixture(){const sent=[],worker={postMessage:m=>sent.push(m),terminate(){this.terminated=true;}},client=createSimulationAuthorityClient({snapshot:'{}',chunkKeys:[],session:'s',workerFactory:()=>worker}),receive=data=>worker.onmessage({data:{session:'s',...data}});receive({kind:'ready'});return {sent,worker,client,receive,close:()=>client.dispose()};}
const reply=(id,publicationFloor)=>({kind:'nativeIntentProductionQuiesced',id,holdId:id,version:1,publicationFloor});

for(const publicationFloor of [0,null])test(`authority RPC explicitly requests and preserves its actual publication floor ${publicationFloor}`,async()=>{
 const f=fixture();try{await f.client.ready;const p=f.client.quiesceNativeIntentProduction(40,{withPublicationFloor:true});p.catch(()=>{});assert.equal(f.sent.at(-1).withPublicationFloor,true);f.receive(reply(40,publicationFloor));assert.deepEqual(await p,{version:1,holdId:40,publicationFloor});assert.equal(f.client.status().next,1);
  const resuming=f.client.resumeNativeIntentProduction(40,41);f.receive({kind:'nativeIntentProductionResumed',id:41,holdId:40,version:1});assert.deepEqual(await resuming,{version:1,holdId:40});
 }finally{f.close();}
});

for(const floor of [-1,1,1.5,'0',undefined])test(`authority client rejects an invalid or undispatched floor ${String(floor)}`,async()=>{
 const f=fixture();try{await f.client.ready;const p=f.client.quiesceNativeIntentProduction(8,{withPublicationFloor:true}),rejected=assert.rejects(p,/floor|response|invalid/i);rejected.catch(()=>{});f.receive(reply(8,floor));await rejected;assert.equal(f.client.status().state,'failed');assert.equal(f.worker.terminated,true);}finally{f.close();}
});

test('a queued but undispatched command cannot be claimed as the source publication floor',async()=>{
 const f=fixture();try{await f.client.ready;const first=f.client.submit({kind:'snapshot'}),second=f.client.submit({kind:'snapshot'});first.result.catch(()=>{});second.result.catch(()=>{});assert.equal(f.client.status().inflight,1);const p=f.client.quiesceNativeIntentProduction(10,{withPublicationFloor:true}),rejected=assert.rejects(p,/floor|response|invalid/i);rejected.catch(()=>{});f.receive(reply(10,2));await rejected;assert.equal(f.client.status().state,'failed');}finally{f.close();}
});

test('the source floor cannot precede an already confirmed authority command',async()=>{
 const f=fixture();try{await f.client.ready;const first=f.client.submit({kind:'snapshot'});f.receive({kind:'result',sequence:1});await first.result;const p=f.client.quiesceNativeIntentProduction(10,{withPublicationFloor:true}),rejected=assert.rejects(p,/floor|response|invalid/i);rejected.catch(()=>{});f.receive(reply(10,0));await rejected;assert.equal(f.client.status().state,'failed');}finally{f.close();}
});

test('an in-flight source command may be the publication floor without completing its normal FIFO response early',async()=>{
 const f=fixture();try{await f.client.ready;const first=f.client.submit({kind:'snapshot'});first.result.catch(()=>{});const p=f.client.quiesceNativeIntentProduction(10,{withPublicationFloor:true});f.receive(reply(10,1));assert.deepEqual(await p,{version:1,holdId:10,publicationFloor:1});assert.equal(f.client.status().inflight,1);f.receive({kind:'result',sequence:1});await first.result;assert.equal(f.client.status().next,2);}finally{f.close();}
});

test('invalid floor request options are rejected before sending a lifecycle message',async()=>{
 const f=fixture();try{await f.client.ready;const n=f.sent.length,p=f.client.quiesceNativeIntentProduction(7,{withPublicationFloor:'yes'});p.catch(()=>{});assert.equal(f.sent.length,n);await assert.rejects(p,/invalid|floor|option/i);}finally{f.close();}
});

for(const publicationFloor of [3,null,-1,undefined])test(`hosted runtime correlates an explicitly requested source floor ${String(publicationFloor)}`,async()=>{
 const sent=[],worker={postMessage:m=>sent.push(m),terminate(){}},runtime=createWorkerHostedRuntime({world:{createConfirmedReceiver:()=>({accept:()=>({accepted:true}),acceptUnchanged:()=>({accepted:true}),status:()=>({sequence:1,lastElapsed:0})})},session:'s',clientOptions:{snapshot:'{}',chunkKeys:[]},workerFactory:()=>worker});
 const receive=data=>worker.onmessage({data:{session:'s',...data}});
 try{const starting=runtime.start();receive({kind:'publication',publication:{sequence:1,elapsed:0,events:[]}});receive({kind:'started',sequence:1,status:{}});await starting;const p=runtime.quiesceNativeIntentProduction({withPublicationFloor:true});p.catch(()=>{});assert.equal(sent.at(-1).withPublicationFloor,true);const id=sent.at(-1).id;
  if(publicationFloor===null||publicationFloor===3){receive(reply(id,publicationFloor));assert.deepEqual(await p,{version:1,holdId:id,publicationFloor});}
  else{const rejected=assert.rejects(p,/floor|response|invalid/i);rejected.catch(()=>{});receive(reply(id,publicationFloor));await rejected;assert.equal(runtime.status().running,false);}
 }finally{runtime.dispose();}
});
