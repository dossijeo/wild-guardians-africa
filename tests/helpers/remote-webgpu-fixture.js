import assert from 'node:assert/strict';
import {createRemoteWebGpuClient} from '../../src/rendering/remote-webgpu-client.js';
import {createRemoteWebGpuHost} from '../../src/rendering/remote-webgpu-host.js';

// Deterministic transport/queue fixture shared by admission verticals. The host
// and client are production code; fakeGpu is not hardware acceptance evidence.
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
    pushErrorScope() {},
    popErrorScope: async()=>null,
    createBuffer(descriptor) {
      const data = new Uint8Array(descriptor.size);
      const buffer = { data, descriptor, destroyed: false, mapAsync: async () => {}, getMappedRange(offset = 0, size = descriptor.size) { assert.equal(offset, 0); assert.equal(size, descriptor.size); return data.buffer; }, unmap() { calls.push(['unmap']); }, destroy() { this.destroyed = true; } };
      buffers.push(buffer); return buffer;
    },
    createTexture: descriptor => ({descriptor,createView: view=>({descriptor:view}),destroy(){}}),
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
  return { device, context, calls, buffers, submitted,
    get canvasSubmissions(){return submitted.filter(command=>command.passes.some(pass=>pass.colorAttachments?.some(a=>a?.view?.version!==undefined||a?.resolveTarget?.version!==undefined)));},
  };
}
const flush = async () => { for (let i = 0; i < 40; i++) await Promise.resolve(); };


function preparedWorldDraw(f,boundary,value=77,signal=null){
 const metadata={clock:f.clock,nativeWorldBoundary:boundary,...(f.resumeTemplate?{nativeResumeTemplate:f.resumeTemplate,nativeResumeTemplateCoverageEnd:f.resumeTemplate.endTime}:{}),...(f.startTemplate?{nativeTaskStartTemplate:f.startTemplate}:{}),...(f.actionTemplate?{nativeTaskActionTemplate:f.actionTemplate}:{}),...(f.consequenceTemplate?{nativeTaskConsequenceTemplate:f.consequenceTemplate}:{}),...(f.settlementTemplate?{nativeTaskSettlementTemplate:f.settlementTemplate}:{}),...(f.initialBodyTemplate?{nativeInitialIdleBodyTemplate:f.initialBodyTemplate}:{}),...(f.cycleTemplate?{nativeIdleCycleTemplate:f.cycleTemplate}:{}),...(f.strollTemplate?{nativeIdleStrollTemplate:f.strollTemplate}:{}),...(f.farmArrivalTemplate?{nativeFarmArrivalTemplate:f.farmArrivalTemplate}:{}),...(f.homeTemplate?{nativeHomeRouteTemplate:f.homeTemplate}:{})};f.client.beginFrame({nativeWorldBoundary:boundary});
 f.client.device.queue.writeBuffer(f.buffer,0,new Float32Array([value]));
 const encoder=f.client.device.createCommandEncoder(),pass=encoder.beginRenderPass({colorAttachments:[{view:f.client.context.getCurrentTexture().createView(),loadOp:'clear',storeOp:'store'}]});
 pass.setPipeline(f.pipeline);pass.setBindGroup(0,f.group);if(f.staticBuffer)pass.setVertexBuffer(0,f.staticBuffer);pass.draw(3);pass.end();f.client.device.queue.submit([encoder.finish()]);return f.client.prepareNativeWorldFrame(metadata,{signal});
}

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


export {pair,fakeGpu,flush,fixture,preparedWorldDraw};
