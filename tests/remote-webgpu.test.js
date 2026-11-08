import test from 'node:test';
import assert from 'node:assert/strict';
import { createRemoteWebGpuClient } from '../src/rendering/remote-webgpu-client.js';
import { createRemoteWebGpuHost } from '../src/rendering/remote-webgpu-host.js';

function pair() {
  const a = {}, b = {};
  a.postMessage = data => queueMicrotask(() => b.onmessage?.({ data: structuredClone(data) }));
  b.postMessage = data => queueMicrotask(() => a.onmessage?.({ data: structuredClone(data) }));
  return [a, b];
}
function fakeGpu() {
  const calls = [], buffers = [], submitted = [];
  let textureVersion = 0, commandVersion = 0;
  let resolveLost;
  const device = {
    lost: new Promise(resolve => { resolveLost = resolve; }),
    queue: {
      writeBuffer(buffer, offset, data) { buffer.data.set(new Uint8Array(data.buffer || data, data.byteOffset || 0, data.byteLength), offset); calls.push(['writeBuffer', offset, Array.from(new Uint8Array(data.buffer || data, data.byteOffset || 0, data.byteLength))]); },
      writeTexture() { calls.push(['writeTexture']); },
      submit(commands) { for (const command of commands) { assert(!submitted.includes(command)); for (const copy of command.copies || []) copy(); submitted.push(command); calls.push(['submit', command]); } },
      onSubmittedWorkDone: async () => {},
    },
    createBuffer(descriptor) {
      const data = new Uint8Array(descriptor.size);
      const buffer = { data, descriptor, destroyed: false, mapAsync: async () => {}, getMappedRange(offset = 0, size = descriptor.size) { assert.equal(offset, 0); assert.equal(size, descriptor.size); return data.buffer; }, unmap() { calls.push(['unmap']); }, destroy() { this.destroyed = true; } };
      buffers.push(buffer); return buffer;
    },
    createBindGroup: descriptor => ({ descriptor }),
    createBindGroupLayout: descriptor => ({ descriptor }),
    createQuerySet: descriptor => ({ descriptor }),
    createRenderPipelineAsync: async descriptor => ({ descriptor }),
    createCommandEncoder() {
      const record = { id: ++commandVersion, passes: [] };
      return {
        beginRenderPass(descriptor) {
          record.passes.push(descriptor);
          return { setPipeline() {}, setBindGroup() {}, setVertexBuffer() {}, setIndexBuffer() {}, draw() { calls.push(['draw']); }, end() {} };
        },
        copyBufferToBuffer(source, sourceOffset, destination, destinationOffset, size) { calls.push(['copy']); if (source) (record.copies ||= []).push(() => destination.data.set(source.data.slice(sourceOffset, sourceOffset + size), destinationOffset)); },
        resolveQuerySet(querySet, firstQuery, queryCount, destination, offset) { (record.copies ||= []).push(() => new Uint32Array(destination.data.buffer, offset, queryCount * 2).fill(77)); },
        finish: () => record,
      };
    },
    destroy() { calls.push(['deviceDestroy']); resolveLost({ reason: 'destroyed', message: 'Explicit native destruction' }); },
  };
  const context = { configure() {}, unconfigure() {}, getCurrentTexture() { const version = ++textureVersion; return { createView: () => ({ version }) }; } };
  return { device, context, calls, buffers, submitted };
}
const flush = async () => { for (let i = 0; i < 40; i++) await Promise.resolve(); };

function nativeControlEvent(type,sequence,actorId,handle,time){
  return {type,sequence,actorId,protocolVersion:2,authorityEpoch:'native-owner',
    effectiveTime:time,routeHandle:type==='RouteAssigned'?handle:null,
    revokedRouteHandle:type==='RouteInvalidated'?handle:null};
}
const nativeHandle=slot=>({authorityEpoch:'native-owner',session:1,slot,generation:1});

async function fixture(clientOptions = {}, hostOptions = {}) {
  const [producerPort, consumerPort] = pair(), gpu = fakeGpu(), errors = [];
  const host = createRemoteWebGpuHost({ ...gpu, canvas: { width: 20, height: 10 }, port: consumerPort, requestFrame: () => 0, cancelFrame() {}, ...hostOptions });
  const client = createRemoteWebGpuClient({ port: producerPort, capabilities: { width: 20, height: 10, format: 'rgba8unorm' }, onError: error => errors.push(error), ...clientOptions });
  client.context.configure({ device: client.device, format: 'rgba8unorm' });
  const buffer = client.device.createBuffer({ size: 16, usage: 72 });
  const group = client.device.createBindGroup({ entries: [{ binding: 0, resource: { buffer } }] });
  const pipeline = client.device.createRenderPipeline({ label: 'test' });
  await flush(); await host.idle();
  function frame(value, metadata = {}) {
    client.beginFrame(metadata);
    client.device.queue.writeBuffer(buffer, 0, new Float32Array([value]));
    const encoder = client.device.createCommandEncoder();
    const pass = encoder.beginRenderPass({ colorAttachments: [{ view: client.context.getCurrentTexture().createView(), loadOp: 'clear', storeOp: 'store' }] });
    pass.setPipeline(pipeline); pass.setBindGroup(0, group); pass.draw(3); pass.end();
    client.device.queue.submit([encoder.finish()]);
    return client.endFrame();
  }
  return { client, host, gpu, errors, buffer, group, pipeline, frame };
}

test('remote drawing continues during delayed pipeline preparation, using fresh command buffers and swapchain views', async () => {
  const f = await fixture();
  const receipt = f.frame(2);
  await flush(); await f.host.idle();
  f.host.present(); await receipt;
  let release;
  f.gpu.device.createRenderPipelineAsync = () => new Promise(resolve => { release = resolve; });
  const preparing = f.host.handle({ type: 'create', method: 'createRenderPipelineAsync', id: 'slow', descriptor: {} });
  f.host.present(); f.host.present();
  assert.equal(f.gpu.submitted.length, 3);
  assert.deepEqual(f.gpu.submitted.map(command => command.passes[0].colorAttachments[0].view.version), [1, 2, 3]);
  assert.equal(f.host.inspect().replayFrames, 2);
  release({}); await preparing;
  assert.equal(f.errors.length, 0);
});

test('native revocation bypasses a resource FIFO blocked on a pending pipeline',async()=>{
  const [authorityPort,drawControlPort]=pair();let now=0;
  const f=await fixture({}, {absoluteNow:()=>now,
    intentControl:{port:drawControlPort,authorityEpoch:'native-owner'}});
  const first=nativeHandle(0),other=nativeHandle(1);
  authorityPort.postMessage(nativeControlEvent('RouteAssigned',1,7,first,10));
  authorityPort.postMessage(nativeControlEvent('RouteAssigned',2,8,other,10));
  await flush();
  f.client.registerClockBinding(f.buffer,{byteOffset:0,semantic:'absolute',epoch:0,
    nativeRoute:{actorId:7,routeHandle:first,assignmentSequence:1}});
  f.client.registerClockBinding(f.buffer,{byteOffset:4,semantic:'absolute',epoch:0,
    nativeRoute:{actorId:8,routeHandle:other,assignmentSequence:2}});
  const clock={version:1,epoch:0,elapsed:10,safeUntil:20,anchorAbsoluteMs:0,
    paused:false,segments:[{start:10,end:20,realDuration:10,rate:1}]};
  const receipt=f.frame(0,{clock});
  await flush();await f.host.idle();f.host.present();await receipt;
  let release;
  f.gpu.device.createRenderPipelineAsync=()=>new Promise(resolve=>{release=resolve;});
  await f.host.handle({type:'create',method:'createRenderPipelineAsync',id:'blocked',descriptor:{}});
  // This operation really holds the resource FIFO until the pipeline resolves.
  f.client.device.queue.submit([{__remoteCommands:[{method:'beginRenderPass',
    args:[{colorAttachments:[]}],commands:[{method:'setPipeline',
      args:[{__remoteGpuId:'blocked'}]}]}]}]);
  await flush();
  assert(f.host.inspect().queuedMessages>0);
  authorityPort.postMessage(nativeControlEvent('RouteInvalidated',3,7,first,10.25));
  await flush();
  assert.equal(f.host.intentControlStatus().sequence,3);
  now=1000;f.host.present();
  const values=new Float32Array(f.gpu.buffers[0].data.buffer);
  assert.equal(values[0],10.25,'the revoked actor stops at its native application time');
  assert.equal(values[1],11,'the unrelated actor continues autonomously');
  assert.equal(f.host.inspect().replayFrames,1);
  release({});await flush();await f.host.idle();
  assert.deepEqual(f.errors,[]);
});

test('native permission is checked after resource preparation, preventing late resurrection',async()=>{
  const [authorityPort,drawControlPort]=pair();
  const f=await fixture({}, {absoluteNow:()=>0,intentControl:{port:drawControlPort,authorityEpoch:'native-owner'}});
  const handle=nativeHandle(0);
  authorityPort.postMessage(nativeControlEvent('RouteAssigned',1,7,handle,10));
  await flush();
  f.client.registerClockBinding(f.buffer,{byteOffset:0,semantic:'absolute',epoch:0,
    nativeRoute:{actorId:7,routeHandle:handle,assignmentSequence:1}});
  let release;
  f.gpu.device.createRenderPipelineAsync=()=>new Promise(resolve=>{release=resolve;});
  const pipeline=f.client.device.createRenderPipeline({label:'late-route'});
  f.client.beginFrame({clock:{version:1,epoch:0,elapsed:10,safeUntil:10,
    anchorAbsoluteMs:0,paused:true,segments:[]}});
  const encoder=f.client.device.createCommandEncoder();
  const pass=encoder.beginRenderPass({colorAttachments:[]});
  pass.setPipeline(pipeline);pass.setBindGroup(0,f.group);pass.draw(3);pass.end();
  f.client.device.queue.submit([encoder.finish()]);
  const receipt=f.client.endFrame(),rejected=assert.rejects(receipt,/obsolete or unauthorized/);
  await flush();
  authorityPort.postMessage(nativeControlEvent('RouteInvalidated',2,7,handle,11));
  await flush();
  assert.equal(f.host.intentControlStatus().sequence,2);
  release({});await flush();await f.host.idle();await rejected;
  assert.equal(f.host.inspect().activeSequence,null);
  assert.equal(f.gpu.submitted.length,0);
});

test('queued route clock bindings capture the native identity before caller mutation',async()=>{
  const [authorityPort,drawControlPort]=pair();
  const f=await fixture({}, {absoluteNow:()=>0,intentControl:{port:drawControlPort,authorityEpoch:'native-owner'}});
  const handle=nativeHandle(0);
  authorityPort.postMessage(nativeControlEvent('RouteAssigned',1,7,handle,10));
  await flush();
  const binding={byteOffset:0,semantic:'absolute',epoch:0,
    nativeRoute:{actorId:7,routeHandle:handle,assignmentSequence:1}};
  f.client.registerClockBinding(f.buffer,binding);
  binding.nativeRoute.routeHandle.generation=99;
  binding.nativeRoute.assignmentSequence=99;
  const receipt=f.frame(0,{clock:{version:1,epoch:0,elapsed:10,safeUntil:10,
    anchorAbsoluteMs:0,paused:true,segments:[]}});
  await flush();await f.host.idle();f.host.present();await receipt;
  assert.deepEqual(f.errors,[]);
  assert.equal(new Float32Array(f.gpu.buffers[0].data.buffer)[0],10);
});

test('a prepared native frame waits for its direct bootstrap rather than using an unscoped permission',async()=>{
  const [authorityPort,drawControlPort]=pair();
  const f=await fixture({}, {absoluteNow:()=>0,
    intentControl:{port:drawControlPort,session:'session-a'}});
  const handle=nativeHandle(0);
  f.client.registerClockBinding(f.buffer,{byteOffset:0,semantic:'absolute',epoch:0,
    nativeRoute:{actorId:7,routeHandle:handle,assignmentSequence:3}});
  const receipt=f.frame(0,{clock:{version:1,epoch:0,elapsed:10,safeUntil:10,
    anchorAbsoluteMs:0,paused:true,segments:[]}});
  await flush();f.host.present();
  assert.equal(f.gpu.submitted.length,0);
  authorityPort.postMessage({type:'IntentBaseline',protocolVersion:2,session:'session-a',
    authorityEpoch:'native-owner',sequence:9,effectiveTime:10,
    routes:[{actorId:7,routeHandle:handle,assignmentSequence:3,startTime:8}]});
  await flush();await f.host.idle();f.host.present();await receipt;
  assert.equal(f.host.intentControlStatus().sequence,9);
  assert.equal(new Float32Array(f.gpu.buffers[0].data.buffer)[0],10);
  assert.deepEqual(f.errors,[]);
});

test('retiring a control connection freezes its admitted clocks without reviving old packets',async()=>{
  const [authorityPort,drawControlPort]=pair();let now=0;
  const f=await fixture({}, {absoluteNow:()=>now,
    intentControl:{port:drawControlPort,session:'session-a'}});
  const handle=nativeHandle(0);
  authorityPort.postMessage({type:'IntentBaseline',protocolVersion:2,session:'session-a',
    authorityEpoch:'native-owner',sequence:3,effectiveTime:10,
    routes:[{actorId:7,routeHandle:handle,assignmentSequence:3,startTime:10}]});
  await flush();
  f.client.registerClockBinding(f.buffer,{byteOffset:0,semantic:'absolute',epoch:0,
    nativeRoute:{actorId:7,routeHandle:handle,assignmentSequence:3}});
  const receipt=f.frame(0,{clock:{version:1,epoch:0,elapsed:10,safeUntil:20,
    anchorAbsoluteMs:0,paused:false,segments:[{start:10,end:20,realDuration:10,rate:1}]}});
  await flush();await f.host.idle();f.host.present();await receipt;
  now=100;f.host.present();
  const last=new Float32Array(f.gpu.buffers[0].data.buffer)[0];
  authorityPort.postMessage({type:'IntentControlClosed',protocolVersion:2,session:'session-a',
    authorityEpoch:'native-owner',sequence:3,reason:'replaced'});
  await flush();now=500;f.host.present();
  assert.equal(new Float32Array(f.gpu.buffers[0].data.buffer)[0],last);
  assert.equal(f.host.intentControlStatus().closed,true);
  assert.deepEqual(f.errors,[]);
});

test('frame publication is bounded and writes are invisible until the atomic presentation boundary', async () => {
  const f = await fixture();
  const receipt = f.frame(7);
  assert.throws(() => f.client.beginFrame(), /backpressure/);
  await flush(); await f.host.idle();
  assert.equal(new Float32Array(f.gpu.buffers[0].data.buffer)[0], 0);
  f.host.present(); const ack = await receipt;
  assert.equal(ack.sequence, 1);
  assert.equal(new Float32Array(f.gpu.buffers[0].data.buffer)[0], 7);
  assert.equal(f.client.inspect().pendingFrame, null);
  f.client.beginFrame(); f.client.cancelFrame();
});

test('writeBuffer snapshots typed-array ranges without detaching or observing later mutations', async () => {
  const f = await fixture();
  const data = new Float32Array([1, 2, 3, 4]);
  f.client.device.queue.writeBuffer(f.buffer, 0, data, 1, 2);
  data.fill(99);
  await flush(); await f.host.idle();
  assert.deepEqual(Array.from(new Float32Array(f.gpu.buffers[0].data.buffer)), [2, 3, 0, 0]);
  assert.equal(data.buffer.byteLength, 16);
});

test('mappedAtCreation uploads through the native mapping without requiring COPY_DST', async () => {
  const f = await fixture();
  const mapped = f.client.device.createBuffer({ size: 8, usage: 32, mappedAtCreation: true });
  new Uint32Array(mapped.getMappedRange()).set([12, 34]);
  mapped.unmap();
  await flush(); await f.host.idle();
  assert.deepEqual(Array.from(new Uint32Array(f.gpu.buffers[1].data.buffer)), [12, 34]);
  assert.equal(f.gpu.buffers[1].descriptor.usage, 36); // COPY_SRC reserved for native versioning.
});

test('destroy retains resources referenced by the active frame, then retires after replacement', async () => {
  const f = await fixture();
  let receipt = f.frame(1); await flush(); await f.host.idle(); f.host.present(); await receipt;
  f.buffer.destroy(); await flush(); await f.host.idle();
  assert.equal(f.gpu.buffers[0].destroyed, false);
  await f.host.handle({ type: 'frame', packet: { sequence: 2, metadata: {}, width: 20, height: 10, operations: [{ method: 'submit', args: [[{ __remoteCommands: [{ method: 'beginRenderPass', args: [{}], commands: [{ method: 'draw', args: [3] }] }] }]] }] } });
  f.host.present(); await flush();
  assert.equal(f.gpu.buffers[0].destroyed, true);
});

test('clock patch advances only inside a confirmed lease and overrides producer writes', async () => {
  const f = await fixture();
  f.client.registerClockBinding(f.buffer, { byteOffset: 0, semantic: 'absolute', epoch: 0 });
  const clock = { version: 1, epoch: 0, elapsed: 2, anchorAbsoluteMs: 0, safeUntil: 3, paused: false, segments: [{ start: 2, end: 3, realDuration: 1, rate: 1 }] };
  const receipt = f.frame(500, { clock });
  await flush(); await f.host.idle(); f.host.present(); await receipt;
  assert.equal(new Float32Array(f.gpu.buffers[0].data.buffer)[0], 3);
  f.host.present();
  assert.equal(new Float32Array(f.gpu.buffers[0].data.buffer)[0], 3);
});

test('one-shot buffer copies do not replay and resource fences work before any frame', async () => {
  const f = await fixture();
  await f.client.device.queue.onSubmittedWorkDone();
  const encoder = f.client.device.createCommandEncoder();
  encoder.copyBufferToBuffer(f.buffer, 0, f.buffer, 4, 4);
  const commands = encoder.finish();
  f.client.beginFrame();
  f.client.device.queue.submit([commands]);
  const receipt = f.client.endFrame();
  await flush(); await f.host.idle(); f.host.present(); await receipt;
  f.host.present();
  assert.equal(f.gpu.calls.filter(call => call[0] === 'copy').length, 1);
  assert.throws(() => f.client.device.queue.submit([commands]), /already submitted/);
});

test('preparation cannot mutate published buffers until the next frame commits', async () => {
  const f = await fixture();
  let receipt = f.frame(1); await flush(); await f.host.idle(); f.host.present(); await receipt;
  f.client.device.queue.writeBuffer(f.buffer, 0, new Float32Array([9]));
  await flush(); await f.host.idle(); f.host.present();
  assert.equal(new Float32Array(f.gpu.buffers[0].data.buffer)[0], 1);
  assert.equal(f.host.inspect().stagedOperations, 0);
  assert.equal(f.host.inspect().uniformForks, 1);
  assert.equal(f.host.inspect().bindingForks, 1);
  assert.equal(new Float32Array(f.gpu.buffers[1].data.buffer)[0], 9);
  await f.client.device.queue.onSubmittedWorkDone();
  receipt = f.frame(10); await flush(); await f.host.idle(); f.host.present(); await receipt;
  assert.equal(new Float32Array(f.gpu.buffers[1].data.buffer)[0], 10);
  assert.equal((await f.client.inspectAsync()).consumer.backend, 'webgpu');
  assert.equal(f.errors.length, 0);
});

test('a write after packet publication forks the pending generation instead of reordering writes', async () => {
  const f = await fixture();
  const receipt = f.frame(1);
  f.client.device.queue.writeBuffer(f.buffer, 0, new Float32Array([2]));
  await flush(); await f.host.idle();
  assert.equal(f.gpu.buffers.length, 2);
  f.host.present(); await receipt;
  assert.equal(new Float32Array(f.gpu.buffers[0].data.buffer)[0], 1);
  assert.equal(new Float32Array(f.gpu.buffers[1].data.buffer)[0], 2);
  f.host.present();
  assert.equal(new Float32Array(f.gpu.buffers[0].data.buffer)[0], 1);
});

test('partial preparation writes fork the logical state of an already published pending frame', async () => {
  const f = await fixture();
  const receipt = f.frame(1);
  f.client.device.queue.writeBuffer(f.buffer, 4, new Float32Array([2]));
  await flush(); await f.host.idle();
  assert.deepEqual(Array.from(new Float32Array(f.gpu.buffers[1].data.buffer)), [1, 2, 0, 0]);
  f.host.present(); await receipt;
  assert.deepEqual(Array.from(new Float32Array(f.gpu.buffers[0].data.buffer)), [1, 0, 0, 0]);
});

test('endFrame metadata is the final clock/event boundary, not the metadata at beginFrame', async () => {
  const f = await fixture();
  f.client.beginFrame({ stale: true });
  const encoder = f.client.device.createCommandEncoder();
  const pass = encoder.beginRenderPass({}); pass.draw(3); pass.end();
  f.client.device.queue.submit([encoder.finish()]);
  const receipt = f.client.endFrame({ confirmed: 123 });
  await flush(); await f.host.idle(); f.host.present();
  assert.deepEqual((await receipt).metadata, { confirmed: 123 });
});

test('multipass uniform writes retain queue order on independent replay', async () => {
  const f = await fixture();
  const valuesAtSubmission = [];
  const submit = f.gpu.device.queue.submit;
  f.gpu.device.queue.submit = commands => { valuesAtSubmission.push(new Float32Array(f.gpu.buffers[0].data.buffer)[0]); submit(commands); };
  f.client.beginFrame();
  for (const value of [20, 30]) {
    f.client.device.queue.writeBuffer(f.buffer, 0, new Float32Array([value]));
    const encoder = f.client.device.createCommandEncoder();
    const pass = encoder.beginRenderPass({}); pass.draw(3); pass.end();
    f.client.device.queue.submit([encoder.finish()]);
  }
  const receipt = f.client.endFrame();
  await flush(); await f.host.idle(); f.host.present(); await receipt;
  f.host.present();
  assert.deepEqual(valuesAtSubmission, [20, 30, 20, 30]);
});

test('replay restores the baseline when a draw precedes the only uniform write', async () => {
  const f = await fixture();
  const valuesAtSubmission = [];
  const submit = f.gpu.device.queue.submit;
  f.gpu.device.queue.submit = commands => { valuesAtSubmission.push(new Float32Array(f.gpu.buffers[0].data.buffer)[0]); submit(commands); };
  const group = f.client.device.createBindGroup({ entries: [{ binding: 0, resource: { buffer: f.buffer } }] });
  f.client.beginFrame();
  for (const value of [null, 1]) {
    if (value !== null) f.client.device.queue.writeBuffer(f.buffer, 0, new Float32Array([value]));
    const encoder = f.client.device.createCommandEncoder();
    const pass = encoder.beginRenderPass({}); pass.setBindGroup(0, group); pass.draw(3); pass.end();
    f.client.device.queue.submit([encoder.finish()]);
  }
  const receipt = f.client.endFrame();
  await flush(); await f.host.idle(); f.host.present(); await receipt; f.host.present();
  assert.deepEqual(valuesAtSubmission, [0, 1, 0, 1]);
});

test('a current-texture view created for a future frame survives unrelated retirement', async () => {
  const f = await fixture();
  let receipt = f.frame(1); await flush(); await f.host.idle(); f.host.present(); await receipt;
  f.client.beginFrame();
  const view = f.client.context.getCurrentTexture().createView();
  const transient = f.client.device.createBuffer({ size: 4, usage: 8 }); transient.destroy();
  const encoder = f.client.device.createCommandEncoder();
  const pass = encoder.beginRenderPass({ colorAttachments: [{ view, loadOp: 'clear', storeOp: 'store' }] }); pass.draw(3); pass.end();
  f.client.device.queue.submit([encoder.finish()]);
  receipt = f.client.endFrame();
  await flush(); await f.host.idle(); f.host.present(); await receipt;
  assert.equal(f.errors.length, 0);
  assert.equal(f.host.inspect().activeSequence, 2);
});

test('canceling presentation preserves completed upload bookkeeping without publishing the canceled frame', async () => {
  const f = await fixture();
  let receipt = f.frame(1); await flush(); await f.host.idle(); f.host.present(); await receipt;
  const group = f.client.device.createBindGroup({ entries: [{ binding: 0, resource: { buffer: f.buffer } }] });
  f.client.beginFrame();
  f.client.device.queue.writeBuffer(f.buffer, 0, new Float32Array([9]));
  let encoder = f.client.device.createCommandEncoder();
  let pass = encoder.beginRenderPass({ colorAttachments: [{ view: f.client.context.getCurrentTexture().createView() }] });
  pass.setBindGroup(0, group); pass.draw(3); pass.end(); f.client.device.queue.submit([encoder.finish()]);
  f.client.cancelFrame();
  await flush(); await f.host.idle(); await f.client.device.queue.onSubmittedWorkDone();
  assert.equal(f.host.inspect().packets, 1);
  assert.equal(f.gpu.submitted.length, 1);
  assert.equal(new Float32Array(f.gpu.buffers[0].data.buffer)[0], 1);
  assert.equal(new Float32Array(f.gpu.buffers[1].data.buffer)[0], 9);
  f.client.beginFrame();
  encoder = f.client.device.createCommandEncoder(); pass = encoder.beginRenderPass({});
  pass.setBindGroup(0, group); pass.draw(3); pass.end(); f.client.device.queue.submit([encoder.finish()]);
  receipt = f.client.endFrame(); await flush(); await f.host.idle(); f.host.present(); await receipt;
  assert.equal(new Float32Array(f.gpu.buffers[1].data.buffer)[0], 9);
  assert.equal(f.host.inspect().activeSequence, 3);
});

test('one-shot compute cannot silently freeze while a remote animation clock advances', async () => {
  const f = await fixture();
  await assert.rejects(f.host.handle({ type: 'frame', packet: {
    sequence: 1, width: 20, height: 10,
    metadata: { clock: { version: 1, epoch: 0, elapsed: 0, anchorAbsoluteMs: 0, safeUntil: 1, paused: false, segments: [{ start: 0, end: 1, realDuration: 1, rate: 1 }] } },
    operations: [{ method: 'submit', args: [[{ __remoteCommands: [{ method: 'beginComputePass', args: [{}], commands: [] }] }]] }],
  } }), /one-shot compute/);
  assert.equal(f.host.inspect().packets, 0);
});

test('finalizer release drops producer ownership without calling native destroy', async () => {
  let deliver;
  const registered = new Set();
  const f = await fixture({ finalizationRegistryFactory(callback) { deliver = callback; return { register(_target, id) { registered.add(id); } }; } });
  const transient = f.client.device.createBuffer({ size: 4, usage: 8 });
  await flush(); await f.host.idle();
  const count = f.host.inspect().resources;
  assert(registered.has(transient.__remoteGpuId));
  deliver(transient.__remoteGpuId);
  await flush(); await f.host.idle();
  assert.equal(f.host.inspect().resources, count - 1);
  assert.equal(f.gpu.buffers[1].destroyed, false);
});

test('recorded proxies remain retained through ACK and native frame pins outlive producer finalization', async () => {
  let deliver;
  const f = await fixture({ finalizationRegistryFactory(callback) { deliver = callback; return { register() {} }; } });
  assert(f.group.__remoteDependencies.has(f.buffer));
  const receipt = f.frame(1);
  deliver(f.buffer.__remoteGpuId); deliver(f.group.__remoteGpuId); deliver(f.pipeline.__remoteGpuId);
  await flush(); await f.host.idle();
  assert.equal(f.host.inspect().producerReleases, 0);
  assert(f.client.inspect().retainedResources >= 3);
  f.host.present(); await receipt; await flush(); await f.host.idle();
  assert.equal(f.host.inspect().producerReleases, 3);
  assert.equal(f.gpu.buffers[0].destroyed, false);
  f.host.present();
  assert.equal(f.errors.length, 0);
  f.client.beginFrame();
  const encoder = f.client.device.createCommandEncoder();
  const pass = encoder.beginRenderPass({}); pass.draw(3); pass.end();
  f.client.device.queue.submit([encoder.finish()]);
  const replacement = f.client.endFrame(); await flush(); await f.host.idle(); f.host.present(); await replacement;
  assert.equal(f.host.inspect().resources, 1);
  assert.equal(f.gpu.buffers[0].destroyed, false);
});

test('a bind group retains released native buffer storage until its own release', async () => {
  const f = await fixture();
  await f.host.handle({ type: 'release', id: f.buffer.__remoteGpuId });
  const before = f.host.inspect().resources;
  const receipt = f.frame(3); await flush(); await f.host.idle(); f.host.present(); await receipt;
  assert.equal(f.gpu.buffers[0].destroyed, false);
  assert(f.host.inspect().resources >= before);
  assert.equal(f.errors.length, 0);
});

function preparedInterval(start, end) {
  return { preparedInterval: { start, end }, clock: { version: 1, epoch: 0, elapsed: start, safeUntil: end, anchorAbsoluteMs: 0, paused: false, consumerAnchored: true, segments: [{ start, end, realDuration: end - start, rate: 1 }] } };
}

test('a prepared successor cannot replace the currently executing interval early', async () => {
  let now = 1000;
  const f = await fixture({}, { absoluteNow: () => now });
  let receipt = f.frame(0, preparedInterval(0, 1)); await flush(); await f.host.idle(); f.host.present();
  assert.equal((await receipt).metadata.clock.consumerAnchored, false);
  now = 1200;
  receipt = f.frame(1, preparedInterval(1, 2)); await flush(); await f.host.idle(); f.host.present();
  assert.equal(f.host.inspect().activeSequence, 1);
  assert.equal(f.host.inspect().pendingSequence, 2);
  assert.equal(f.client.inspect().pendingFrame, 2);
  assert.equal(f.host.inspect().frameTime.elapsed, .2);
  now = 2000; f.host.present();
  assert.equal((await receipt).metadata.clock.anchorAbsoluteMs, 2000);
  assert.equal(f.host.inspect().activeSequence, 2);
  assert.equal(f.host.inspect().frameTime.elapsed, 1);
  now = 2200; f.host.present();
  assert.equal(f.host.inspect().frameTime.elapsed, 1.2);
});

test('late preparation holds the old safe endpoint then begins the new interval without rewind', async () => {
  let now = 1000;
  const f = await fixture({}, { absoluteNow: () => now });
  let receipt = f.frame(0, preparedInterval(0, 1)); await flush(); await f.host.idle(); f.host.present(); await receipt;
  now = 2400; f.host.present();
  assert.equal(f.host.inspect().frameTime.elapsed, 1);
  receipt = f.frame(1, preparedInterval(1, 2)); await flush(); await f.host.idle();
  now = 2450; f.host.present();
  assert.equal((await receipt).metadata.clock.anchorAbsoluteMs, 2400);
  assert.equal(f.host.inspect().frameTime.elapsed, 1.05);
  assert.equal(f.errors.length, 0);
});

test('visibility suspension preserves the active interval and shifts the queued successor without catch-up', async () => {
  let now = 1000;
  const f = await fixture({}, { absoluteNow: () => now });
  let receipt = f.frame(0, preparedInterval(0, 1)); await flush(); await f.host.idle(); f.host.present(); await receipt;
  now = 1200; f.host.present(); f.host.setVisibility(true);
  now = 1600;
  receipt = f.frame(1, preparedInterval(1, 2)); await flush(); await f.host.idle();
  now = 4000; f.host.present();
  assert.equal(f.host.inspect().frameTime.elapsed, .2);
  assert.equal(f.host.inspect().activeSequence, 1);
  f.host.setVisibility(false); f.host.present();
  assert.equal(f.host.inspect().frameTime.elapsed, .2);
  assert.equal(f.host.inspect().pendingSequence, 2);
  assert.equal(f.host.inspect().hiddenMs, 2800);
  now = 4800; f.host.present();
  assert.equal((await receipt).metadata.clock.anchorAbsoluteMs, 4800);
  assert.equal(f.host.inspect().frameTime.elapsed, 1);
  assert.equal(f.errors.length, 0);
});

test('a first packet received while hidden starts at resume rather than skipping its interval', async () => {
  let now = 1000;
  const f = await fixture({}, { absoluteNow: () => now, hidden: true });
  const receipt = f.frame(0, preparedInterval(0, 1)); await flush(); await f.host.idle();
  now = 4000; f.host.present();
  assert.equal(f.host.inspect().nativeFrames, 0);
  f.host.setVisibility(false); f.host.present();
  assert.equal((await receipt).metadata.clock.anchorAbsoluteMs, 4000);
  assert.equal(f.host.inspect().frameTime.elapsed, 0);
});

test('invalid resource references are rejected before any frame upload mutates the displayed generation', async () => {
  const f = await fixture();
  const receipt = f.frame(1); await flush(); await f.host.idle(); f.host.present(); await receipt;
  await assert.rejects(f.host.handle({ type: 'frame', packet: {
    sequence: 2, width: 20, height: 10, metadata: {}, operations: [
      { method: 'writeBuffer', args: [{ __remoteGpuId: f.buffer.__remoteGpuId }, 0, new Float32Array([99])] },
      { method: 'submit', args: [[{ __remoteCommands: [{ method: 'beginRenderPass', args: [{}], commands: [{ method: 'setBindGroup', args: [0, { __remoteGpuId: 'missing' }] }, { method: 'draw', args: [3] }] }] }]] },
    ],
  } }), /Unknown.*remote GPU resource/);
  assert.equal(new Float32Array(f.gpu.buffers[0].data.buffer)[0], 1);
  assert.equal(f.host.inspect().activeSequence, 1);
  assert.equal(f.host.inspect().pendingSequence, null);
});

test('a valid but regressive clock cannot mutate resources or replace the displayed generation', async () => {
  const f = await fixture();
  const clock = { version: 1, epoch: 0, elapsed: 2, safeUntil: 2, anchorAbsoluteMs: 0, paused: true, segments: [] };
  const receipt = f.frame(1, { clock }); await flush(); await f.host.idle(); f.host.present(); await receipt;
  await f.host.handle({ type: 'frame', packet: {
    sequence: 2, width: 99, height: 99, metadata: { clock: { ...clock, elapsed: 1, safeUntil: 1 } }, operations: [
      { method: 'writeBuffer', args: [{ __remoteGpuId: f.buffer.__remoteGpuId }, 0, new Float32Array([99])] },
      { method: 'submit', args: [[{ __remoteCommands: [{ method: 'beginRenderPass', args: [{}], commands: [{ method: 'draw', args: [3] }] }] }]] },
    ],
  } });
  f.host.present(); await flush();
  assert.equal(new Float32Array(f.gpu.buffers[0].data.buffer)[0], 1);
  assert.equal(f.host.inspect().activeSequence, 1);
  assert.equal(f.host.inspect().nativeFrames, 1);
  assert.match(f.errors[0]?.message, /rewind/);
});

test('retiring N unrelated resources performs N localized checks and no active graph traversals', async () => {
  const f = await fixture();
  const receipt = f.frame(1); await flush(); await f.host.idle(); f.host.present(); await receipt;
  const count = 200;
  for (let i = 0; i < count; i++) await f.host.handle({ type: 'create', method: 'createBuffer', id: `unused:${i}`, descriptor: { size: 4, usage: 8 } });
  const before = f.host.inspect();
  for (let i = 0; i < count; i++) await f.host.handle({ type: 'destroy', id: `unused:${i}` });
  await flush();
  const after = f.host.inspect();
  assert.equal(after.dependencyVisits, before.dependencyVisits);
  assert.equal(after.retirementChecks - before.retirementChecks, count);
  assert.equal(before.resources - after.resources, count);
  assert.equal(f.gpu.buffers[0].destroyed, false);
});

test('explicit native destruction waits for staged preparation to reach a generation boundary', async () => {
  const f = await fixture();
  const storage = f.client.device.createBuffer({ size: 16, usage: 136 });
  const group = f.client.device.createBindGroup({ entries: [{ binding: 0, resource: { buffer: storage } }] });
  function render() {
    f.client.beginFrame();
    const encoder = f.client.device.createCommandEncoder(), pass = encoder.beginRenderPass({});
    pass.setBindGroup(0, group); pass.draw(3); pass.end();
    f.client.device.queue.submit([encoder.finish()]); return f.client.endFrame();
  }
  let receipt = render(); await flush(); await f.host.idle(); f.host.present(); await receipt;
  f.client.device.queue.writeBuffer(storage, 0, new Uint32Array([3]));
  const transient = f.client.device.createBuffer({ size: 16, usage: 72 }); transient.destroy();
  await flush(); await f.host.idle(); await flush();
  assert.equal(f.host.inspect().stagedOperations, 1);
  assert.equal(f.gpu.buffers[2].destroyed, false);
  receipt = render(); await flush(); await f.host.idle(); f.host.present(); await receipt; await flush();
  assert.equal(f.gpu.buffers[2].destroyed, true);
});

test('an unrelated asynchronous pipeline cannot block publication of a newer frame using ready resources', async () => {
  const f = await fixture();
  let receipt = f.frame(1); await flush(); await f.host.idle(); f.host.present(); await receipt;
  let completePipeline;
  f.gpu.device.createRenderPipelineAsync = () => new Promise(resolve => { completePipeline = resolve; });
  const pipelinePromise = f.client.device.createRenderPipelineAsync({ label: 'new-material' });
  receipt = f.frame(2);
  await flush(); await f.host.idle();
  assert.equal(f.host.inspect().pendingResources, 1);
  f.host.present(); await receipt;
  assert.equal(f.host.inspect().activeSequence, 2);
  assert.equal(new Float32Array(f.gpu.buffers[0].data.buffer)[0], 2);
  // Queue fences cover submitted queue work, not unrelated shader compilation.
  await f.client.device.queue.onSubmittedWorkDone();
  completePipeline({}); await pipelinePromise;
  assert.equal(f.host.inspect().pendingResources, 0);
});

test('pipeline-derived layouts and bind groups wait only on their branch and follow uniform forks', async () => {
  const f = await fixture();
  let receipt = f.frame(1); await flush(); await f.host.idle(); f.host.present(); await receipt;
  let completePipeline;
  f.gpu.device.createRenderPipelineAsync = () => new Promise(resolve => { completePipeline = resolve; });
  const pipeline = f.client.device.createRenderPipeline({ label: 'new-material' });
  const layout = pipeline.getBindGroupLayout(0);
  const group = f.client.device.createBindGroup({ layout, entries: [{ binding: 0, resource: { buffer: f.buffer } }] });
  f.client.device.queue.writeBuffer(f.buffer, 0, new Float32Array([9]));
  receipt = f.frame(2); await flush(); await f.host.idle();
  assert.equal(f.host.inspect().pendingResources, 3);
  f.host.present(); await receipt;
  assert.equal(f.host.inspect().activeSequence, 2);
  completePipeline({ getBindGroupLayout: () => ({ nativeLayout: true }) });
  for (let i = 0; i < 20 && f.host.inspect().pendingResources; i++) { await new Promise(resolve => setTimeout(resolve, 0)); await flush(); }
  assert.equal(f.host.inspect().pendingResources, 0);
  f.client.beginFrame();
  const encoder = f.client.device.createCommandEncoder(), pass = encoder.beginRenderPass({});
  pass.setPipeline(pipeline); pass.setBindGroup(0, group); pass.draw(3); pass.end();
  f.client.device.queue.submit([encoder.finish()]);
  receipt = f.client.endFrame(); await flush(); await f.host.idle(); f.host.present(); await receipt;
  assert.equal(f.errors.length, 0);
  assert.equal(f.host.inspect().activeSequence, 3);
});

test('explicit proxy device destruction reaches the native device and resolves lost before cleanup', async () => {
  const f = await fixture();
  const receipt = f.frame(1), rejected = assert.rejects(receipt, /device lost/);
  f.client.device.destroy();
  const lost = await f.client.device.lost;
  await rejected; await flush();
  assert.equal(lost.reason, 'destroyed');
  assert(f.gpu.calls.some(call => call[0] === 'deviceDestroy'));
  assert.equal(f.client.inspect().pendingFrame, null);
  assert.equal(f.errors.length, 0);
});

test('clock offsets override stale multipass uniforms and baseline restoration before every submission', async () => {
  const f = await fixture();
  f.client.registerClockBinding(f.buffer, { byteOffset: 4, semantic: 'absolute', epoch: 0 });
  const values = [], submit = f.gpu.device.queue.submit;
  f.gpu.device.queue.submit = commands => { values.push(new Float32Array(f.gpu.buffers[0].data.buffer)[1]); submit(commands); };
  f.client.beginFrame({ clock: { version: 1, epoch: 0, elapsed: 5, safeUntil: 5, anchorAbsoluteMs: 0, paused: true, segments: [] } });
  for (const write of [false, true]) {
    if (write) f.client.device.queue.writeBuffer(f.buffer, 0, new Float32Array([11, 99, 12, 13]));
    const encoder = f.client.device.createCommandEncoder(), pass = encoder.beginRenderPass({});
    pass.setBindGroup(0, f.group); pass.draw(3); pass.end();
    f.client.device.queue.submit([encoder.finish()]);
  }
  const receipt = f.client.endFrame(); await flush(); await f.host.idle(); f.host.present(); await receipt; f.host.present();
  assert.deepEqual(values, [5, 5, 5, 5]);
});

test('frame and fence diagnostics distinguish posting, admission, first draw, ACK and local refusal', async () => {
  const f = await fixture();
  const receipt = f.frame(1); await flush(); await f.host.idle(); f.host.present(); await receipt;
  await f.client.device.queue.onSubmittedWorkDone();
  const timing = f.client.inspect().frameTimings.at(-1);
  assert(timing.endFrameCalledAt <= timing.endFrameReturnedAt);
  assert(timing.postedAt <= timing.postCompletedAt);
  assert(timing.consumer.workerReceivedAt <= timing.consumer.admissionStartedAt);
  assert(timing.consumer.admittedAt <= timing.consumer.firstDrawStartedAt);
  assert(timing.consumer.firstDrawCompletedAt <= timing.ackReceivedAt);
  assert(f.client.inspect().fenceTimings.at(-1).consumer.finishedAt);
  f.client.beginFrame(); f.client.device.queue.writeBuffer(f.buffer, 0, new Float32Array([2]));
  await assert.rejects(f.client.device.queue.onSubmittedWorkDone(), /uncommitted/);
  assert.equal(f.client.inspect().fenceTimings.at(-1).localRejected, true);
  f.client.cancelFrame(); await flush(); await f.host.idle();
});

test('pending native fence promises preserve their queue prefixes without blocking later resources or frames', async () => {
  const f = await fixture();
  let receipt = f.frame(1); await flush(); await f.host.idle(); f.host.present(); await receipt;
  const held = [], completionOrder = [];
  f.gpu.device.queue.onSubmittedWorkDone = () => new Promise(resolve => held.push({ resolve, prefix: f.gpu.calls.length }));
  const firstFence = f.client.device.queue.onSubmittedWorkDone().then(() => completionOrder.push(1));
  f.client.device.createBuffer({ size: 4, usage: 8 });
  receipt = f.frame(2); await flush(); await f.host.idle();
  assert.equal(held.length, 1);
  assert.equal(f.gpu.buffers.length, 2);
  f.host.present(); await receipt;
  assert.equal(f.host.inspect().activeSequence, 2);
  const secondFence = f.client.device.queue.onSubmittedWorkDone().then(() => completionOrder.push(2));
  await flush(); await f.host.idle();
  assert.equal(held.length, 2);
  assert(held[0].prefix < held[1].prefix);
  assert.deepEqual(completionOrder, []);
  held[0].resolve(); await firstFence;
  assert.deepEqual(completionOrder, [1]);
  held[1].resolve(); await secondFence;
  assert.deepEqual(completionOrder, [1, 2]);
  assert.equal(f.errors.length, 0);
});

test('device loss rejects a pending fence without waiting for its native promise to finish', async () => {
  const f = await fixture();
  f.gpu.device.queue.onSubmittedWorkDone = () => new Promise(() => {});
  const fence = f.client.device.queue.onSubmittedWorkDone();
  const rejected = assert.rejects(fence, /device lost/);
  await flush(); await f.host.idle();
  f.client.device.destroy();
  assert.equal((await f.client.device.lost).reason, 'destroyed');
  await rejected;
  assert.equal(f.errors.length, 0);
});

test('pending mapping, shader diagnostics and error scopes do not block ready frames', async () => {
  const f = await fixture();
  const readback = f.client.device.createBuffer({ size: 16, usage: 9 });
  await flush(); await f.host.idle();
  let finishMap, finishInfo, finishScope;
  f.gpu.buffers[1].mapAsync = () => new Promise(resolve => { finishMap = resolve; });
  f.gpu.device.createShaderModule = () => ({ getCompilationInfo: () => new Promise(resolve => { finishInfo = resolve; }) });
  f.gpu.device.popErrorScope = () => new Promise(resolve => { finishScope = resolve; });
  const mapping = readback.mapAsync(1), info = f.client.device.createShaderModule({ code: '' }).getCompilationInfo();
  const scope = f.client.device.popErrorScope();
  const receipt = f.frame(4); await flush(); await f.host.idle();
  assert.equal(readback.mapState, 'pending');
  assert.equal(typeof finishMap, 'function'); assert.equal(typeof finishInfo, 'function'); assert.equal(typeof finishScope, 'function');
  f.host.present(); await receipt;
  assert.equal(f.host.inspect().activeSequence, 1);
  finishScope(null); assert.equal(await scope, null);
  finishInfo({ messages: [{ message: 'warning', type: 'warning', lineNum: 1 }] });
  assert.equal((await info).messages[0].message, 'warning');
  finishMap(); await mapping;
  assert.equal(readback.mapState, 'mapped'); assert.equal(readback.getMappedRange().byteLength, 16);
  readback.unmap(); await flush(); await f.host.idle();
  assert.equal(f.errors.length, 0);
});

test('pending mapping cancellation preserves newer mappings and explicit destruction', async () => {
  const f = await fixture();
  const buffer = f.client.device.createBuffer({ size: 16, usage: 9 });
  await flush(); await f.host.idle();
  const held = [];
  f.gpu.buffers[1].mapAsync = () => new Promise((resolve, reject) => held.push({ resolve, reject }));
  const first = buffer.mapAsync(1), firstRejected = assert.rejects(first, /canceled/);
  await flush(); await f.host.idle(); buffer.unmap();
  const second = buffer.mapAsync(1);
  await firstRejected; await flush(); await f.host.idle();
  held[0].resolve(); await flush();
  assert.equal(buffer.mapState, 'pending');
  held[1].resolve(); await second; assert.equal(buffer.mapState, 'mapped');
  buffer.unmap(); await flush(); await f.host.idle();
  const third = buffer.mapAsync(1), thirdRejected = assert.rejects(third, /destroy/);
  await flush(); await f.host.idle(); buffer.destroy();
  await thirdRejected; await flush(); await f.host.idle();
  held[2].resolve(); await flush();
  assert.equal(buffer.mapState, 'unmapped'); assert.equal(f.gpu.buffers[1].destroyed, true);
  assert.equal(f.errors.length, 0);
});

test('native mapping rejection and device loss restore proxy mapState', async () => {
  const f = await fixture();
  const buffer = f.client.device.createBuffer({ size: 16, usage: 9 });
  await flush(); await f.host.idle();
  f.gpu.buffers[1].mapAsync = () => Promise.reject(Error('Invalid map range'));
  await assert.rejects(buffer.mapAsync(1), /Invalid map range/);
  assert.equal(buffer.mapState, 'unmapped'); assert.equal(f.errors.length, 0);
  f.gpu.buffers[1].mapAsync = () => new Promise(() => {});
  const mapped = buffer.mapAsync(1), rejected = assert.rejects(mapped, /device lost/);
  await flush(); await f.host.idle(); f.client.device.destroy();
  await rejected; assert.equal(buffer.mapState, 'unmapped');
});

async function storageFixture(access = 'read-only-storage', usage = 168) {
  const f = await fixture();
  const storage = f.client.device.createBuffer({ size: 16, usage });
  const layout = access === null ? undefined : f.client.device.createBindGroupLayout({ entries: [{ binding: 0, visibility: 1, buffer: { type: access } }] });
  const group = f.client.device.createBindGroup({ layout, entries: [{ binding: 0, resource: { buffer: storage } }] });
  f.client.device.queue.writeBuffer(storage, 0, new Uint32Array([1, 2, 3, 4]));
  await flush(); await f.host.idle();
  function render({ write, copy } = {}) {
    f.client.beginFrame();
    if (write) f.client.device.queue.writeBuffer(storage, 0, new Uint32Array(write));
    const encoder = f.client.device.createCommandEncoder();
    if (copy) encoder.copyBufferToBuffer(copy, 0, storage, 0, 16);
    const pass = encoder.beginRenderPass({}); pass.setBindGroup(0, group); pass.draw(3); pass.end();
    f.client.device.queue.submit([encoder.finish()]); return f.client.endFrame();
  }
  return { ...f, storage, render };
}

test('readonly storage forks by native copy, retains GPU contents and preserves the published generation', async () => {
  const f = await storageFixture();
  let receipt = f.render(); await flush(); await f.host.idle(); f.host.present(); await receipt;
  const old = f.gpu.buffers[1];
  // Emulate a completed native write before the snapshot; no CPU shadow exists.
  new Uint32Array(old.data.buffer)[1] = 70;
  f.client.device.queue.writeBuffer(f.storage, 8, new Uint32Array([90]));
  await f.client.device.queue.onSubmittedWorkDone();
  const fork = f.gpu.buffers[2];
  assert.deepEqual(Array.from(new Uint32Array(old.data.buffer)), [1, 70, 3, 4]);
  assert.deepEqual(Array.from(new Uint32Array(fork.data.buffer)), [1, 70, 90, 4]);
  assert.equal(f.host.inspect().bufferForks, 1); assert.equal(f.host.inspect().stagedOperations, 0);
  f.host.present(); assert.equal(old.destroyed, false);
  receipt = f.render(); await flush(); await f.host.idle(); f.host.present(); await receipt;
  assert.equal(f.host.inspect().activeSequence, 2); assert.equal(f.errors.length, 0);
});

test('native storage fork overlays pending CPU writes without publishing them early', async () => {
  const f = await storageFixture();
  const receipt = f.render({ write: [10, 20] }); await flush(); await f.host.idle();
  f.client.device.queue.writeBuffer(f.storage, 8, new Uint32Array([30]));
  await f.client.device.queue.onSubmittedWorkDone();
  assert.deepEqual(Array.from(new Uint32Array(f.gpu.buffers[1].data.buffer)), [1, 2, 3, 4]);
  assert.deepEqual(Array.from(new Uint32Array(f.gpu.buffers[2].data.buffer)), [10, 20, 30, 4]);
  f.host.present(); await receipt;
  assert.deepEqual(Array.from(new Uint32Array(f.gpu.buffers[1].data.buffer)), [10, 20, 3, 4]);
});

test('writable or unclassified storage and pending GPU outputs cannot bypass the fence invariant', async () => {
  for (const access of ['storage', null]) {
    const f = await storageFixture(access);
    const receipt = f.render(); await flush(); await f.host.idle(); f.host.present(); await receipt;
    f.client.device.queue.writeBuffer(f.storage, 0, new Uint32Array([9]));
    await assert.rejects(f.client.device.queue.onSubmittedWorkDone(), /uncommitted/);
    assert.equal(f.host.inspect().bufferForks || 0, 0);
    assert.equal(new Uint32Array(f.gpu.buffers[1].data.buffer)[0], 1);
  }
  const f = await storageFixture();
  const source = f.client.device.createBuffer({ size: 16, usage: 12 });
  f.client.device.queue.writeBuffer(source, 0, new Uint32Array([5, 6, 7, 8]));
  const receipt = f.render({ copy: source }); await flush(); await f.host.idle();
  f.client.device.queue.writeBuffer(f.storage, 0, new Uint32Array([9]));
  await assert.rejects(f.client.device.queue.onSubmittedWorkDone(), /uncommitted/);
  assert.equal(f.host.inspect().bufferForks || 0, 0);
  f.host.present(); await receipt;
  assert.deepEqual(Array.from(new Uint32Array(f.gpu.buffers[1].data.buffer)), [5, 6, 7, 8]);
});

test('published vertex and index buffers use generation copies without CPU shadows', async () => {
  const f = await fixture();
  const vertex = f.client.device.createBuffer({ size: 16, usage: 40 });
  const index = f.client.device.createBuffer({ size: 16, usage: 24 });
  for (const buffer of [vertex, index]) f.client.device.queue.writeBuffer(buffer, 0, new Uint32Array([1, 2, 3, 4]));
  f.client.beginFrame();
  const encoder = f.client.device.createCommandEncoder(), pass = encoder.beginRenderPass({});
  pass.setVertexBuffer(0, vertex); pass.setIndexBuffer(index, 'uint32'); pass.draw(3); pass.end();
  f.client.device.queue.submit([encoder.finish()]);
  const receipt = f.client.endFrame(); await flush(); await f.host.idle(); f.host.present(); await receipt;
  f.client.device.queue.writeBuffer(vertex, 0, new Uint32Array([10]));
  f.client.device.queue.writeBuffer(index, 0, new Uint32Array([20]));
  await f.client.device.queue.onSubmittedWorkDone();
  assert.equal(f.host.inspect().bufferForks, 2);
  assert.deepEqual(f.gpu.buffers.slice(1).map(buffer => new Uint32Array(buffer.data.buffer)[0]), [1, 1, 10, 20]);
});

test('canvas reconfiguration cannot invalidate pending or active frames and unconfigure stops replay', async () => {
  const f = await fixture();
  const receipt = f.frame(1); await flush(); await f.host.idle();
  let reconfigured = 0;
  f.gpu.context.configure = () => { reconfigured++; };
  const configure = { type: 'configure', descriptor: { format: 'bgra8unorm' } };
  await assert.rejects(f.host.handle(configure), /configuration is fixed/);
  f.host.present(); await receipt;
  await assert.rejects(f.host.handle(configure), /configuration is fixed/);
  assert.equal(reconfigured, 0);
  const count = f.gpu.submitted.length;
  await f.host.handle({ type: 'unconfigure' }); f.host.present();
  assert.equal(f.gpu.submitted.length, count);
});

test('pending query resolution protects its actual destination buffer from premature generation copies', async () => {
  const f = await storageFixture('read-only-storage', 168 | 512);
  const queries = f.client.device.createQuerySet({ type: 'occlusion', count: 2 });
  f.client.beginFrame();
  const encoder = f.client.device.createCommandEncoder();
  encoder.resolveQuerySet(queries, 0, 2, f.storage, 0);
  const pass = encoder.beginRenderPass({}); pass.draw(3); pass.end();
  f.client.device.queue.submit([encoder.finish()]);
  const receipt = f.client.endFrame(); await flush(); await f.host.idle();
  f.client.device.queue.writeBuffer(f.storage, 0, new Uint32Array([9]));
  await assert.rejects(f.client.device.queue.onSubmittedWorkDone(), /uncommitted/);
  assert.equal(f.host.inspect().bufferForks || 0, 0);
  f.host.present(); await receipt;
  assert.deepEqual(Array.from(new Uint32Array(f.gpu.buffers[1].data.buffer)), [77, 77, 77, 77]);
});

test('ordered resource admission acknowledges captured writes before GPU completion without weakening real fences', async () => {
  const f = await fixture();
  let nativeFenceCalls = 0, releaseGpu, completed = false;
  f.gpu.device.queue.onSubmittedWorkDone = () => { nativeFenceCalls++; return new Promise(resolve => { releaseGpu = resolve; }); };
  const resource = f.client.device.createBuffer({ size: 16, usage: 8 });
  const bytes = new Uint32Array([12, 34, 56, 78]);
  f.client.device.queue.writeBuffer(resource, 0, bytes); bytes.fill(99);
  const ordered = await f.client.device.queue.onResourceSubmissionOrdered();
  assert.deepEqual(ordered, { kind: 'remote-ordered-submission', submitted: true });
  assert.deepEqual(Array.from(new Uint32Array(f.gpu.buffers[1].data.buffer)), [12, 34, 56, 78]);
  assert.equal(nativeFenceCalls, 0);
  const completion = f.client.device.queue.onSubmittedWorkDone().then(() => { completed = true; });
  await flush(); await f.host.idle();
  assert.equal(nativeFenceCalls, 1); assert.equal(completed, false);
  const receipt = f.frame(2); await flush(); await f.host.idle(); f.host.present(); await receipt;
  await f.client.device.queue.onResourceSubmissionOrdered();
  assert.equal(completed, false);
  releaseGpu(); await completion; assert.equal(completed, true);
});

test('ordered admission rejects uncommitted local frames and unsafe published mutations', async () => {
  const f = await storageFixture('storage');
  f.client.beginFrame(); f.client.device.queue.writeBuffer(f.storage, 0, new Uint32Array([9]));
  await assert.rejects(f.client.device.queue.onResourceSubmissionOrdered(), /uncommitted remote frame/);
  f.client.cancelFrame(); await flush(); await f.host.idle();
  const receipt = f.render(); await flush(); await f.host.idle(); f.host.present(); await receipt;
  f.client.device.queue.writeBuffer(f.storage, 0, new Uint32Array([10]));
  await assert.rejects(f.client.device.queue.onResourceSubmissionOrdered(), /uncommitted published/);
  await assert.rejects(f.client.device.queue.onSubmittedWorkDone(), /uncommitted/);
  assert.equal(new Uint32Array(f.gpu.buffers[1].data.buffer)[0], 9);
});

test('ordered admission cannot hide a preceding resource upload error', async () => {
  const f = await fixture();
  f.gpu.device.queue.writeBuffer = () => { throw Error('Native upload rejected'); };
  f.client.device.queue.writeBuffer(f.buffer, 0, new Float32Array([1]));
  await assert.rejects(f.client.device.queue.onResourceSubmissionOrdered(), /Native upload rejected/);
  assert.equal(f.host.inspect().failed, true);
});

test('ordered admission waits for captured external image payloads, never their GPU completion', async t => {
  const originalCanvas = globalThis.OffscreenCanvas, originalBitmap = globalThis.createImageBitmap;
  t.after(() => { globalThis.OffscreenCanvas = originalCanvas; globalThis.createImageBitmap = originalBitmap; });
  globalThis.OffscreenCanvas = class {};
  let finishCapture, acknowledged = false, closed = 0, uploads = 0, fences = 0;
  class CapturedBitmap { constructor() { this.marker = 'captured'; } close() { closed++; } }
  globalThis.createImageBitmap = () => new Promise(resolve => { finishCapture = () => resolve(new CapturedBitmap()); });
  const f = await fixture();
  f.gpu.device.createTexture = descriptor => ({ descriptor });
  f.gpu.device.queue.copyExternalImageToTexture = source => { assert.equal(source.source.marker, 'captured'); uploads++; };
  f.gpu.device.queue.onSubmittedWorkDone = () => { fences++; return new Promise(() => {}); };
  const texture = f.client.device.createTexture({ size: [1, 1], format: 'rgba8unorm', usage: 2 });
  f.client.device.queue.copyExternalImageToTexture({ source: new globalThis.OffscreenCanvas() }, { texture }, [1, 1]);
  const ready = f.client.device.queue.onResourceSubmissionOrdered().then(() => { acknowledged = true; });
  await flush(); await f.host.idle();
  assert.equal(acknowledged, false); assert.equal(uploads, 0);
  finishCapture(); await ready;
  assert.equal(uploads, 1); assert.equal(closed, 1); assert.equal(fences, 0);
});
