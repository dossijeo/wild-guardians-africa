import test from 'node:test';
import assert from 'node:assert/strict';
import {GuardianCanvasExecutor} from '../src/ui/guardian-canvas-executor.js';
const pose=()=>({roll:0,yaw:0,pitch:0,angles:[1,2,3,4],offsets:[0,0,0,0]});
function fixture(t,options={}){
 const messages=[];let terminated=0,failures=0;
 const worker={postMessage:m=>messages.push(m),terminate:()=>terminated++};
 const canvas=()=>({clientWidth:300,clientHeight:280,transferControlToOffscreen:()=>({})});
 const bitmap={close(){this.closed=true;}};
 const executor=new GuardianCanvasExecutor(canvas(),canvas(),{}, {createWorker:()=>worker,createBitmap:async()=>bitmap,onFailure:()=>failures++,...options});
 t.after(()=>executor.dispose());
 return {executor,worker,messages,bitmap,get terminated(){return terminated;},get failures(){return failures;}};
}
test('coalesces poses with one frame in flight and snapshots mutable arrays',async t=>{
 const f=fixture(t);await Promise.resolve();assert.equal(f.messages[0].type,'init');
 f.worker.onmessage({data:{type:'ready',setupMs:2}});await f.executor.ready;
 const p=pose();f.executor.render(1,p);f.executor.render(2,p);f.executor.render(3,p);p.angles[0]=99;
 assert.equal(f.messages.length,2);assert.equal(f.executor.stats.coalesced,1);
 f.worker.onmessage({data:{type:'frame',sequence:1}});
 assert.equal(f.messages.length,3);assert.equal(f.messages[2].time,3);assert.equal(f.messages[2].pose.angles[0],1);
 f.worker.onmessage({data:{type:'frame',sequence:1}});assert.equal(f.executor.stats.completed,1);
 f.worker.onmessage({data:{type:'frame',sequence:2}});assert.equal(f.executor.stats.completed,2);
});
test('dispose before bitmap preparation closes the late bitmap without transferring canvases',async t=>{
 let resolve;const f=fixture(t,{createBitmap:()=>new Promise(r=>resolve=r)});
 const rejected=assert.rejects(f.executor.ready,/disposed/);f.executor.dispose();resolve(f.bitmap);await rejected;await Promise.resolve();
 assert.equal(f.bitmap.closed,true);assert.equal(f.messages.length,0);assert.equal(f.terminated,1);
});
test('startup failure rejects readiness; running failure invokes fallback exactly once',async t=>{
 const first=fixture(t);const failed=assert.rejects(first.executor.ready,/unavailable/);
 first.worker.onmessage({data:{type:'error',message:'unavailable'}});await failed;assert.equal(first.failures,0);
 const f=fixture(t);await Promise.resolve();f.worker.onmessage({data:{type:'ready',setupMs:1}});await f.executor.ready;f.executor.render(1,pose());
 f.worker.onmessage({data:{type:'error',message:'context lost'}});f.worker.onmessage({data:{type:'error',message:'late'}});
 assert.equal(f.failures,1);assert.equal(f.terminated,1);assert.equal(f.executor.pending,null);assert.equal(f.executor.closed,true);
});
