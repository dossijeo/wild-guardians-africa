import test from 'node:test';import assert from 'node:assert/strict';
import {createWorkerGameRuntime} from '../src/simulation/worker-game-runtime.js';
const flush=()=>new Promise(resolve=>setImmediate(resolve));
test('runtime orders elapsed ticks, residency and pause commands without a render loop',async()=>{
 let time=0,nextTimer=0,nextSequence=0;const timers=new Map(),sent=[],accepted=[],client={ready:Promise.resolve(),submit(command){let resolve,reject;const result=new Promise((a,b)=>{resolve=a;reject=b;});sent.push({command,resolve,reject,sequence:++nextSequence});return {accepted:true,result};},dispose(){}};
 const world={createConfirmedReceiver(){let sequence=0;return {accept(message){if(message.sequence!==sequence+1)return {accepted:false,reason:'gap'};sequence=message.sequence;accepted.push(sequence);return {accepted:true,sequence};},status(){return {sequence,lastElapsed:0,fault:false};}};}};
 const runtime=createWorkerGameRuntime({client,world,session:'s',now:()=>time,schedule:fn=>{const id=++nextTimer;timers.set(id,fn);return id;},cancel:id=>timers.delete(id)});
 const complete=async(index,missing=[])=>{const item=sent[index];assert.ok(item);item.resolve({session:'s',sequence:item.sequence,residency:{missing},saveAvailable:true});await flush();};
 const started=runtime.start();await flush();assert.equal(sent[0].command.kind,'snapshot');await complete(0,['1,2']);await started;assert.deepEqual(sent[1].command,{kind:'addChunk',key:'1,2'});
 await assert.rejects(runtime.submit({kind:'advance',seconds:.5,nightFastForward:true}),/Invalid external/);assert.equal(runtime.status().fault,null);
 time=125;const wake=timers.values().next().value;timers.clear();wake();assert.equal(runtime.status().pendingSteps,2);time=130;const paused=runtime.submit({kind:'pause',reason:'menu'});await complete(1);assert.deepEqual(sent[2].command,{kind:'advance',seconds:.05,nightFastForward:true});assert.equal(runtime.status().pendingSteps,2);
 await complete(2);assert.equal(sent[3].command.kind,'advance');await complete(3);assert.deepEqual(sent[4].command,{kind:'pause',reason:'menu'});await complete(4);await paused;
 const resumed=runtime.submit({kind:'resume',reason:'menu'});assert.equal(sent[5].command.kind,'resume');time=155;const wake2=timers.values().next().value;timers.clear();wake2();await complete(5);await resumed;assert.equal(sent[6].command.kind,'advance');await complete(6);
 assert.deepEqual(accepted,[1,2,3,4,5,6,7]);assert.equal(runtime.status().confirmedSequence,7);runtime.dispose();assert.equal(runtime.status().closed,true);
});
test('disposing rejects an in-flight command even if its reply arrives later',async()=>{
 const sent=[],client={ready:Promise.resolve(),submit(command){let resolve;const result=new Promise(r=>{resolve=r;});sent.push({command,resolve});return {accepted:true,result};},dispose(){}};let sequence=0;
 const world={createConfirmedReceiver(){return {accept(message){sequence=message.sequence;return {accepted:true};},status(){return {sequence,lastElapsed:0,fault:false};}};}};
 const runtime=createWorkerGameRuntime({client,world,session:'s',now:()=>0,schedule:()=>1,cancel:()=>{}}),starting=runtime.start();await flush();sent[0].resolve({sequence:1,residency:{missing:[]},saveAvailable:true});await starting;
 const pending=runtime.submit({kind:'pause',reason:'menu'}),rejected=assert.rejects(pending,/disposed/);runtime.dispose();await rejected;sent[1].resolve({sequence:2,residency:{missing:[]},saveAvailable:true});await flush();assert.equal(sequence,1);
});
