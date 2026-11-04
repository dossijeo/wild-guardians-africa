import { runVertexWebGpuSwap } from './vertex-webgpu-swap.js';

self.onmessage = async ({ data }) => {
  try {
    const result = await runVertexWebGpuSwap({ mode: data.mode, canvas: data.canvas, nativeBc7: data.nativeBc7, count: data.count, beastToon: data.beastToon, beastShadow: data.beastShadow, autoVariant: data.autoVariant, disableBc7: data.disableBc7, verifiedStream: data.verifiedStream, captureBlend: data.captureBlend });
    self.postMessage({ result });
  } catch (error) {
    self.postMessage({ error: String(error?.stack ?? error) });
  }
};
