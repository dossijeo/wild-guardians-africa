// Capture main-thread rAF alongside the renderer worker's own render loop.
export async function runWorkerSwap(mode, nativeBc7 = false, count = 1, beastToon = false, beastShadow = false, autoVariant = false, disableBc7 = false, verifiedStream = false, captureBlend = false) {
  const canvas = document.createElement('canvas'); canvas.width = canvas.height = 512; document.body.replaceChildren(canvas);
  const offscreen = canvas.transferControlToOffscreen();
  const worker = new Worker(new URL('./vertex-webgpu-render-worker.js', import.meta.url), { type: 'module' });
  const intervals = []; let previous = 0, finished = false;
  function tick(now) {
    if (previous) intervals.push({ at: performance.timeOrigin + now, ms: now - previous });
    previous = now; if (!finished) requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
  try {
    const result = await new Promise((resolve, reject) => {
      worker.onerror = event => reject(Error(event.message));
      worker.onmessage = ({ data }) => data.error ? reject(Error(data.error)) : resolve(data.result);
      worker.postMessage({ mode, nativeBc7, count, beastToon, beastShadow, autoVariant, disableBc7, verifiedStream, captureBlend, canvas: offscreen }, [offscreen]);
    });
    return { ...result, mainIntervals: intervals };
  } finally { finished = true; worker.terminate(); }
}

// API capability check only; does not imply anything about driver cache reuse.
export async function probeWebGpuTransfer() {
  const adapter = await navigator.gpu.requestAdapter(); if (!adapter) throw Error('No WebGPU adapter');
  const device = await adapter.requestDevice();
  const texture = device.createTexture({ size: [1, 1], format: 'rgba8unorm', usage: GPUTextureUsage.TEXTURE_BINDING });
  const buffer = device.createBuffer({ size: 4, usage: GPUBufferUsage.COPY_DST });
  const results = {};
  try {
    for (const [name, value] of [['device', device], ['texture', texture], ['buffer', buffer]]) {
      for (const transfer of [false, true]) {
        try { structuredClone(value, transfer ? { transfer: [value] } : undefined); results[`${name}${transfer ? 'Transfer' : 'Clone'}`] = 'ok'; }
        catch (error) { results[`${name}${transfer ? 'Transfer' : 'Clone'}`] = error.name; }
      }
    }
    return results;
  } finally { buffer.destroy(); texture.destroy(); device.destroy(); }
}
