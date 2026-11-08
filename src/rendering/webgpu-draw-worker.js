import { createRemoteWebGpuHost } from './remote-webgpu-host.js';
import { createRemoteCameraState } from './remote-camera-state.js';

function numericProperties(object) {
  const result = {};
  for (let cursor = object; cursor && cursor !== Object.prototype; cursor = Object.getPrototypeOf(cursor)) {
    for (const key of Object.getOwnPropertyNames(cursor)) {
      try { if (typeof object[key] === 'number') result[key] = object[key]; } catch {}
    }
  }
  return result;
}

let host = null, initializing = false, hidden = false;
self.onmessage = async event => {
  if (event.data.type === 'visibility') {
    hidden = !!event.data.hidden; host?.setVisibility(hidden); return;
  }
  if (event.data.type !== 'init' || initializing) return;
  initializing = true; hidden = !!event.data.hidden;
  const { canvas, port } = event.data;
  try {
    if (!navigator.gpu) throw Error('Native WebGPU unavailable in draw Worker; fallback is not permitted');
    const adapter = await navigator.gpu.requestAdapter({ powerPreference: 'high-performance' });
    if (!adapter) throw Error('Native WebGPU adapter unavailable');
    const knownFeatures = ['depth-clip-control','depth32float-stencil8','texture-compression-bc','texture-compression-bc-sliced-3d','texture-compression-etc2','texture-compression-astc','texture-compression-astc-sliced-3d','timestamp-query','indirect-first-instance','shader-f16','rg11b10ufloat-renderable','bgra8unorm-storage','float32-filterable','float32-blendable','clip-distances','dual-source-blending'];
    const requiredLimits = {};
    for (const key of ['maxBufferSize', 'maxStorageBufferBindingSize', 'maxUniformBufferBindingSize', 'maxTextureDimension2D', 'maxTextureArrayLayers']) {
      if (Number.isFinite(adapter.limits[key])) requiredLimits[key] = adapter.limits[key];
    }
    const device = await adapter.requestDevice({ requiredFeatures: knownFeatures.filter(feature => adapter.features.has(feature)), requiredLimits });
    const context = canvas.getContext('webgpu');
    if (!context) throw Error('Native WebGPU canvas context unavailable');
    const info = adapter.info || {};
    const adapterInfo = { vendor: info.vendor, architecture: info.architecture, device: info.device, description: info.description };
    host = createRemoteWebGpuHost({ device, context, canvas, port, adapterInfo, hidden, cameraState: createRemoteCameraState({ mailbox: null }) });
    port.postMessage({ type: 'ready', capabilities: { features: Array.from(device.features), limits: numericProperties(device.limits), format: navigator.gpu.getPreferredCanvasFormat(), width: canvas.width, height: canvas.height, adapterInfo } });
  } catch (error) { port.postMessage({ type: 'error', error: error?.stack || String(error) }); }
};
