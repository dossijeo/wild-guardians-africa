import {copyNativeHomeArrivalReference,copyNativeHomeArrivalAttestation,sameNativeHomeArrivalReference} from '../world/native-home-arrival.js';
import {copyNativeTaskSettlementReference,sameNativeTaskSettlementReference,nativeTaskSettlementReferenceCovered,copyNativeTaskSettlementAttestation} from '../world/native-task-settlement.js';
import {copyNativeInitialIdleBodyReference,sameNativeInitialIdleBodyReference,nativeInitialIdleBodyReferenceCovered,copyNativeInitialIdleBodyAttestation} from '../world/native-initial-idle-body.js';
import {copyNativeHomeRouteReference,sameNativeHomeRouteReference,copyNativeHomeRouteAttestation,nativeHomeRouteReferenceCovered} from '../world/native-home-route.js';
import {copyNativeTaskConsequenceReference,sameNativeTaskConsequenceReference,nativeTaskConsequenceReferenceCovered,copyNativeTaskConsequenceAttestation} from '../world/native-task-consequence.js';
import {copyNativeTaskStartReference,sameNativeTaskStartReference,nativeTaskStartReferenceCovered} from '../world/native-task-start-reference.js';
import {copyNativeTaskStartAttestation} from '../world/native-task-start-attestation.js';
import {nativeTaskActionRemainingDuration,copyNativeTaskActionReference,sameNativeTaskActionReference,nativeTaskActionReferenceCovered} from '../world/native-task-action-presentation.js';
import {copyNativeTaskActionAttestation} from '../world/native-task-action-attestation.js';
import {copyNativeResumeAttestation} from '../world/native-resume-attestation.js';
import {sameNativeResumeReference} from '../world/native-resume-reference.js';
import {copyNativeResumeReference,nativeResumeReferenceCovered} from '../world/native-resume-reference.js';
import {copyNativeSuspendedBodyReference,nativeSuspendedBodyReferenceCovered} from '../world/native-suspended-body-reference.js';
import { floorFloat32 } from './float32-time.js';
import {copyNativeRouteReference} from '../world/native-route-reference.js';
import {copyNativeGateReference,nativeGateReferenceCovered} from '../world/native-gate-reference.js';
import { remoteCameraWithinEnvelope } from './remote-camera-envelope.js';
import { createRemoteFrameTimeGuard } from './remote-frame-time-guard.js';
import { scheduleRemoteFrame } from './remote-frame-scheduler.js';
import { evaluateRemoteClock } from './remote-presentation-clock.js';
import { createNativeRouteControl } from './native-route-control.js';
import {copyNativeWorldBoundary,sameNativeWorldBoundary} from '../world/native-world-boundary.js';

import {validRemoteTexturePreparation} from './remote-texture-preparation.js';
import {rejectedFramePreparations,closePreparationImages} from './remote-frame-preparations.js';
const REF = '__remoteGpuId';
const CURRENT = '@canvas';
const CREATION = new Set(['createBuffer','createTexture','createSampler','createBindGroup','createBindGroupLayout','createPipelineLayout','createShaderModule','createQuerySet','createRenderPipeline','createRenderPipelineAsync','createComputePipeline','createComputePipelineAsync']);
const QUEUE = new Set(['writeBuffer','writeTexture','copyExternalImageToTexture','submit']);
const COMMANDS = new Set(['copyBufferToBuffer','copyBufferToTexture','copyTextureToBuffer','copyTextureToTexture','clearBuffer','resolveQuerySet','insertDebugMarker','pushDebugGroup','popDebugGroup']);
const PASS = new Set(['setPipeline','setBindGroup','setVertexBuffer','setIndexBuffer','draw','drawIndexed','drawIndirect','drawIndexedIndirect','dispatchWorkgroups','dispatchWorkgroupsIndirect','setViewport','setScissorRect','setStencilReference','setBlendConstant','beginOcclusionQuery','endOcclusionQuery','executeBundles','insertDebugMarker','pushDebugGroup','popDebugGroup']);

export function createRemoteWebGpuHost({ device, context, canvas, port, intentControl = null, requestFrame = callback => requestAnimationFrame(callback), cancelFrame = handle => cancelAnimationFrame(handle), absoluteNow = () => performance.timeOrigin + performance.now(), cameraState = null, adapterInfo = null, hidden: initiallyHidden = false, maxFrameOperations = 100000, maxFrameBytes = 64 * 1024 * 1024, resourceSliceMs = 2, yieldResourceTask = () => globalThis.scheduler?.postTask ? globalThis.scheduler.postTask(() => {}, { priority: 'background' }) : new Promise(resolve => setTimeout(resolve, 0)) }) {
  if(intentControl!==null&&(!intentControl.port||typeof intentControl.port.postMessage!=='function'))throw TypeError('Invalid native intent control port');
  if(intentControl&&!intentControl.authorityEpoch&&
     (typeof intentControl.session!=='string'||!intentControl.session))throw TypeError('Missing native intent control session');
  let routeControl=intentControl?.authorityEpoch?createNativeRouteControl(intentControl):null;
  let lastNativeGpuFence=0;const nativeGpuFences=new Set();
  let lastNativeMutationFence=0,nativeMutationHold=null,nativeMutationFloor=null;
  let nativeMutationEpoch=0;
  let nativeWorldBoundary=null,worldBoundaryRequired=false;
  const frameBoundary=packet=>packet.admittedWorldBoundary??packet.metadata?.nativeWorldBoundary??null;
  const frameWorldCurrent=packet=>!worldBoundaryRequired||sameNativeWorldBoundary(frameBoundary(packet),nativeWorldBoundary);
  const frameClock=packet=>packet?.admittedMotionBinding?{...packet.metadata.clock,safeUntil:packet.admittedClockCoverageEnd??Math.max(packet.metadata.clock.safeUntil,(packet.admittedMotionBinding.reference.endTime??packet.metadata.clock.safeUntil))}:packet?.metadata?.clock;
  const drawCommandsCurrent=(op,boundary)=>op.method!=='submit'||op.args[0].every(buffer=>{
    if(buffer.texturePreparation)return validRemoteTexturePreparation(buffer,key=>resolutionResources?.get(key)||resources.get(key));
    return !worldBoundaryRequired||!buffer.__remoteCommands.some(command=>command.method==='beginRenderPass')||sameNativeWorldBoundary(buffer.nativeWorldBoundary??null,boundary);
  });
  function publishWorldBoundary(){port.postMessage({type:'native-world-boundary',worldBoundary:nativeWorldBoundary});}
  function invalidatePendingNativeWorld(reason){
    admittingFrame?.cancel();
    if(!pending)return;const stale=pending;pending=null;
    if(stale.preparedWorldBoundary&&frameWorldCurrent(stale)){
      stale.admittedClockBindings=admitClockBindings(stale);
      if(stale.admittedMotionBinding){let end=Math.max(stale.metadata.clock.safeUntil,(stale.admittedMotionBinding.reference.endTime??stale.metadata.clock.safeUntil));for(const binding of stale.admittedClockBindings){if(binding.nativeResume||binding.nativeStart||binding.nativeConsequence||binding.nativeHome||binding.nativeAction||binding.nativeSettlement||binding.nativeInitialIdleBody)end=Math.max(end,binding.motionRecord.executionEnd??0,binding.resourceEnd===undefined?0:binding.motionRecord.executionEpoch+(binding.resourceEnd-binding.epoch));else if((binding.nativeRoute||binding.nativeGate||binding.nativeSuspended)&&binding.resourceEnd!==undefined)end=Math.max(end,binding.executionEpoch===undefined?binding.resourceEnd:binding.executionEpoch+(binding.resourceEnd-binding.epoch));}stale.admittedClockCoverageEnd=end;}
      stale.nativeMutationEpoch=nativeMutationEpoch;pending=stale;return;
    }
    if(stale.initializedPreparation)port.postMessage({type:'frame-obsolete',sequence:stale.sequence,reason,resourcePreparationsRetained:true});
    else rejectPreparedFrame(stale,reason,true);
    releaseSnapshot(stale.resourceSnapshot);
  }
  const cancelledWorldFrames=new Set();
  function cancelPreparedWorldFrame(sequence){
    if(!Number.isSafeInteger(sequence)||sequence<1)throw Error('Invalid prepared world frame cancellation');
    if(nativeMutationHold?.preparedFrameSequence===sequence)return; // Retained by the current receipt until release.
    if(sequence>lastReceivedFrameSequence){if(cancelledWorldFrames.size>=64)throw Error('Too many prepared frame cancellations');cancelledWorldFrames.add(sequence);}
    if(admittingFrame?.prepared&&admittingFrame.packet.sequence===sequence)admittingFrame.cancel();
    if(!pending?.preparedWorldBoundary||pending.sequence!==sequence||frameWorldCurrent(pending))return;
    const packet=pending;pending=null;releaseSnapshot(packet.resourceSnapshot);
    port.postMessage({type:'frame-obsolete',sequence,reason:'Prepared world frame cancelled',resourcePreparationsRetained:true});
  }
  let nativeConsumerRetirement=null;
  let nativeConsumerToken=null,nativeRetirementNotified=false,deviceIsLost=false;
  function notifyNativeRetired(){
    if(nativeRetirementNotified)return;nativeRetirementNotified=true;
    try{if(routeControl)intentControl.port.postMessage({type:'intent-control-retired',protocolVersion:2,
      session:intentControl.session,authorityEpoch:routeControl.status().authorityEpoch,
      sequence:routeControl.status().sequence,consumerToken:nativeConsumerToken,drained:true});}catch{}
    intentControl?.port.close?.();
  }
  const mutationSubmissionWaiters=new Set();
  function settleMutationSubmissions(error=null){
    for(const waiter of mutationSubmissionWaiters){mutationSubmissionWaiters.delete(waiter);error?waiter.reject(error):waiter.resolve();}
  }
  function waitMutationSubmission(){
    return nativeMutationHold?new Promise((resolve,reject)=>mutationSubmissionWaiters.add({resolve,reject})):Promise.resolve();
  }
  const nativeControlWaiters=new Set();
  const nativeControlTimeoutMs=intentControl?.timeoutMs??10000;
  if(!Number.isFinite(nativeControlTimeoutMs)||nativeControlTimeoutMs<=0)throw TypeError('Invalid native intent control timeout');
  const resources = new Map([['@device', { id: '@device', value: device, pins: 0, dependencies: new Set() }]]);
  const retired = new Set(), clockBindings = new Map(), cameraBindings = new Map();
  const clockBindingKeys = new Map(), cameraBindingKeys = new Map();
  const reverseDependencies = new Map(), obsoleteVersions = new Set();
  const pendingResources = new Map();
  const pendingRetirement = new Set(), nativeRetirement = new Set();
  let retirementScheduled = false;
  let resolutionResources = null;
  let admittingFrame=null;
  let stagedOperations = [],retainedPreparationSnapshot=null,preparationRecoveryRequired=false,lastReceivedFrameSequence=0,retainedPreparationOperationCount=0;
  let disposalPromise=null;
  let active = null, pending = null, stopped = false, failed = false, deviceDestroyRequested = false, frameHandle = null, chain = Promise.resolve();
  let currentTexture = null, currentViews = new Map(), deviceConfigured = false;
  let previousFrameAt = null, sampleCursor = 0;
  let nativeRouteFrame = null;
  let hidden = !!initiallyHidden, hiddenStartedAt = initiallyHidden ? absoluteNow() : null;
  let resourceSliceStarted = absoluteNow(), queuedMessages = 0;
  const samples = new Array(4096), errors = [];
  const frameTimings = [], fenceTimings = [];
  function recordTiming(ring, value, limit = 256) { ring.push(value); if (ring.length > limit) ring.shift(); return value; }
  const frameTime = createRemoteFrameTimeGuard();
  const metrics = { nativeFrames: 0, replayFrames: 0, packets: 0, computePackets: 0, commands: 0, queueWrites: 0, gpuErrors: 0, cameraUpdatesRejected: 0, uniformForks: 0, uniformForkBytes: 0, bindingForks: 0, resourceRetirements: 0, dependencyVisits: 0, retirementChecks: 0, producerReleases: 0, hiddenMs: 0, visibilityTransitions: 0, resourceTaskYields: 0, resourceJobMaxMs: 0, resourceJobMaxType: null };
  function settleNativeControl(error=null){
    const current=routeControl?.status();
    for(const waiter of nativeControlWaiters){
      if(!error&&(!current||current.sequence<waiter.sequence))continue;
      nativeControlWaiters.delete(waiter);clearTimeout(waiter.timer);waiter.signal?.removeEventListener('abort',waiter.abort);
      error?waiter.reject(error):waiter.resolve();
    }
  }
  function waitNativeControl(sequence,signal){
    if(signal?.aborted)return Promise.resolve();
    if(!intentControl)return Promise.reject(Error('Native route control unavailable'));
    if(!Number.isSafeInteger(sequence)||sequence<0)return Promise.reject(Error('Invalid native route assignment sequence'));
    const current=routeControl?.status();
    if(stopped||failed||current?.closed)return Promise.reject(Error('Native route control is closed'));
    if(current&&current.sequence>=sequence)return Promise.resolve();
    return new Promise((resolve,reject)=>{
      const waiter={sequence,resolve,reject,timer:null,signal,abort:null};
      waiter.abort=()=>{if(!nativeControlWaiters.delete(waiter))return;clearTimeout(waiter.timer);resolve();};
      waiter.timer=setTimeout(()=>{
        if(!nativeControlWaiters.delete(waiter))return;signal?.removeEventListener('abort',waiter.abort);
        const error=Error('Native intent control sequence did not arrive');
        error.code='native-route-control-timeout';reject(error);
      },nativeControlTimeoutMs);
      nativeControlWaiters.add(waiter);signal?.addEventListener('abort',waiter.abort,{once:true});if(signal?.aborted)waiter.abort();
    });
  }
  function reply(message, result, error) {
    if (message.requestId) port.postMessage({ type: 'reply', requestId: message.requestId, result, error: error?.message });
  }
  // Start native work in FIFO order, but do not serialize unrelated work behind
  // completion notifications. Pin the exact resource generation until settled.
  function observeNative(message, promise, convert = value => value, entry = null) {
    if (entry) entry.pins++;
    Promise.resolve(promise).then(value => {
      if (!stopped) reply(message, convert(value));
    }).catch(error => { if (!stopped) reply(message, null, error); }).finally(() => {
      if (entry) { entry.pins--; tryRetire(entry); }
    });
  }
  function cancelMapping(entry, reason) {
    const job = entry.mapJob;
    if (!job) return;
    entry.mapJob = null;
    entry.value.unmap();
    job.finish(null, Error(reason));
  }
  function fail(error) {
    if (failed || stopped) return;
    failed = true;
    admittingFrame?.cancel();
    discardRetainedPreparations();
    settleMutationSubmissions(error);
    routeControl?.dispose();settleNativeControl(error);
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
      if (entry.pending) throw Error(`Remote GPU resource is not ready ${key}`);
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
      metrics.dependencyVisits++;
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
  function waitForResources(keys) {
    const waits = [];
    for (const key of keys) {
      if (pendingResources.has(key)) waits.push(pendingResources.get(key).promise);
      else if (key !== CURRENT && !resources.has(key)) throw Error(`Unknown remote GPU resource ${key}`);
    }
    return waits.length ? Promise.all(waits) : null;
  }
  function createResourceJob(message, dependencies, build, extra = {}) {
    if (resources.has(message.id)) throw Error(`Duplicate remote resource ${message.id}`);
    const waiting = waitForResources(dependencies);
    const entry = { value: null, pending: true, dependencies, descriptor: message.descriptor, kind: message.method || message.type, ...extra };
    setResource(message.id, entry);
    let resolveReady, rejectReady;
    const promise = new Promise((resolve, reject) => { resolveReady = resolve; rejectReady = reject; });
    promise.catch(() => {});
    pendingResources.set(message.id, { promise, reject: rejectReady });
    const failedJob = error => {
      entry.pending = false; pendingResources.delete(message.id); rejectReady(error);
      if (stopped) return;
      reply(message, null, error);
      if (!deviceDestroyRequested) fail(error);
    };
    const finished = value => {
      if (stopped) { rejectReady(Error('Remote GPU disposed during preparation')); return; }
      entry.value = value; entry.pending = false; pendingResources.delete(message.id);
      resolveReady(entry); reply(message); tryRetire(entry);
    };
    const start = () => {
      if (stopped || failed) { failedJob(Error('Remote GPU preparation canceled')); return; }
      // Resolve the native dependency generation held by this job, not whatever
      // happens to be in the global alias table when asynchronous work finishes.
      const previous = resolutionResources; resolutionResources = entry.dependencyEntries;
      try {
        const result = build();
        if (result?.then) result.then(finished, failedJob);
        else finished(result);
      } catch (error) { failedJob(error); }
      finally { resolutionResources = previous; }
    };
    if (waiting) waiting.then(async () => {
      if (absoluteNow() - resourceSliceStarted >= resourceSliceMs) {
        metrics.resourceTaskYields++; await yieldResourceTask(); resourceSliceStarted = absoluteNow();
      }
      start();
    }).catch(failedJob);
    else start();
  }
  function snapshotResources(initial,{allowPending=false,source=null}={}) {
    const result = new Map();
    const visit = (key, entry = resources.get(key)) => {
      metrics.dependencyVisits++;
      if (key === CURRENT) return;
      if (!entry || entry.pending&&!allowPending || entry.retired || entry.nativeDestroyed) throw Error(`Unknown, pending or retired remote GPU resource ${key}`);
      if (result.has(key)) {
        if (result.get(key) !== entry) throw Error(`Mixed native generations for remote resource ${key}`);
        return;
      }
      result.set(key, entry);
      for (const [dependency, resolved] of entry.dependencyEntries || []) visit(dependency, resolved);
    };
    for (const key of initial) visit(key,source?.get(key)||resources.get(key));
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
    metrics.retirementChecks++;
    if (!entry || entry.pending || entry.retired || entry.id === '@device' || entry.pins > 0) return;
    const current = resources.get(entry.id) === entry;
    if (current && !entry.retirementRequested && !entry.producerReleased) return;
    if (stagedOperations.length) { pendingRetirement.add(entry); return; }
    // Explicit GPUBuffer.destroy has different semantics from JS collection:
    // it invalidates native storage even if an unused bind group still refers
    // to it. Collection only releases ownership and never calls destroy.
    if (entry.retirementRequested && !entry.nativeDestroyed) {
      entry.nativeDestroyed = true; scheduleNativeRetirement(entry.value);
    }
    if (entry.dependents > 0) return;
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
  function forkPublishedBuffer(key) {
    const entry = resources.get(key);
    if (!entry || entry.kind !== 'createBuffer') return false;
    if (active?.resourceSnapshot?.get(key) !== entry && pending?.resourceSnapshot?.get(key) !== entry) return true;
    if (!entry.uniformShadow) return forkPublishedReadOnlyBuffer(key, entry);
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
    metrics.uniformForks++; metrics.uniformForkBytes += descriptor.size; metrics.uniformForkLastAt = absoluteNow();
    // Bind groups are immutable native objects. Recreate just the groups that
    // reference the fork; old packets keep their original native groups.
    rebuildDependentBindings(key);
    return true;
  }
  function copyablePublishedTexture(key){
    const entry=resources.get(key);if(!entry||entry.kind!=='createTexture')return false;
    if(active?.resourceSnapshot.get(key)!==entry&&pending?.resourceSnapshot.get(key)!==entry)return true;
    const d=entry.descriptor;
    return (d.usage&3)===3&&(d.sampleCount??1)===1&&(d.dimension??'2d')==='2d'&&typeof d.format==='string'&&!/depth|stencil/.test(d.format);
  }
  function forkPublishedTexture(key){
    if(!copyablePublishedTexture(key))return false;
    const entry=resources.get(key);if(active?.resourceSnapshot.get(key)!==entry&&pending?.resourceSnapshot.get(key)!==entry)return true;
    const d=entry.descriptor,size=Array.isArray(d.size)||ArrayBuffer.isView(d.size)?Array.from(d.size):[d.size.width,d.size.height??1,d.size.depthOrArrayLayers??1],value=device.createTexture(d),encoder=device.createCommandEncoder();
    for(let mipLevel=0;mipLevel<(d.mipLevelCount??1);mipLevel++)encoder.copyTextureToTexture({texture:entry.value,mipLevel},{texture:value,mipLevel},[Math.max(1,Math.floor(size[0]/2**mipLevel)),Math.max(1,Math.floor((size[1]??1)/2**mipLevel)),size[2]??1]);
    device.queue.submit([encoder.finish()]);setResource(key,{...entry,value});rebuildDependentBindings(key);
    metrics.textureForks=(metrics.textureForks||0)+1;metrics.textureForkMipLevels=(metrics.textureForkMipLevels||0)+(d.mipLevelCount??1);return true;
  }
  function forkPublishedReadOnlyBuffer(key, entry) {
    // COPY_SRC must have been reserved at allocation; mapping buffers and
    // writable shader bindings require an explicit ownership protocol instead.
    if (!(entry.descriptor.usage & 4) || (entry.descriptor.usage & 3) || entry.descriptor.size % 4) return false;
    for (const packet of [active, pending]) if (packet?.resourceSnapshot?.get(key) === entry) {
      if (packet.unsafeForkBuffers.has(key)) return false;
      // Pending copies/compute have not executed yet. Copying current bytes
      // would silently lose their output. Only pending CPU writes can be overlaid.
      if (packet === pending && packet.gpuWrittenBuffers.has(key)) return false;
    }
    const descriptor = { ...entry.descriptor, mappedAtCreation: false, usage: entry.descriptor.usage | 8 };
    const value = device.createBuffer(descriptor), encoder = device.createCommandEncoder();
    encoder.copyBufferToBuffer(entry.value, 0, value, 0, descriptor.size);
    device.queue.submit([encoder.finish()]);
    if (pending?.resourceSnapshot?.get(key) === entry) for (const op of pending.operations) {
      if (op.method === 'writeBuffer' && op.args[0][REF] === key) device.queue.writeBuffer(value, op.args[1], op.args[2]);
    }
    setResource(key, { ...entry, value, descriptor });
    metrics.bufferForks = (metrics.bufferForks || 0) + 1;
    metrics.bufferForkBytes = (metrics.bufferForkBytes || 0) + descriptor.size;
    metrics.bufferForkLastAt = absoluteNow();
    rebuildDependentBindings(key);
    return true;
  }
  function classifyBufferOwnership(packet) {
    packet.unsafeForkBuffers = new Set(); packet.gpuWrittenBuffers = new Set();
    // Explicit layouts are authoritative. Pipeline-inferred layouts have no
    // inspectable access declaration, so never infer read-only from usage bits.
    for (const group of packet.resourceSnapshot.values()) if (group.kind === 'createBindGroup') {
      const layout = group.dependencyEntries.get(group.descriptor.layout?.[REF]);
      for (const binding of group.descriptor.entries || []) {
        const key = binding.resource?.buffer?.[REF]; if (!key) continue;
        const buffer = packet.resourceSnapshot.get(key);
        if (!(buffer?.descriptor?.usage & 128)) continue;
        const declaration = layout?.descriptor?.entries?.find(item => item.binding === binding.binding)?.buffer;
        if (!declaration || !['uniform', 'read-only-storage'].includes(declaration.type || 'uniform')) packet.unsafeForkBuffers.add(key);
      }
    }
    for (const op of packet.operations) if (op.method === 'submit') for (const buffer of op.args[0]) for (const command of buffer.__remoteCommands) {
      const destination = command.method === 'copyBufferToBuffer' ? command.args[2]
        : command.method === 'resolveQuerySet' ? command.args[3]
        : command.method === 'clearBuffer' ? command.args[0]
        : command.method === 'copyTextureToBuffer' ? command.args[1]?.buffer : null;
      if (destination?.[REF]) packet.gpuWrittenBuffers.add(destination[REF]);
    }
  }
  function rebuildDependentBindings(key) {
    for (const dependent of reverseDependencies.get(key) || []) {
      const entry = resources.get(dependent);
      if (entry?.pending) {
        const previous = entry.dependencyEntries.get(key), current = resources.get(key);
        if (previous !== current) {
          entry.dependencyEntries.set(key, current); current.dependents++;
          if (previous) { previous.dependents--; tryRetire(previous); }
        }
        continue;
      }
      let value;
      if(entry?.kind==='view'){const texture=resources.get(entry.dependencies.values().next().value);value=texture.value.createView(resolve(entry.descriptor));}
      else if (entry?.kind === 'createBindGroup') value = device.createBindGroup(resolve(entry.descriptor));
      else if (entry?.kind === 'bundle') {
        const encoder = device.createRenderBundleEncoder(resolve(entry.descriptor));
        runPass(encoder, entry.commands, false); value = encoder.finish();
      } else continue;
      setResource(dependent, { ...entry, value });
      metrics.bindingForks++; metrics.bindingForkLastAt = absoluteNow();
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
    if(buffer.texturePreparation){if(!validRemoteTexturePreparation(buffer,key=>resolutionResources?.get(key)||resources.get(key)))throw Error('Invalid remote texture preparation');if(replay)return null;}
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
  function nativeRetiringError(){const error=Error('Native GPU consumer is retiring');error.code='native-gpu-consumer-retiring';return error;}
  function applyQueue(op, replay = false, initialized = false) {
    if(nativeConsumerRetirement)throw nativeRetiringError();
    if (!QUEUE.has(op.method)) throw Error(`Unsupported remote queue method ${op.method}`);
    if (op.method === 'submit') {
        const buffers = op.args[0].filter(buffer=>!initialized||!buffer.texturePreparation).map(buffer => encodeCommandBuffer(buffer, replay)).filter(Boolean);
      if (buffers.length) device.queue.submit(buffers);
      return buffers.length > 0;
      } else if (!replay&&!initialized || (op.method === 'writeBuffer' && active?.replayWriteBuffers?.has(op.args[0][REF]))) {
      device.queue[op.method](...resolve(op.args)); metrics.queueWrites++;
      if (op.method === 'writeBuffer') {
        const entry = resolutionResources?.get(op.args[0][REF]) || resources.get(op.args[0][REF]);
        if (entry?.uniformShadow) entry.uniformShadow.set(new Uint8Array(op.args[2].buffer || op.args[2], op.args[2].byteOffset || 0, op.args[2].byteLength), op.args[1]);
      }
      if (op.method === 'copyExternalImageToTexture') op.args[0]?.source?.close?.();
    }
  }
  function patchPresentation(elapsed, camera, nativeTimes) {
    if (elapsed !== null) {
      for (const binding of active.clockBindings) {
        if (!active?.retained?.has(binding.id)) continue;
        // A scene can contain long-lived independent motors and a finite
        // resumed body. Each binding retains its own data and revocation cap.
        const executionEpoch=binding.motionRecord?.executionEpoch??binding.executionEpoch??binding.epoch;
        const scoped=!!(binding.nativeRoute||binding.nativeGate||binding.nativeSuspended||binding.nativeResume||binding.nativeStart||binding.nativeConsequence||binding.nativeHome||binding.nativeAction||binding.nativeSettlement||binding.nativeInitialIdleBody),bindingTime=!scoped&&active.admittedMotionBinding?Math.min(elapsed,active.metadata.clock.safeUntil):elapsed;
        const resumeCeiling=(binding.nativeResume||binding.nativeStart||binding.nativeConsequence||binding.nativeHome)&&binding.resourceEnd!==undefined?executionEpoch+(binding.resourceEnd-binding.epoch):binding.motionRecord?.executionEnd??binding.nativeResume?.endTime??binding.nativeStart?.endTime??binding.nativeConsequence?.endTime??binding.nativeHome?.endTime??Infinity;
        const routeTime=Math.min(bindingTime,binding.routeRecord?.safeUntil??binding.actionRecord?.safeUntil??binding.settlementRecord?.safeUntil??binding.initialIdleBodyRecord?.safeUntil??Infinity,resumeCeiling);
        const resourceCeiling=binding.resourceEnd??binding.nativeResume?.endTime??binding.nativeStart?.endTime??binding.nativeConsequence?.endTime??binding.nativeHome?.endTime??(active.admittedMotionBinding?active.metadata.clock.safeUntil:Infinity);
        const resourceTime=Math.min(resourceCeiling,(binding.nativeResume||binding.nativeStart||binding.nativeConsequence||binding.nativeHome||binding.executionEpoch!==undefined)?binding.epoch+Math.max(0,routeTime-executionEpoch):routeTime);
        // Finite actions retain their declared duration. Do not add the age to
        // a large absolute epoch and subtract it again before its float upload.
        const value=binding.nativeHome&&binding.semantic==='relative'?Math.max(0,Math.min(resourceCeiling-binding.epoch,routeTime-executionEpoch)):binding.nativeInitialIdleBody&&binding.semantic==='relative'?Math.max(0,routeTime-executionEpoch):binding.nativeSettlement&&binding.semantic==='relative'?Math.max(0,routeTime-executionEpoch):binding.nativeAction?(routeTime>=binding.motionRecord.executionEnd?nativeTaskActionRemainingDuration(binding.nativeAction.request):Math.min(nativeTaskActionRemainingDuration(binding.nativeAction.request),Math.max(0,routeTime-executionEpoch))):binding.semantic==='origin-modulo'?executionEpoch%binding.period:binding.semantic==='relative'?resourceTime-binding.epoch:resourceTime;
        if (!Number.isFinite(value)) throw Error('Invalid remote presentation clock value');
        const submittedValue=binding.semantic==='origin-modulo'?Math.fround(value):floorFloat32(value);
        device.queue.writeBuffer(resolve({ [REF]: binding.id }), binding.byteOffset, new Float32Array([submittedValue]));
        if(binding.semantic!=='origin-modulo'&&(binding.nativeRoute||binding.nativeGate||binding.nativeSuspended||binding.nativeResume||binding.nativeStart||binding.nativeConsequence||binding.nativeHome||binding.nativeAction||binding.nativeSettlement||binding.nativeInitialIdleBody))nativeTimes.set(binding.nativeClockKey,{
          ...(binding.nativeRoute?{nativeRoute:binding.nativeRoute}:binding.nativeGate?{nativeGate:binding.nativeGate}:binding.nativeResume?{nativeResume:binding.nativeResume}:binding.nativeStart?{nativeStart:binding.nativeStart}:binding.nativeHome?{nativeHome:binding.nativeHome,relativeTime:submittedValue}:binding.nativeConsequence?{nativeConsequence:binding.nativeConsequence}:binding.nativeInitialIdleBody?{nativeInitialIdleBody:binding.nativeInitialIdleBody,relativeTime:submittedValue}:binding.nativeSettlement?{nativeSettlement:binding.nativeSettlement,relativeTime:submittedValue}:binding.nativeAction?{nativeAction:binding.nativeAction,relativeTime:submittedValue}:{nativeSuspended:binding.nativeSuspended}),semantic:binding.semantic,epoch:binding.epoch,...((binding.nativeResume||binding.nativeStart||binding.nativeConsequence||binding.nativeHome||binding.nativeAction||binding.nativeSettlement||binding.nativeInitialIdleBody)?{executionEpoch}:{}),
          elapsed:binding.semantic==='relative'?submittedValue+binding.epoch:submittedValue});
        if(binding.routeRecord&&binding.semantic!=='origin-modulo')binding.routeRecord.lastDrawTime=Math.max(
          binding.routeRecord.lastDrawTime??-Infinity,
          Math.min(routeTime,binding.semantic==='relative'?submittedValue+executionEpoch:submittedValue));
        if(binding.initialIdleBodyRecord&&binding.semantic!=='origin-modulo')binding.initialIdleBodyRecord.lastDrawTime=Math.max(binding.initialIdleBodyRecord.lastDrawTime??-Infinity,Math.min(routeTime,executionEpoch+submittedValue));
        if(binding.settlementRecord&&binding.semantic!=='origin-modulo')binding.settlementRecord.lastDrawTime=Math.max(binding.settlementRecord.lastDrawTime??-Infinity,Math.min(routeTime,executionEpoch+submittedValue));
        if(binding.actionRecord)binding.actionRecord.lastDrawTime=Math.max(binding.actionRecord.lastDrawTime??-Infinity,Math.min(routeTime,executionEpoch+submittedValue));
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
    if(nativeMutationHold||nativeConsumerRetirement)return; // No submission during a native boundary or retirement.
    if(intentControl&&!routeControl)return; // A prepared image is not a native baseline.
    if (!deviceConfigured || (!active && !pending)) return;
    try {
      const startedAt = absoluteNow();
      currentTexture = null; currentViews = new Map();
      let next = pending;
      if(next?.preparedWorldBoundary&&!frameWorldCurrent(next))next=null;
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
      if(next&&next.nativeMutationEpoch!==nativeMutationEpoch)next=null;
      if(next&&routeControl?.status().clock){
        const permit=routeControl.clockLease(frameClock(next).epoch,frameClock(next).safeUntil),at=evaluateRemoteClock(permit,startedAt);
        const bounded=Math.max(at,nativeMutationFloor??-Infinity);
        if(nativeMutationFloor!==null&&(permit.safeUntil<nativeMutationFloor||next.admittedClockBindings.some(binding=>
             binding.routeRecord&&binding.routeRecord.safeUntil<nativeMutationFloor))||bounded<next.metadata.clock.elapsed||
           next.admittedClockBindings.some(binding=>binding.routeRecord&&binding.routeRecord.startTime>bounded))next=null;
      }
      const candidate = next || active;
      if(!candidate||candidate.admittedActionRecord&&!candidate.admittedActionRecord.isCurrent()||candidate.admittedClockBindings.some(binding=>binding.suspendedRecord&&!binding.suspendedRecord.isCurrent()||binding.motionRecord&&!binding.motionRecord.isCurrent()))return;
      // Never replay a packet prepared before a physical commit. f-R4 will
      // coordinate replacement resources; until then retain the last image.
      if(candidate.nativeMutationEpoch!==nativeMutationEpoch||!frameWorldCurrent(candidate))return;
      // Causal mode belongs to the direct connection, not a preparer's tags.
      // Omitting a nativeRoute binding in a later packet cannot restore an
      // unbounded producer clock or bypass the compute replay restriction.
      const causalLease=routeControl?.clockLease(frameClock(candidate)?.epoch,frameClock(candidate)?.safeUntil),
        effectiveLease=causalLease??candidate.metadata?.clock??null;
      if(nativeMutationFloor!==null&&(!causalLease||causalLease.safeUntil<nativeMutationFloor))return;
      if(causalLease&&candidate.hasCompute)throw Error('Native causal clock cannot replay one-shot compute');
      const timeTicket = frameTime.propose({ generation: candidate.sequence, lease: effectiveLease, absoluteNow: startedAt,
        minimum:nativeMutationFloor });
      if (next) {
        pending = null;
        if (next.width !== canvas.width) canvas.width = next.width;
        if (next.height !== canvas.height) canvas.height = next.height;
        active = next; active.retained = new Set(active.resourceSnapshot.keys());
        active.clockBindings = active.admittedClockBindings;
        active.cameraBindings = active.preparedCameraBindings??Array.from(cameraBindings.values());
        active.baselineWrites = [];
        for (const key of active.baselineBuffers) {
          const entry = active.resourceSnapshot.get(key);
          if (!entry?.uniformShadow) throw Error(`Cannot replay an unversioned GPU buffer read before its first write: ${key}`);
          active.baselineWrites.push({ id: key, bytes: active.preparedBaselines?.get(key)??entry.uniformShadow.slice() });
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
      if (!next||active.initializedPreparation) for (const baseline of active.baselineWrites) device.queue.writeBuffer(resolve({ [REF]: baseline.id }), 0, baseline.bytes);
      // Preserve the original queue order (a buffer can change between passes).
      // Only the generation boundary is atomic, never reorder WebGPU operations.
      const nativeTimes=new Map();let submitted=false;
      for (const op of active.operations) {
        if (op.method === 'submit') patchPresentation(clockElapsed, camera, nativeTimes);
        if(applyQueue(op, !next,active.initializedPreparation)===true)submitted=true;
      }
      // Publish input witnesses only after the actual command submissions have
      // succeeded. A preparation, rejected frame or failed submit is no image.
      if(submitted)nativeRouteFrame={sequence:active.sequence,clockElapsed,worldBoundary:frameBoundary(active),bindings:Array.from(nativeTimes.values())};
      metrics.nativeFrames++;
      frameTime.consume(timeTicket);
      if (!next) metrics.replayFrames++;
      samples[sampleCursor++ % samples.length] = { at: startedAt,sequence:active.sequence,nativeWorldBoundary:frameBoundary(active),intervalMs: previousFrameAt === null ? null : startedAt - previousFrameAt, drawMs: absoluteNow() - startedAt, replay: !next, clockElapsed, safeUntil: effectiveLease?.safeUntil ?? null, cameraVersion: camera?.version ?? null };
      previousFrameAt = startedAt;
      if (next) {
        active.transportTiming.firstDrawStartedAt = startedAt;
        active.transportTiming.firstDrawCompletedAt = absoluteNow();
        recordTiming(frameTimings, active.transportTiming);
        port.postMessage({ type: 'presented', sequence: active.sequence, metadata: active.metadata, transportTiming: active.transportTiming, absoluteTime: absoluteNow(), backend: 'webgpu', replayFrames: metrics.replayFrames });
        releaseSnapshot(previous?.resourceSnapshot);
      }
    } catch (error) { fail(error); }
    finally { resolutionResources = null; }
  }
  function packetBytes(value) {
    if(typeof ImageBitmap!=='undefined'&&value instanceof ImageBitmap)return value.width*value.height*4;
    if (ArrayBuffer.isView(value) || value instanceof ArrayBuffer) return value.byteLength;
    if (!value || typeof value !== 'object') return 0;
    return Object.values(value).reduce((sum, child) => sum + packetBytes(child), 0);
  }
  function validateOperations(operations) {
    let count = 0;
    for (const op of operations) {
      if (!QUEUE.has(op.method) || !Array.isArray(op.args)) throw Error(`Invalid remote queue operation ${op.method}`);
      if (op.method !== 'submit') continue;
      if (!Array.isArray(op.args[0])) throw Error('Invalid remote submission');
      for (const buffer of op.args[0]) {
        if (!Array.isArray(buffer.__remoteCommands)) throw Error('Invalid remote command buffer');
        for (const command of buffer.__remoteCommands) {
          if (++count > maxFrameOperations) throw Error('Remote command count exceeds safety limit');
          if (!Array.isArray(command.args)) throw Error('Invalid remote command arguments');
          if (command.method === 'beginRenderPass' || command.method === 'beginComputePass') {
            if (!Array.isArray(command.commands)) throw Error('Invalid remote pass');
            for (const item of command.commands) {
              if (++count > maxFrameOperations || !PASS.has(item.method) || !Array.isArray(item.args)) throw Error(`Invalid remote pass command ${item.method}`);
              const computeCommand = item.method.startsWith('dispatch');
              if (computeCommand && command.method !== 'beginComputePass') throw Error('Compute dispatch cannot execute in a render pass');
              if (command.method === 'beginComputePass' && !['setPipeline','setBindGroup','dispatchWorkgroups','dispatchWorkgroupsIndirect','insertDebugMarker','pushDebugGroup','popDebugGroup'].includes(item.method)) throw Error('Render command cannot execute in a compute pass');
            }
          } else if (!COMMANDS.has(command.method)) throw Error(`Invalid remote encoder command ${command.method}`);
        }
      }
    }
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
      else if (command.method === 'copyBufferToBuffer') destination = command.args[2];
      else if (command.method === 'resolveQuerySet') destination = command.args[3];
      else if (command.method.startsWith('copy')) destination = command.args[1];
      else if (command.method === 'clearBuffer') destination = command.args[0];
      for (const key of retainClosure(references(destination))) result.add(key);
    }
    return result;
  }
  function discardRetainedPreparations(closeImages=true){
    const old=retainedPreparationSnapshot;retainedPreparationSnapshot=null;
    if(closeImages)closePreparationImages(stagedOperations);stagedOperations=[];retainedPreparationOperationCount=0;releaseSnapshot(old);
    for(const entry of pendingRetirement)tryRetire(entry);
  }
  function rejectPreparedFrame(packet,reason,wasPending=false,cause='native-world'){
    if(!wasPending)validateOperations(packet.operations);
    const groups=wasPending?[{operations:packet.operations,source:packet.resourceSnapshot},{operations:stagedOperations,source:retainedPreparationSnapshot}]:
      [{operations:stagedOperations,source:retainedPreparationSnapshot},{operations:packet.operations,source:null}];
    const operations=[],snapshot=new Map();let retained=!preparationRecoveryRequired;
    try{
      for(const group of groups){
        const projected=rejectedFramePreparations(group.operations,buffer=>validRemoteTexturePreparation(buffer,key=>group.source?.get(key)||resources.get(key)));
        if(!projected){retained=false;break;}operations.push(...projected);
        const owned=snapshotResources(references(projected),{allowPending:true,source:group.source});
        for(const [key,entry]of owned){if(snapshot.has(key)&&snapshot.get(key)!==entry)throw Error('Rejected preparation mixed resource generations');snapshot.set(key,entry);}
      }
      validateOperations(operations);
      if(operations.length>maxFrameOperations||packetBytes(operations)>maxFrameBytes)retained=false;
    }catch{retained=false;}
    if(retained){
      pinSnapshot(snapshot);const old=retainedPreparationSnapshot;retainedPreparationSnapshot=snapshot;stagedOperations=operations;retainedPreparationOperationCount=operations.length;releaseSnapshot(old);
    }else{
      preparationRecoveryRequired=true;
      closePreparationImages(groups.flatMap(group=>group.operations));
      discardRetainedPreparations(false);
    }
    port.postMessage({type:'frame-obsolete',sequence:packet.sequence,reason,cause,resourcePreparationsRetained:retained});
  }
  function retainedPreparationsFor(operations){
    if(!retainedPreparationSnapshot)return stagedOperations;
    const later=stagedOperations.slice(retainedPreparationOperationCount),needed=snapshotResources(references([...later,...operations]),{allowPending:true}),result=[];
    for(const op of stagedOperations.slice(0,retainedPreparationOperationCount)){
      const targets=writtenResources(op);
      if(![...targets].some(key=>needed.has(key)))continue;
      for(const key of references(op)){
        const prior=retainedPreparationSnapshot.get(key),current=needed.get(key)||resources.get(key);
        if(prior&&current!==prior)throw Error('Retained preparation no longer owns its resource generation');
      }
      result.push(op);
    }
    return [...result,...later];
  }
  // Obsolete drawing can leave CPU uploads waiting for the next
  // image. Admission must be able to finish those uploads without replaying
  // that image or changing the last good generation. Reuse the existing COW
  // buffers/textures and rebuild their immutable views/bindings; every byte is
  // submitted before a real queue fence is acknowledged.
  function submitRetainedCpuPreparations(){
    if(!retainedPreparationSnapshot||!stagedOperations.length||pending||admittingFrame||nativeMutationHold||nativeConsumerRetirement||preparationRecoveryRequired)return false;
    const keys=new Set(),textures=new Set();
    for(const op of stagedOperations){
      if(op.method==='writeTexture'){
        const key=op.args[0].texture[REF],prior=retainedPreparationSnapshot.get(key);
        if(prior&&prior!==resources.get(key)||!copyablePublishedTexture(key)){metrics.retainedFenceBlock={method:op.method,key};return false;}textures.add(key);continue;
      }
      if(op.method!=='writeBuffer'){metrics.retainedFenceBlock={method:op.method};return false;}
      const key=op.args[0][REF],entry=resources.get(key),prior=retainedPreparationSnapshot.get(key);
      if(!entry?.uniformShadow||prior&&prior!==entry){metrics.retainedFenceBlock={key,uniform:!!entry?.uniformShadow,generation:entry?.generation,prior:prior?.generation};return false;}keys.add(key);
    }
    for(const key of keys)if(!forkPublishedBuffer(key))throw Error('Retained uniform preparation lost its copy-on-write owner');
    for(const key of textures)if(!forkPublishedTexture(key))throw Error('Retained texture preparation lost its copy-on-write owner');
    const operations=stagedOperations;stagedOperations=[];retainedPreparationOperationCount=0;
    for(const op of operations)applyQueue(op);
    const retained=retainedPreparationSnapshot;retainedPreparationSnapshot=null;releaseSnapshot(retained);
    metrics.retainedUniformUploads=(metrics.retainedUniformUploads||0)+operations.filter(op=>op.method==='writeBuffer').length;
    metrics.retainedTextureUploads=(metrics.retainedTextureUploads||0)+operations.filter(op=>op.method==='writeTexture').length;
    for(const entry of pendingRetirement)tryRetire(entry);
    return true;
  }
  function validatePreparedWorldBoundary(packet){
    const boundary=copyNativeWorldBoundary(packet.metadata?.nativeWorldBoundary??null),status=routeControl?.status(),clock=packet.metadata?.clock;
    if(!worldBoundaryRequired||!status?.clock||!clock||!boundary||boundary.authorityEpoch!==status.authorityEpoch||
      boundary.nativeSession!==status.clock.nativeSession||boundary.effectiveTime>status.clock.committedThrough||
      nativeWorldBoundary&&boundary.ticket<=nativeWorldBoundary.ticket||clock.safeUntil<boundary.effectiveTime||clock.elapsed>boundary.effectiveTime)
      throw Error('Prepared frame requires a new native world proposal boundary and covering resources');
    if([packet.metadata.nativeTaskStartTemplate,packet.metadata.nativeResumeTemplate,packet.metadata.nativeTaskActionTemplate,packet.metadata.nativeTaskConsequenceTemplate,packet.metadata.nativeTaskSettlementTemplate,packet.metadata.nativeInitialIdleBodyTemplate,packet.metadata.nativeHomeRouteTemplate,packet.metadata.nativeHomeArrivalTemplate].filter(Boolean).length>1)throw Error('Conflicting native prepared templates');
    if(packet.metadata.nativeInitialIdleBodyTemplate){const ref=copyNativeInitialIdleBodyReference(packet.metadata.nativeInitialIdleBodyTemplate);if(!sameNativeWorldBoundary(ref.worldBoundary,boundary))throw Error('Invalid native initial Idle body template');routeControl.admitInitialIdleBody(ref,{preparingWorldBoundary:boundary});}
    if(packet.metadata.nativeTaskSettlementTemplate){const ref=copyNativeTaskSettlementReference(packet.metadata.nativeTaskSettlementTemplate);if(!sameNativeWorldBoundary(ref.worldBoundary,boundary))throw Error('Invalid native settlement template');routeControl.admitSettlement(ref,{preparingWorldBoundary:boundary});}
    if(packet.metadata.nativeHomeArrivalTemplate){const ref=copyNativeHomeArrivalReference(packet.metadata.nativeHomeArrivalTemplate);if(ref.sourceHome.gateIds.length)throw Error('Native Home absence gate graphics are not prepared');if(!sameNativeWorldBoundary(ref.worldBoundary,boundary))throw Error('Invalid native Home absence template');packet.preparedHomeArrivalLease=routeControl.admitHomeArrival(ref,{preparingWorldBoundary:boundary});}
    if(packet.metadata.nativeHomeRouteTemplate){const ref=copyNativeHomeRouteReference(packet.metadata.nativeHomeRouteTemplate);if(!sameNativeWorldBoundary(ref.worldBoundary,boundary))throw Error('Invalid native Home template');routeControl.admitHome(ref,{preparingWorldBoundary:boundary});}
    if(packet.metadata.nativeTaskConsequenceTemplate){const ref=copyNativeTaskConsequenceReference(packet.metadata.nativeTaskConsequenceTemplate);if(!sameNativeWorldBoundary(ref.worldBoundary,boundary))throw Error('Invalid native consequence template');routeControl.admitConsequence(ref,{preparingWorldBoundary:boundary});}
    if(packet.metadata.nativeTaskActionTemplate){const ref=copyNativeTaskActionReference(packet.metadata.nativeTaskActionTemplate);if(!sameNativeWorldBoundary(ref.worldBoundary,boundary))throw Error('Invalid native action template');routeControl.admitAction(ref,{preparingWorldBoundary:boundary});}
    if(packet.metadata.nativeTaskStartTemplate){const ref=copyNativeTaskStartReference(packet.metadata.nativeTaskStartTemplate);if(packet.metadata.nativeResumeTemplate||!sameNativeWorldBoundary(ref.worldBoundary,boundary))throw Error('Invalid first-task template');}
    if(packet.metadata.nativeResumeTemplate){const ref=copyNativeResumeReference(packet.metadata.nativeResumeTemplate);if(!sameNativeWorldBoundary(ref.worldBoundary,boundary))throw Error('Invalid deferred native resume template');}
    return boundary;
  }
  function admitClockBindings(packet,preparing=false){
    const preparedBindings=(packet.preparedClockBindings??Array.from(clockBindings.values())).filter(binding=>packet.resourceSnapshot.has(binding.id));
    if(preparing&&packet.metadata.nativeHomeArrivalTemplate){if(!packet.preparedHomeArrivalLease?.isPrepared())throw Error('Native Home absence lost its current source');const actor=packet.metadata.nativeHomeArrivalTemplate.actorId;if(preparedBindings.some(binding=>binding.nativeHome?.actorId===actor||binding.nativeRoute?.actorId===actor))throw Error('Native Home absence still includes its actor clock');}
    return preparedBindings.map(original=>{let binding=original;
      if(binding.nativeInitialIdleBody){
        if(!routeControl?.status().clock||!packet.metadata?.clock||!worldBoundaryRequired||!nativeInitialIdleBodyReferenceCovered(binding.nativeInitialIdleBody,packet.metadata.nativeWorldBoundary)||!preparing&&!nativeInitialIdleBodyReferenceCovered(binding.nativeInitialIdleBody,nativeWorldBoundary))throw Error('Native initial Idle body requires its applied world and causal clock');
        const motionRecord=routeControl.admitInitialIdleBody(binding.nativeInitialIdleBody,{preparingWorldBoundary:preparing?packet.metadata.nativeWorldBoundary:null});
        if(preparing&&!motionRecord.isCurrent()&&!sameNativeInitialIdleBodyReference(binding.nativeInitialIdleBody,packet.metadata.nativeInitialIdleBodyTemplate))throw Error('Pending settlement clock differs from its retained template');
        if(packet.metadata.clock.safeUntil<binding.nativeInitialIdleBody.worldBoundary.effectiveTime)throw Error('Prepared clock does not cover native initial Idle body');
        return {...binding,motionRecord,initialIdleBodyRecord:motionRecord.initialIdleBodyRecord};
      }
      if(binding.nativeSettlement){
        if(!routeControl?.status().clock||!packet.metadata?.clock||!worldBoundaryRequired||!nativeTaskSettlementReferenceCovered(binding.nativeSettlement,packet.metadata.nativeWorldBoundary)||!preparing&&!nativeTaskSettlementReferenceCovered(binding.nativeSettlement,nativeWorldBoundary))throw Error('Native settlement requires its applied world and causal clock');
        const motionRecord=routeControl.admitSettlement(binding.nativeSettlement,{preparingWorldBoundary:preparing?packet.metadata.nativeWorldBoundary:null});
        if(preparing&&!motionRecord.isCurrent()&&!sameNativeTaskSettlementReference(binding.nativeSettlement,packet.metadata.nativeTaskSettlementTemplate))throw Error('Pending settlement clock differs from its retained template');
        if(packet.metadata.clock.safeUntil<binding.nativeSettlement.worldBoundary.effectiveTime)throw Error('Prepared clock does not cover native settlement');
        return {...binding,motionRecord,settlementRecord:motionRecord.settlementRecord};
      }
      if(binding.nativeAction){
        if(!routeControl?.status().clock||!packet.metadata?.clock||!worldBoundaryRequired||!nativeTaskActionReferenceCovered(binding.nativeAction,packet.metadata.nativeWorldBoundary)||!preparing&&!nativeTaskActionReferenceCovered(binding.nativeAction,nativeWorldBoundary))throw Error('Native action requires its applied world and causal clock');
        const motionRecord=routeControl.admitAction(binding.nativeAction,{preparingWorldBoundary:preparing?packet.metadata.nativeWorldBoundary:null});
        if(preparing&&!motionRecord.isCurrent()&&!sameNativeTaskActionReference(binding.nativeAction,packet.metadata.nativeTaskActionTemplate))throw Error('Pending action clock differs from its retained template');
        if(packet.metadata.clock.safeUntil<binding.nativeAction.startTime)throw Error('Prepared clock does not cover native action');
        return {...binding,motionRecord,actionRecord:motionRecord.actionRecord};
      }
      if(binding.nativeHome){
        if(!routeControl?.status().clock||!packet.metadata?.clock||!worldBoundaryRequired||!nativeHomeRouteReferenceCovered(binding.nativeHome,packet.metadata.nativeWorldBoundary)||!preparing&&!nativeHomeRouteReferenceCovered(binding.nativeHome,nativeWorldBoundary))throw Error('Native Home requires its exact template and causal world');
        const motionRecord=routeControl.admitHome(binding.nativeHome,{preparingWorldBoundary:preparing?packet.metadata.nativeWorldBoundary:null});
        if(preparing&&!motionRecord.isCurrent()&&!sameNativeHomeRouteReference(binding.nativeHome,packet.metadata.nativeHomeRouteTemplate))throw Error('Pending Home clock differs from its retained template');
        if(packet.metadata.clock.safeUntil<binding.nativeHome.worldBoundary.effectiveTime)throw Error('Prepared clock does not cover native Home');
        return {...binding,motionRecord,...(!preparing?{routeRecord:motionRecord.routeRecord}:{})};
      }
      if(binding.nativeConsequence){
        if(!routeControl?.status().clock||!packet.metadata?.clock||!worldBoundaryRequired||!nativeTaskConsequenceReferenceCovered(binding.nativeConsequence,packet.metadata.nativeWorldBoundary)||!preparing&&!nativeTaskConsequenceReferenceCovered(binding.nativeConsequence,nativeWorldBoundary))throw Error('Native consequence requires its exact template and causal world');
        const motionRecord=routeControl.admitConsequence(binding.nativeConsequence,{preparingWorldBoundary:preparing?packet.metadata.nativeWorldBoundary:null});
        if(preparing&&!motionRecord.isCurrent()&&!sameNativeTaskConsequenceReference(binding.nativeConsequence,packet.metadata.nativeTaskConsequenceTemplate))throw Error('Pending consequence clock differs from its retained template');
        if(packet.metadata.clock.safeUntil<binding.nativeConsequence.worldBoundary.effectiveTime)throw Error('Prepared clock does not cover native consequence');
        return {...binding,motionRecord,...(!preparing?{routeRecord:motionRecord.routeRecord}:{})};
      }
      if(binding.nativeStart){
        if(!routeControl?.status().clock||!packet.metadata?.clock||!worldBoundaryRequired||!nativeTaskStartReferenceCovered(binding.nativeStart,packet.metadata.nativeWorldBoundary)||!preparing&&!nativeTaskStartReferenceCovered(binding.nativeStart,nativeWorldBoundary))throw Error('Native first task requires its exact prepared template and causal world');
        const motionRecord=routeControl.admitStart(binding.nativeStart,{preparingWorldBoundary:preparing?packet.metadata.nativeWorldBoundary:null});
        if(preparing&&!motionRecord.isCurrent()&&!sameNativeTaskStartReference(binding.nativeStart,packet.metadata.nativeTaskStartTemplate))throw Error('Pending first-task clock differs from its retained template');
        if(packet.metadata.clock.safeUntil<binding.nativeStart.worldBoundary.effectiveTime)throw Error('Prepared clock does not cover first task');
        return {...binding,motionRecord,...(!preparing?{routeRecord:motionRecord.routeRecord}:{})};
      }
      if(binding.nativeResume){
        if(!routeControl?.status().clock||!packet.metadata?.clock||!worldBoundaryRequired||!nativeResumeReferenceCovered(binding.nativeResume,packet.metadata.nativeWorldBoundary)||!preparing&&!nativeResumeReferenceCovered(binding.nativeResume,nativeWorldBoundary))throw Error('Native resume requires its applied world and causal clock');
        const motionRecord=routeControl.admitResume(binding.nativeResume,{preparingWorldBoundary:preparing?packet.metadata.nativeWorldBoundary:null});
        if(packet.metadata.clock.safeUntil<binding.nativeResume.worldBoundary.effectiveTime)throw Error('Prepared clock does not cover native resume resources');
        return {...binding,motionRecord,...(!preparing?{routeRecord:motionRecord.routeRecord}:{})};
      }
      if(binding.nativeSuspended){
        if(!routeControl?.status().clock||!packet.metadata?.clock||!worldBoundaryRequired||!nativeSuspendedBodyReferenceCovered(binding.nativeSuspended,packet.metadata.nativeWorldBoundary)||!preparing&&!nativeSuspendedBodyReferenceCovered(binding.nativeSuspended,nativeWorldBoundary))throw Error('Native suspension requires its applied world and causal clock');
        const suspendedRecord=routeControl.admitSuspended(binding.nativeSuspended,{preparingWorldBoundary:preparing?packet.metadata.nativeWorldBoundary:null});
        if(packet.metadata.clock.safeUntil<binding.nativeSuspended.suspendedAt)throw Error('Prepared clock does not cover native suspension');
        return {...binding,suspendedRecord};
      }
      if(binding.nativeGate){
        const live=clockBindings.get(`${binding.id}:${binding.byteOffset}`);if(live?.executionEpoch!==undefined&&live.epoch===binding.epoch&&JSON.stringify(live.nativeGate)===JSON.stringify(binding.nativeGate))binding={...binding,executionEpoch:live.executionEpoch};
        if(!routeControl?.status().clock||!packet.metadata?.clock||!worldBoundaryRequired||!nativeGateReferenceCovered(binding.nativeGate,packet.metadata.nativeWorldBoundary)||!preparing&&!nativeGateReferenceCovered(binding.nativeGate,nativeWorldBoundary))throw Error('Native gate requires its applied world and causal clock');
        const startEpoch=routeControl.startGateExecutionEpoch(binding.nativeGate);
        return {...binding,...(binding.executionEpoch===undefined&&startEpoch!==null?{executionEpoch:startEpoch}:{})};
      }
      if(!binding.nativeRoute)return {...binding};
      if(!routeControl||!packet.metadata?.clock)throw Error('Native route requires direct control and a presentation clock lease');
      const routeRecord=routeControl.admit(binding.nativeRoute);
      if(packet.metadata.clock.safeUntil<routeRecord.startTime)throw Error('Prepared clock does not cover native route assignment');
      if(preparing)return {...binding}; // Revalidate the current assignment at native release; never grant a future one.
      return {...binding,routeRecord};
    });
  }
  function initializePreparedWorldFrame(packet){
    const uploads=[],drawReferences=new Set();
    for(const op of packet.operations){
      if(op.method==='submit'){
        const buffers=op.args[0].filter(buffer=>buffer.texturePreparation);
        for(const key of references(buffers))if(resources.get(key)?.kind==='createTexture'&&drawReferences.has(key))throw Error('Prepared texture initialization depends on an earlier drawing pass');
        if(buffers.length)uploads.push({method:'submit',args:[buffers]});
        for(const key of references(op.args[0].filter(buffer=>!buffer.texturePreparation)))drawReferences.add(key);
        continue;
      }
      if(op.method!=='writeBuffer'&&[...writtenResources(op)].some(key=>drawReferences.has(key)))throw Error('Prepared texture mutation follows an earlier drawing pass');
      uploads.push(op);
    }
    // Fork only changed buffers. Texture initialization must own an unpublished
    // target; drawing/attachments remain encoded and run only after commit.
    for(const op of uploads)for(const key of writtenResources(op)){
      const entry=resources.get(key);if(!entry||entry.pending)throw Error('Prepared upload resource unavailable');
      if(op.method!=='writeBuffer'&&(active?.resourceSnapshot.has(key)||pending?.resourceSnapshot.has(key)))throw Error('Prepared texture upload requires a separate resource generation');
    }
    for(const op of uploads)if(op.method==='writeBuffer'&&!forkPublishedBuffer(op.args[0][REF]))throw Error('Prepared upload cannot fork a published writable resource');
    packet.resourceSnapshot=snapshotResources(packet.references);
    packet.preparedBaselines=new Map([...packet.baselineBuffers].map(key=>[key,packet.resourceSnapshot.get(key).uniformShadow.slice()]));
    for(const op of uploads)applyQueue(op);
    packet.initializedPreparation=true;
  }
  async function handle(message) {
    if(message.type==='dispose'){try{await api.dispose();reply(message,{disposed:true});}catch(error){reply(message,null,error);}return;}
    if (stopped || failed) return;
    if(nativeConsumerRetirement&&['operation','frame'].includes(message.type))throw nativeRetiringError();
    switch (message.type) {
      case 'create': {
        if (!CREATION.has(message.method)) throw Error(`Unsupported remote resource ${message.method}`);
        // Even Three's synchronous factory is admitted asynchronously here: its
        // producer gets an ID immediately; drawing keeps its prior generation.
        const method = message.method === 'createRenderPipeline' ? 'createRenderPipelineAsync' : message.method === 'createComputePipeline' ? 'createComputePipelineAsync' : message.method;
        // Enable native generation copies without retaining large CPU shadows.
        // MAP_READ/MAP_WRITE usage combinations cannot accept arbitrary flags.
        if (message.method === 'createBuffer' && !(message.descriptor.usage & 3)) message.descriptor = { ...message.descriptor, usage: message.descriptor.usage | 4 };
        const uniformShadow = message.method === 'createBuffer' && (message.descriptor.usage & 64) && !(message.descriptor.usage & 128) ? new Uint8Array(message.descriptor.size) : null;
        createResourceJob(message, references(message.descriptor), () => device[method](resolve(message.descriptor)), { uniformShadow, mapMode: message.descriptor.mappedAtCreation ? 2 : 0 });
        break;
      }
      case 'view': {
        if (message.texture === CURRENT) setResource(message.id, { currentView: true, descriptor: message.descriptor, sequence: message.sequence ?? ((active?.sequence || 0) + 1), dependencies: new Set([CURRENT]) });
        else createResourceJob(message, new Set([message.texture]), () => resolve({ [REF]: message.texture }).createView(resolve(message.descriptor)));
        break;
      }
      case 'pipeline-layout': createResourceJob(message, new Set([message.pipeline]), () => resolve({ [REF]: message.pipeline }).getBindGroupLayout(message.index)); break;
      case 'bundle': {
        createResourceJob(message, references(message.commands), () => {
          const encoder = device.createRenderBundleEncoder(resolve(message.descriptor));
          runPass(encoder, message.commands, false); return encoder.finish();
        }, { commands: message.commands }); break;
      }
      case 'operation': {
        if(message.nativeMutationEpoch===undefined)message.nativeMutationEpoch=nativeMutationEpoch;
        const readiness = waitForResources(references(message.op));
        if (readiness) await readiness;
        if(stopped||failed||nativeConsumerRetirement)throw Error('Native GPU consumer is retiring or closed');
        if(message.op.method==='submit'){
          if(intentControl&&!routeControl&&[...references(message.op)].some(key=>key===CURRENT||resources.get(key)?.currentView))
            throw Error('Standalone world drawing requires a native baseline');
          // Standalone resource/diagnostic submissions share the same queue as
          // drawing. They cannot slip between the captured drain and release.
          await waitMutationSubmission();
          if(message.nativeMutationEpoch!==nativeMutationEpoch)
            throw Error('Native mutation invalidated a pending standalone GPU submission');
          if(!drawCommandsCurrent(message.op,nativeWorldBoundary))throw Error('Standalone drawing resources do not match the committed native world');
        }
        const touchesPublishedState = [...writtenResources(message.op)].some(key => active?.resourceSnapshot?.has(key) || pending?.resourceSnapshot?.has(key));
        const canFork = !stagedOperations.length && touchesPublishedState && message.op.method === 'writeBuffer' && forkPublishedBuffer(message.op.args[0][REF]);
        if (stagedOperations.length || (touchesPublishedState && !canFork)) {
          // Preparation may touch existing resources. Such mutations belong to
          // the next atomic generation, even if Three issued them before render.
          if (stagedOperations.length >= maxFrameOperations) throw Error('Remote preparation exceeds safety limit');
          stagedOperations.push(message.op);
        } else applyQueue(message.op);
        break;
      }
      case 'configure':
        if (active || pending) throw Error('Remote canvas configuration is fixed while a frame is published; recreate the renderer to change it');
        context.configure(resolve(message.descriptor)); deviceConfigured = true; break;
      case 'unconfigure': context.unconfigure(); deviceConfigured = false; break;
      case 'prepare-world-frame':
      case 'frame': {
        if(['preparedHomeArrivalLease','admittedActionRecord','admittedWorldBoundary','admittedResumeBinding','admittedMotionBinding','admittedClockBindings','admittedClockCoverageEnd'].some(key=>Object.hasOwn(message.packet??{},key)))throw Error('A producer cannot supply native execution bindings');
        const preparing=message.type==='prepare-world-frame';
        if(preparing&&message.version!==1)throw Error('Unsupported prepared world frame version');
        if(!Number.isSafeInteger(message.packet?.sequence)||message.packet.sequence<=lastReceivedFrameSequence)throw Error('Stale remote frame');
        lastReceivedFrameSequence=message.packet.sequence;
        if(preparing&&cancelledWorldFrames.delete(message.packet.sequence)){rejectPreparedFrame(message.packet,'Prepared world frame cancelled');reply(message,null,Error('Prepared world frame cancelled'));break;}
        if(!Array.isArray(message.packet.operations)||message.packet.operations.length>maxFrameOperations||packetBytes(message.packet)>maxFrameBytes)throw Error('Remote frame exceeds safety limit');
        if(preparationRecoveryRequired){rejectPreparedFrame(message.packet,'Rejected preparation requires a fresh surface');break;}
        const boundary=preparing?validatePreparedWorldBoundary(message.packet):null;
        const controller=new AbortController();let cancel;const cancelled=new Promise(resolve=>{cancel=()=>{controller.abort();resolve();};});
        const admission={packet:message.packet,cancel,controller,prepared:preparing};admittingFrame=admission;
        let preparedReady=false;
        const current=()=>!stopped&&!failed&&!nativeConsumerRetirement&&!controller.signal.aborted&&message.nativeMutationEpoch===nativeMutationEpoch&&(preparing||frameWorldCurrent(message.packet));
        try{
        if(!preparing&&!frameWorldCurrent(message.packet)){
          rejectPreparedFrame(message.packet,'Prepared resources do not match the committed native world');break;
        }
        if(message.nativeMutationEpoch===undefined)message.nativeMutationEpoch=nativeMutationEpoch;
        if(message.nativeMutationEpoch!==nativeMutationEpoch){
          rejectPreparedFrame(message.packet,'Native mutation invalidated the prepared frame');break;
        }
        if (pending) throw Error('Remote GPU backpressure: pending generation already exists');
        if (!Array.isArray(message.packet?.operations)) throw Error('Invalid remote frame operations');
        const packet = { ...message.packet,...(preparing?{preparedWorldBoundary:boundary}:{}),resourceSnapshot:null, operations: [...retainedPreparationsFor(message.packet.operations), ...message.packet.operations] };
        if(packet.operations.some(op=>!drawCommandsCurrent(op,packet.metadata?.nativeWorldBoundary??null))){
          rejectPreparedFrame({...packet,operations:message.packet.operations},'Old draw commands cannot be retagged for another native world');break;
        }
        packet.transportTiming = { ...message.packet.transportTiming, sequence: packet.sequence, workerReceivedAt: message.receivedAt ?? absoluteNow(), admissionStartedAt: absoluteNow() };
        packet.receivedAt = absoluteNow();
        if (!Number.isSafeInteger(packet.sequence) || packet.sequence <= (active?.sequence || 0)) throw Error('Stale remote frame');
        if (!Array.isArray(packet.operations) || packet.operations.length > maxFrameOperations || packetBytes(packet) > maxFrameBytes) throw Error('Remote frame exceeds safety limit');
        if (!packet.operations.some(op => op.method === 'submit')) throw Error('Remote frame contains no drawing submission');
        validateOperations(packet.operations);
        if (packet.metadata?.clock) evaluateRemoteClock(packet.metadata.clock, packet.metadata.clock.anchorAbsoluteMs);
        const hasCompute = packet.operations.some(op => op.method === 'submit' && op.args[0].some(buffer => buffer.__remoteCommands.some(command => command.method === 'beginComputePass')));
        packet.hasCompute=hasCompute;
        if (hasCompute && packet.metadata?.clock && !packet.metadata.clock.paused && packet.metadata.clock.safeUntil > packet.metadata.clock.elapsed) throw Error('An advancing remote clock cannot replay a frame containing one-shot compute; certify a repeatable compute contract first');
        packet.references = references(packet.operations);
        const readiness = waitForResources(packet.references);
        packet.transportTiming.resourcesWaitStartedAt = absoluteNow();
        if (readiness) await Promise.race([readiness,cancelled]);
        if(stopped||failed||nativeConsumerRetirement)throw Error('Native GPU consumer is retiring or closed');
        if(!current()){
          rejectPreparedFrame({...packet,operations:message.packet.operations},'Native mutation invalidated the prepared frame');break;
        }
        packet.transportTiming.resourcesReadyAt = absoluteNow();
        packet.receivedAt = absoluteNow();
        if(preparing&&!packet.operations.some(op=>op.method==='submit'&&op.args[0].some(buffer=>!buffer.texturePreparation&&buffer.__remoteCommands.some(command=>command.method==='beginRenderPass'&&(command.args[0]?.colorAttachments??[]).some(attachment=>[...references([attachment.view,attachment.resolveTarget])].some(key=>key===CURRENT||resources.get(key)?.currentView))))))throw Error('Prepared world frame contains no canvas presentation pass');
        packet.resourceSnapshot = snapshotResources(packet.references);
        const nativeBindings=Array.from(clockBindings.values()).filter(binding=>
          packet.resourceSnapshot.has(binding.id)&&binding.nativeRoute);
        if(nativeBindings.length&&!preparing){
          // A control message and its prepared packet use different ports.
          // Rendezvous on the native high-water mark, never on a resource job.
          const through=Math.max(...nativeBindings.map(binding=>binding.nativeRoute.assignmentSequence));
          await Promise.race([waitNativeControl(through,controller.signal),cancelled]);
        }
        if(!current()){
          rejectPreparedFrame({...packet,operations:message.packet.operations},'Native mutation invalidated the prepared frame');break;
        }
        packet.nativeMutationEpoch=message.nativeMutationEpoch;
        // Resolve permissions after all resource awaits. A direct revocation may
        // have arrived while this generation waited for a model or pipeline.
        try{packet.admittedClockBindings=admitClockBindings(packet,preparing);}catch(error){
          if(error?.code!=='native-route-admission-obsolete')throw error;
          // The same healthy-device preparation retention applies when direct
          // route control overtakes a packet on the resource channel. It grants
          // no route/time and does not turn this into a physical world change.
          rejectPreparedFrame({...packet,operations:message.packet.operations},error.message,false,'native-route');break;
        }
        classifyBufferOwnership(packet);
        if(routeControl?.status().clock&&packet.admittedClockBindings.some(binding=>packet.gpuWrittenBuffers.has(binding.id)))throw Error('Native presentation clocks cannot be overwritten by GPU commands');
        const writeCounts = new Map();
        for (const op of packet.operations) if (op.method === 'writeBuffer') {
          const key = op.args[0][REF]; writeCounts.set(key, (writeCounts.get(key) || 0) + 1);
        }
        // Restore per-pass uniforms when a buffer has several values within the
        // same frame. Single immutable uploads and all texture uploads stay out
        // of replay; clocks/camera are patched immediately before submission.
        if(preparing&&[...writeCounts.keys()].some(key=>packet.gpuWrittenBuffers.has(key)))throw Error('Prepared CPU uploads cannot overlap one-shot GPU outputs');
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
        for (const key of packet.baselineBuffers) if (!packet.resourceSnapshot.get(key)?.uniformShadow) throw Error(`Cannot replay an unversioned GPU buffer read before its first write: ${key}`);
        if(preparing){
          if(hasCompute)throw Error('Prepared native world frame cannot contain one-shot compute');
          initializePreparedWorldFrame(packet);
          packet.preparedClockBindings=packet.admittedClockBindings;
          packet.preparedCameraBindings=Array.from(cameraBindings.values()).filter(binding=>packet.resourceSnapshot.has(binding.id));
        }
        pinSnapshot(packet.resourceSnapshot);
        closePreparationImages(stagedOperations.filter(op=>!packet.operations.includes(op)));
        stagedOperations = [];retainedPreparationOperationCount=0;const retained=retainedPreparationSnapshot;retainedPreparationSnapshot=null;releaseSnapshot(retained);
        if (hasCompute) metrics.computePackets++;
        pending = packet;
        packet.transportTiming.admittedAt = absoluteNow();
        if(preparing){
          await Promise.race([device.queue.onSubmittedWorkDone(),cancelled]);
          if(!current()||pending!==packet){cancelPreparedWorldFrame(packet.sequence);reply(message,null,Error('Prepared world frame cancelled'));break;}
          packet.preparedUploadsComplete=true;
          reply(message,{version:1,sequence:packet.sequence,worldBoundary:boundary,uploadsSubmitted:true});
          preparedReady=true;
        }
        for (const entry of pendingRetirement) tryRetire(entry);
        metrics.packets++; break;
        }catch(error){if(preparing){preparedReady=true;reply(message,null,error);}throw error;}
        finally{if(preparing&&!preparedReady)reply(message,null,Error('Prepared world frame unavailable'));controller.abort();if(admittingFrame===admission)admittingFrame=null;}
      }
      case 'destroy': {
        const entry = resources.get(message.id);
        if (entry) { cancelMapping(entry, 'Remote buffer mapping canceled by destroy'); retired.add(message.id); entry.retirementRequested = true; tryRetire(entry); }
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
        if (entry.mapJob || entry.mapMode) { reply(message, null, Error('Remote buffer already mapped')); break; }
        const job = { done: false, finish(result, error) {
          if (job.done) return;
          job.done = true;
          if (entry.mapJob === job) entry.mapJob = null;
          if (!stopped) reply(message, result, error);
          entry.pins--; tryRetire(entry);
        } };
        entry.mapJob = job; entry.pins++;
        try {
          Promise.resolve(entry.value.mapAsync(message.mode, message.offset, message.size)).then(() => {
            if (job.done || stopped) return;
            entry.mapMode = message.mode;
            entry.mappedRange = entry.value.getMappedRange(message.offset, message.size);
            job.finish({ bytes: entry.mappedRange.slice(0) });
          }).catch(error => job.finish(null, error));
        } catch (error) { job.finish(null, error); }
        break;
      }
      case 'unmap': {
        const entry = resources.get(message.id); if (!entry) throw Error('Unknown unmapped buffer');
        if (entry.mapJob) { cancelMapping(entry, 'Remote buffer mapping canceled by unmap'); break; }
        if ((entry.mapMode & 2) && message.bytes) new Uint8Array(entry.mappedRange || entry.value.getMappedRange(message.offset, message.bytes.byteLength)).set(new Uint8Array(message.bytes));
        if ((entry.mapMode & 2) && entry.uniformShadow && message.bytes) entry.uniformShadow.set(new Uint8Array(message.bytes), message.offset);
        entry.value.unmap(); entry.mapMode = 0; entry.mappedRange = null; break;
      }
      case 'ordered-submission': {
        // The client outbox already captured asynchronous image payloads, and
        // this FIFO has submitted every preceding operation. WebGPU preserves
        // their order relative to later drawing without a queue-completion wait.
        if (stagedOperations.length) { reply(message, null, Error('Cannot order uncommitted published resource mutations')); break; }
        if (deviceDestroyRequested) { reply(message, null, Error('Remote GPU device is being destroyed')); break; }
        metrics.orderedSubmissions = (metrics.orderedSubmissions || 0) + 1;
        reply(message, { kind: 'remote-ordered-submission', submitted: true });
        break;
      }
      case 'fence': {
        const timing = recordTiming(fenceTimings, { requestId: message.requestId || null, producerRequestedAt: message.producerRequestedAt ?? null, workerReceivedAt: message.receivedAt ?? absoluteNow(), startedAt: absoluteNow(), caller: message.caller?.split('\n').find(line => line.includes('.js:') && !line.includes('remote-webgpu-client')) || null }, 128);
        submitRetainedCpuPreparations();
        if (stagedOperations.length) {
          timing.finishedAt = absoluteNow(); timing.rejected = 'uncommitted-published-resources';
          const details = stagedOperations.slice(0, 8).map(op => ({ method: op.method, resources: [...writtenResources(op)].map(id => ({ id, kind: resources.get(id)?.kind, label: resources.get(id)?.descriptor?.label, usage: resources.get(id)?.descriptor?.usage, size: resources.get(id)?.descriptor?.size })) }));
          reply(message, null, Error(`A fence cannot cover uncommitted changes to a published frame; publish the next frame first. State: ${JSON.stringify({retained:!!retainedPreparationSnapshot,pending:!!pending,admitting:!!admittingFrame,hold:!!nativeMutationHold,retiring:!!nativeConsumerRetirement,recovery:preparationRecoveryRequired,block:metrics.retainedFenceBlock})}. Deferred: ${JSON.stringify(details)}\n${message.caller || ''}`));
          break;
        }
        // Native onSubmittedWorkDone captures this queue prefix immediately; its
        // Promise does not prevent later writes/submits. Awaiting it in the FIFO
        // would turn independent completion notifications into serial barriers.
        device.queue.onSubmittedWorkDone().then(() => {
          timing.finishedAt = absoluteNow();
          if (!stopped) reply(message, { timing });
        }, error => {
          timing.finishedAt = absoluteNow(); timing.error = error?.message || String(error);
          if (!stopped) reply(message, null, error);
        });
        break;
      }
      case 'inspect': reply(message, {...api.inspect(),intentControl:routeControl?.status()??null}); break;
      case 'device-destroy': deviceDestroyRequested = true; device.destroy(); break;
      case 'compilation-info': {
        const entry = resources.get(message.id);
        if (!entry) throw Error('Unknown shader module');
        observeNative(message, entry.value.getCompilationInfo(), info => ({ messages: Array.from(info.messages, item => ({ message: item.message, type: item.type, lineNum: item.lineNum, linePos: item.linePos, offset: item.offset, length: item.length })) }), entry);
        break;
      }
      case 'clock-binding': {
        if(message.binding.resourceEnd!==undefined&&(!Number.isFinite(message.binding.resourceEnd)||message.binding.resourceEnd<message.binding.epoch))throw Error('Invalid native clock resource end');
        if(message.binding.executionEpoch!==undefined)throw Error('A preparer cannot set the execution origin');
        if(message.binding.semantic==='origin-modulo'&&(!(message.binding.nativeResume||message.binding.nativeStart||message.binding.nativeConsequence||message.binding.nativeHome||message.binding.nativeSettlement)||!Number.isFinite(message.binding.period)||message.binding.period<=0))throw Error('Invalid native origin phase binding');
        const key = `${message.id}:${message.binding.byteOffset}`;const prior=clockBindings.get(key);
        const nativeRoute=message.binding.nativeRoute?copyNativeRouteReference(message.binding.nativeRoute):null,nativeGate=message.binding.nativeGate?copyNativeGateReference(message.binding.nativeGate):null;
        const nativeResume=message.binding.nativeResume?copyNativeResumeReference(message.binding.nativeResume):null,nativeStart=message.binding.nativeStart?copyNativeTaskStartReference(message.binding.nativeStart):null;
        const nativeSuspended=message.binding.nativeSuspended?copyNativeSuspendedBodyReference(message.binding.nativeSuspended):null,nativeAction=message.binding.nativeAction?copyNativeTaskActionReference(message.binding.nativeAction):null;
        const nativeConsequence=message.binding.nativeConsequence?copyNativeTaskConsequenceReference(message.binding.nativeConsequence):null;
        const nativeHome=message.binding.nativeHome?copyNativeHomeRouteReference(message.binding.nativeHome):null;
        if(nativeHome&&(!['relative','origin-modulo'].includes(message.binding.semantic)||message.binding.epoch!==nativeHome.worldBoundary.effectiveTime))throw Error('Invalid native Home clock');
        const nativeSettlement=message.binding.nativeSettlement?copyNativeTaskSettlementReference(message.binding.nativeSettlement):null;
        const nativeInitialIdleBody=message.binding.nativeInitialIdleBody?copyNativeInitialIdleBodyReference(message.binding.nativeInitialIdleBody):null;
        if(nativeSettlement&&(!['relative','origin-modulo'].includes(message.binding.semantic)||message.binding.epoch!==nativeSettlement.worldBoundary.effectiveTime||message.binding.resourceEnd!==undefined))throw Error('Invalid native settlement phase clock');
        if(nativeInitialIdleBody&&(message.binding.semantic!=='relative'||message.binding.epoch!==nativeInitialIdleBody.worldBoundary.effectiveTime||message.binding.resourceEnd!==undefined))throw Error('Invalid native initial Idle body phase clock');
        if(nativeConsequence&&message.binding.epoch!==nativeConsequence.worldBoundary.effectiveTime)throw Error('Invalid native consequence clock epoch');
        if([nativeRoute,nativeGate,nativeSuspended,nativeResume,nativeStart,nativeAction,nativeConsequence,nativeSettlement,nativeHome,nativeInitialIdleBody].filter(Boolean).length>1)throw Error('Conflicting native clock references');
        if(nativeAction&&(message.binding.semantic!=='relative'||message.binding.epoch!==nativeAction.startTime||message.binding.resourceEnd!==undefined))throw Error('Invalid native action phase clock');
        clockBindings.set(key, { ...message.binding, ...(nativeRoute?{nativeRoute}:{}),...(nativeGate?{nativeGate}:{}),...(nativeSuspended?{nativeSuspended}:{}),...(nativeResume?{nativeResume}:{}),...(nativeStart?{nativeStart}:{}),...(nativeAction?{nativeAction}:{}),...(nativeConsequence?{nativeConsequence}:{}),...(nativeHome?{nativeHome}:{}),...(nativeSettlement?{nativeSettlement}:{}),...(nativeInitialIdleBody?{nativeInitialIdleBody}:{}),
          ...((nativeRoute||nativeGate||nativeSuspended||nativeResume||nativeStart||nativeAction||nativeConsequence||nativeSettlement||nativeHome||nativeInitialIdleBody)?{nativeClockKey:JSON.stringify([nativeRoute?'route':nativeGate?'gate':nativeResume?'resume':nativeStart?'start':nativeHome?'home':nativeConsequence?'consequence':nativeAction?'action':nativeInitialIdleBody?'initial-idle-body':nativeSettlement?'settlement':'suspended',nativeRoute??nativeGate??nativeSuspended??nativeResume??nativeStart??nativeAction??nativeConsequence??nativeSettlement??nativeHome??nativeInitialIdleBody,message.binding.semantic,message.binding.epoch])}:{}), ...(prior?.executionEpoch!==undefined&&JSON.stringify(prior.nativeGate)===JSON.stringify(nativeGate)&&prior.epoch===message.binding.epoch?{executionEpoch:prior.executionEpoch}:{}),id: message.id });
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
      case 'pop-error-scope': observeNative(message, device.popErrorScope(), error => error ? { message: error.message } : null); break;

      default: throw Error(`Unknown remote GPU message ${message.type}`);
    }
  }
  port.onmessage = event => {
    const message = event.data;
    if(message.type==='frame'||message.type==='prepare-world-frame'||message.type==='operation')message.nativeMutationEpoch=nativeMutationEpoch;
    if (message.type === 'frame' || message.type==='prepare-world-frame'||message.type === 'fence') message.receivedAt = absoluteNow();
    if(message.type==='cancel-world-frame'){try{if(message.version!==1)throw Error('Unsupported prepared world frame cancellation');cancelPreparedWorldFrame(message.sequence);}catch(error){fail(error);}return;}
    if (message.type === 'inspect') { reply(message, {...api.inspect(),intentControl:routeControl?.status()??null}); return; }
    if (message.type === 'device-destroy') { deviceDestroyRequested = true; device.destroy(); return; }
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
    }).catch(error => {
      // Work from the retiring producer cannot submit again. Its cancellation
      // must not poison the already accepted queue-drain callback/receipt.
      if(nativeConsumerRetirement&&error?.code==='native-gpu-consumer-retiring'){
        if(message.type==='frame')port.postMessage({type:'frame-obsolete',sequence:message.packet?.sequence,cause:'native-mutation',reason:error.message,resourcePreparationsRetained:false});
        else reply(message,null,error);
        return;
      }
      reply(message,null,error);fail(error);
    }).finally(() => { queuedMessages--; });
  };
  port.start?.();
  if(intentControl){
    // Never enter the resource FIFO: it can await native pipeline creation.
    intentControl.port.onmessage=event=>{
      if(stopped||failed)return;
      try{
         const message=event.data;
         if(intentControl.session&&message?.session!==intentControl.session)
           throw Error('Native intent control transport session mismatch');
         if(message?.type==='IntentControlRetire'){
           const status=routeControl?.status();
           if(!status||status.closed||nativeConsumerRetirement||nativeMutationHold||nativeGpuFences.size||
              message.protocolVersion!==2||message.fenceVersion!==1||message.authorityEpoch!==status.authorityEpoch||
              message.sequence!==status.sequence||message.effectiveTime!==status.effectiveTime||
              message.clockSequence!==status.clock?.clockSequence||typeof message.retirementId!=='string'||!message.retirementId)
             throw Error('Invalid native GPU retirement boundary');
           nativeConsumerRetirement={...message,drained:false};
           if(admittingFrame?.prepared)admittingFrame.cancel();
           if(pending?.preparedWorldBoundary)cancelPreparedWorldFrame(pending.sequence);
           discardRetainedPreparations();
           // Freeze both rAF and standalone submissions before capturing the
           // queue. Resource jobs may finish, but cannot submit after this fence.
           routeControl.dispose();settleNativeControl(Error('Native GPU consumer is retiring'));
           Promise.resolve(device.queue.onSubmittedWorkDone()).then(()=>{
             if(stopped||failed||nativeConsumerRetirement?.retirementId!==message.retirementId)return;
             nativeConsumerRetirement.drained=true;metrics.nativeRetiredAt=absoluteNow();
             intentControl.port.postMessage({...message,type:'intent-control-drained',accepted:true});
           }).catch(error=>fail(error));return;
         }
         if(message?.type==='IntentMutationQuiesce'){
           const status=routeControl?.status();
           if(!status?.clock||status.closed||nativeMutationHold||message.protocolVersion!==2||message.fenceVersion!==1||
              message.authorityEpoch!==status.authorityEpoch||message.sequence!==status.sequence||
              message.effectiveTime!==status.effectiveTime||message.clockSequence!==status.clock.clockSequence||
              !Number.isSafeInteger(message.holdId)||message.holdId!==lastNativeMutationFence+1||
              active?.clockBindings?.some(binding=>binding.routeRecord&&binding.routeRecord.safeUntil<message.effectiveTime))
             throw Error('Invalid or unsafe native mutation quiescence boundary');
           const preparedWorldBoundary=copyNativeWorldBoundary(message.preparedWorldBoundary??null);
           if(preparedWorldBoundary&&(!pending?.preparedUploadsComplete||!sameNativeWorldBoundary(pending.preparedWorldBoundary,preparedWorldBoundary))){
             intentControl.port.postMessage({...message,type:'intent-mutation-quiesced',accepted:false});
             throw Error('Native mutation lacks its retained prepared command packet');
           }
           if([message.preparedTaskActionTemplate,message.preparedTaskStartTemplate,message.preparedResumeTemplate,message.preparedTaskConsequenceTemplate,message.preparedTaskSettlementTemplate,message.preparedInitialIdleBodyTemplate,message.preparedHomeRouteTemplate,message.preparedHomeArrivalTemplate].filter(Boolean).length>1)throw Error('Conflicting native quiescence templates');
           if(message.preparedInitialIdleBodyTemplate)try{const ref=copyNativeInitialIdleBodyReference(message.preparedInitialIdleBodyTemplate);if(!sameNativeInitialIdleBodyReference(ref,pending?.metadata?.nativeInitialIdleBodyTemplate))throw Error('Native quiescence lacks its settlement template');const bindings=admitClockBindings(pending,true);if(!bindings.some(b=>b.semantic==='relative'&&b.nativeInitialIdleBody&&sameNativeInitialIdleBodyReference(b.nativeInitialIdleBody,ref)))throw Error('Native initial Idle body has no prepared clock binding');}catch(error){intentControl.port.postMessage({...message,type:'intent-mutation-quiesced',accepted:false});throw error;}
           if(message.preparedTaskSettlementTemplate)try{const ref=copyNativeTaskSettlementReference(message.preparedTaskSettlementTemplate);if(!sameNativeTaskSettlementReference(ref,pending?.metadata?.nativeTaskSettlementTemplate))throw Error('Native quiescence lacks its settlement template');const bindings=admitClockBindings(pending,true);if(!bindings.some(b=>b.semantic==='relative'&&b.nativeSettlement&&sameNativeTaskSettlementReference(b.nativeSettlement,ref)))throw Error('Native settlement has no prepared clock binding');}catch(error){intentControl.port.postMessage({...message,type:'intent-mutation-quiesced',accepted:false});throw error;}
           if(message.preparedHomeArrivalTemplate)try{const ref=copyNativeHomeArrivalReference(message.preparedHomeArrivalTemplate);if(!sameNativeHomeArrivalReference(ref,pending?.metadata?.nativeHomeArrivalTemplate)||!pending?.preparedHomeArrivalLease?.isPrepared())throw Error('Native quiescence lacks its current Home absence template');}catch(error){intentControl.port.postMessage({...message,type:'intent-mutation-quiesced',accepted:false});throw error;}
           if(message.preparedHomeRouteTemplate)try{const ref=copyNativeHomeRouteReference(message.preparedHomeRouteTemplate);if(!sameNativeHomeRouteReference(ref,pending?.metadata?.nativeHomeRouteTemplate))throw Error('Native quiescence lacks its Home template');const bindings=admitClockBindings(pending,true);if(!bindings.some(b=>b.semantic==='relative'&&b.nativeHome&&sameNativeHomeRouteReference(b.nativeHome,ref)))throw Error('Native Home has no prepared relative clock');}catch(error){intentControl.port.postMessage({...message,type:'intent-mutation-quiesced',accepted:false});throw error;}
           if(message.preparedTaskConsequenceTemplate){const ref=copyNativeTaskConsequenceReference(message.preparedTaskConsequenceTemplate);if(!sameNativeTaskConsequenceReference(ref,pending?.metadata?.nativeTaskConsequenceTemplate))throw Error('Native quiescence lacks its consequence template');const bindings=admitClockBindings(pending,true);if(!bindings.some(b=>b.nativeConsequence&&sameNativeTaskConsequenceReference(b.nativeConsequence,ref)))throw Error('Native consequence has no prepared clock binding');}
           if(message.preparedTaskActionTemplate){const ref=copyNativeTaskActionReference(message.preparedTaskActionTemplate);if(!sameNativeTaskActionReference(ref,pending?.metadata?.nativeTaskActionTemplate)){intentControl.port.postMessage({...message,type:'intent-mutation-quiesced',accepted:false});throw Error('Native quiescence lacks its action template');}routeControl.admitAction(ref,{preparingWorldBoundary:preparedWorldBoundary});}
           if(message.preparedTaskStartTemplate&&(message.preparedResumeTemplate||!sameNativeTaskStartReference(copyNativeTaskStartReference(message.preparedTaskStartTemplate),pending?.metadata?.nativeTaskStartTemplate))){intentControl.port.postMessage({...message,type:'intent-mutation-quiesced',accepted:false});throw Error('Native quiescence lacks its first-task template');}
           if(message.preparedResumeTemplate&&!sameNativeResumeReference(copyNativeResumeReference(message.preparedResumeTemplate),pending?.metadata?.nativeResumeTemplate)){
             intentControl.port.postMessage({...message,type:'intent-mutation-quiesced',accepted:false});throw Error('Native quiescence lacks its deferred template');
           }
           if(message.preparedResumeTemplate||message.preparedTaskStartTemplate||message.preparedTaskActionTemplate||message.preparedTaskConsequenceTemplate||message.preparedTaskSettlementTemplate||message.preparedInitialIdleBodyTemplate||message.preparedHomeRouteTemplate||message.preparedHomeArrivalTemplate)try{admitClockBindings(pending,true);}catch(error){intentControl.port.postMessage({...message,type:'intent-mutation-quiesced',accepted:false});throw error;}
           lastNativeMutationFence=message.holdId;nativeMutationHold={...message,quiesced:false};
           if(preparedWorldBoundary)nativeMutationHold.preparedFrameSequence=pending.sequence;
           Promise.resolve(device.queue.onSubmittedWorkDone()).then(()=>{
             if(stopped||failed||nativeMutationHold?.holdId!==message.holdId)return;
             nativeMutationHold.quiesced=true;metrics.nativeMutationQuiescedAt=absoluteNow();
             intentControl.port.postMessage({type:'intent-mutation-quiesced',fenceVersion:1,session:intentControl.session,
               authorityEpoch:message.authorityEpoch,holdId:message.holdId,sequence:message.sequence,
               effectiveTime:message.effectiveTime,clockSequence:message.clockSequence,accepted:true,
               ...(message.preparedInitialIdleBodyTemplate?{nativeInitialIdleBodyVersion:1,preparedInitialIdleBodyTemplate:copyNativeInitialIdleBodyReference(message.preparedInitialIdleBodyTemplate)}:{}),...(message.preparedTaskSettlementTemplate?{nativeTaskSettlementVersion:1,preparedTaskSettlementTemplate:copyNativeTaskSettlementReference(message.preparedTaskSettlementTemplate)}:{}),
               ...(message.preparedHomeArrivalTemplate?{nativeHomeArrivalVersion:1,preparedHomeArrivalTemplate:copyNativeHomeArrivalReference(message.preparedHomeArrivalTemplate)}:{}),
               ...(message.preparedHomeRouteTemplate?{nativeHomeRouteVersion:1,preparedHomeRouteTemplate:copyNativeHomeRouteReference(message.preparedHomeRouteTemplate)}:{}),
               ...(message.preparedTaskConsequenceTemplate?{nativeTaskConsequenceVersion:1,preparedTaskConsequenceTemplate:copyNativeTaskConsequenceReference(message.preparedTaskConsequenceTemplate)}:{}),
               ...(preparedWorldBoundary?{preparedWorldBoundary,preparedFrameSequence:nativeMutationHold.preparedFrameSequence}:{})});
           }).catch(error=>fail(error));return;
         }
         if(message?.type==='IntentMutationRelease'){
           const status=routeControl?.status(),hold=nativeMutationHold;
           if(!hold?.quiesced||!status?.clock||status.closed||message.protocolVersion!==2||message.fenceVersion!==1||
              message.authorityEpoch!==status.authorityEpoch||message.holdId!==hold.holdId||
              message.heldSequence!==hold.sequence||message.heldTime!==hold.effectiveTime||message.heldClockSequence!==hold.clockSequence||
              message.sequence!==status.sequence||message.effectiveTime!==status.effectiveTime||message.clockSequence!==status.clock.clockSequence||
              status.clock.committedThrough<hold.effectiveTime||typeof message.committed!=='boolean')throw Error('Invalid native mutation release boundary');
           if(message.nativeHomeArrivals!==undefined&&(!Array.isArray(message.nativeHomeArrivals)||!message.committed||message.nativeHomeArrivals.some(v=>v?.reference?.sourceControlSequence!==hold.sequence)))throw Error('Uncommitted or mismatched native Home arrival attestation');
           if(message.nativeResumedRoutes!==undefined&&(!Array.isArray(message.nativeResumedRoutes)||!message.committed||message.nativeResumedRoutes.some(value=>value?.reference?.sourceControlSequence!==hold.sequence)))throw Error('Uncommitted or mismatched native resume attestation');
           if(message.nativeStartedRoutes!==undefined&&(!Array.isArray(message.nativeStartedRoutes)||!message.committed||message.nativeStartedRoutes.some(value=>value?.reference?.sourceControlSequence!==hold.sequence)))throw Error('Uncommitted or mismatched native first-task attestation');
           if(message.nativeHomes!==undefined&&(!Array.isArray(message.nativeHomes)||!message.committed||message.nativeHomes.some(v=>v?.reference?.sourceControlSequence!==hold.sequence)))throw Error('Uncommitted or mismatched native Home attestation');
           if(message.nativeInitialIdleBodies!==undefined&&(!Array.isArray(message.nativeInitialIdleBodies)||!message.committed||message.nativeInitialIdleBodies.some(v=>v?.reference?.sourceControlSequence!==hold.sequence)))throw Error('Uncommitted or mismatched native initial Idle body attestation');
           if(message.nativeSettlements!==undefined&&(!Array.isArray(message.nativeSettlements)||!message.committed||message.nativeSettlements.some(v=>v?.reference?.sourceControlSequence!==hold.sequence)))throw Error('Uncommitted or mismatched native settlement attestation');
           if(message.nativeConsequences!==undefined&&(!Array.isArray(message.nativeConsequences)||!message.committed||message.nativeConsequences.some(v=>v?.reference?.sourceControlSequence!==hold.sequence)))throw Error('Uncommitted or mismatched native consequence attestation');
           if(message.nativeActions!==undefined&&(!Array.isArray(message.nativeActions)||!message.committed||message.nativeActions.some(value=>value?.reference?.sourceControlSequence!==hold.sequence)))throw Error('Uncommitted or mismatched native action attestation');
           if(message.nativeSuspendedBodies!==undefined&&(!Array.isArray(message.nativeSuspendedBodies)||!message.committed))throw Error('Uncommitted native suspension attestation');
           if(message.committed){
             const boundary=copyNativeWorldBoundary(message.worldBoundary??null);
             if(hold.preparedWorldBoundary&&!hold.preparedResumeTemplate&&!hold.preparedTaskStartTemplate&&!hold.preparedTaskActionTemplate&&!hold.preparedTaskConsequenceTemplate&&!hold.preparedTaskSettlementTemplate&&!hold.preparedInitialIdleBodyTemplate&&!hold.preparedHomeRouteTemplate&&!hold.preparedHomeArrivalTemplate&&!sameNativeWorldBoundary(hold.preparedWorldBoundary,boundary))throw Error('Native release differs from its prepared command receipt');
             if(worldBoundaryRequired&&(!boundary||boundary.authorityEpoch!==status.authorityEpoch||
                boundary.nativeSession!==status.clock.nativeSession||boundary.effectiveTime!==message.effectiveTime||
                nativeWorldBoundary&&boundary.ticket<=nativeWorldBoundary.ticket))throw Error('Invalid committed world resource boundary');
             if(hold.preparedHomeArrivalTemplate){
               if(message.nativeInitialIdleBodies?.length||message.nativeSettlements?.length||message.nativeConsequences?.length||message.nativeActions?.length||message.nativeStartedRoutes?.length||message.nativeSuspendedBodies?.length||message.nativeResumedRoutes?.length||message.nativeHomes?.length||message.nativeHomeArrivals?.length!==1||!pending||pending.sequence!==hold.preparedFrameSequence)throw Error('Native Home absence lost its retained frame');
               const binding=copyNativeHomeArrivalAttestation(message.nativeHomeArrivals[0]);if(!sameNativeHomeArrivalReference(binding.preparedReference,hold.preparedHomeArrivalTemplate)||!sameNativeWorldBoundary(binding.reference.worldBoundary,boundary))throw Error('Native Home absence names another retained template');pending.preparedHomeArrivalLease?.validateCommitted(binding);if(!pending.preparedHomeArrivalLease)throw Error('Native Home absence lost its prepared source');pending.admittedMotionBinding=binding;pending.admittedWorldBoundary=boundary;
             }else if(message.nativeHomeArrivals?.length)throw Error('Native Home absence lacks its retained template');
             if(hold.preparedHomeRouteTemplate){
               if(message.nativeInitialIdleBodies?.length||message.nativeHomeArrivals?.length||message.nativeSettlements?.length||message.nativeConsequences?.length||message.nativeActions?.length||message.nativeStartedRoutes?.length||message.nativeSuspendedBodies?.length||message.nativeResumedRoutes?.length||message.nativeHomes?.length!==1||!pending||pending.sequence!==hold.preparedFrameSequence)throw Error('Native Home lost its retained frame');
               const binding=copyNativeHomeRouteAttestation(message.nativeHomes[0]);if(!sameNativeHomeRouteReference(binding.preparedReference,hold.preparedHomeRouteTemplate))throw Error('Native Home names another retained template');
               pending.admittedMotionBinding=binding;pending.admittedWorldBoundary=boundary;
             }else if(message.nativeHomes?.length)throw Error('Native Home lacks its retained template');
             if(hold.preparedInitialIdleBodyTemplate){
               if(message.nativeSettlements?.length||message.nativeHomeArrivals?.length||message.nativeHomes?.length||message.nativeConsequences?.length||message.nativeActions?.length||message.nativeStartedRoutes?.length||message.nativeSuspendedBodies?.length||message.nativeResumedRoutes?.length||message.nativeInitialIdleBodies?.length!==1||!pending||pending.sequence!==hold.preparedFrameSequence)throw Error('Native initial Idle body lost its retained frame');
               const binding=copyNativeInitialIdleBodyAttestation(message.nativeInitialIdleBodies[0]);if(!sameNativeInitialIdleBodyReference(binding.preparedReference,hold.preparedInitialIdleBodyTemplate))throw Error('Native initial Idle body names another retained template');
               pending.admittedMotionBinding=binding;pending.admittedWorldBoundary=boundary;
             }else if(message.nativeInitialIdleBodies?.length)throw Error('Native initial Idle body lacks its retained template');
             if(hold.preparedTaskSettlementTemplate){
               if(message.nativeInitialIdleBodies?.length||message.nativeHomeArrivals?.length||message.nativeHomes?.length||message.nativeConsequences?.length||message.nativeActions?.length||message.nativeStartedRoutes?.length||message.nativeSuspendedBodies?.length||message.nativeResumedRoutes?.length||message.nativeSettlements?.length!==1||!pending||pending.sequence!==hold.preparedFrameSequence)throw Error('Native settlement lost its retained frame');
               const binding=copyNativeTaskSettlementAttestation(message.nativeSettlements[0]);if(!sameNativeTaskSettlementReference(binding.preparedReference,hold.preparedTaskSettlementTemplate))throw Error('Native settlement names another retained template');
               pending.admittedMotionBinding=binding;pending.admittedWorldBoundary=boundary;
             }else if(message.nativeSettlements?.length)throw Error('Native settlement lacks its retained template');
             if(hold.preparedTaskConsequenceTemplate){
               if(message.nativeInitialIdleBodies?.length||message.nativeHomeArrivals?.length||message.nativeHomes?.length||message.nativeSettlements?.length||message.nativeActions?.length||message.nativeStartedRoutes?.length||message.nativeSuspendedBodies?.length||message.nativeResumedRoutes?.length||message.nativeConsequences?.length!==1||!pending||pending.sequence!==hold.preparedFrameSequence)throw Error('Native consequence lost its retained frame');
               const binding=copyNativeTaskConsequenceAttestation(message.nativeConsequences[0]);if(!sameNativeTaskConsequenceReference(binding.preparedReference,hold.preparedTaskConsequenceTemplate))throw Error('Native consequence names another retained template');
               pending.admittedMotionBinding=binding;pending.admittedWorldBoundary=boundary;
               for(const [key,clock] of clockBindings)if(clock.nativeGate&&sameNativeWorldBoundary(clock.nativeGate.worldBoundary,binding.preparedReference.worldBoundary)){if(!binding.gateIds.includes(clock.nativeGate.gateId))throw Error('Native consequence did not attest its gate');clockBindings.set(key,{...clock,executionEpoch:binding.reference.worldBoundary.effectiveTime});}
             }else if(message.nativeConsequences?.length)throw Error('Native consequence lacks its retained template');
             if(hold.preparedTaskActionTemplate){
               if(message.nativeInitialIdleBodies?.length||message.nativeHomeArrivals?.length||message.nativeHomes?.length||message.nativeSettlements?.length||message.nativeConsequences?.length||message.nativeStartedRoutes?.length||message.nativeSuspendedBodies?.length||message.nativeResumedRoutes?.length||message.nativeActions?.length!==1||!pending||pending.sequence!==hold.preparedFrameSequence)throw Error('Native action lost its retained frame');
               const binding=copyNativeTaskActionAttestation(message.nativeActions[0]);if(!sameNativeTaskActionReference(binding.preparedReference,hold.preparedTaskActionTemplate))throw Error('Native action names another retained template');
               pending.admittedMotionBinding=binding;pending.admittedWorldBoundary=boundary;
             }else if(message.nativeActions?.length)throw Error('Native action lacks a retained template');
             if(hold.preparedTaskStartTemplate){
               if(message.nativeInitialIdleBodies?.length||message.nativeHomeArrivals?.length||message.nativeHomes?.length||message.nativeSettlements?.length||message.nativeConsequences?.length||message.nativeActions?.length||message.nativeSuspendedBodies?.length||message.nativeResumedRoutes?.length||message.nativeStartedRoutes?.length!==1||!pending||pending.sequence!==hold.preparedFrameSequence)throw Error('First task lost its retained frame');
               const binding=copyNativeTaskStartAttestation(message.nativeStartedRoutes[0]);if(!sameNativeTaskStartReference(binding.preparedReference,hold.preparedTaskStartTemplate))throw Error('First task names another retained template');
               pending.admittedMotionBinding=binding;pending.admittedWorldBoundary=boundary;
               for(const [key,clock] of clockBindings)if(clock.nativeGate&&sameNativeWorldBoundary(clock.nativeGate.worldBoundary,binding.preparedReference.worldBoundary)){if(!binding.gateIds.includes(clock.nativeGate.gateId))throw Error('First task did not attest its gate');clockBindings.set(key,{...clock,executionEpoch:binding.reference.worldBoundary.effectiveTime});}
             }else if(message.nativeStartedRoutes?.length)throw Error('First-task attestation lacks a retained template');
             if(hold.preparedResumeTemplate){
               if(message.nativeInitialIdleBodies?.length||message.nativeHomeArrivals?.length||message.nativeHomes?.length||message.nativeSettlements?.length||message.nativeConsequences?.length||message.nativeActions?.length||message.nativeStartedRoutes?.length||message.nativeSuspendedBodies?.length||message.nativeResumedRoutes?.length!==1||!pending||pending.sequence!==hold.preparedFrameSequence)throw Error('Deferred native resume lost its prepared frame');
               const binding=copyNativeResumeAttestation(message.nativeResumedRoutes[0]);if(!sameNativeResumeReference(binding.preparedReference,hold.preparedResumeTemplate))throw Error('Native resume names another prepared template');
               pending.admittedMotionBinding=binding;pending.admittedWorldBoundary=boundary;
               for(const [key,clock] of clockBindings)if(clock.nativeGate&&sameNativeWorldBoundary(clock.nativeGate.worldBoundary,binding.preparedReference.worldBoundary)){
                 if(!binding.gateIds.includes(clock.nativeGate.gateId))throw Error('Native resume did not attest its prepared gate');clockBindings.set(key,{...clock,executionEpoch:binding.reference.worldBoundary.effectiveTime});
               }
             }else if(message.nativeResumedRoutes?.some(value=>value.preparedReference))throw Error('Deferred attestation without a retained template');
             routeControl.installSuspendedBodies(boundary,message.nativeSuspendedBodies??[]);
             routeControl.installResumedRoutes(boundary,message.nativeResumedRoutes??[]);
             routeControl.installStartedRoutes(boundary,message.nativeStartedRoutes??[]);
             routeControl.installActions(boundary,message.nativeActions??[]);
             routeControl.installConsequences(boundary,message.nativeConsequences??[]);
             routeControl.installInitialIdleBodies(boundary,message.nativeInitialIdleBodies??[]);
             routeControl.installSettlements(boundary,message.nativeSettlements??[]);
             routeControl.installHomes(boundary,message.nativeHomes??[]);
             if(hold.preparedTaskActionTemplate)pending.admittedActionRecord=routeControl.admitAction(hold.preparedTaskActionTemplate);
             nativeWorldBoundary=boundary;
             nativeMutationEpoch++;
             invalidatePendingNativeWorld('Native mutation invalidated the prepared frame');
           }
           nativeMutationFloor=Math.max(nativeMutationFloor??0,hold.effectiveTime);nativeMutationHold=null;
           if(!message.committed&&pending?.preparedWorldBoundary)cancelPreparedWorldFrame(pending.sequence);
           if(message.committed&&worldBoundaryRequired)publishWorldBoundary();
           settleMutationSubmissions();
           metrics.nativeMutationReleasedAt=absoluteNow();return;
         }
         if(message?.type==='IntentControlFence'){
          const status=routeControl?.status();
          if(!status||status.closed||message.protocolVersion!==2||message.fenceVersion!==1||
             !Number.isFinite(message.effectiveTime)||message.effectiveTime<0||
             !Number.isSafeInteger(message.fenceId)||message.fenceId<1||
             message.authorityEpoch!==status.authorityEpoch||message.sequence!==status.sequence||
              message.effectiveTime!==status.effectiveTime||message.clockSequence!==status.clock?.clockSequence||
              message.fenceId!==lastNativeGpuFence+1||nativeGpuFences.size>=64)
            throw Error('Invalid native GPU fence boundary');
          lastNativeGpuFence=message.fenceId;nativeGpuFences.add(message.fenceId);
          // Snapshot the already-submitted GPU work now, outside the resource
          // FIFO. Future draws read the revoked records; late preparations must
          // still pass native admission. This is not a new clock/mutation permit.
          Promise.resolve(device.queue.onSubmittedWorkDone()).then(()=>{
            nativeGpuFences.delete(message.fenceId);
            if(stopped||failed||routeControl.status().closed)return;
            metrics.nativeIntentGpuFencedAt=absoluteNow();metrics.nativeIntentGpuFencedSequence=message.sequence;
            intentControl.port.postMessage({type:'intent-control-fenced',fenceVersion:1,
              ...(intentControl.session?{session:intentControl.session}:{}),authorityEpoch:message.authorityEpoch,
              sequence:message.sequence,effectiveTime:message.effectiveTime,fenceId:message.fenceId,accepted:true,
              ...(message.clockSequence===undefined?{}:{clockSequence:message.clockSequence})});
          }).catch(error=>{nativeGpuFences.delete(message.fenceId);fail(error);});
          return;
         }
         if(message?.type==='IntentClock'){
           if(!routeControl)throw Error('Native causal clock arrived before its baseline');
           if(frameTime.status().elapsed!==null&&message.committedThrough<frameTime.status().elapsed)
             throw Error('Native causal clock arrived after presented time');
           routeControl.acceptClock(message);
           metrics.nativeCausalClockAppliedAt=absoluteNow();metrics.nativeCausalClockAppliedSequence=message.clockSequence;
           intentControl.port.postMessage({type:'intent-clock-applied',session:intentControl.session,
             authorityEpoch:message.authorityEpoch,clockSequence:message.clockSequence,intentSequence:message.intentSequence,
             committedThrough:message.committedThrough,accepted:true});return;
         }
        let accepted;
        if(message?.type==='IntentBaseline'){
          if(message.nativeInitialIdleBodies!==undefined&&(!Array.isArray(message.nativeInitialIdleBodies)||message.nativeInitialIdleBodies.length))throw Error('Native initial Idle bodies require prepared graphical admission');
          if(message.nativeHomeArrivals!==undefined&&(!Array.isArray(message.nativeHomeArrivals)||message.nativeHomeArrivals.length))throw Error('Native Home arrival requires prepared graphical admission');
          if(message.nativeHomes!==undefined&&(!Array.isArray(message.nativeHomes)||message.nativeHomes.length))throw Error('Native Home routes require prepared graphical admission');
          if(message.nativeSettlements!==undefined&&(!Array.isArray(message.nativeSettlements)||message.nativeSettlements.length))throw Error('Native settled bodies require prepared graphical admission');
          if(routeControl||message.protocolVersion!==2||!Array.isArray(message.routes)||
             !Number.isFinite(message.effectiveTime))throw Error('Invalid or repeated native intent baseline');
           routeControl=createNativeRouteControl({authorityEpoch:message.authorityEpoch,
             initialSequence:message.sequence,initialTime:message.effectiveTime,routes:message.routes,pendingTaskRequests:message.pendingTaskRequests??[],pendingActionRequests:message.pendingActionRequests??[],pendingHomeRequests:message.pendingHomeRequests??[],pendingInitialIdleRequests:message.pendingInitialIdleRequests??[]});
           if(message.consumerToken!==undefined&&(typeof message.consumerToken!=='string'||!message.consumerToken))throw Error('Invalid native consumer identity');
           nativeConsumerToken=message.consumerToken??null;
           if(message.clock)routeControl.acceptClock(message.clock,{baseline:true});
           if(message.worldBoundaryVersion!==undefined&&message.worldBoundaryVersion!==1)throw Error('Unsupported native world resource boundary');
           worldBoundaryRequired=message.worldBoundaryVersion===1;
           nativeWorldBoundary=copyNativeWorldBoundary(message.worldBoundary??null);
           if(message.nativeStartedRoutes!==undefined)routeControl.installStartedRoutes(nativeWorldBoundary,message.nativeStartedRoutes,{bootstrap:true});
           if(message.nativeActions!==undefined)routeControl.installActions(nativeWorldBoundary,message.nativeActions,{bootstrap:true});
           if(message.nativeConsequences!==undefined)routeControl.installConsequences(nativeWorldBoundary,message.nativeConsequences,{bootstrap:true});
           if(nativeWorldBoundary&&(nativeWorldBoundary.authorityEpoch!==message.authorityEpoch||
              nativeWorldBoundary.nativeSession!==message.clock?.nativeSession||
              nativeWorldBoundary.effectiveTime>message.clock.committedThrough))throw Error('Invalid native world resource baseline');
           if(worldBoundaryRequired)publishWorldBoundary();
           if(pending&&!frameWorldCurrent(pending)||admittingFrame&&!frameWorldCurrent(admittingFrame.packet))invalidatePendingNativeWorld('Prepared resources precede the native world baseline');
          accepted=true;
        }else if(message?.type==='IntentControlClosed'){
          if(message.protocolVersion!==2||message.authorityEpoch!==routeControl?.status().authorityEpoch)
            throw Error('Invalid native intent control retirement');
          routeControl.dispose();settleNativeControl(Error('Native intent control retired'));
          if(!['replaced','disposed','consumer-retired'].includes(message.reason))
            fail(Error('Native intent control failed: '+message.reason));
          return;
        }else{
          if(!routeControl)throw Error('Native intent event arrived before its baseline');
          accepted=routeControl.accept(message);
        }
        if(accepted){metrics.nativeIntentControlAppliedAt=absoluteNow();
          metrics.nativeIntentControlAppliedSequence=routeControl.status().sequence;}
        settleNativeControl();
        intentControl.port.postMessage({type:'intent-control-applied',
          ...(intentControl.session?{session:intentControl.session}:{}),
          authorityEpoch:routeControl.status().authorityEpoch,
           sequence:routeControl.status().sequence,accepted,...(message?.type==='IntentBaseline'&&message.clock?{
             clockSequence:message.clock.clockSequence,clockIntentSequence:message.clock.intentSequence,
             clockCommittedThrough:message.clock.committedThrough}:{})});
      }catch(error){fail(error);}
    };
    intentControl.port.onmessageerror=()=>fail(Error('Native route control transfer failed'));
    intentControl.port.start?.();
  }
  device.lost?.then(info => { deviceIsLost=true;port.postMessage({ type: 'lost', info: { reason: info.reason, message: info.message } }); api.dispose();notifyNativeRetired(); });
  device.addEventListener?.('uncapturederror', event => { metrics.gpuErrors++; fail(event.error); });
  frameHandle = requestFrame(present);
  const api = {
    handle, present, idle: () => chain,
    intentControlStatus:()=>routeControl?{...routeControl.status(),retiring:nativeConsumerRetirement!==null,drained:nativeConsumerRetirement?.drained??false}:null,
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
    inspect: () => ({ ...metrics, hidden, resources: resources.size, pendingResources: pendingResources.size, activeSequence: active?.sequence || null, pendingSequence: pending?.sequence || null, queuedMessages, stagedOperations: stagedOperations.length,retainedPreparationResources:retainedPreparationSnapshot?.size??0,retainedPreparationBytes:retainedPreparationSnapshot?packetBytes(stagedOperations):0,preparationRecoveryRequired, obsoleteVersions: obsoleteVersions.size, failed, backend: 'webgpu', rafIndependent: true, adapterInfo, frameTime: frameTime.status(), frameTimings: frameTimings.slice(), fenceTimings: fenceTimings.slice(), lease: frameClock(active) || null, nativeCausalClock:routeControl?.status().clock??null, nativeMutationHold:nativeMutationHold?.holdId??null,nativeMutationFloor,nativeMutationEpoch, cameraSafe: active?.metadata?.cameraSafe ?? false, cameraEnvelope: active?.metadata?.cameraEnvelope || null, clockBindings: active?.clockBindings.length || 0, cameraBindings: active?.cameraBindings.length || 0, clockAtHorizon: !!frameClock(active) && frameTime.status().elapsed >= Math.min(routeControl?.status().clock?.committedThrough??Infinity,frameClock(active).safeUntil), nativeRouteFrame: nativeRouteFrame ? structuredClone(nativeRouteFrame) : null, errors: errors.slice(), samples: sampleCursor < samples.length ? samples.slice(0, sampleCursor) : [...samples.slice(sampleCursor % samples.length), ...samples.slice(0, sampleCursor % samples.length)] }),
    dispose() {
      if (stopped) return disposalPromise; stopped = true;
      admittingFrame?.cancel();discardRetainedPreparations();
      settleMutationSubmissions(Error('Remote GPU disposed during native mutation'));
      settleNativeControl(Error('Remote GPU disposed'));
      routeControl?.dispose();
      for (const job of pendingResources.values()) job.reject(Error('Remote GPU disposed'));
      pendingResources.clear();
      if (frameHandle !== null) cancelFrame(frameHandle);
      disposalPromise=device.queue.onSubmittedWorkDone().then(notifyNativeRetired,error=>{
        if(deviceIsLost)notifyNativeRetired();else throw error;
      }).finally(() => {
        for (const [key, entry] of resources) if (key !== '@device') entry.value?.destroy?.();
        resources.clear(); context.unconfigure(); device.destroy();
      });
      disposalPromise.catch(()=>{});return disposalPromise;
    },
  };
  return api;
}
