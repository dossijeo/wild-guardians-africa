import * as THREE from 'three';
import { WebGPURenderer } from 'three/webgpu';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { prepareHydration } from './vertex-preview-hydrate.js';
import { makeStableVertexMaterials } from './vertex-stable-material.js';

// Isolated request-time preparation. The old material remains visible while
// compileAsync is pending. This does not promise asynchronous texture upload.
export async function runVertexWebGpuSwap({ mode, frames = 180, captureShaders = false, canvas = null, nativeBc7 = false }) {
  if (!['async', 'target', 'coverage', 'whole', 'sequential', 'staged', 'stable', 'direct'].includes(mode)) throw Error('Unknown mode');
  const loader = new GLTFLoader(), preview = await loader.loadAsync('/hydration-files/preview.glb');
  const renderer = new WebGPURenderer({ antialias: false, ...(canvas ? { canvas } : {}) }); await renderer.init();
  if (!renderer.backend?.isWebGPUBackend) throw Error('WebGPU backend unavailable');
  renderer.setSize(512, 512, false); if (!canvas) document.body.replaceChildren(renderer.domElement);
  let ktxLoader = null;
  if (nativeBc7) {
    if (!renderer.hasFeature('texture-compression-bc')) throw Error('Native BC7 unavailable on this device');
    const { KTX2Loader } = await import('three/addons/loaders/KTX2Loader.js');
    ktxLoader = new KTX2Loader().setTranscoderPath('/node_modules/three/examples/jsm/libs/basis/').detectSupport(renderer);
    loader.register(parser => ({ name: 'WG_native_ktx2', loadTexture(index) { const ext = parser.json.textures[index].extensions?.WG_native_ktx2; return ext ? parser.loadTextureImage(index, ext.source, ktxLoader) : null; } }));
  }
  let stableResources = null;
  if (mode === 'stable') {
    const [metadata, mapping] = await Promise.all([fetch('/hydration-files/materials.gltf').then(r => r.json()), fetch('/hydration-files/mapping.json').then(r => r.json())]);
    // Metadata and a one-pixel in-memory stand-in establish the final material
    // structure without downloading the final images before the first frame.
    const pixel = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAACXBIWXMAAAPoAAAD6AG1e1JrAAAADUlEQVQImWP4////fwAJ+wP9CNHoHgAAAABJRU5ErkJggg==';
    metadata.images = metadata.images.map(image => ({ ...image, uri: pixel }));
    if (nativeBc7) {
      for (const entry of metadata.textures) { const ext = entry.extensions?.WG_native_ktx2; if (ext) { entry.source = ext.source; delete entry.extensions.WG_native_ktx2; } }
      metadata.extensionsUsed = (metadata.extensionsUsed ?? []).filter(name => name !== 'WG_native_ktx2');
      metadata.extensionsRequired = (metadata.extensionsRequired ?? []).filter(name => name !== 'WG_native_ktx2');
    }
    const placeholderMaterials = await loader.parseAsync(JSON.stringify(metadata), '/hydration-files/');
    stableResources = await makeStableVertexMaterials(renderer, preview, placeholderMaterials, mapping);
  }
  const device = renderer.backend.device, adapter = await navigator.gpu.requestAdapter();
  const info = adapter?.info ?? {};
  const gpuCalls = [], shaderCodes = new WeakMap();
  const createShader = device.createShaderModule.bind(device);
  device.createShaderModule = descriptor => {
    const module = createShader(descriptor); let hash = 2166136261;
    for (let i = 0; i < descriptor.code.length; i++) hash = Math.imul(hash ^ descriptor.code.charCodeAt(i), 16777619);
    shaderCodes.set(module, { hash: (hash >>> 0).toString(16), code: descriptor.code }); return module;
  };
  function instrument(target, name) {
    const original = target[name].bind(target);
    target[name] = (...args) => {
      const start = performance.now(), result = original(...args), elapsed = performance.now() - start;
      const descriptor = args[0];
      const vertex = name.includes('Pipeline') ? shaderCodes.get(descriptor.vertex?.module) : null, fragment = name.includes('Pipeline') ? shaderCodes.get(descriptor.fragment?.module) : null;
      gpuCalls.push({ name, at: start, cpuMs: elapsed, ...(name.includes('Pipeline') ? { label: descriptor.label ?? '', vertexShaderHash: vertex?.hash ?? null, fragmentShaderHash: fragment?.hash ?? null, ...(captureShaders ? { vertexShader: vertex?.code ?? null } : {}), topology: descriptor.primitive?.topology ?? '', colorFormats: descriptor.fragment?.targets?.map(target => target?.format) ?? [], depthFormat: descriptor.depthStencil?.format ?? null, sampleCount: descriptor.multisample?.count ?? 1, vertexBuffers: descriptor.vertex?.buffers?.map(buffer => ({ stride: buffer.arrayStride, step: buffer.stepMode, attributes: buffer.attributes?.map(a => ({ location: a.shaderLocation, format: a.format, offset: a.offset })) })) ?? [] } : {}) });
      return result;
    };
  }
  for (const name of ['createRenderPipeline', 'createRenderPipelineAsync']) instrument(device, name);
  for (const name of ['copyExternalImageToTexture', 'writeTexture']) instrument(device.queue, name);
  const scene = new THREE.Scene(); scene.background = new THREE.Color(0x777777); scene.add(preview.scene);
  scene.add(new THREE.HemisphereLight(0xe7f0e7, 0x70624e, 2));
  const sun = new THREE.DirectionalLight(0xfff0d4, 3); sun.position.set(-6, 12, 9); scene.add(sun);
  const box = new THREE.Box3().setFromObject(preview.scene), center = box.getCenter(new THREE.Vector3()), size = box.getSize(new THREE.Vector3());
  const radius = Math.max(size.x, size.y, size.z, .01), camera = new THREE.PerspectiveCamera(35, 1, radius / 1000, radius * 20);
  camera.position.copy(center).add(new THREE.Vector3(1.5, 1, 2.5).normalize().multiplyScalar(radius * 2.5)); camera.lookAt(center);
  const mixer = new THREE.AnimationMixer(preview.scene); if (preview.animations.length) mixer.clipAction(preview.animations[0]).play();
  const intervals = [], renderCpu = [], events = {}, start = performance.now(), absoluteStart = performance.timeOrigin + performance.now();
  let frame = 0, previous = 0, ready = false, applied = false, failure = null, apply;
  const provisional = []; preview.scene.traverse(object => { if (object.isMesh) provisional.push({ object, material: object.material }); });
  events.framesWhileCompiling = 0;
  const errors = []; device.addEventListener('uncapturederror', e => errors.push(e.error.message));
  function request() {
    events.requestedAt = performance.now() - start;
    if (mode === 'stable') {
      events.compileStart = performance.now() - start;
      (async () => {
        const materials = await loader.loadAsync('/hydration-files/materials.gltf');
        const textures = await stableResources.resolveFinal(materials);
        if (!textures.length) throw Error('No final textures were resolved');
        events.materialsReadyAt = performance.now() - start;
        events.textureCalls = [];
        for (const texture of textures) {
          await new Promise(requestAnimationFrame);
          const t = performance.now(); renderer.initTexture(texture);
          events.textureCalls.push({ cpuMs: performance.now() - t, width: texture.image?.width ?? null, height: texture.image?.height ?? null });
        }
        apply = () => stableResources.apply(); events.compileResolved = performance.now() - start; ready = true; events.readyAt = events.compileResolved;
      })().catch(error => { failure = String(error?.stack ?? error); });
      return;
    }
    Promise.all([loader.loadAsync('/hydration-files/materials.gltf'), fetch('/hydration-files/mapping.json').then(r => r.json())])
      .then(async ([materials, mapping]) => {
        events.materialManifestAt = performance.now() - start;
        apply = await prepareHydration(preview, materials, mapping);
        events.materialsReadyAt = performance.now() - start;
        if (mode !== 'direct') {
          const saved = [];
          preview.scene.traverse(object => { if (object.isMesh) saved.push({ object, material: object.material, color: object.geometry.getAttribute('color'), frustumCulled: object.frustumCulled, visible: object.visible }); });
          events.compileStart = performance.now() - start;
          events.compileCalls = [];
          function restore() {
            for (const item of saved) { item.object.material = item.material; item.object.visible = item.visible; item.object.frustumCulled = item.frustumCulled; if (item.color) item.object.geometry.setAttribute('color', item.color); else item.object.geometry.deleteAttribute('color'); }
          }
          if (mode === 'staged') {
            const textures = new Set();
            try { apply(); for (const item of saved) for (const value of Object.values(item.object.material)) if (value?.isTexture) textures.add(value); } finally { restore(); }
            events.textureCalls = [];
            for (const texture of textures) {
              await new Promise(requestAnimationFrame);
              const t = performance.now(); renderer.initTexture(texture);
              events.textureCalls.push({ cpuMs: performance.now() - t, width: texture.image?.width ?? null, height: texture.image?.height ?? null });
            }
          }
          const batches = mode === 'sequential' || mode === 'staged' ? saved : [null];
          for (const selected of batches) {
            if (mode === 'sequential' || mode === 'staged') await new Promise(requestAnimationFrame);
            let pending;
            const previousTarget = renderer.getRenderTarget(), callStart = performance.now();
            try {
              apply();
              if (mode === 'coverage' || mode === 'whole' || mode === 'sequential' || mode === 'staged') for (const item of saved) item.object.frustumCulled = false;
              if (selected) for (const item of saved) item.object.visible = item === selected && item.visible;
              if (mode === 'target' || mode === 'coverage' || mode === 'whole' || mode === 'sequential' || mode === 'staged') {
                if (typeof renderer._getFrameBufferTarget !== 'function') throw Error('No framebuffer matching support');
                const target = renderer._getFrameBufferTarget(); if (!target) throw Error('No intermediate framebuffer');
                renderer.setRenderTarget(target);
              }
              pending = mode === 'whole' || mode === 'sequential' || mode === 'staged' ? renderer.compileAsync(scene, camera) : renderer.compileAsync(preview.scene, camera, scene);
            } finally {
              renderer.setRenderTarget(previousTarget);
              restore();
            }
            events.compileCalls.push({ name: selected?.object.name ?? 'all', startedAt: callStart - start, cpuMs: performance.now() - callStart });
            await pending;
          }
          events.compileReturned = events.compileCalls[0].startedAt + events.compileCalls[0].cpuMs;
          events.compileResolved = performance.now() - start;
        }
        ready = true; events.readyAt = performance.now() - start;
      }).catch(error => { failure = String(error?.stack ?? error); });
  }
  return await new Promise((resolve, reject) => {
    function tick(now) {
      if (failure || errors.length) return reject(Error(JSON.stringify({ failure, errors })));
      if (previous) { intervals.push({ frame, ms: now - previous }); mixer.update(Math.min((now - previous) / 1000, .1)); } previous = now;
      if (frame === 30) request();
      if (events.compileStart !== undefined && events.compileResolved === undefined) {
        if (provisional.some(item => item.object.material !== item.material)) return reject(Error('Provisional material changed while compilation was pending'));
        events.framesWhileCompiling++;
      }
      if (ready && !applied) { events.applyFrame = frame; events.applyAt = performance.now() - start; const t = performance.now(); apply(); events.applyCpuMs = performance.now() - t; applied = true; }
      const t = performance.now(); renderer.render(scene, camera); renderCpu.push({ frame, ms: performance.now() - t });
      frame++;
      if (frame < frames || (!applied && frame < 1200)) requestAnimationFrame(tick);
      else {
        if (!applied) return reject(Error('Timed out waiting for materials'));
        if (mode !== 'direct' && !(events.applyAt >= events.compileResolved)) return reject(Error('Material applied before compile resolved'));
        const imageRequests = performance.getEntriesByType('resource').filter(entry => /\/hydration-files\/[^/]+\.(png|jpg|webp|ktx2)(?:\?|$)/i.test(entry.name)).map(entry => ({ name: entry.name, at: entry.startTime - start, duration: entry.duration }));
        if (mode === 'stable' && (!imageRequests.length || imageRequests.some(entry => entry.at < events.requestedAt))) return reject(Error('Final image request occurred before the on-demand request, or was not observed'));
        const transcoderRequests = performance.getEntriesByType('resource').filter(entry => /basis_transcoder\.(js|wasm)/.test(entry.name)).map(entry => entry.name);
        if (nativeBc7 && transcoderRequests.length) return reject(Error('Native BC7 unexpectedly loaded a Basis transcoder'));
        resolve({ mode, backend: 'WebGPU', nativeBc7, transcoderRequests, absoluteStart, adapter: { vendor: info.vendor, architecture: info.architecture, device: info.device, description: info.description }, intervals, renderCpu, events, errors, imageRequests, gpuCalls: gpuCalls.map(call => ({ ...call, at: call.at - start })) });
        ktxLoader?.dispose(); renderer.dispose();
      }
    }
    requestAnimationFrame(tick);
  });
}
