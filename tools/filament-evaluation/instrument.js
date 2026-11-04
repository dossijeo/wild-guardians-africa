// Instrument the actual WebGPU commands submitted by Filament. Timed frames must
// be run serially; RAF measurements should use beginFrame({ timed: false }).
export function instrumentWebGPU(device) {
  const restores = [];
  const pipelines = new WeakMap();
  const totals = {
    bufferBytes: 0, textureBytes: 0, peakBufferBytes: 0, peakTextureBytes: 0,
    buffersCreated: 0, buffersDestroyed: 0, texturesCreated: 0, texturesDestroyed: 0,
    resourceCreateMs: 0, resourceDestroyMs: 0, submits: 0,
    writeBufferCalls: 0, writeBufferBytes: 0, writeTextureCalls: 0,
  };
  const native = {
    encoder: device.createCommandEncoder.bind(device),
    buffer: device.createBuffer.bind(device),
    querySet: device.createQuerySet.bind(device),
    submit: device.queue.submit.bind(device.queue),
  };
  let frame = null;
  let pending = false;
  let disposed = false;
  const timestampsSupported = device.features.has('timestamp-query');
  const querySet = timestampsSupported ? native.querySet({ type: 'timestamp', count: 512 }) : null;

  function patch(object, key, replacement) {
    const descriptor = Object.getOwnPropertyDescriptor(object, key);
    Object.defineProperty(object, key, { configurable: true, writable: true, value: replacement });
    restores.push(() => descriptor ? Object.defineProperty(object, key, descriptor) : delete object[key]);
  }
  function resource(object, kind, bytes) {
    const byteKey = `${kind}Bytes`;
    const plural = kind === 'buffer' ? 'buffers' : 'textures';
    totals[byteKey] += bytes;
    totals[`${plural}Created`]++;
    const peak = kind === 'buffer' ? 'peakBufferBytes' : 'peakTextureBytes';
    totals[peak] = Math.max(totals[peak], totals[byteKey]);
    const destroy = object.destroy.bind(object);
    let destroyed = false;
    // Resource wrappers need not be retained globally: doing so would prevent GC.
    Object.defineProperty(object, 'destroy', { configurable: true, value() {
      const start = performance.now();
      try { return destroy(); } finally {
        totals.resourceDestroyMs += performance.now() - start;
        if (!destroyed) {
          destroyed = true;
          totals[byteKey] -= bytes;
          totals[`${plural}Destroyed`]++;
        }
      }
    } });
    return object;
  }
  const createBuffer = device.createBuffer.bind(device);
  patch(device, 'createBuffer', descriptor => {
    const start = performance.now();
    const result = createBuffer(descriptor);
    totals.resourceCreateMs += performance.now() - start;
    return resource(result, 'buffer', descriptor.size);
  });
  const createTexture = device.createTexture.bind(device);
  patch(device, 'createTexture', descriptor => {
    const start = performance.now();
    const result = createTexture(descriptor);
    totals.resourceCreateMs += performance.now() - start;
    return resource(result, 'texture', estimateTextureBytes(descriptor));
  });
  for (const method of ['createRenderPipeline', 'createRenderPipelineAsync']) {
    const original = device[method].bind(device);
    patch(device, method, descriptor => {
      const topology = descriptor.primitive?.topology || 'triangle-list';
      const result = original(descriptor);
      if (method.endsWith('Async')) return result.then(pipeline => {
        pipelines.set(pipeline, topology); return pipeline;
      });
      pipelines.set(result, topology);
      return result;
    });
  }
  patch(device.queue, 'submit', commands => {
    totals.submits++;
    if (frame) frame.submits++;
    return native.submit(commands);
  });
  const writeBuffer = device.queue.writeBuffer.bind(device.queue);
  patch(device.queue, 'writeBuffer', (...args) => {
    totals.writeBufferCalls++;
    const data = args[2];
    const elementBytes = data.BYTES_PER_ELEMENT || 1;
    const offset = args[3] || 0;
    totals.writeBufferBytes += args[4] === undefined ? data.byteLength - offset * elementBytes : args[4] * elementBytes;
    return writeBuffer(...args);
  });
  const writeTexture = device.queue.writeTexture.bind(device.queue);
  patch(device.queue, 'writeTexture', (...args) => {
    totals.writeTextureCalls++;
    return writeTexture(...args);
  });
  patch(device, 'createCommandEncoder', (...args) => {
    const encoder = native.encoder(...args);
    const begin = encoder.beginRenderPass.bind(encoder);
    Object.defineProperty(encoder, 'beginRenderPass', { configurable: true, value(descriptor) {
      const current = frame;
      let passDescriptor = descriptor;
      if (current) {
        current.renderPasses++;
        if (current.timed && current.queryCount + 2 <= 512) {
          const index = current.queryCount;
          current.queryCount += 2;
          passDescriptor = { ...descriptor, timestampWrites: {
            querySet, beginningOfPassWriteIndex: index, endOfPassWriteIndex: index + 1,
          } };
        } else if (current.timed) current.timestampOverflow = true;
      }
      const pass = begin(passDescriptor);
      if (!current) return pass;
      let topology = 'triangle-list';
      const setPipeline = pass.setPipeline.bind(pass);
      Object.defineProperty(pass, 'setPipeline', { value(pipeline) {
        topology = pipelines.get(pipeline) || 'triangle-list';
        return setPipeline(pipeline);
      } });
      if (pass.executeBundles) {
        const executeBundles = pass.executeBundles.bind(pass);
        Object.defineProperty(pass, 'executeBundles', { value(bundles) {
          current.renderBundleExecutions++;
          return executeBundles(bundles);
        } });
      }
      for (const method of ['draw', 'drawIndexed', 'drawIndirect', 'drawIndexedIndirect']) {
        const draw = pass[method].bind(pass);
        Object.defineProperty(pass, method, { value(...drawArgs) {
          current.drawCalls++;
          if (method.endsWith('Indirect')) current.indirectDrawCalls++;
          else {
            const count = drawArgs[0];
            const instances = drawArgs[1] ?? 1;
            current.triangles += instances * (topology === 'triangle-list' ? Math.floor(count / 3)
              : topology === 'triangle-strip' ? Math.max(0, count - 2) : 0);
          }
          return draw(...drawArgs);
        } });
      }
      return pass;
    } });
    return encoder;
  });

  return {
    beginFrame({ timed = false } = {}) {
      if (disposed) throw new Error('WebGPU instrumentation disposed');
      if (frame || pending) throw new Error('Finish the previous instrumented frame first');
      if (timed && !timestampsSupported) throw new Error('Device lacks timestamp-query');
      frame = { timed, drawCalls: 0, indirectDrawCalls: 0, triangles: 0,
        renderPasses: 0, renderBundleExecutions: 0, submits: 0, queryCount: 0, timestampOverflow: false };
    },
    async endFrame() {
      if (!frame) throw new Error('No instrumented frame is active');
      const result = frame;
      frame = null;
      result.gpuMs = null;
      result.gpuPassSumMs = null;
      result.triangleCountIsExact = result.indirectDrawCalls === 0 && result.renderBundleExecutions === 0;
      if (!result.timed || !result.queryCount) return result;
      pending = true;
      let resolveBuffer;
      let readBuffer;
      try {
        const bytes = result.queryCount * 8;
        resolveBuffer = native.buffer({ size: bytes, usage: GPUBufferUsage.QUERY_RESOLVE | GPUBufferUsage.COPY_SRC });
        readBuffer = native.buffer({ size: bytes, usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ });
        const encoder = native.encoder();
        encoder.resolveQuerySet(querySet, 0, result.queryCount, resolveBuffer, 0);
        encoder.copyBufferToBuffer(resolveBuffer, 0, readBuffer, 0, bytes);
        native.submit([encoder.finish()]);
        await readBuffer.mapAsync(GPUMapMode.READ);
        const times = new BigUint64Array(readBuffer.getMappedRange());
        let sum = 0n;
        let first = times[0];
        let last = times[1];
        for (let i = 0; i < times.length; i += 2) {
          if (times[i] < first) first = times[i];
          if (times[i + 1] > last) last = times[i + 1];
          sum += times[i + 1] - times[i];
        }
        result.gpuMs = Number(last - first) / 1e6;
        result.gpuPassSumMs = Number(sum) / 1e6;
        result.gpuScope = 'First render-pass begin through last render-pass end; sum excludes gaps; compute and uploads outside this interval are excluded';
        readBuffer.unmap();
        return result;
      } finally {
        readBuffer?.destroy();
        resolveBuffer?.destroy();
        pending = false;
      }
    },
    stats() {
      return { ...totals, gpuResourceBytesEstimate: totals.bufferBytes + totals.textureBytes,
        timestampsSupported, textureMemoryIsEstimate: true };
    },
    dispose() {
      if (pending || frame) throw new Error('Finish instrumentation before disposal');
      if (disposed) return;
      disposed = true;
      for (const restore of restores.reverse()) restore();
      querySet?.destroy();
    },
  };
}

function estimateTextureBytes(descriptor) {
  const size = descriptor.size;
  let width = Array.isArray(size) ? size[0] : size.width;
  let height = (Array.isArray(size) ? size[1] : size.height) || 1;
  let depth = (Array.isArray(size) ? size[2] : size.depthOrArrayLayers) || 1;
  const format = descriptor.format;
  let blockWidth = 1, blockHeight = 1, bytes = 4;
  if (/^(bc|etc2|eac|astc)/.test(format)) {
    blockWidth = blockHeight = 4;
    bytes = /^(bc1|bc4|etc2-rgb8|etc2-rgb8a1|eac-r11)/.test(format) ? 8 : 16;
    const astc = /^astc-(\d+)x(\d+)/.exec(format);
    if (astc) { blockWidth = +astc[1]; blockHeight = +astc[2]; }
  } else if (/^rgba32/.test(format)) bytes = 16;
  else if (/^(rgba16|rg32|depth32float-stencil8)/.test(format)) bytes = 8;
  else if (/^(rg16|r32|rgba8|bgra8|rgb10|rg11|rgb9|depth24|depth32)/.test(format)) bytes = 4;
  else if (/^(rg8|r16|depth16)/.test(format)) bytes = 2;
  else if (/^(r8|stencil8)/.test(format)) bytes = 1;
  let total = 0;
  for (let mip = 0; mip < (descriptor.mipLevelCount || 1); mip++) {
    total += Math.ceil(width / blockWidth) * Math.ceil(height / blockHeight) * depth * bytes;
    width = Math.max(1, Math.floor(width / 2));
    height = Math.max(1, Math.floor(height / 2));
    if (descriptor.dimension === '3d') depth = Math.max(1, Math.floor(depth / 2));
  }
  return total * (descriptor.sampleCount || 1);
}
