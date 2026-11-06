import test from 'node:test';
import assert from 'node:assert/strict';
import {createWebGpuWorldClient} from '../src/rendering/webgpu-world-client.js';

test('real world client routes and bounds microevent frames without blocking camera',async()=>{
 const worker={messages:[],postMessage(message){this.messages.push(message);},terminate(){}},port=()=>({close(){}}),client=createWebGpuWorldClient({canvas:{transferControlToOffscreen:()=>({})},session:'s',snapshot:'{}',workerFactory:()=>worker,channelFactory:()=>({port1:port(),port2:port()})});
 try{worker.onmessage({data:{kind:'ready',backend:'WebGPU'}});await client.ready;const prepared=client.microevents.prepare();assert.equal(worker.messages.at(-1).kind,'prepareMicroevents');worker.onmessage({data:{kind:'microeventPrepareResult'}});await prepared;
  const frame={origin:[0,0,0],light:1,instances:new Float32Array(15)};client.microevents.frame(frame);client.microevents.frame(frame);client.setCamera({x:1});assert.equal(worker.messages.at(-1).kind,'camera');worker.onmessage({data:{kind:'microeventFrameAck',sequence:1}});assert.equal(worker.messages.at(-1).kind,'microeventFrame');assert.equal(worker.messages.at(-1).frame.sequence,2);
 }finally{client.dispose();}
});
