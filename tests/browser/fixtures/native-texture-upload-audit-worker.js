import { createRemoteWebGpuHost } from '/src/rendering/remote-webgpu-host.js';

const written = [], unchanged = [], validationErrors = [];
let device, host;

async function texels(texture) {
  const stride = 256;
  const buffer = device.createBuffer({ size: stride * 64, usage: GPUBufferUsage.MAP_READ | GPUBufferUsage.COPY_DST });
  try {
    const encoder = device.createCommandEncoder();
    encoder.copyTextureToBuffer({ texture }, { buffer, bytesPerRow: stride, rowsPerImage: 64 }, [1, 64]);
    device.queue.submit([encoder.finish()]);
    await buffer.mapAsync(GPUMapMode.READ);
    const data = new Uint8Array(buffer.getMappedRange());
    return Array.from({ length: 64 }, (_, row) => Array.from(data.slice(row * stride, row * stride + 4)));
  } finally { buffer.destroy(); }
}

self.onmessage = async ({ data: { id, op, canvas, port } }) => {
  try {
    let result;
    if (op === 'init') {
      const adapter = await navigator.gpu.requestAdapter();
      if (!adapter || adapter.info.isFallbackAdapter || /swiftshader|software/i.test(adapter.info.device+' '+adapter.info.description)) throw Error('Physical WebGPU unavailable');
      result = { vendor: adapter.info.vendor, architecture: adapter.info.architecture, device: adapter.info.device, description: adapter.info.description };
      device = await adapter.requestDevice();
      device.addEventListener('uncapturederror', event => validationErrors.push(event.error.message));
      const createTexture = device.createTexture.bind(device);
      device.createTexture = descriptor => {
        const texture = createTexture(descriptor);
        if (descriptor.label === 'written-sampled-texture') written.push(texture);
        if (descriptor.label === 'unchanged-sampled-texture') unchanged.push(texture);
        return texture;
      };
      host = createRemoteWebGpuHost({ device, context: canvas.getContext('webgpu'), canvas, port, requestFrame: () => 1, cancelFrame() {} });
    } else if (op === 'present') {
      host.present();
    } else if (op === 'inspect') {
      const { stagedOperations, activeSequence, pendingSequence, textureForks, textureForkMipLevels, textureForkLastResource, bindingForks, resources, failed, errors } = host.inspect();
      result = { stagedOperations, activeSequence, pendingSequence, textureForks, textureForkMipLevels, textureForkLastResource, bindingForks, resources, failed, errors, validationErrors };
    } else if (op === 'read') {
      result = { written: await Promise.all(written.map(texels)), unchanged: await Promise.all(unchanged.map(texels)) };
    } else if (op === 'dispose') {
      await host.dispose();
      device.destroy();
    }
    self.postMessage({ id, result });
  } catch (error) { self.postMessage({ id, error: String(error.stack ?? error) }); }
};
