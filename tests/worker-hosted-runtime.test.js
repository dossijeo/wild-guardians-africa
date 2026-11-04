import test from 'node:test';
import assert from 'node:assert/strict';
import {MessageChannel} from 'node:worker_threads';
import {once} from 'node:events';
import {createWorkerHostedRuntime} from '../src/simulation/worker-hosted-runtime.js';

test('confirmed events are delivered after each reconciliation before ACK without an event backlog',async()=>{
 const messages=[],order=[],worker={postMessage:value=>messages.push(value),terminate(){this.terminated=true;}};let sequence=0;
 const world={createConfirmedReceiver(){return {accept(p){sequence=p.sequence;order.push(`state-${sequence}`);return {accepted:true};},status(){return {sequence,lastElapsed:0};}};}};
 const runtime=createWorkerHostedRuntime({world,session:'s',clientOptions:{},runtimeOptions:{coalescePublications:true},workerFactory:()=>worker,onConfirmedEvents:events=>order.push(...events.map(event=>event.id))});
 const start=runtime.start();worker.onmessage({data:{kind:'publication',session:'s',publication:{sequence:1,elapsed:0,events:[]}}});worker.onmessage({data:{kind:'started',session:'s',sequence:1,status:{}}});await start;
 const events=Array.from({length:205},(_,i)=>({id:`event-${i+1}`,type:'unused'}));worker.onmessage({data:{kind:'publication',session:'s',publication:{sequence:2,elapsed:1,events}}});
 worker.onmessage({data:{kind:'publication',session:'s',publication:{sequence:3,elapsed:2,events:[{id:'event-206',type:'unused'}]}}});
 assert.equal(runtime.confirmedEventDelivery,true);assert.equal(order[1],'state-2');assert.equal(order[2],'event-1');assert.equal(order[206],'event-205');assert.equal(order[207],'state-3');assert.equal(order[208],'event-206');assert.equal(messages.at(-1).sequence,3);runtime.dispose();
});
test('presentation event failure is reported without terminating the authority',async()=>{
 const messages=[],errors=[],worker={postMessage:value=>messages.push(value),terminate(){this.terminated=true;}};let sequence=0;
 const world={createConfirmedReceiver(){return {accept(p){sequence=p.sequence;return {accepted:true};},status(){return {sequence,lastElapsed:0};}};}};
 const runtime=createWorkerHostedRuntime({world,session:'s',clientOptions:{},runtimeOptions:{coalescePublications:true},workerFactory:()=>worker,onConfirmedEvents:()=>{throw Error('presentation');},onViewError:error=>errors.push(error.message)});
 const start=runtime.start();worker.onmessage({data:{kind:'publication',session:'s',publication:{sequence:1,elapsed:0,events:[]}}});worker.onmessage({data:{kind:'started',session:'s',sequence:1,status:{}}});await start;
 worker.onmessage({data:{kind:'publication',session:'s',publication:{sequence:2,elapsed:1,events:[{id:'event-1'}]}}});assert.deepEqual(errors,['presentation']);assert.equal(runtime.status().fault,null);assert.equal(worker.terminated,undefined);assert.equal(messages.at(-1).sequence,2);runtime.dispose();
});

function setup(runtimeOptions={}){
 const messages=[],worker={postMessage:value=>messages.push(structuredClone(value)),terminate(){this.terminated=true;}},seen=[];let sequence=0,elapsed=0;
 const world={createConfirmedReceiver(){return {accept(packet){seen.push(packet.sequence);sequence=packet.sequence;elapsed=packet.elapsed;return {accepted:true};},acceptUnchanged(packet){sequence=packet.sequence;elapsed=packet.elapsed;return {accepted:true};},status(){return {sequence,lastElapsed:elapsed};}};}};
 const runtime=createWorkerHostedRuntime({world,session:'s',clientOptions:{snapshot:'x',chunkKeys:[],compactViewAcks:runtimeOptions.backgroundViews===true},runtimeOptions,workerFactory:()=>worker});return {runtime,worker,messages,seen};
}
test('hosted runtime publishes before resolving commands and rejects work on disposal',async()=>{
 const {runtime,worker,messages,seen}=setup(),start=runtime.start();assert.equal(messages[0].kind,'initialize');
 worker.onmessage({data:{kind:'publication',session:'s',publication:{sequence:1,elapsed:0,saveAvailable:true}}});worker.onmessage({data:{kind:'started',session:'s',sequence:1,status:{running:true}}});await start;
 const pause=runtime.submit({kind:'pause',reason:'menu'});assert.equal(messages.at(-1).command.kind,'pause');const id=messages.at(-1).id;
 const publication={sequence:2,elapsed:.05,saveAvailable:false,snapshot:'state',events:[{id:'event-1'}]};worker.onmessage({data:{kind:'publication',session:'s',publication}});assert.equal(runtime.status().saveAvailable,false);worker.onmessage({data:{kind:'commandResult',session:'s',id,sequence:2}});assert.equal(await pause,publication);assert.deepEqual(seen,[1,2]);
 const pending=runtime.submit({kind:'snapshot'}),rejected=assert.rejects(pending,/disposed/);runtime.dispose();await rejected;assert.equal(worker.terminated,true);worker.onmessage({data:{kind:'publication',session:'s',publication:{sequence:3,elapsed:.1}}});assert.deepEqual(seen,[1,2]);
});
test('hosted runtime fails pending commands on a wrong session',async()=>{
 const {runtime,worker}=setup(),start=runtime.start(),rejected=assert.rejects(start,/session mismatch/);worker.onmessage({data:{kind:'started',session:'wrong'}});await rejected;assert.equal(runtime.status().running,false);assert.equal(worker.terminated,true);
});
test('hosted runtime reserves bounded space for control commands',async()=>{
 const messages=[],worker={postMessage:value=>messages.push(value),terminate(){}},world={createConfirmedReceiver:()=>({accept:()=>({accepted:true}),status:()=>({sequence:1,lastElapsed:0})})};
 const runtime=createWorkerHostedRuntime({world,session:'s',clientOptions:{},maxPending:1,controlReserve:1,workerFactory:()=>worker}),start=runtime.start();worker.onmessage({data:{kind:'publication',session:'s',publication:{sequence:1,elapsed:0}}});worker.onmessage({data:{kind:'started',session:'s',sequence:1,status:{}}});await start;
 const ordinary=runtime.submit({kind:'plant'}),paused=runtime.submit({kind:'pause',reason:'menu'});await assert.rejects(runtime.submit({kind:'resume',reason:'menu'}),/queue is full/);
 const rejected=[assert.rejects(ordinary,/disposed/),assert.rejects(paused,/disposed/)];runtime.dispose();await Promise.all(rejected);
});
test('hosted runtime rejects startup and command results that precede their publications',async()=>{
 const first=setup(),start=first.runtime.start(),rejectedStart=assert.rejects(start,/start before confirmed publication/);
 first.worker.onmessage({data:{kind:'started',session:'s',sequence:1,status:{}}});await rejectedStart;assert.equal(first.worker.terminated,true);
 const second=setup(),ready=second.runtime.start();second.worker.onmessage({data:{kind:'publication',session:'s',publication:{sequence:1,elapsed:0}}});second.worker.onmessage({data:{kind:'started',session:'s',sequence:1,status:{}}});await ready;
 const command=second.runtime.submit({kind:'pause'}),rejected=assert.rejects(command,/command before confirmed publication/),id=second.messages.at(-1).id;
 second.worker.onmessage({data:{kind:'commandResult',session:'s',id,sequence:2}});await rejected;assert.equal(second.worker.terminated,true);
});
test('diagnostic acknowledgements follow successful publication and are disabled otherwise',async()=>{
 const enabled=setup({diagnostics:true}),start=enabled.runtime.start();enabled.worker.onmessage({data:{kind:'publication',session:'s',publication:{sequence:1,elapsed:0}}});
 assert.deepEqual(enabled.messages.at(-1),{kind:'publicationAck',session:'s',sequence:1});assert.deepEqual(enabled.seen,[1]);assert.equal(enabled.runtime.status().reception.count,1);assert.ok(enabled.runtime.status().reception.mean>=0);
 enabled.worker.onmessage({data:{kind:'started',session:'s',sequence:1,status:{}}});await start;enabled.runtime.dispose();
 const disabled=setup(),ready=disabled.runtime.start();disabled.worker.onmessage({data:{kind:'publication',session:'s',publication:{sequence:1,elapsed:0}}});assert.equal(disabled.messages.length,1);assert.equal(disabled.runtime.status().reception,undefined);
 disabled.worker.onmessage({data:{kind:'started',session:'s',sequence:1,status:{}}});await ready;disabled.runtime.dispose();
});
test('folded camera confirmation returns the original unchanged receipt',async()=>{
 const {runtime,worker,messages}=setup({coalescePublications:true,foldViews:true}),start=runtime.start();worker.onmessage({data:{kind:'publication',session:'s',publication:{sequence:1,elapsed:0}}});worker.onmessage({data:{kind:'started',session:'s',sequence:1,status:{}}});await start;
 const result=runtime.submit({kind:'setNavigationView',view:{}}),id=messages.at(-1).id,receipt={session:'s',sequence:3,unchanged:true,events:[],stateSequence:1};worker.onmessage({data:{kind:'publication',session:'s',tick:true,firstSequence:2,publication:{sequence:3,elapsed:.1}}});worker.onmessage({data:{kind:'commandResult',session:'s',id,sequence:3,receipt}});assert.equal(await result,receipt);runtime.dispose();
});
test('background camera updates do not wait for a command result and accept ordered unchanged ranges',async()=>{
 const {runtime,worker,messages}=setup({coalescePublications:true,backgroundViews:true}),start=runtime.start();worker.onmessage({data:{kind:'publication',session:'s',publication:{sequence:1,elapsed:0}}});worker.onmessage({data:{kind:'started',session:'s',sequence:1,status:{}}});await start;
 const view={bounds:[0,1,2,3],eye:{x:1,z:2},target:{x:3,z:4}};assert.equal(runtime.setNavigationView(view),undefined);assert.deepEqual(messages.at(-1),{kind:'view',session:'s',command:{kind:'setNavigationView',view}});
 worker.onmessage({data:{kind:'publication',session:'s',backgroundView:true,firstSequence:2,publication:{sequence:3,elapsed:0,unchanged:true}}});assert.equal(runtime.status().confirmedSequence,3);assert.equal(messages.at(-1).kind,'publicationAck');runtime.dispose();
});
test('posting camera and action isolates later caller mutations and rejects uncloneable payloads',async()=>{
 const {runtime,worker,messages}=setup({coalescePublications:true,backgroundViews:true}),start=runtime.start();worker.onmessage({data:{kind:'publication',session:'s',publication:{sequence:1,elapsed:0}}});worker.onmessage({data:{kind:'started',session:'s',sequence:1,status:{}}});await start;
 const view={bounds:[0,1,2,3],eye:{x:1,z:2},target:{x:3,z:4}},command={kind:'plant',position:{x:7,z:8}};runtime.setNavigationView(view);const postedView=messages.at(-1);view.eye.x=99;view.bounds[0]=99;assert.equal(postedView.command.view.eye.x,1);assert.equal(postedView.command.view.bounds[0],0);
 const pending=runtime.submit(command),postedCommand=messages.at(-1);command.position.x=99;assert.equal(postedCommand.command.position.x,7);await assert.rejects(runtime.submit({kind:'plant',value:()=>{}}),/clone/i);assert.equal(runtime.status().fault,null);assert.throws(()=>runtime.setNavigationView({bad:()=>{}}),/clone/i);
 const disposed=assert.rejects(pending,/disposed/);runtime.dispose();await disposed;
});
test('native message channel captures mutable input at post time',async()=>{
 const {port1,port2}=new MessageChannel(),worker={postMessage:value=>port1.postMessage(value),terminate(){port1.close();port2.close();}},world={createConfirmedReceiver(){let sequence=0;return {accept(message){sequence=message.sequence;return {accepted:true};},status:()=>({sequence,lastElapsed:0})};}};
 const runtime=createWorkerHostedRuntime({world,session:'s',clientOptions:{compactViewAcks:true},runtimeOptions:{coalescePublications:true,backgroundViews:true},workerFactory:()=>worker});const initialized=once(port2,'message'),start=runtime.start();await initialized;worker.onmessage({data:{kind:'publication',session:'s',publication:{sequence:1,elapsed:0}}});await once(port2,'message');worker.onmessage({data:{kind:'started',session:'s',sequence:1,status:{}}});await start;
 const view={eye:{x:3},target:{x:5},bounds:[1,2,3,4]},received=once(port2,'message');runtime.setNavigationView(view);view.eye.x=9;view.bounds[0]=9;const [message]=await received;assert.equal(message.command.view.eye.x,3);assert.equal(message.command.view.bounds[0],1);runtime.dispose();
});
