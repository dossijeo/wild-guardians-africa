import {
  StorageBufferAttribute, IndirectStorageBufferAttribute, Vector3,
} from 'three/webgpu';
import {
  Fn, If, storage, uniform, instanceIndex, uint, atomicAdd, atomicStore,
} from 'three/tsl';

/**
 * An isolated early-falsification probe, NOT a game or grass-render benchmark.
 * Resident candidates are vec4(x,y,z,height); selection uses horizontal distance
 * only. No frustum, occupancy, chunks, LOD, wind, draw, or production selection.
 * GPU compacts IDs and produces a nonindexed indirect argument buffer. Counters
 * and IDs are read back only for audits, outside measured submission intervals.
 * Use a dedicated WebGPURenderer, initialized with trackTimestamp:true.
 */
export async function runComputeProbe(renderer, options = {}) {
  const progress = options.onProgress ?? (() => {});
  progress('initializing renderer');
  await renderer.init();
  progress('renderer initialized');
  if (!renderer.backend.isWebGPUBackend) {
    return { status: 'unsupported', reason: 'Atomic compaction requires WebGPU; fallback is not equivalent.' };
  }
  const {
    candidates = syntheticCandidates(32768),
    cameraPosition = new Vector3(),
    farDistance = 48,
    samples = 120,
    warmup = 20,
    vertexCount = 24,
  } = options;
  if (!(candidates instanceof Float32Array) || candidates.length % 4 || !candidates.length) {
    throw new TypeError('candidates must be a nonempty Float32Array with stride 4.');
  }
  if (!Number.isFinite(farDistance) || farDistance <= 0 || !Number.isInteger(samples) || samples < 1) {
    throw new RangeError('farDistance must be positive and samples must be a positive integer.');
  }
  const count = candidates.length / 4;
  const sourceAttribute = new StorageBufferAttribute(candidates, 4);
  const selectedAttribute = new StorageBufferAttribute(count, 1, Uint32Array);
  // drawIndirect layout: vertexCount, instanceCount, firstVertex, firstInstance.
  const indirectAttribute = new IndirectStorageBufferAttribute(new Uint32Array(4), 1);
  const source = storage(sourceAttribute, 'vec4', count).toReadOnly();
  const selected = storage(selectedAttribute, 'uint', count);
  const indirect = storage(indirectAttribute, 'uint', 4).toAtomic();
  const camera = uniform(new Vector3().copy(cameraPosition));
  const radiusSquared = uniform(Math.fround(farDistance * farDistance));
  const reset = Fn(() => {
    atomicStore(indirect.element(0), uint(vertexCount));
    atomicStore(indirect.element(1), uint(0));
    atomicStore(indirect.element(2), uint(0));
    atomicStore(indirect.element(3), uint(0));
  })().compute(1);
  const compact = Fn(() => {
    const delta = source.element(instanceIndex).xz.sub(camera.xz).toVar();
    If(delta.dot(delta).lessThanEqual(radiusSquared), () => {
      const slot = atomicAdd(indirect.element(1), uint(1)).toVar();
      selected.element(slot).assign(instanceIndex);
    });
  })().compute(count);
  const computeNodes = [reset, compact];
  const cpuOutput = new Uint32Array(count);
  const raw = [];
  const audits = [];
  const timestampAvailable = renderer.backend.trackTimestamp === true
    && renderer.hasFeature('timestamp-query');
  const metadata = {
    source: options.candidates ? 'caller-provided resident candidate array' : 'synthetic deterministic grid',
    candidateCount: count,
    farDistance,
    warmup,
    samples,
    vertexCount,
    inputBytes: candidates.byteLength,
    outputBytes: selectedAttribute.array.byteLength + indirectAttribute.array.byteLength,
    timestampAvailable,
    workload: 'horizontal distance selection + atomic ID compaction + indirect arguments; no rendering',
    timingProtocol: 'Serial diagnostic dispatches; await timestamp/query completion outside CPU interval. Not throughput or frame latency.',
  };
  const errors = [];
  const device = renderer.backend.device;
  // r180's timestamp pool catches failures and logs them instead of rejecting.
  // Capture these logs so its previous duration cannot masquerade as a sample.
  const originalConsoleError = console.error;
  const captureConsoleError = (...args) => {
    errors.push(args.map(String).join(' '));
    originalConsoleError(...args);
  };
  console.error = captureConsoleError;
  const onError = event => errors.push(String(event.error?.message ?? event.error ?? event));
  device.addEventListener('uncapturederror', onError);
  function setCamera(frame) {
    // CPU and GPU always see the same Float32-rounded camera values.
    camera.value.set(
      Math.fround(cameraPosition.x + Math.sin(frame * 0.043) * farDistance * 0.2),
      Math.fround(cameraPosition.y),
      Math.fround(cameraPosition.z + Math.cos(frame * 0.037) * farDistance * 0.2),
    );
  }
  function cpuSelect() {
    let n = 0;
    const x = camera.value.x, z = camera.value.z, rr = radiusSquared.value;
    for (let i = 0; i < count; i++) {
      const dx = Math.fround(candidates[i * 4] - x);
      const dz = Math.fround(candidates[i * 4 + 2] - z);
      const d2 = Math.fround(Math.fround(dx * dx) + Math.fround(dz * dz));
      if (d2 <= rr) cpuOutput[n++] = i;
    }
    return n;
  }
  async function audit(frame, cpuCount) {
    const [argumentBuffer, indexBuffer] = await Promise.all([
      renderer.getArrayBufferAsync(indirectAttribute),
      renderer.getArrayBufferAsync(selectedAttribute),
    ]);
    const args = new Uint32Array(argumentBuffer);
    const n = args[1];
    const ids = new Uint32Array(indexBuffer).slice(0, Math.min(n, count));
    ids.sort();
    let firstMismatch = null;
    for (let i = 0; i < Math.min(cpuCount, ids.length); i++) {
      if (ids[i] !== cpuOutput[i]) {
        firstMismatch = { offset: i, cpu: cpuOutput[i], gpu: ids[i] };
        break;
      }
    }
    const pass = n === cpuCount && firstMismatch === null
      && args[0] === vertexCount && args[2] === 0 && args[3] === 0;
    audits.push({
      frame, camera: camera.value.toArray(), cpuCount, gpuCount: n,
      indirectArguments: Array.from(args), pass, firstMismatch,
    });
    if (!pass) throw new Error(`Compute selection mismatch: ${JSON.stringify(audits.at(-1))}`);
  }
  async function dispatch() {
    const existingPool = renderer.backend.timestampQueryPool.compute;
    if (existingPool?.pendingResolve || existingPool?.currentQueryIndex) {
      throw new Error('Compute timing pool is not empty; use an idle, dedicated renderer.');
    }
    const errorCount = errors.length;
    const start = performance.now();
    renderer.compute(computeNodes);
    const cpuSubmissionMs = performance.now() - start;
    // Snapshot allocation before resolving; empty/stale samples must not count.
    const pool = renderer.backend.timestampQueryPool.compute;
    const issued = pool?.currentQueryIndex ?? 0;
    const queryPairs = issued / 2;
    const uniqueContexts = pool?.queryOffsets.size ?? 0;
    const gpuMs = timestampAvailable && issued > 0
      ? await renderer.resolveTimestampsAsync('compute')
      : null;
    await device.queue.onSubmittedWorkDone();
    const gpuValid = timestampAvailable && queryPairs > 0 && queryPairs === uniqueContexts
      && !pool.pendingResolve && pool.currentQueryIndex === 0
      && errors.length === errorCount && Number.isFinite(gpuMs) && gpuMs >= 0;
    return {
      cpuSubmissionMs, gpuMs, gpuValid, belowResolution: gpuValid && gpuMs === 0,
      queryCount: issued, queryPairs, uniqueContexts,
    };
  }
  try {
    // Flush any prior pending timing data from the dedicated renderer.
    if (timestampAvailable && renderer.backend.timestampQueryPool.compute?.currentQueryIndex) {
      await renderer.resolveTimestampsAsync('compute');
    }
    for (let i = -warmup; i < samples; i++) {
      progress(`dispatch ${i}`);
      setCamera(Math.max(i, 0));
      const before = performance.now();
      const cpuCount = cpuSelect();
      const cpuSelectionMs = performance.now() - before;
      const measured = await dispatch();
      progress(`completed dispatch ${i}`);
      if (i >= 0) raw.push({ frame: i, cpuCount, cpuSelectionMs, ...measured });
      if (i === -1 || i === 0 || i === Math.floor(samples / 2) || i === samples - 1) {
        await audit(i, cpuCount);
      }
      if (errors.length) throw new Error(errors.join('\n'));
    }
    return {
      status: 'completed', metadata, audits, raw,
      summary: {
        cpuSelectionMs: summarize(raw.map(row => row.cpuSelectionMs)),
        computeSubmissionMs: summarize(raw.map(row => row.cpuSubmissionMs)),
        gpuComputeMs: summarize(raw.filter(row => row.gpuValid).map(row => row.gpuMs)),
        invalidGpuSamples: raw.filter(row => !row.gpuValid).length,
        belowResolutionGpuSamples: raw.filter(row => row.belowResolution).length,
      },
      limitations: [
        'No draw or game integration: this cannot justify migrating the renderer.',
        'GPU timings exclude input upload during initialization and readback audits.',
        'CPU selection includes output packing into a reused typed array; GPU includes reset and compact dispatches.',
        'Serial timestamp resolution changes CPU/GPU overlap; not a frame-throughput comparison.',
        'GPU atomics produce nondeterministic output order; set equality, not order, is verified.',
        'Float32 boundary rounding or GPU fused operations can cause rare threshold disagreements; audits fail explicitly.',
        'GPU duration is optional and quantized by the browser; errors invalidate this run.',
      ],
    };
  } finally {
    await device.queue.onSubmittedWorkDone().catch(() => {});
    if (console.error === captureConsoleError) console.error = originalConsoleError;
    device.removeEventListener('uncapturederror', onError);
    reset.dispose();
    compact.dispose();
    // Storage attributes have no public dispose in r180. This isolated probe
    // owns these buffers; use the pinned backend lifecycle rather than leaking.
    for (const attribute of [sourceAttribute, selectedAttribute, indirectAttribute]) {
      if (renderer.backend.has(attribute)) renderer.backend.destroyAttribute(attribute);
    }
  }
}

function summarize(values) {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  return {
    count: sorted.length,
    mean: values.reduce((a, b) => a + b, 0) / values.length,
    p50: sorted[Math.floor((sorted.length - 1) * 0.5)],
    p95: sorted[Math.floor((sorted.length - 1) * 0.95)],
    min: sorted[0], max: sorted.at(-1),
  };
}

function syntheticCandidates(count) {
  const result = new Float32Array(count * 4);
  const side = Math.ceil(Math.sqrt(count));
  for (let i = 0; i < count; i++) {
    result[i * 4] = ((i % side) - side / 2) * 0.75;
    result[i * 4 + 1] = 0;
    result[i * 4 + 2] = (Math.floor(i / side) - side / 2) * 0.75;
    result[i * 4 + 3] = 0.3;
  }
  return result;
}
