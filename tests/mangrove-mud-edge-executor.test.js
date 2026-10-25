import test from 'node:test';
import assert from 'node:assert/strict';
import {MudEdgeExecutor} from '../src/rendering/mangrove-mud-edge-executor.js';
const input=()=>{const a={array:new Float32Array(3),itemSize:3,count:1};return {gp:a,gc:a,gn:a,p:a,origin:[0,0],outlines:[]};};
function rig(){const messages=[],worker={postMessage:m=>messages.push(m),terminate(){this.dead=true;}};return {worker,messages,executor:new MudEdgeExecutor({workerFactory:()=>worker})};}
test('worker has bounded single execution, queued cancellation and transferable result ownership',async()=>{
 const r=rig(),abort=new AbortController(),a=r.executor.run(input()),b=r.executor.run(input(),{signal:abort.signal});assert.equal(r.messages.length,1);await assert.rejects(r.executor.run(input()),/backpressure/);
 const rejected=assert.rejects(b,/cancelled/);abort.abort();await rejected;
 const result={colors:new Float32Array(3)};r.worker.onmessage({data:{id:r.messages[0].id,result,computeMs:2}});assert.equal(await a,result);assert.equal(r.executor.jobs.size,0);r.executor.dispose();assert.equal(r.worker.dead,true);
});
test('cancelled in-flight job remains capacity-bounded and late reply cannot settle a newer request',async()=>{
 const r=rig(),abort=new AbortController(),a=r.executor.run(input(),{signal:abort.signal}),rejected=assert.rejects(a,/cancelled/);abort.abort();await rejected;
 const b=r.executor.run(input());await assert.rejects(r.executor.run(input()),/backpressure/);assert.equal(r.messages.length,1);
 r.worker.onmessage({data:{id:r.messages[0].id,result:{},computeMs:1}});assert.equal(r.messages.length,2);
 r.worker.onmessage({data:{id:r.messages[0].id,result:{},computeMs:1}});assert.equal(r.executor.jobs.size,1);
 r.worker.onmessage({data:{id:r.messages[1].id,result:7,computeMs:1}});assert.equal(await b,7);r.executor.dispose();
});
test('world disposal rejects active and queued requests without retaining the worker',async()=>{
 const r=rig(),a=r.executor.run(input()),b=r.executor.run(input());const assertions=[assert.rejects(a,/disposed/),assert.rejects(b,/disposed/)];r.executor.dispose();await Promise.all(assertions);assert.equal(r.worker.dead,true);assert.equal(r.executor.jobs.size,0);assert.equal(r.executor.active,null);assert.equal(r.executor.stats.cancelled,2);assert.equal(r.executor.stats.failed,0);
});
