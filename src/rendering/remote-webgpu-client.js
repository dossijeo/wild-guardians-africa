// The producer owns Three's object graph, never the native GPU device. Only
// serializable WebGPU descriptors and commands cross this boundary.
const REF = '__remoteGpuId';
const CURRENT = '@canvas';
const ENCODER_METHODS = ['copyBufferToBuffer','copyBufferToTexture','copyTextureToBuffer','copyTextureToTexture','clearBuffer','resolveQuerySet','insertDebugMarker','pushDebugGroup','popDebugGroup'];
const PASS_METHODS = ['setPipeline','setBindGroup','setVertexBuffer','setIndexBuffer','draw','drawIndexed','drawIndirect','drawIndexedIndirect','dispatchWorkgroups','dispatchWorkgroupsIndirect','setViewport','setScissorRect','setStencilReference','setBlendConstant','beginOcclusionQuery','endOcclusionQuery','executeBundles','insertDebugMarker','pushDebugGroup','popDebugGroup'];

function copyBytes(data, offset = 0, size) {
  const view = ArrayBuffer.isView(data);
  const unit = view ? (data.BYTES_PER_ELEMENT || 1) : 1;
  const length = view ? data.byteLength : data.byteLength;
  const start = offset * unit;
  const count = size === undefined ? length - start : size * unit;
  if (start < 0 || count < 0 || start + count > length) throw RangeError('Remote GPU data range');
  return new Uint8Array(view ? data.buffer : data, (view ? data.byteOffset : 0) + start, count).slice();
}

export function createRemoteWebGpuClient({ port, capabilities, onError = () => {}, onPresented = () => {}, terminate = () => {}, finalizationRegistryFactory = callback => typeof FinalizationRegistry === 'function' ? new FinalizationRegistry(callback) : null }) {
  let nextId = 0, sequence = 0, frame = null, pendingFrame = null, disposed = false, fatalError = null;
  let outbound = Promise.resolve();
  const pending = new Map(), clockBindings = new Map(), canvasViewIds = new Set();
  const weakResources = new Map(), retainedCounts = new Map(), deferredFinalizations = new Set();
  const finalizer = finalizationRegistryFactory(resourceId => {
    if (disposed || fatalError) return;
    if (retainedCounts.get(resourceId)) { deferredFinalizations.add(resourceId); return; }
    weakResources.delete(resourceId); canvasViewIds.delete(resourceId);
    send({ type: 'release', id: resourceId });
  });
  const metrics = { framesPublished: 0, framesPresented: 0, resourcesCreated: 0, bytesWritten: 0 };
  let resolveLost;
  const lost = new Promise(resolve => { resolveLost = resolve; });
  const id = prefix => `${prefix}:${++nextId}`;
  function retainReferences(values) {
    for (const value of values) retainedCounts.set(value[REF], (retainedCounts.get(value[REF]) || 0) + 1);
    return values;
  }
  function releaseReferences(values) {
    for (const value of values || []) {
      const resourceId = value[REF], remaining = (retainedCounts.get(resourceId) || 1) - 1;
      if (remaining) retainedCounts.set(resourceId, remaining);
      else {
        retainedCounts.delete(resourceId);
        if (deferredFinalizations.delete(resourceId) && !disposed && !fatalError) {
          weakResources.delete(resourceId); canvasViewIds.delete(resourceId); send({ type: 'release', id: resourceId });
        }
      }
    }
  }
  function collectReferences(value, result = new Set()) {
    if (!value || typeof value !== 'object' || value instanceof ArrayBuffer || ArrayBuffer.isView(value)) return result;
    if (value[REF]) {
      const proxy = weakResources.get(value[REF])?.deref();
      if (proxy) result.add(proxy);
      return result;
    }
    for (const child of Object.values(value)) collectReferences(child, result);
    return result;
  }
  function rememberFrameReference(value) {
    if (frame && !frame.retained.has(value)) {
      frame.retained.add(value); retainReferences([value]);
    }
  }
  function encode(value) {
    if (value === null || value === undefined || typeof value !== 'object') {
      if (typeof value === 'function') throw TypeError('Functions cannot cross GPU boundary');
      return value;
    }
    if (value[REF]) { rememberFrameReference(value); return { [REF]: value[REF] }; }
    if (value.__remoteCommands) return { __remoteCommands: value.__remoteCommands, descriptor: value.descriptor };
    if (ArrayBuffer.isView(value)) return value.slice ? value.slice() : new Uint8Array(value.buffer, value.byteOffset, value.byteLength).slice();
    if (value instanceof ArrayBuffer) return value.slice(0);
    if (Array.isArray(value)) return value.map(encode);
    if (typeof ImageBitmap !== 'undefined' && value instanceof ImageBitmap) return value;
    return Object.fromEntries(Object.entries(value).map(([key, child]) => [key, encode(child)]));
  }
  function fail(error) {
    const reason = error instanceof Error ? error : new Error(String(error));
    if (fatalError) return;
    fatalError = reason;
    for (const entry of pending.values()) entry.reject(reason);
    pending.clear(); pendingFrame?.reject(reason);
    releaseReferences(pendingFrame?.retained); releaseReferences(frame?.retained);
    pendingFrame = null; frame = null;
    onError(reason);
  }
  function send(message) {
    if (disposed) throw Error('Remote GPU is disposed');
    if (fatalError) throw fatalError;
    const retained = retainReferences(collectReferences(message));
    outbound = outbound.then(async () => {
      // Conversion starts at queue call time to capture the correct canvas
      // version. Await it only in the sender, never in the draw loop.
      const ownedImages = [];
      for (const op of message.type === 'frame' ? message.packet.operations : message.op ? [message.op] : []) {
        if (!op.prepareImage) continue;
        const bitmap = await op.prepareImage;
        op.args[0].source = bitmap;
        delete op.prepareImage;
        ownedImages.push(bitmap);
      }
      port.postMessage(message);
      for (const bitmap of ownedImages) bitmap.close();
    }).finally(() => releaseReferences(retained));
    outbound.catch(fail);
  }
  function request(message) {
    const requestId = id('request');
    const promise = new Promise((resolve, reject) => pending.set(requestId, { resolve, reject }));
    send({ ...message, requestId });
    return promise;
  }
  function queueOp(op) {
    if (frame) {
      for (const value of collectReferences(op)) rememberFrameReference(value);
      frame.operations.push(op);
    }
    else send({ type: 'operation', op });
  }
  function object(kind, descriptor = {}, suppliedId) {
    const value = { [REF]: suppliedId || id(kind), label: descriptor.label || '' };
    value.destroy = () => send({ type: 'destroy', id: value[REF] });
    Object.defineProperty(value, '__remoteDependencies', { value: collectReferences(descriptor) });
    if (!suppliedId) {
      weakResources.set(value[REF], new WeakRef(value));
      finalizer?.register(value, value[REF]);
    }
    return value;
  }
  function resource(kind, descriptor = {}, method = `create${kind}`) {
    const value = object(kind, descriptor);
    metrics.resourcesCreated++;
    send({ type: 'create', method, id: value[REF], descriptor: encode(descriptor) });
    return value;
  }
  function texture(descriptor, suppliedId) {
    const value = suppliedId ? object('Texture', descriptor, suppliedId) : resource('Texture', descriptor);
    const size = descriptor.size || [canvas.width, canvas.height, 1];
    const dimensions = Array.isArray(size) ? size : [size.width, size.height, size.depthOrArrayLayers];
    Object.assign(value, { width: dimensions[0], height: dimensions[1] || 1, depthOrArrayLayers: dimensions[2] || 1, mipLevelCount: descriptor.mipLevelCount || 1, sampleCount: descriptor.sampleCount || 1, dimension: descriptor.dimension || '2d', format: descriptor.format || capabilities.format, usage: descriptor.usage || 0 });
    value.createView = (viewDescriptor = {}) => {
      const view = object('TextureView', viewDescriptor);
      view.__remoteDependencies.add(value);
      if (value[REF] === CURRENT) canvasViewIds.add(view[REF]);
      send({ type: 'view', id: view[REF], texture: value[REF], descriptor: encode(viewDescriptor), sequence: frame?.sequence || sequence + 1 });
      return view;
    };
    return value;
  }
  function pipeline(method, descriptor, async = false) {
    const value = object('Pipeline', descriptor);
    value.getBindGroupLayout = index => {
      const layout = object('BindGroupLayout');
      layout.__remoteDependencies.add(value);
      send({ type: 'pipeline-layout', id: layout[REF], pipeline: value[REF], index });
      return layout;
    };
    metrics.resourcesCreated++;
    const message = { type: 'create', method, id: value[REF], descriptor: encode(descriptor) };
    if (async) return request(message).then(() => value);
    send(message); return value;
  }
  function encoder(descriptor = {}, bundle = false) {
    const commands = [];
    const recordedReferences = collectReferences(descriptor);
    const result = { label: descriptor.label || '' };
    let finished = false;
    const add = (method, args) => { if (finished) throw Error('Finished remote encoder'); collectReferences(args, recordedReferences); commands.push({ method, args: encode(args) }); };
    for (const method of bundle ? PASS_METHODS : ENCODER_METHODS) result[method] = (...args) => add(method, args);
    if (!bundle) for (const type of ['Render', 'Compute']) result[`begin${type}Pass`] = passDescriptor => {
      const pass = { method: `begin${type}Pass`, args: [encode(passDescriptor || {})], commands: [] };
      collectReferences(passDescriptor, recordedReferences);
      commands.push(pass);
      let ended = false;
      const passProxy = {};
      for (const method of PASS_METHODS) passProxy[method] = (...args) => {
        if (ended || finished) throw Error('Finished remote pass');
        collectReferences(args, recordedReferences);
        pass.commands.push({ method, args: encode(args) });
      };
      passProxy.end = () => { if (ended) throw Error('Remote pass already ended'); ended = true; };
      return passProxy;
    };
    result.finish = () => {
      finished = true;
      if (bundle) {
        const value = object('RenderBundle');
        for (const dependency of recordedReferences) value.__remoteDependencies.add(dependency);
        send({ type: 'bundle', id: value[REF], descriptor: encode(descriptor), commands });
        return value;
      }
      return { __remoteCommands: commands, descriptor: encode(descriptor), __remoteReferences: recordedReferences, submitted: false };
    };
    return result;
  }
  const queue = {
    writeBuffer(buffer, bufferOffset, data, dataOffset = 0, size) {
      const bytes = copyBytes(data, dataOffset, size); metrics.bytesWritten += bytes.byteLength;
      queueOp({ method: 'writeBuffer', args: [encode(buffer), bufferOffset, bytes] });
    },
    writeTexture(destination, data, layout, size) {
      const bytes = copyBytes(data); metrics.bytesWritten += bytes.byteLength;
      queueOp({ method: 'writeTexture', args: [encode(destination), bytes, encode(layout), encode(size)] });
    },
    copyExternalImageToTexture(source, destination, size) {
      const isCanvas = typeof OffscreenCanvas !== 'undefined' && source.source instanceof OffscreenCanvas;
      const op = { method: 'copyExternalImageToTexture', args: [isCanvas ? { ...source, source: null } : encode(source), encode(destination), encode(size)] };
      if (isCanvas) op.prepareImage = createImageBitmap(source.source);
      queueOp(op);
    },
    submit(buffers) {
      for (const buffer of buffers) { if (buffer.submitted) throw Error('Command buffer already submitted'); buffer.submitted = true; }
      queueOp({ method: 'submit', args: [buffers.map(buffer => ({ __remoteCommands: buffer.__remoteCommands, descriptor: buffer.descriptor }))] });
    },
    onSubmittedWorkDone() {
      if (frame?.operations.length) return Promise.reject(Error('Cannot fence uncommitted remote frame'));
      return request({ type: 'fence', caller: new Error('Remote queue fence requested').stack });
    },
  };
  const device = {
    [REF]: '@device', queue, features: new Set(capabilities.features || []), limits: Object.freeze({ ...capabilities.limits }), adapterInfo: capabilities.adapterInfo || {}, lost,
    createBuffer(descriptor) {
      const value = resource('Buffer', descriptor);
      let mapping = descriptor.mappedAtCreation ? new ArrayBuffer(descriptor.size) : null, mapOffset = 0;
      Object.assign(value, { size: descriptor.size, usage: descriptor.usage, mapState: mapping ? 'mapped' : 'unmapped' });
      value.getMappedRange = (offset = 0, size = value.size - offset) => {
        if (!mapping || value.mapState !== 'mapped') throw Error('Remote buffer is not mapped');
        if (offset !== mapOffset || size !== mapping.byteLength) throw Error('Partial mapped ranges are unsupported; map requested range first');
        return mapping;
      };
      value.mapAsync = async (mode, offset = 0, size = value.size - offset) => {
        if (value.mapState !== 'unmapped') throw Error('Remote buffer already mapped');
        value.mapState = 'pending';
        const result = await request({ type: 'map', id: value[REF], mode, offset, size });
        mapping = result.bytes; mapOffset = offset; value.mapState = 'mapped';
      };
      value.unmap = () => {
        if (value.mapState !== 'mapped') return;
        send({ type: 'unmap', id: value[REF], offset: mapOffset, bytes: mapping.slice(0) });
        mapping = null; mapOffset = 0; value.mapState = 'unmapped';
      };
      return value;
    },
    createTexture: descriptor => texture(descriptor),
    createSampler: descriptor => resource('Sampler', descriptor),
    createBindGroup: descriptor => resource('BindGroup', descriptor),
    createBindGroupLayout: descriptor => resource('BindGroupLayout', descriptor),
    createPipelineLayout: descriptor => resource('PipelineLayout', descriptor),
    createQuerySet: descriptor => resource('QuerySet', descriptor),
    createShaderModule(descriptor) {
      const value = resource('ShaderModule', descriptor);
      value.getCompilationInfo = () => request({ type: 'compilation-info', id: value[REF] });
      return value;
    },
    createRenderPipeline: descriptor => pipeline('createRenderPipeline', descriptor),
    createRenderPipelineAsync: descriptor => pipeline('createRenderPipelineAsync', descriptor, true),
    createComputePipeline: descriptor => pipeline('createComputePipeline', descriptor),
    createComputePipelineAsync: descriptor => pipeline('createComputePipelineAsync', descriptor, true),
    createCommandEncoder: descriptor => encoder(descriptor),
    createRenderBundleEncoder: descriptor => encoder(descriptor, true),
    importExternalTexture() { throw Error('External video textures need an explicit remote resource owner'); },
    pushErrorScope: filter => send({ type: 'push-error-scope', filter }),
    popErrorScope: () => request({ type: 'pop-error-scope' }),
    addEventListener() {}, removeEventListener() {}, destroy: () => port.postMessage({ type: 'device-destroy' }),
  };
  const canvas = {
    width: capabilities.width, height: capabilities.height, style: {},
    addEventListener() {}, removeEventListener() {}, setAttribute() {},
    getContext: name => name === 'webgpu' ? context : null,
  };
  const context = {
    canvas,
    configure: descriptor => send({ type: 'configure', descriptor: encode(descriptor) }),
    unconfigure: () => send({ type: 'unconfigure' }),
    getConfiguration: () => ({ device, format: capabilities.format }),
    getCurrentTexture: () => texture({ size: [canvas.width, canvas.height, 1], format: capabilities.format }, CURRENT),
  };
  port.onmessage = event => {
    const message = event.data;
    if (message.type === 'reply') {
      const entry = pending.get(message.requestId);
      if (entry) { pending.delete(message.requestId); message.error ? entry.reject(Error(message.error)) : entry.resolve(message.result); }
    } else if (message.type === 'presented') {
      metrics.framesPresented++;
      if (pendingFrame?.sequence === message.sequence) {
        pendingFrame.resolve(message); releaseReferences(pendingFrame.retained); pendingFrame = null;
      }
      onPresented(message);
    } else if (message.type === 'lost') {
      resolveLost(message.info);
      fatalError = Error(`WebGPU device lost: ${message.info?.reason || 'unknown'}: ${message.info?.message || ''}`);
      pendingFrame?.reject(fatalError);
      releaseReferences(pendingFrame?.retained); releaseReferences(frame?.retained);
      pendingFrame = null; frame = null;
      for (const entry of pending.values()) entry.reject(fatalError);
      pending.clear();
    }
    else if (message.type === 'error') fail(Error(message.error));
  };
  port.start?.();
  const api = {
    device, context, canvas,
    beginFrame(metadata = {}) {
      if (disposed || fatalError) throw fatalError || Error('Remote GPU is disposed');
      if (frame || pendingFrame) throw Error('Remote GPU frame backpressure: one generation already pending');
      frame = { sequence: ++sequence, metadata: structuredClone(metadata), operations: [], retained: new Set() };
    },
    endFrame(metadata) {
      if (!frame) throw Error('No remote GPU frame transaction');
      const packet = frame; frame = null;
      const retained = packet.retained; delete packet.retained;
      if (metadata !== undefined) packet.metadata = structuredClone(metadata);
      packet.width = canvas.width; packet.height = canvas.height;
      metrics.framesPublished++;
      return new Promise((resolve, reject) => {
        pendingFrame = { sequence: packet.sequence, resolve, reject, retained };
        send({ type: 'frame', packet });
      });
    },
    cancelFrame() {
      if (!frame) return;
      const operations = frame.operations, retained = frame.retained; frame = null;
      // Three already updated upload/version bookkeeping. Cancel presentation,
      // not the resource writes that bookkeeping says have been submitted.
      for (const op of operations) {
        if (op.method !== 'submit') { queueOp(op); continue; }
        const buffers = op.args[0].map(buffer => ({ ...buffer, __remoteCommands: buffer.__remoteCommands.filter(command => {
          if (command.method !== 'beginRenderPass') return true;
          return !(command.args[0]?.colorAttachments || []).some(attachment => canvasViewIds.has(attachment?.view?.[REF]) || canvasViewIds.has(attachment?.resolveTarget?.[REF]));
        }) })).filter(buffer => buffer.__remoteCommands.length);
        if (buffers.length) queueOp({ method: 'submit', args: [buffers] });
      }
      releaseReferences(retained);
    },
    registerClockBinding(buffer, binding) {
      if (!buffer?.[REF] || !['absolute', 'relative'].includes(binding.semantic) || !Number.isInteger(binding.byteOffset) || binding.byteOffset < 0 || binding.byteOffset % 4) throw TypeError('Invalid remote clock binding');
      const key = `${buffer[REF]}:${binding.byteOffset}`;
      clockBindings.set(key, binding);
      send({ type: 'clock-binding', id: buffer[REF], binding });
    },
    registerCameraBinding(buffer, binding) { send({ type: 'camera-binding', id: buffer[REF], binding }); },
    setCameraMailbox(mailbox) { send({ type: 'camera-mailbox', mailbox }); },
    inspect: () => ({ ...metrics, pendingFrame: pendingFrame?.sequence || null, openFrame: frame?.sequence || null, clockBindings: clockBindings.size, retainedResources: retainedCounts.size, weakResources: weakResources.size, finalizationAvailable: !!finalizer, backend: 'remote-webgpu', failed: !!fatalError }),
    inspectAsync: () => request({ type: 'inspect' }).then(consumer => ({ ...api.inspect(), consumer })),
    dispose() {
      if (disposed) return;
      port.postMessage({ type: 'dispose' }); disposed = true;
      const error = Error('Remote GPU disposed');
      pendingFrame?.reject(error); pendingFrame = null;
      retainedCounts.clear(); weakResources.clear(); deferredFinalizations.clear();
      for (const entry of pending.values()) entry.reject(error);
      pending.clear(); terminate(); port.close?.();
    },
  };
  return api;
}

export async function createRemoteWebGpu({ canvas, port: suppliedPort, onError, onPresented, workerFactory = () => new Worker(new URL('./webgpu-draw-worker.js', import.meta.url), { type: 'module', name: 'wild-guardians-gpu-draw' }) }) {
  const worker = suppliedPort ? null : workerFactory();
  const channel = suppliedPort ? null : new MessageChannel();
  const port = suppliedPort || channel.port1;
  const capabilities = await new Promise((resolve, reject) => {
    port.onmessage = event => {
      if (event.data.type === 'ready') resolve(event.data.capabilities);
      else if (event.data.type === 'error') reject(Error(event.data.error));
    };
    port.start?.();
    if (worker) {
      worker.addEventListener('error', event => reject(Error(event.message)), { once: true });
      worker.postMessage({ type: 'init', canvas, port: channel.port2 }, [canvas, channel.port2]);
    }
  });
  return createRemoteWebGpuClient({ port, capabilities, onError, onPresented, terminate: () => worker?.terminate() });
}
