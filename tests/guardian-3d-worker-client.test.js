import test from 'node:test';
import assert from 'node:assert/strict';
import { Guardian3DWorkerClient } from '../src/ui/guardian-3d-worker-client.js';

function setup() {
 const messages=[],worker={postMessage(data){messages.push(data);},terminate(){this.terminated=true;}};
 const canvas={clientWidth:200,clientHeight:300,transferControlToOffscreen(){return {};}};
 const client=new Guardian3DWorkerClient(canvas,{createWorker:()=>worker});
 return {client,worker,messages,canvas,receive:data=>worker.onmessage({data})};
}
test('sends latest frame only after acknowledgement, preserving audio clock and resize',async()=>{
 const x=setup();x.receive({type:'ready'});await x.client.ready;
 x.client.draw({time:1,audio:{currentTime:2,ended:false,uncloneable:()=>{}},gesture:'speak'});
 x.client.draw({time:2});x.canvas.clientWidth=250;x.client.resize();x.client.draw({time:3});
 assert.equal(x.messages.filter(m=>m.type==='frame').length,1);
 assert.deepEqual(x.messages.at(-1).frame.audio,{currentTime:2,ended:false});
 x.receive({type:'frame',sequence:1,metrics:{drawCalls:2}});
 assert.equal(x.messages.at(-1).frame.time,3);assert.equal(x.messages.at(-1).viewport.width,250);
 x.receive({type:'frame',sequence:1});assert.equal(x.client.inflight,true);
 x.receive({type:'frame',sequence:2,metrics:{drawCalls:3}});assert.equal(x.client.metrics.drawCalls,3);
 x.client.dispose();assert.equal(x.worker.terminated,true);
});
test('startup failure rejects readiness and disposes the Worker',async()=>{
 const x=setup();x.receive({type:'error',message:'failed'});await assert.rejects(x.client.ready,/failed/);assert.equal(x.worker.terminated,true);
});
test('a failed record transfer triggers runtime fallback',async()=>{
 let failure;const x=setup();x.client.onFailure=error=>{failure=error;};x.receive({type:'ready'});await x.client.ready;
 x.worker.postMessage=()=>{throw Error('transfer failed');};x.client.setRecord({id:'ES_01'});
 assert.match(failure.message,/transfer failed/);assert.equal(x.worker.terminated,true);
});
