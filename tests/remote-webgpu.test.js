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
      submit(commands) { for (const command of commands) { assert(!submitted.includes(command)); submitted.push(command); calls.push(['submit', command]); } },
      onSubmittedWorkDone: async () => {},
    },
    createBuffer(descriptor) {
      const data = new Uint8Array(descriptor.size);
      const buffer = { data, descriptor, destroyed: false, mapAsync: async () => {}, getMappedRange(offset = 0, size = descriptor.size) { assert.equal(offset, 0); assert.equal(size, descriptor.size); return data.buffer; }, unmap() { calls.push(['unmap']); }, destroy() { this.destroyed = true; } };
      buffers.push(buffer); return buffer;
    },
    createBindGroup: descriptor => ({ descriptor }),
    createRenderPipelineAsync: async descriptor => ({ descriptor }),
    createCommandEncoder() {
      const record = { id: ++commandVersion, passes: [] };
      return {
        beginRenderPass(descriptor) {
          record.passes.push(descriptor);
          return { setPipeline() {}, setBindGroup() {}, draw() { calls.push(['draw']); }, end() {} };
        },
        copyBufferToBuffer() { calls.push(['copy']); },
        finish: () => record,
      };
    },
    destroy() { calls.push(['deviceDestroy']); resolveLost({ reason: 'destroyed', message: 'Explicit native destruction' }); },
  };
  const context = { configure() {}, unconfigure() {}, getCurrentTexture() { const version = ++textureVersion; return { createView: () => ({ version }) }; } };
  return { device, context, calls, buffers, submitted };
}
const flush = async () => { for (let i = 0; i < 40; i++) await Promise.resolve(); };

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
  assert.equal(f.gpu.buffers[1].descriptor.usage, 32);
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
