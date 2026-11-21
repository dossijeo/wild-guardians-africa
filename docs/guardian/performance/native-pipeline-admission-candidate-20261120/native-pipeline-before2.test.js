import test from 'node:test';
import assert from 'node:assert/strict';
import {fixture,flush} from './helpers/remote-webgpu-fixture.js';

// Production Host/client; deferred native factories and virtual GPU/RAF.
// This proves admission/ownership, not physical frame cadence or driver cost.
function gate(f){
 const jobs=[];let closing=false;
 const create=kind=>descriptor=>new Promise((resolve,reject)=>{
  const value={descriptor,getBindGroupLayout:()=>({kind:'original-native-layout'})};
  const job={kind,descriptor,value,resolve:()=>resolve(value),reject};jobs.push(job);if(closing)job.resolve();
 });
 f.gpu.device.createRenderPipelineAsync=create('render');f.gpu.device.createComputePipelineAsync=create('compute');
 return {jobs,release(){closing=true;for(const job of jobs)job.resolve();}};
}

test('pending native compilation backpressures the existing FIFO while resident draws and inspection continue',async()=>{
 const f=await fixture({}, {absoluteNow:()=>1000}),g=gate(f);let first,second;
 try{
  const shown=f.frame(1);await flush();await f.host.idle();f.host.present();await shown;
  first=f.client.device.createRenderPipelineAsync({label:'first'});second=f.client.device.createRenderPipelineAsync({label:'second'});first.catch(()=>{});second.catch(()=>{});
  await flush();assert.equal(g.jobs.length,1,'native promises must retain the existing admission credit until compilation completes');
  const before=f.gpu.canvasSubmissions.length;f.host.present();assert.equal(f.gpu.canvasSubmissions.length,before+1);assert.equal(f.host.inspect().activeSequence,1);
  const {consumer:inspection}=await f.client.inspectAsync();assert.equal(inspection.pendingResources,1);assert.equal(inspection.failed,false);
  g.jobs[0].resolve();await first;await flush();assert.equal(g.jobs.length,2);assert.equal(g.jobs[1].descriptor.label,'second');
  g.jobs[1].resolve();await second;await f.host.idle();assert.equal(f.host.inspect().pendingResources,0);assert.deepEqual(f.errors,[]);
 }finally{g.release();f.client.dispose();await f.host.dispose();await Promise.allSettled([first,second]);}
});

test('render and compute compilation share admission and retain the original layout dependency',async()=>{
 const f=await fixture({}, {absoluteNow:()=>1000}),g=gate(f);let compute;
 try{
  const render=f.client.device.createRenderPipeline({label:'render'}),layout=render.getBindGroupLayout(0);
  compute=f.client.device.createComputePipelineAsync({label:'compute',layout});compute.catch(()=>{});
  await flush();assert.equal(g.jobs.length,1);g.jobs[0].resolve();await flush();
  assert.equal(g.jobs.length,2);assert.equal(g.jobs[1].kind,'compute');assert.equal(g.jobs[1].descriptor.layout.kind,'original-native-layout');
  g.jobs[1].resolve();await compute;await f.host.idle();assert.deepEqual(f.errors,[]);
 }finally{g.release();f.client.dispose();await f.host.dispose();await Promise.allSettled([compute]);}
});

test('disposal rejects queued compilation and does not wait for or start the next native factory',async()=>{
 const f=await fixture({}, {absoluteNow:()=>1000}),g=gate(f);const a=f.client.device.createRenderPipelineAsync({label:'in-flight'}),b=f.client.device.createRenderPipelineAsync({label:'queued'});a.catch(()=>{});b.catch(()=>{});
 try{
  await flush();assert.equal(g.jobs.length,1);await f.host.dispose();await flush();await f.host.idle();
  assert.equal(g.jobs.length,1);assert.equal(f.host.inspect().resources,0);assert.equal(f.host.inspect().pendingResources,0);
  g.jobs[0].resolve();await flush();assert.equal(g.jobs.length,1);assert.equal(f.host.inspect().resources,0);
 }finally{g.release();f.client.dispose();await f.host.dispose();await Promise.allSettled([a,b]);}
});

test('a rejected compilation fails admission without starting the queued pipeline',async()=>{
 const f=await fixture({}, {absoluteNow:()=>1000}),g=gate(f);const a=f.client.device.createRenderPipelineAsync({label:'rejected'}),b=f.client.device.createComputePipelineAsync({label:'queued'});a.catch(()=>{});b.catch(()=>{});
 try{
  await flush();assert.equal(g.jobs.length,1);g.jobs[0].reject(Error('driver compilation rejected'));await flush();await f.host.idle();
  assert.equal(g.jobs.length,1);assert.equal(f.host.inspect().failed,true);assert(f.errors.some(e=>/driver compilation rejected/.test(e.message)));
 }finally{g.release();f.client.dispose();await f.host.dispose();await Promise.allSettled([a,b]);}
});
