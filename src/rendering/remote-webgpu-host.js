import { floorFloat32 } from './float32-time.js';
import { remoteCameraWithinEnvelope } from './remote-camera-envelope.js';
import { createRemoteFrameTimeGuard } from './remote-frame-time-guard.js';
import { scheduleRemoteFrame } from './remote-frame-scheduler.js';

const REF = '__remoteGpuId';
const CURRENT = '@canvas';
const CREATION = new Set(['createBuffer','createTexture','createSampler','createBindGroup','createBindGroupLayout','createPipelineLayout','createShaderModule','createQuerySet','createRenderPipeline','createRenderPipelineAsync','createComputePipeline','createComputePipelineAsync']);
const QUEUE = new Set(['writeBuffer','writeTexture','copyExternalImageToTexture','submit']);
const COMMANDS = new Set(['copyBufferToBuffer','copyBufferToTexture','copyTextureToBuffer','copyTextureToTexture','clearBuffer','resolveQuerySet','insertDebugMarker','pushDebugGroup','popDebugGroup']);
const PASS = new Set(['setPipeline','setBindGroup','setVertexBuffer','setIndexBuffer','draw','drawIndexed','drawIndirect','drawIndexedIndirect','dispatchWorkgroups','dispatchWorkgroupsIndirect','setViewport','setScissorRect','setStencilReference','setBlendConstant','beginOcclusionQuery','endOcclusionQuery','executeBundles','insertDebugMarker','pushDebugGroup','popDebugGroup']);

export function createRemoteWebGpuHost({ device, context, canvas, port, requestFrame = callback => requestAnimationFrame(callback), cancelFrame = handle => cancelAnimationFrame(handle), absoluteNow = () => performance.timeOrigin + performance.now(), cameraState = null, adapterInfo = null, hidden: initiallyHidden = false, maxFrameOperations = 100000, maxFrameBytes = 64 * 1024 * 1024, resourceSliceMs = 2, yieldResourceTask = () => globalThis.scheduler?.postTask ? globalThis.scheduler.postTask(() => {}, { priority: 'background' }) : new Promise(resolve => setTimeout(resolve, 0)) }) {
  const resources = new Map([['@device', { id: '@device', value: device, pins: 0, dependencies: new Set() }]]);
  const retired = new Set(), clockBindings = new Map(), cameraBindings = new Map();
  const clockBindingKeys = new Map(), cameraBindingKeys = new Map();
  const reverseDependencies = new Map(), obsoleteVersions = new Set();
  const pendingRetirement = new Set(), nativeRetirement = new Set();
  let retirementScheduled = false;
  let resolutionResources = null;
  let stagedOperations = [];
  let active = null, pending = null, stopped = false, failed = false, frameHandle = null, chain = Promise.resolve();
  let currentTexture = null, currentViews = new Map(), deviceConfigured = false;
  let previousFrameAt = null, sampleCursor = 0;
  let hidden = !!initiallyHidden, hiddenStartedAt = initiallyHidden ? absoluteNow() : null;
  let resourceSliceStarted = absoluteNow(), queuedMessages = 0;
  const samples = new Array(4096), errors = [];
  const frameTime = createRemoteFrameTimeGuard();
  const metrics = { nativeFrames: 0, replayFrames: 0, packets: 0, computePackets: 0, commands: 0, queueWrites: 0, gpuErrors: 0, cameraUpdatesRejected: 0, uniformForks: 0, uniformForkBytes: 0, bindingForks: 0, resourceRetirements: 0, producerReleases: 0, hiddenMs: 0, visibilityTransitions: 0, resourceTaskYields: 0, resourceJobMaxMs: 0, resourceJobMaxType: null };
  function reply(message, result, error) {
    if (message.requestId) port.postMessage({ type: 'reply', requestId: message.requestId, result, error: error?.message });
  }
  function fail(error) {
    if (failed || stopped) return;
    failed = true;
    errors.push(error?.stack || String(error));
    port.postMessage({ type: 'error', error: error?.stack || String(error) });
  }
  function references(value, result = new Set()) {
    if (!value || typeof value !== 'object' || value instanceof ArrayBuffer || ArrayBuffer.isView(value)) return result;
    if (value[REF]) { result.add(value[REF]); return result; }
    for (const child of Object.values(value)) references(child, result);
    return result;
  }
  function resolve(value) {
    if (!value || typeof value !== 'object' || value instanceof ArrayBuffer || ArrayBuffer.isView(value)) return value;
    if (value[REF]) {
      const key = value[REF];
      if (key === CURRENT) return currentTexture ||= context.getCurrentTexture();
      const entry = resolutionResources?.get(key) || resources.get(key);
      if (!entry) throw Error(`Unknown remote GPU resource ${key}`);
      if (entry.currentView) {
        if (!currentViews.has(key)) currentViews.set(key, resolve({ [REF]: CURRENT }).createView(entry.descriptor));
        return currentViews.get(key);
      }
      return entry.value;
    }
    if (Array.isArray(value)) return value.map(resolve);
    // External images are native cloneable objects, not descriptors.
    if (typeof ImageBitmap !== 'undefined' && value instanceof ImageBitmap) return value;
    return Object.fromEntries(Object.entries(value).map(([key, child]) => [key, resolve(child)]));
  }
  function retainClosure(initial) {
    const retained = new Set();
    const visit = (key, entry = resources.get(key)) => {
      if (retained.has(key)) return;
      retained.add(key);
      if (entry?.dependencyEntries) for (const [dependency, resolved] of entry.dependencyEntries) visit(dependency, resolved);
      else for (const dependency of entry?.dependencies || []) visit(dependency);
    };
    for (const key of initial || []) visit(key);
    return retained;
  }
  function setResource(key, entry) {
    const previous = resources.get(key);
    entry.id = key; entry.pins = 0; entry.dependents = 0;
    entry.retirementRequested = false; entry.retired = false; entry.producerReleased = false; entry.internalRetirement = false; entry.nativeDestroyed = false;
    entry.dependencyEntries = new Map();
    for (const dependency of entry.dependencies) {
      const resolved = resources.get(dependency);
      if (resolved) { entry.dependencyEntries.set(dependency, resolved); resolved.dependents = (resolved.dependents || 0) + 1; }
    }
    resources.set(key, entry);
    for (const dependency of entry.dependencies) {
      if (!reverseDependencies.has(dependency)) reverseDependencies.set(dependency, new Set());
      reverseDependencies.get(dependency).add(key);
    }
    if (previous && previous !== entry) { previous.producerReleased = true; previous.internalRetirement = true; obsoleteVersions.add(previous); tryRetire(previous); }
  }
  function snapshotResources(initial) {
    const result = new Map();
    const visit = (key, entry = resources.get(key)) => {
      if (!entry) return;
      if (result.has(key)) {
        if (result.get(key) !== entry) throw Error(`Mixed native generations for remote resource ${key}`);
        return;
      }
      result.set(key, entry);
      for (const [dependency, resolved] of entry.dependencyEntries || []) visit(dependency, resolved);
    };
    for (const key of initial) visit(key);
    return result;
  }
  function pinSnapshot(snapshot) {
    for (const entry of snapshot.values()) {
      entry.pins = (entry.pins || 0) + 1;
      if (entry.currentView) entry.retirementRequested = true;
    }
  }
  function releaseSnapshot(snapshot) {
    for (const entry of snapshot?.values() || []) {
      entry.pins--;
      if (entry.pins < 0) throw Error('Unbalanced GPU generation retention');
      tryRetire(entry);
    }
  }
  function scheduleNativeRetirement(value) {
    if (!value?.destroy) return;
    nativeRetirement.add(value);
    if (retirementScheduled) return;
    retirementScheduled = true;
    queueMicrotask(() => {
      retirementScheduled = false;
      const batch = Array.from(nativeRetirement); nativeRetirement.clear();
      device.queue.onSubmittedWorkDone().then(() => { for (const item of batch) item.destroy(); }).catch(fail);
    });
  }
  function tryRetire(entry) {
    if (!entry || entry.retired || entry.id === '@device' || entry.pins > 0) return;
    const current = resources.get(entry.id) === entry;
    if (current && !entry.retirementRequested && !entry.producerReleased) return;
    // Explicit GPUBuffer.destroy has different semantics from JS collection:
    // it invalidates native storage even if an unused bind group still refers
    // to it. Collection only releases ownership and never calls destroy.
    if (entry.retirementRequested && !entry.nativeDestroyed) {
      entry.nativeDestroyed = true; scheduleNativeRetirement(entry.value);
    }
    if (entry.dependents > 0) return;
    if (stagedOperations.length) { pendingRetirement.add(entry); return; }
    entry.retired = true; obsoleteVersions.delete(entry); pendingRetirement.delete(entry);
    if (current) {
      resources.delete(entry.id); retired.delete(entry.id);
      for (const dependency of entry.dependencies) reverseDependencies.get(dependency)?.delete(entry.id);
      for (const key of clockBindingKeys.get(entry.id) || []) clockBindings.delete(key);
      for (const key of cameraBindingKeys.get(entry.id) || []) cameraBindings.delete(key);
      clockBindingKeys.delete(entry.id); cameraBindingKeys.delete(entry.id);
    }
    metrics.resourceRetirements++;
    if (entry.internalRetirement && !entry.nativeDestroyed) {
      entry.nativeDestroyed = true; scheduleNativeRetirement(entry.value);
    }
    for (const dependency of entry.dependencyEntries?.values() || []) {
      dependency.dependents--;
      if (dependency.dependents < 0) throw Error('Unbalanced native GPU resource dependency');
      tryRetire(dependency);
    }
    entry.dependencyEntries?.clear();
  }
  function forkPublishedUniform(key) {
    const entry = resources.get(key);
    if (!entry?.uniformShadow) return false;
    if (active?.resourceSnapshot?.get(key) !== entry && pending?.resourceSnapshot?.get(key) !== entry) return true;
    const descriptor = { ...entry.descriptor, mappedAtCreation: false, usage: entry.descriptor.usage | 8 };
    const shadow = entry.uniformShadow.slice();
    // The producer has already issued a pending frame's writes, even though the
    // consumer has not shown that frame yet. A subsequent partial write starts
    // from that logical state, never from an older displayed generation.
    if (pending?.resourceSnapshot?.get(key) === entry) for (const op of pending.operations) {
      if (op.method === 'writeBuffer' && op.args[0][REF] === key) shadow.set(new Uint8Array(op.args[2].buffer || op.args[2], op.args[2].byteOffset || 0, op.args[2].byteLength), op.args[1]);
    }
    const value = device.createBuffer(descriptor);
    device.queue.writeBuffer(value, 0, shadow);
    setResource(key, { ...entry, value, descriptor, uniformShadow: shadow });
    metrics.uniformForks++; metrics.uniformForkBytes += descriptor.size;
    // Bind groups are immutable native objects. Recreate just the groups that
    // reference the fork; old packets keep their original native groups.
    rebuildDependentBindings(key);
    return true;
  }
  function rebuildDependentBindings(key) {
    for (const dependent of reverseDependencies.get(key) || []) {
      const entry = resources.get(dependent);
      let value;
      if (entry?.kind === 'createBindGroup') value = device.createBindGroup(resolve(entry.descriptor));
      else if (entry?.kind === 'bundle') {
        const encoder = device.createRenderBundleEncoder(resolve(entry.descriptor));
        runPass(encoder, entry.commands, false); value = encoder.finish();
      } else continue;
      setResource(dependent, { ...entry, value });
      metrics.bindingForks++;
      rebuildDependentBindings(dependent);
    }
  }
  function runPass(target, commands, replay) {
    for (const command of commands) {
      if (!PASS.has(command.method)) throw Error(`Unsupported remote pass command ${command.method}`);
      if (replay && ['beginOcclusionQuery','endOcclusionQuery'].includes(command.method)) continue;
      target[command.method](...resolve(command.args)); metrics.commands++;
    }
  }
  function encodeCommandBuffer(buffer, replay = false) {
    const encoder = device.createCommandEncoder(buffer.descriptor || {});
    let count = 0;
    for (const command of buffer.__remoteCommands || []) {
      if (command.method === 'beginRenderPass' || command.method === 'beginComputePass') {
        if (replay && command.method === 'beginComputePass') continue;
        const descriptor = resolve(command.args[0]);
        if (replay) { delete descriptor.timestampWrites; delete descriptor.occlusionQuerySet; }
        const pass = encoder[command.method](descriptor);
        runPass(pass, command.commands, replay); pass.end(); count++;
      } else {
        if (!COMMANDS.has(command.method)) throw Error(`Unsupported remote encoder command ${command.method}`);
        // Readbacks, query resolutions and resource copies are one-shot jobs.
        // Render-target copies are replayed as part of the rendering pass chain.
        if (replay && !['copyTextureToTexture','insertDebugMarker','pushDebugGroup','popDebugGroup'].includes(command.method)) continue;
        encoder[command.method](...resolve(command.args)); count++;
      }
    }
    return count ? encoder.finish() : null;
  }
  function applyQueue(op, replay = false) {
    if (!QUEUE.has(op.method)) throw Error(`Unsupported remote queue method ${op.method}`);
    if (op.method === 'submit') {
      const buffers = op.args[0].map(buffer => encodeCommandBuffer(buffer, replay)).filter(Boolean);
      if (buffers.length) device.queue.submit(buffers);
    } else if (!replay || (op.method === 'writeBuffer' && active?.replayWriteBuffers?.has(op.args[0][REF]))) {
      device.queue[op.method](...resolve(op.args)); metrics.queueWrites++;
      if (op.method === 'writeBuffer') {
        const entry = resolutionResources?.get(op.args[0][REF]) || resources.get(op.args[0][REF]);
        if (entry?.uniformShadow) entry.uniformShadow.set(new Uint8Array(op.args[2].buffer || op.args[2], op.args[2].byteOffset || 0, op.args[2].byteLength), op.args[1]);
      }
      if (op.method === 'copyExternalImageToTexture') op.args[0]?.source?.close?.();
    }
  }
  function patchPresentation(elapsed, camera) {
    if (elapsed !== null) {
      for (const binding of active.clockBindings) {
        if (!active?.retained?.has(binding.id)) continue;
        const value = binding.semantic === 'relative' ? elapsed - binding.epoch : elapsed;
        if (!Number.isFinite(value)) throw Error('Invalid remote presentation clock value');
        device.queue.writeBuffer(resolve({ [REF]: binding.id }), binding.byteOffset, new Float32Array([floorFloat32(value)]));
      }
    }
    if (camera) for (const binding of active.cameraBindings) {
      if (!active?.retained?.has(binding.id)) continue;
      const value = camera.values[binding.semantic];
      if (!value) throw Error(`Unknown remote camera semantic ${binding.semantic}`);
      device.queue.writeBuffer(resolve({ [REF]: binding.id }), binding.byteOffset, value);
    }
  }
  function present() {
    if (stopped || failed) return;
    frameHandle = requestFrame(present);
    if (hidden) return;
    if (!deviceConfigured || (!active && !pending)) return;
    try {
      const startedAt = absoluteNow();
      currentTexture = null; currentViews = new Map();
      let next = pending;
      if (next) {
        const scheduled = scheduleRemoteFrame({ metadata: next.metadata, previousMetadata: active?.metadata || null, receivedAt: next.receivedAt, now: startedAt });
        if (!scheduled.ready) next = null;
        else {
          const metadata = scheduled.metadata?.clock?.consumerAnchored
            ? { ...scheduled.metadata, clock: { ...scheduled.metadata.clock, consumerAnchored: false } }
            : scheduled.metadata;
          next = { ...next, metadata };
        }
      }
      const previous = active;
      const candidate = next || active;
      const timeTicket = frameTime.propose({ generation: candidate.sequence, lease: candidate.metadata?.clock ?? null, absoluteNow: startedAt });
      if (next) {
        pending = null;
        if (next.width !== canvas.width) canvas.width = next.width;
        if (next.height !== canvas.height) canvas.height = next.height;
        active = next; active.retained = new Set(active.resourceSnapshot.keys());
        active.clockBindings = Array.from(clockBindings.values());
        active.cameraBindings = Array.from(cameraBindings.values());
        active.baselineWrites = [];
        for (const key of active.baselineBuffers) {
          const entry = active.resourceSnapshot.get(key);
          if (!entry?.uniformShadow) throw Error(`Cannot replay an unversioned GPU buffer read before its first write: ${key}`);
          active.baselineWrites.push({ id: key, bytes: entry.uniformShadow.slice() });
        }
      }
      resolutionResources = active.resourceSnapshot;
      const clockElapsed = timeTicket.elapsed;
      const candidateCamera = active.metadata?.cameraSafe === false ? null : cameraState?.sample({ width: canvas.width, height: canvas.height });
      if (candidateCamera) {
        if (remoteCameraWithinEnvelope(candidateCamera, active.metadata?.cameraEnvelope)) {
          if (!active.acceptedCamera || candidateCamera.revision !== active.acceptedCamera.revision || candidateCamera.version !== active.acceptedCamera.version) {
            active.acceptedCamera = { ...candidateCamera, values: Object.fromEntries(Object.entries(candidateCamera.values).map(([key, value]) => [key, value.slice()])) };
          }
        }
        else metrics.cameraUpdatesRejected++;
      }
      const camera = active.acceptedCamera || null;
      if (!next) for (const baseline of active.baselineWrites) device.queue.writeBuffer(resolve({ [REF]: baseline.id }), 0, baseline.bytes);
      // Preserve the original queue order (a buffer can change between passes).
      // Only the generation boundary is atomic, never reorder WebGPU operations.
      for (const op of active.operations) {
        if (op.method === 'submit') patchPresentation(clockElapsed, camera);
        applyQueue(op, !next);
      }
      metrics.nativeFrames++;
      frameTime.consume(timeTicket);
      if (!next) metrics.replayFrames++;
      samples[sampleCursor++ % samples.length] = { at: startedAt, intervalMs: previousFrameAt === null ? null : startedAt - previousFrameAt, drawMs: absoluteNow() - startedAt, replay: !next, clockElapsed, safeUntil: active.metadata?.clock?.safeUntil ?? null, cameraVersion: camera?.version ?? null };
      previousFrameAt = startedAt;
      if (next) {
        port.postMessage({ type: 'presented', sequence: active.sequence, metadata: active.metadata, absoluteTime: absoluteNow(), backend: 'webgpu', replayFrames: metrics.replayFrames });
        releaseSnapshot(previous?.resourceSnapshot);
      }
    } catch (error) { fail(error); }
    finally { resolutionResources = null; }
  }
  function packetBytes(value) {
    if (ArrayBuffer.isView(value) || value instanceof ArrayBuffer) return value.byteLength;
    if (!value || typeof value !== 'object') return 0;
    return Object.values(value).reduce((sum, child) => sum + packetBytes(child), 0);
  }
  function writtenResources(op) {
    if (op.method === 'writeBuffer') return references(op.args[0]);
    if (op.method === 'writeTexture') return references(op.args[0].texture);
    if (op.method === 'copyExternalImageToTexture') return references(op.args[1].texture);
    const result = new Set();
    if (op.method === 'submit') for (const buffer of op.args[0]) for (const command of buffer.__remoteCommands) {
      let destination;
      if (command.method === 'beginComputePass') destination = command.commands;
      else if (command.method === 'beginRenderPass') destination = command.args[0];
      else if (command.method === 'copyBufferToBuffer' || command.method === 'resolveQuerySet') destination = command.args[2];
      else if (command.method.startsWith('copy')) destination = command.args[1];
      else if (command.method === 'clearBuffer') destination = command.args[0];
      for (const key of retainClosure(references(destination))) result.add(key);
    }
    return result;
  }
  async function handle(message) {
    if (stopped || failed) return;
    switch (message.type) {
      case 'create': {
        if (!CREATION.has(message.method)) throw Error(`Unsupported remote resource ${message.method}`);
        if (resources.has(message.id)) throw Error(`Duplicate remote resource ${message.id}`);
        // Even Three's synchronous factory is admitted asynchronously here: its
        // producer gets an ID immediately; drawing keeps its prior generation.
        const method = message.method === 'createRenderPipeline' ? 'createRenderPipelineAsync' : message.method === 'createComputePipeline' ? 'createComputePipelineAsync' : message.method;
        const value = await device[method](resolve(message.descriptor));
        const uniformShadow = message.method === 'createBuffer' && (message.descriptor.usage & 64) && !(message.descriptor.usage & 128) ? new Uint8Array(message.descriptor.size) : null;
        setResource(message.id, { value, dependencies: references(message.descriptor), descriptor: message.descriptor, kind: message.method, uniformShadow, mapMode: message.descriptor.mappedAtCreation ? 2 : 0 });
        reply(message); break;
      }
      case 'view': {
        const entry = message.texture === CURRENT
          ? { currentView: true, descriptor: message.descriptor, sequence: message.sequence ?? ((active?.sequence || 0) + 1), dependencies: new Set([CURRENT]) }
          : { value: resolve({ [REF]: message.texture }).createView(resolve(message.descriptor)), dependencies: new Set([message.texture]) };
        setResource(message.id, entry); break;
      }
      case 'pipeline-layout': setResource(message.id, { value: resolve({ [REF]: message.pipeline }).getBindGroupLayout(message.index), dependencies: new Set([message.pipeline]) }); break;
      case 'bundle': {
        const encoder = device.createRenderBundleEncoder(resolve(message.descriptor));
        runPass(encoder, message.commands, false);
        setResource(message.id, { value: encoder.finish(), dependencies: references(message.commands), kind: 'bundle', descriptor: message.descriptor, commands: message.commands }); break;
      }
      case 'operation': {
        const touchesPublishedState = [...writtenResources(message.op)].some(key => active?.resourceSnapshot?.has(key) || pending?.resourceSnapshot?.has(key));
        const canFork = !stagedOperations.length && touchesPublishedState && message.op.method === 'writeBuffer' && forkPublishedUniform(message.op.args[0][REF]);
        if (stagedOperations.length || (touchesPublishedState && !canFork)) {
          // Preparation may touch existing resources. Such mutations belong to
          // the next atomic generation, even if Three issued them before render.
          if (stagedOperations.length >= maxFrameOperations) throw Error('Remote preparation exceeds safety limit');
          stagedOperations.push(message.op);
        } else applyQueue(message.op);
        break;
      }
      case 'configure': context.configure(resolve(message.descriptor)); deviceConfigured = true; break;
      case 'unconfigure': context.unconfigure(); deviceConfigured = false; break;
      case 'frame': {
        if (pending) throw Error('Remote GPU backpressure: pending generation already exists');
        const packet = message.packet;
        packet.receivedAt = absoluteNow();
        packet.operations = [...stagedOperations, ...packet.operations];
        stagedOperations = [];
        if (!Number.isSafeInteger(packet.sequence) || packet.sequence <= (active?.sequence || 0)) throw Error('Stale remote frame');
        if (!Array.isArray(packet.operations) || packet.operations.length > maxFrameOperations || packetBytes(packet) > maxFrameBytes) throw Error('Remote frame exceeds safety limit');
        if (!packet.operations.some(op => op.method === 'submit')) throw Error('Remote frame contains no drawing submission');
        const hasCompute = packet.operations.some(op => op.method === 'submit' && op.args[0].some(buffer => buffer.__remoteCommands.some(command => command.method === 'beginComputePass')));
        if (hasCompute && packet.metadata?.clock && !packet.metadata.clock.paused && packet.metadata.clock.safeUntil > packet.metadata.clock.elapsed) throw Error('An advancing remote clock cannot replay a frame containing one-shot compute; certify a repeatable compute contract first');
        if (hasCompute) metrics.computePackets++;
        packet.references = references(packet.operations);
        packet.resourceSnapshot = snapshotResources(packet.references);
        pinSnapshot(packet.resourceSnapshot);
        const writeCounts = new Map();
        for (const op of packet.operations) if (op.method === 'writeBuffer') {
          const key = op.args[0][REF]; writeCounts.set(key, (writeCounts.get(key) || 0) + 1);
        }
        // Restore per-pass uniforms when a buffer has several values within the
        // same frame. Single immutable uploads and all texture uploads stay out
        // of replay; clocks/camera are patched immediately before submission.
        packet.replayWriteBuffers = new Set([...writeCounts].filter(([, count]) => count > 1).map(([key]) => key));
        const written = new Set();
        packet.baselineBuffers = new Set();
        for (const op of packet.operations) {
          if (op.method === 'writeBuffer') written.add(op.args[0][REF]);
          else if (op.method === 'submit') for (const key of retainClosure(references(op))) {
            if (writeCounts.has(key) && !written.has(key)) {
              packet.baselineBuffers.add(key); packet.replayWriteBuffers.add(key);
            }
          }
        }
        pending = packet;
        for (const entry of pendingRetirement) tryRetire(entry);
        metrics.packets++; break;
      }
      case 'destroy': {
        const entry = resources.get(message.id);
        if (entry) { retired.add(message.id); entry.retirementRequested = true; tryRetire(entry); }
        break;
      }
      case 'release': {
        const entry = resources.get(message.id);
        if (entry && message.id !== '@device') {
          entry.producerReleased = true; metrics.producerReleases++; tryRetire(entry);
        }
        break;
      }
      case 'map': {
        const entry = resources.get(message.id); if (!entry) throw Error('Unknown mapped buffer');
        await entry.value.mapAsync(message.mode, message.offset, message.size);
        entry.mapMode = message.mode;
        entry.mappedRange = entry.value.getMappedRange(message.offset, message.size);
        const bytes = entry.mappedRange.slice(0);
        reply(message, { bytes }); break;
      }
      case 'unmap': {
        const entry = resources.get(message.id); if (!entry) throw Error('Unknown unmapped buffer');
        if (entry.mapMode & 2) new Uint8Array(entry.mappedRange || entry.value.getMappedRange(message.offset, message.bytes.byteLength)).set(new Uint8Array(message.bytes));
        if ((entry.mapMode & 2) && entry.uniformShadow) entry.uniformShadow.set(new Uint8Array(message.bytes), message.offset);
        entry.value.unmap(); entry.mapMode = 0; entry.mappedRange = null; break;
      }
      case 'fence': {
        if (stagedOperations.length) {
          const details = stagedOperations.slice(0, 8).map(op => ({ method: op.method, resources: [...writtenResources(op)].map(id => ({ id, kind: resources.get(id)?.kind, label: resources.get(id)?.descriptor?.label, usage: resources.get(id)?.descriptor?.usage, size: resources.get(id)?.descriptor?.size })) }));
          reply(message, null, Error(`A fence cannot cover uncommitted changes to a published frame; publish the next frame first. Deferred: ${JSON.stringify(details)}\n${message.caller || ''}`));
          break;
        }
        await device.queue.onSubmittedWorkDone(); reply(message); break;
      }
      case 'inspect': reply(message, api.inspect()); break;
      case 'compilation-info': {
        const info = await resolve({ [REF]: message.id }).getCompilationInfo();
        reply(message, { messages: Array.from(info.messages, item => ({ message: item.message, type: item.type, lineNum: item.lineNum, linePos: item.linePos, offset: item.offset, length: item.length })) }); break;
      }
      case 'clock-binding': {
        const key = `${message.id}:${message.binding.byteOffset}`;
        clockBindings.set(key, { ...message.binding, id: message.id });
        if (!clockBindingKeys.has(message.id)) clockBindingKeys.set(message.id, new Set());
        clockBindingKeys.get(message.id).add(key); break;
      }
      case 'camera-binding': {
        const key = `${message.id}:${message.binding.byteOffset}`;
        if (message.binding.enabled === false) { cameraBindings.delete(key); cameraBindingKeys.get(message.id)?.delete(key); }
        else {
          cameraBindings.set(key, { ...message.binding, id: message.id });
          if (!cameraBindingKeys.has(message.id)) cameraBindingKeys.set(message.id, new Set());
          cameraBindingKeys.get(message.id).add(key);
        }
        break;
      }
      case 'camera-mailbox': if (!cameraState) throw Error('Remote camera state unavailable'); else cameraState.setMailbox(message.mailbox); break;
      case 'push-error-scope': device.pushErrorScope(message.filter); break;
      case 'pop-error-scope': { const error = await device.popErrorScope(); reply(message, error ? { message: error.message } : null); break; }
      case 'dispose': api.dispose(); break;
      default: throw Error(`Unknown remote GPU message ${message.type}`);
    }
  }
  port.onmessage = event => {
    const message = event.data;
    if (message.type === 'inspect') { reply(message, api.inspect()); return; }
    if (++queuedMessages > maxFrameOperations) { fail(Error('Remote resource queue exceeds safety limit')); return; }
    chain = chain.then(async () => {
      // A resolved pipeline can unlock thousands of queued promise callbacks.
      // Admit resource jobs in interruptible tasks so they cannot monopolize a
      // single microtask checkpoint while the independent draw loop is ready.
      if (absoluteNow() - resourceSliceStarted >= resourceSliceMs) {
        metrics.resourceTaskYields++; await yieldResourceTask(); resourceSliceStarted = absoluteNow();
      }
      const started = absoluteNow();
      const job = handle(message);
      const synchronousMs = absoluteNow() - started;
      if (synchronousMs > metrics.resourceJobMaxMs) { metrics.resourceJobMaxMs = synchronousMs; metrics.resourceJobMaxType = message.method || message.type; }
      await job;
    }).catch(error => { reply(message, null, error); fail(error); }).finally(() => { queuedMessages--; });
  };
  port.start?.();
  device.lost?.then(info => { port.postMessage({ type: 'lost', info: { reason: info.reason, message: info.message } }); api.dispose(); });
  device.addEventListener?.('uncapturederror', event => { metrics.gpuErrors++; fail(event.error); });
  frameHandle = requestFrame(present);
  const api = {
    handle, present, idle: () => chain,
    setVisibility(nextHidden) {
      nextHidden = !!nextHidden;
      if (nextHidden === hidden) return;
      const now = absoluteNow(); metrics.visibilityTransitions++;
      if (nextHidden) hiddenStartedAt = now;
      else {
        const duration = Math.max(0, now - hiddenStartedAt);
        metrics.hiddenMs += duration;
        if (active?.metadata?.preparedInterval && active.metadata.clock) {
          active.metadata = { ...active.metadata, clock: { ...active.metadata.clock, anchorAbsoluteMs: active.metadata.clock.anchorAbsoluteMs + duration } };
        }
        if (pending) pending.receivedAt = pending.receivedAt >= hiddenStartedAt ? now : pending.receivedAt + duration;
        hiddenStartedAt = null; previousFrameAt = null;
      }
      hidden = nextHidden;
    },
    inspect: () => ({ ...metrics, hidden, resources: resources.size, activeSequence: active?.sequence || null, pendingSequence: pending?.sequence || null, queuedMessages, stagedOperations: stagedOperations.length, obsoleteVersions: obsoleteVersions.size, failed, backend: 'webgpu', rafIndependent: true, adapterInfo, frameTime: frameTime.status(), lease: active?.metadata?.clock || null, cameraSafe: active?.metadata?.cameraSafe ?? false, cameraEnvelope: active?.metadata?.cameraEnvelope || null, clockBindings: active?.clockBindings.length || 0, cameraBindings: active?.cameraBindings.length || 0, clockAtHorizon: !!active?.metadata?.clock && frameTime.status().elapsed >= active.metadata.clock.safeUntil, errors: errors.slice(), samples: sampleCursor < samples.length ? samples.slice(0, sampleCursor) : [...samples.slice(sampleCursor % samples.length), ...samples.slice(0, sampleCursor % samples.length)] }),
    dispose() {
      if (stopped) return; stopped = true;
      if (frameHandle !== null) cancelFrame(frameHandle);
      device.queue.onSubmittedWorkDone().finally(() => {
        for (const [key, entry] of resources) if (key !== '@device') entry.value?.destroy?.();
        resources.clear(); context.unconfigure(); device.destroy();
      }).catch(() => {});
    },
  };
  return api;
}
