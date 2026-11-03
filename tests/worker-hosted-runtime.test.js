import test from 'node:test';
import assert from 'node:assert/strict';
import {createWorkerHostedRuntime} from '../src/simulation/worker-hosted-runtime.js';

function setup(){
 const messages=[],worker={postMessage:value=>messages.push(value),terminate(){this.terminated=true;}},seen=[];let sequence=0,elapsed=0;
 const world={createConfirmedReceiver(){return {accept(packet){seen.push(packet.sequence);sequence=packet.sequence;elapsed=packet.elapsed;return {accepted:true};},acceptUnchanged(packet){sequence=packet.sequence;elapsed=packet.elapsed;return {accepted:true};},status(){return {sequence,lastElapsed:elapsed};}};}};
 const runtime=createWorkerHostedRuntime({world,session:'s',clientOptions:{snapshot:'x',chunkKeys:[]},workerFactory:()=>worker});return {runtime,worker,messages,seen};
}
test('hosted runtime publishes before resolving commands and rejects work on disposal',async()=>{
 const {runtime,worker,messages,seen}=setup(),start=runtime.start();assert.equal(messages[0].kind,'initialize');
 worker.onmessage({data:{kind:'publication',session:'s',publication:{sequence:1,elapsed:0,saveAvailable:true}}});worker.onmessage({data:{kind:'started',session:'s',initial:{sequence:1},status:{running:true}}});await start;
 const pause=runtime.submit({kind:'pause',reason:'menu'});assert.equal(messages.at(-1).command.kind,'pause');const id=messages.at(-1).id;
 worker.onmessage({data:{kind:'publication',session:'s',publication:{sequence:2,elapsed:.05,saveAvailable:false}}});assert.equal(runtime.status().saveAvailable,false);worker.onmessage({data:{kind:'commandResult',session:'s',id,result:{sequence:2}}});assert.equal((await pause).sequence,2);assert.deepEqual(seen,[1,2]);
 const pending=runtime.submit({kind:'snapshot'}),rejected=assert.rejects(pending,/disposed/);runtime.dispose();await rejected;assert.equal(worker.terminated,true);worker.onmessage({data:{kind:'publication',session:'s',publication:{sequence:3,elapsed:.1}}});assert.deepEqual(seen,[1,2]);
});
test('hosted runtime fails pending commands on a wrong session',async()=>{
 const {runtime,worker}=setup(),start=runtime.start(),rejected=assert.rejects(start,/session mismatch/);worker.onmessage({data:{kind:'started',session:'wrong'}});await rejected;assert.equal(runtime.status().running,false);assert.equal(worker.terminated,true);
});
test('hosted runtime reserves bounded space for control commands',async()=>{
 const messages=[],worker={postMessage:value=>messages.push(value),terminate(){}},world={createConfirmedReceiver:()=>({status:()=>({sequence:1,lastElapsed:0})})};
 const runtime=createWorkerHostedRuntime({world,session:'s',clientOptions:{},maxPending:1,controlReserve:1,workerFactory:()=>worker}),start=runtime.start();worker.onmessage({data:{kind:'started',session:'s',initial:{sequence:1},status:{}}});await start;
 const ordinary=runtime.submit({kind:'plant'}),paused=runtime.submit({kind:'pause',reason:'menu'});await assert.rejects(runtime.submit({kind:'resume',reason:'menu'}),/queue is full/);
 const rejected=[assert.rejects(ordinary,/disposed/),assert.rejects(paused,/disposed/)];runtime.dispose();await Promise.all(rejected);
});
test('hosted runtime rejects startup and command results that precede their publications',async()=>{
 const first=setup(),start=first.runtime.start(),rejectedStart=assert.rejects(start,/start before confirmed publication/);
 first.worker.onmessage({data:{kind:'started',session:'s',initial:{sequence:1},status:{}}});await rejectedStart;assert.equal(first.worker.terminated,true);
 const second=setup(),ready=second.runtime.start();second.worker.onmessage({data:{kind:'publication',session:'s',publication:{sequence:1,elapsed:0}}});second.worker.onmessage({data:{kind:'started',session:'s',initial:{sequence:1},status:{}}});await ready;
 const command=second.runtime.submit({kind:'pause'}),rejected=assert.rejects(command,/command before confirmed publication/),id=second.messages.at(-1).id;
 second.worker.onmessage({data:{kind:'commandResult',session:'s',id,result:{sequence:2}}});await rejected;assert.equal(second.worker.terminated,true);
});
