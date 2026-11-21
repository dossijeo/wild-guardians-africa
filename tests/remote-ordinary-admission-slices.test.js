import test from 'node:test';
import assert from 'node:assert/strict';
import {fixture,flush} from './helpers/remote-webgpu-fixture.js';

// Production Host/client and a deterministic resource budget; virtual GPU/RAF.
// This checks scheduling and ownership, not physical frame cadence.
test('a large ordinary packet yields before publication and leaves the resident generation drawable',async()=>{
 let charge=false,now=1000,release,enter,turns=0;
 const blocked=new Promise(resolve=>{enter=resolve;});
 const f=await fixture({}, {absoluteNow:()=>{if(charge)now+=.1;return now;},
  yieldResourceTask:()=>{if(++turns===1)return new Promise(resolve=>{release=resolve;enter();});return Promise.resolve();}});
 try{
  const shown=f.frame(1);await flush();await f.host.idle();f.host.present();await shown;
  const original=f.gpu.buffers[0],writes=f.host.inspect().queueWrites;
  charge=true;f.client.beginFrame();f.client.device.queue.writeBuffer(f.buffer,0,new Float32Array([77]));
  const encoder=f.client.device.createCommandEncoder(),pass=encoder.beginRenderPass({colorAttachments:[{view:f.client.context.getCurrentTexture().createView(),loadOp:'clear',storeOp:'store'}]});
  pass.setPipeline(f.pipeline);pass.setBindGroup(0,f.group);for(let i=0;i<800;i++)pass.draw(3);pass.end();f.client.device.queue.submit([encoder.finish()]);
  const presented=f.client.endFrame();presented.catch(()=>{});await flush();
  assert.equal(await Promise.race([blocked.then(()=>'yield'),f.host.idle().then(()=>'admitted')]),'yield','ordinary inspection must share the resource budget inside the packet');
  assert.equal(f.host.inspect().pendingSequence,null);assert.equal(f.host.inspect().queueWrites,writes);
  assert.equal(new Float32Array(original.data.buffer)[0],1);
  const before=f.gpu.canvasSubmissions.length;f.host.present();assert.equal(f.gpu.canvasSubmissions.length,before+1);assert.equal(f.host.inspect().activeSequence,1);
  release();await f.host.idle();f.host.present();await presented;
  assert.equal(f.host.inspect().activeSequence,2);assert.deepEqual(f.errors,[]);
 }finally{charge=false;release?.();f.client.dispose();await f.host.dispose();}
});

test('retirement interrupts an ordinary inspection after its snapshot without releasing live buffers before the real drain',async()=>{
 let host,armed=false,now=1000,baseline=Infinity,releaseTask,releaseDrain,enter;
 const blocked=new Promise(resolve=>{enter=resolve;});
 const f=await fixture({}, {absoluteNow:()=>{if(armed&&host?.inspect().dependencyVisits>baseline)now+=3;return now;},
  yieldResourceTask:()=>new Promise(resolve=>{releaseTask=resolve;enter();})});host=f.host;
 try{
  const shown=f.frame(1);await flush();await host.idle();host.present();await shown;
  baseline=host.inspect().dependencyVisits;armed=true;
  const original=f.gpu.buffers[0],writes=host.inspect().queueWrites,presented=f.frame(77);presented.catch(()=>{});await flush();
  assert.equal(await Promise.race([blocked.then(()=>'yield'),host.idle().then(()=>'admitted')]),'yield');
  assert.equal(host.inspect().pendingSequence,null);assert.equal(host.inspect().queueWrites,writes);
  f.gpu.device.queue.onSubmittedWorkDone=()=>new Promise(resolve=>{releaseDrain=resolve;});
  const disposed=host.dispose();await host.idle();await flush();
  assert.equal(typeof releaseDrain,'function');assert.equal(original.destroyed,false);
  assert.equal(host.inspect().pendingSequence,null);assert.equal(host.inspect().queueWrites,writes);
  assert.equal(new Float32Array(original.data.buffer)[0],1);
  releaseDrain();await disposed;assert.equal(original.destroyed,true);assert.deepEqual(f.errors,[]);
 }finally{armed=false;releaseTask?.();releaseDrain?.();f.client.dispose();await host.dispose();}
});
