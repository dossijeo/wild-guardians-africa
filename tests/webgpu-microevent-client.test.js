import test from 'node:test';
import assert from 'node:assert/strict';
import {createWebGpuWorldClient} from '../src/rendering/webgpu-world-client.js';

test('real world client routes and bounds microevent frames without blocking camera',async()=>{
 const worker={messages:[],postMessage(message){this.messages.push(message);},terminate(){}},port=()=>({close(){}}),client=createWebGpuWorldClient({canvas:{transferControlToOffscreen:()=>({})},session:'s',snapshot:'{}',workerFactory:()=>worker,channelFactory:()=>({port1:port(),port2:port()})});
 try{worker.onmessage({data:{kind:'ready',backend:'WebGPU'}});await client.ready;const prepared=client.microevents.prepare();assert.equal(worker.messages.at(-1).kind,'prepareMicroevents');worker.onmessage({data:{kind:'microeventPrepareResult'}});await prepared;
  const frame={origin:[0,0,0],light:1,instances:new Float32Array(15)};client.microevents.frame(frame);client.microevents.frame(frame);client.setCamera({x:1});assert.equal(worker.messages.at(-1).kind,'camera');worker.onmessage({data:{kind:'microeventFrameAck',sequence:1}});assert.equal(worker.messages.at(-1).kind,'microeventFrame');assert.equal(worker.messages.at(-1).frame.sequence,2);
 }finally{client.dispose();}
});

test('microevent visibility cannot admit a result after a camera change',async()=>{
 const worker={messages:[],postMessage(message){this.messages.push(message);},terminate(){}},port=()=>({close(){}}),client=createWebGpuWorldClient({canvas:{transferControlToOffscreen:()=>({})},session:'s',snapshot:'{}',presentationInputs:true,workerFactory:()=>worker,channelFactory:()=>({port1:port(),port2:port()})});
 try{worker.onmessage({data:{kind:'ready',backend:'WebGPU'}});await client.ready;worker.onmessage({data:{kind:'rendered-frame',sequence:0,terrainGeneration:1,selectableGeneration:1,cameraVersion:0}});const request=client.microeventVisible({x:1,y:2,z:3}),id=worker.messages.at(-1).id;client.setCamera({x:1});worker.onmessage({data:{kind:'microeventVisibilityResult',id,visible:true}});await assert.rejects(request,/Stale/);
 }finally{client.dispose();}
});

test('a stalled visibility query is rejected and a late response cannot revive it',async()=>{
 const worker={messages:[],postMessage(message){this.messages.push(message);},terminate(){}},port=()=>({close(){}}),client=createWebGpuWorldClient({canvas:{transferControlToOffscreen:()=>({})},session:'s',snapshot:'{}',presentationInputs:true,workerFactory:()=>worker,channelFactory:()=>({port1:port(),port2:port()})});
 try{worker.onmessage({data:{kind:'ready',backend:'WebGPU'}});await client.ready;worker.onmessage({data:{kind:'rendered-frame',sequence:0,terrainGeneration:1,selectableGeneration:1,cameraVersion:0}});const request=client.microeventVisible({x:1,y:2,z:3}),id=worker.messages.at(-1).id;await assert.rejects(request,/timed out/);worker.onmessage({data:{kind:'microeventVisibilityResult',id,visible:true}});assert.equal(client.status().phase,'running');}finally{client.dispose();}
});
