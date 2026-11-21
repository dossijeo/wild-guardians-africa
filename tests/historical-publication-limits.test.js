import test from 'node:test';
import assert from 'node:assert/strict';
import {historicalPublicationRuntimeOptions, HISTORICAL_MAX_REAL_DURATION} from '../src/simulation/historical-publication-limits.js';
import {createWorkerGameRuntime} from '../src/simulation/worker-game-runtime.js';

test('only recoverable historical profile bounds the publication horizon',()=>{
 const opts={stepSeconds:.05,maxBatchSteps:16,batchWindowSteps:2};
 assert.equal(historicalPublicationRuntimeOptions(opts,false),opts);
 assert.deepEqual(historicalPublicationRuntimeOptions(opts,true),{stepSeconds:.05,maxBatchSteps:2,batchWindowSteps:2});
 assert.deepEqual(historicalPublicationRuntimeOptions({stepSeconds:.04,maxBatchSteps:16,batchWindowSteps:4},true),{stepSeconds:.04,maxBatchSteps:2,batchWindowSteps:2});
 assert.equal(historicalPublicationRuntimeOptions({stepSeconds:.1,maxBatchSteps:8},true).maxBatchSteps,1);
 assert.throws(()=>historicalPublicationRuntimeOptions({stepSeconds:.101},true),/horizon/);
 assert.throws(()=>historicalPublicationRuntimeOptions({maxBatchSteps:0},true),/horizon/);
 assert.throws(()=>historicalPublicationRuntimeOptions({maxBatchSteps:2,batchWindowSteps:3},true),/horizon/);
 assert.equal(HISTORICAL_MAX_REAL_DURATION,.1);
});

test('bounded batches retain all accepted ticks, events and intervening command order',async()=>{
 let time=0,sequence=0,allowed=false,wake;const commands=[],events=[],publications=[];
 const client={ready:Promise.resolve(),submit(command){commands.push(command);const n=++sequence,steps=command.steps??1;return {accepted:true,result:Promise.resolve({sequence:n,stepsExecuted:steps,residency:{missing:[]},events:command.kind==='advance'?Array.from({length:steps},(_,i)=>({id:`${n}:${i}`})):[]})};},dispose(){}};
 const world={createConfirmedReceiver(){let n=0;return {accept(message){assert.equal(message.sequence,++n);publications.push(n);return {accepted:true};},status(){return {sequence:n,lastElapsed:0};}};}};
 const options=historicalPublicationRuntimeOptions({stepSeconds:.05,maxBatchSteps:16,batchWindowSteps:2},true);
 const runtime=createWorkerGameRuntime({...options,client,world,session:'s',now:()=>time,schedule:fn=>(wake=fn,1),cancel(){},canDispatch:command=>allowed||command.kind==='snapshot',onConfirmedEvents:items=>events.push(...items.map(item=>item.id))});
 try{await runtime.start();time=250;wake();const pause=runtime.submit({kind:'pause',reason:'menu'});time=400;wake();assert.equal(runtime.status().pendingSteps,8);allowed=true;runtime.resumeDispatch();await pause;for(let i=0;i<20&&runtime.status().pendingSteps;i++)await new Promise(resolve=>setImmediate(resolve));
  assert.deepEqual(commands.map(command=>[command.kind,command.steps??1]),[['snapshot',1],['advance',2],['advance',2],['advance',1],['pause',1],['advance',2],['advance',1]]);
  assert.deepEqual(publications,[1,2,3,4,5,6,7]);assert.deepEqual(events,['2:0','2:1','3:0','3:1','4:0','6:0','6:1','7:0']);assert.equal(runtime.status().pendingSteps,0);
 }finally{runtime.dispose();}
});
