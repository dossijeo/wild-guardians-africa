import test from 'node:test';
import assert from 'node:assert/strict';
import {createWebGpuWorldClient} from '../src/rendering/webgpu-world-client.js';
import {handoffWebGpuSurface} from '../src/app/webgpu-surface-handoff.js';
import {createWebGpuMicroeventSender} from '../src/microevents/webgpu-billboard-sender.js';

const checkpoint=(sequence=2)=>({sequence,presentationCheckpoint:{version:1,sequence,elapsed:10,...Object.fromEntries(['guardian','agriculture','blessing'].map(k=>[k,{version:1,sequence,elapsed:10}]))},workCheckpoint:{version:1,sequence,elapsed:10,effects:[]}});
const frame=(recoveryId=0)=>({kind:'rendered-frame',sequence:2,terrainGeneration:1,selectableGeneration:1,cameraVersion:0,...(recoveryId?{recoveryId}:{})});
function fixture(options={}){
 const messages=[],channels=[],errors=[];let canvasTransfers=0,workers=0,drawWorkers=0;
 const worker={postMessage(message,transfer){messages.push({message,transfer});},terminate(){}},draw={postMessage(){},terminate(){}},canvas={style:{visibility:''},transferControlToOffscreen(){canvasTransfers++;return {};}};
 const client=createWebGpuWorldClient({canvas,session:'s',snapshot:'{}',remoteDraw:true,intentControlPort:{postMessage(){}},presentationRecovery:true,presentationWorkRecovery:true,experimentalTemporalPresentation:{product:true,checkpoints:true},presentationCapabilities:{coordinatedChunks:true,causalInputs:true},workerFactory:()=>{workers++;return worker;},drawWorkerFactory:()=>{drawWorkers++;return draw;},channelFactory:()=>{const port=()=>({postMessage(){},start(){},close(){this.closed=true;}}),channel={port1:port(),port2:port()};channels.push(channel);return channel;},onError:e=>errors.push(e),...options});
 worker.onmessage({data:{kind:'ready',backend:'WebGPU'}});
 return {client,worker,canvas,messages,channels,errors,send:data=>worker.onmessage({data}),counts:()=>({canvasTransfers,workers,drawWorkers}),last:()=>messages.at(-1),dispose:()=>client.dispose()};
}

test('retained client replaces only its three transports and requires a newly acknowledged frame generation',async()=>{
 const f=fixture();try{await f.client.ready;f.send(frame());f.send({kind:'firstFrame'});assert.equal(f.client.hasCurrentFrame(),true);const waiting=f.client.waitForCurrentFrame({minSequence:99});const rejected=assert.rejects(waiting,/recovery|rebind/i);rejected.catch(()=>{});const oldChannels=f.channels.length,preparing=f.client.prepareRetainedRecovery();await rejected;const request=f.last();assert.equal(request.message.kind,'recovery-rebind');assert.equal(request.message.session,'s');assert.deepEqual(request.transfer,[request.message.terrainPort,request.message.presentationPort,request.message.recoveryPort]);assert.equal(f.client.hasCurrentFrame(),false);assert.equal(f.client.status().firstFrameRendered,false);assert.equal(f.client.status().phase,'recovering');f.send(frame());f.send({kind:'firstFrame'});assert.equal(f.client.hasCurrentFrame(),false);assert.equal(f.client.status().firstFrameRendered,false);
  f.send({kind:'recovery-rebound',id:request.message.id,retainedCheckpoint:checkpoint()});const result=await preparing;assert.equal(f.channels.length,oldChannels+3);assert.equal(result.terrainPort,f.channels[oldChannels].port2);assert.equal(result.presentationPort,f.channels[oldChannels+1].port2);assert.equal(result.recoveryPort,f.channels[oldChannels+2].port2);assert.deepEqual(result.retainedCheckpoint,checkpoint());assert.deepEqual(f.counts(),{canvasTransfers:1,workers:1,drawWorkers:1});assert.equal(f.client.status().phase,'recovering');f.client.finishRecovery();assert.deepEqual(f.last().message,{kind:'recovery-live',recoveryId:request.message.id});f.send(frame(request.message.id));assert.equal(f.client.hasCurrentFrame(),false,'new frame is still rejected before recovery-live ACK');f.send({kind:'recoveryLive'});assert.equal(f.client.status().phase,'recovering');f.send({kind:'recoveryLive',recoveryId:request.message.id});assert.equal(f.client.status().phase,'running');f.send(frame());assert.equal(f.client.hasCurrentFrame(),false);f.send(frame(request.message.id));assert.equal(f.client.hasCurrentFrame(),true);f.send({kind:'firstFrame'});assert.equal(f.client.status().firstFrameRendered,false);f.send({kind:'firstFrame',recoveryId:request.message.id});assert.equal(f.client.status().firstFrameRendered,true);
 }finally{f.dispose();}
});

test('repeated retained recovery uses monotonic RPC identity even at the same publication and ignores previous witnesses',async()=>{
 const f=fixture();let previous=0;try{for(let i=0;i<2;i++){const p=f.client.prepareRetainedRecovery(),id=f.last().message.id;assert.ok(id>previous);f.send({kind:'recovery-rebound',id,retainedCheckpoint:checkpoint()});await p;f.client.finishRecovery();f.send({kind:'recoveryLive',recoveryId:id});f.send(frame(previous));assert.equal(f.client.hasCurrentFrame(),false);f.send(frame(id));assert.equal(f.client.hasCurrentFrame(),true);previous=id;}assert.deepEqual(f.counts(),{canvasTransfers:1,workers:1,drawWorkers:1});assert.deepEqual(f.errors,[]);}finally{f.dispose();}
});

test('retainable frame failure preserves the microevent facade and can rebind; hardware loss remains terminal',async()=>{
 const f=fixture(),sender=f.client.microevents;try{f.send({kind:'failure',code:'remote-frame-native-mutation-obsolete',message:'old recording'});assert.equal(f.client.status().phase,'failed');assert.equal(sender.status().closed,false);const p=f.client.prepareRetainedRecovery(),id=f.last().message.id;f.send({kind:'recovery-rebound',id,retainedCheckpoint:checkpoint()});await p;f.client.finishRecovery();f.send({kind:'recoveryLive',recoveryId:id});assert.equal(f.client.microevents,sender);f.send({kind:'failure',message:'WebGPU device lost: destroyed'});assert.equal(sender.status().closed,true);await assert.rejects(f.client.prepareRetainedRecovery(),/unavailable/i);}finally{f.dispose();}
});

test('retained capability is absent without the existing coordinated temporal remote owner',()=>{
 for(const options of [{remoteDraw:false,intentControlPort:null},{experimentalTemporalPresentation:null},{presentationCapabilities:{coordinatedChunks:false}}]){const f=fixture(options);try{assert.equal(f.client.prepareRetainedRecovery,undefined);}finally{f.dispose();}}
});

test('pending presentation input prevents local transport replacement and disposal is terminal',async()=>{
 const f=fixture();try{const input=f.client.submitPresentationInput(1,{kind:'pause',reason:'test'});input.catch(()=>{});const before=f.channels.length;await assert.rejects(f.client.prepareRetainedRecovery(),/unavailable/i);assert.equal(f.channels.length,before);f.dispose();await assert.rejects(input);await assert.rejects(f.client.prepareRetainedRecovery(),/unavailable/i);}finally{f.dispose();}
});

test('retained rejection and malformed checkpoint close candidate transports and cannot authorize a frame',async()=>{
 for(const bad of [false,true]){const f=fixture();try{const count=f.channels.length,p=f.client.prepareRetainedRecovery(),id=f.last().message.id;if(bad)f.send({kind:'recovery-rebound',id,retainedCheckpoint:checkpoint(0)});else f.send({kind:'recovery-rebind-error',id,message:'owner unavailable'});await assert.rejects(p,/unavailable|checkpoint/i);assert.equal(f.client.status().phase,'failed');assert.equal(f.client.hasCurrentFrame(),false);assert.ok(f.channels.slice(count).every(c=>c.port1.closed&&c.port2.closed));f.send(frame(id));assert.equal(f.client.hasCurrentFrame(),false);}finally{f.dispose();}}
});

test('a timed out retained request cannot consume its late result or revive the old frame',async()=>{
 const f=fixture();try{const p=f.client.prepareRetainedRecovery({timeoutMs:5}),id=f.last().message.id;await assert.rejects(p,/timed out/i);f.send({kind:'recovery-rebound',id,retainedCheckpoint:checkpoint()});f.send({kind:'recoveryLive',recoveryId:id});f.send(frame(id));assert.equal(f.client.status().phase,'failed');assert.equal(f.client.hasCurrentFrame(),false);}finally{f.dispose();}
});

test('retained handoff reuses the existing camera binding without binding or disposing it',async()=>{
 const calls=[],canvas={style:{visibility:''}},client={setCamera(){},resize(){},waitForCurrentFrame:async()=>{},hasCurrentFrame:()=>true},previous={client,canvas,dispose(){calls.push('dispose');}},next=await handoffWebGpuSurface({client,canvas,previous,retainPrevious:true,isCurrent:()=>true,readCamera:()=>0,readSize:()=>({width:1,height:1}),bind(){calls.push('bind');throw Error('duplicate binding');},commit:value=>{assert.equal(value,previous);calls.push('commit');},beforeCommit:async()=>{calls.push('finish');return 3;},beforePublish:()=>calls.push('check'),afterPublish:()=>calls.push('publish'),minSequence:2,requestFrame:()=>1,cancelFrame(){}});assert.equal(next,previous);assert.deepEqual(calls,['finish','check','commit','publish']);assert.equal(canvas.style.visibility,'');
});

test('retained handoff rejects a different client/canvas and keeps the same binding on failed publication',async()=>{
 const canvas={style:{visibility:''}},client={setCamera(){},resize(){},waitForCurrentFrame:async()=>{},hasCurrentFrame:()=>true};let disposed=0;const previous={client,canvas,dispose(){disposed++;}},options={client,canvas,previous,retainPrevious:true,isCurrent:()=>true,readCamera:()=>0,readSize:()=>({width:1,height:1}),bind:()=>previous,commit(){},minSequence:2,requestFrame:()=>1,cancelFrame(){}};
 await assert.rejects(handoffWebGpuSurface({...options,previous:{...previous,client:{}}}),/retained|handoff/i);await assert.rejects(handoffWebGpuSurface({...options,canvas:{style:{}}}),/retained|handoff/i);await assert.rejects(handoffWebGpuSurface({...options,beforePublish(){throw Error('stale dispatch');}}),/stale dispatch/);assert.equal(disposed,0);assert.equal(canvas.style.visibility,'');
});

test('microevent reset drops old transient frames and ACKs while retaining monotonic identity',async()=>{
 const sent=[],sender=createWebGpuMicroeventSender({send:m=>sent.push(m),isOpen:()=>true}),value={origin:[0,0,0],light:1,instances:new Float32Array(15)};try{let p=sender.prepare();sender.receive({kind:'microeventPrepareResult'});await p;assert.equal(sender.frame(value),1);assert.equal(sender.frame(value),2);sender.reset();assert.equal(sender.status().closed,false);assert.equal(sender.status().queued,null);p=sender.prepare();sender.receive({kind:'microeventPrepareResult'});await p;assert.equal(sender.frame(value),3);const before=sent.length;sender.receive({kind:'microeventFrameAck',sequence:1});assert.equal(sent.length,before);assert.equal(sender.status().inflight,3);assert.deepEqual(sent.filter(m=>m.kind==='microeventFrame').map(m=>m.frame.sequence),[1,3]);}finally{sender.dispose();}
});
