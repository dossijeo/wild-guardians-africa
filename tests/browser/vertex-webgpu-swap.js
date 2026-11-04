import * as THREE from 'three';
import { WebGPURenderer } from 'three/webgpu';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { prepareHydration } from './vertex-preview-hydrate.js';

// Isolated request-time preparation. The old material remains visible while
// compileAsync is pending. This does not promise asynchronous texture upload.
export async function runVertexWebGpuSwap({ mode, frames = 180 }) {
  if (!['async', 'direct'].includes(mode)) throw Error('Unknown mode');
  const loader = new GLTFLoader(), preview = await loader.loadAsync('/hydration-files/preview.glb');
  const renderer = new WebGPURenderer({ antialias: false }); await renderer.init();
  if (!renderer.backend?.isWebGPUBackend) throw Error('WebGPU backend unavailable');
  renderer.setSize(512, 512); document.body.replaceChildren(renderer.domElement);
  const device = renderer.backend.device, adapter = await navigator.gpu.requestAdapter();
  const info = adapter?.info ?? {};
  const gpuCalls = [];
  function instrument(target, name) {
    const original = target[name].bind(target);
    target[name] = (...args) => {
      const start = performance.now(), result = original(...args), elapsed = performance.now() - start;
      gpuCalls.push({ name, at: start, cpuMs: elapsed });
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
  const intervals = [], renderCpu = [], events = {}, start = performance.now();
  let frame = 0, previous = 0, ready = false, applied = false, failure = null, apply;
  const errors = []; device.addEventListener('uncapturederror', e => errors.push(e.error.message));
  function request() {
    events.requestedAt = performance.now() - start;
    Promise.all([loader.loadAsync('/hydration-files/materials.gltf'), fetch('/hydration-files/mapping.json').then(r => r.json())])
      .then(async ([materials, mapping]) => {
        events.materialManifestAt = performance.now() - start;
        apply = await prepareHydration(preview, materials, mapping);
        events.materialsReadyAt = performance.now() - start;
        if (mode === 'async') {
          const saved = [];
          preview.scene.traverse(object => { if (object.isMesh) saved.push({ object, material: object.material, color: object.geometry.getAttribute('color') }); });
          events.compileStart = performance.now() - start;
          let pending;
          try { apply(); pending = renderer.compileAsync(preview.scene, camera, scene); }
          finally { for (const item of saved) { item.object.material = item.material; if (item.color) item.object.geometry.setAttribute('color', item.color); else item.object.geometry.deleteAttribute('color'); } }
          events.compileReturned = performance.now() - start;
          await pending; events.compileResolved = performance.now() - start;
        }
        ready = true; events.readyAt = performance.now() - start;
      }).catch(error => { failure = String(error?.stack ?? error); });
  }
  return await new Promise((resolve, reject) => {
    function tick(now) {
      if (failure || errors.length) return reject(Error(JSON.stringify({ failure, errors })));
      if (previous) { intervals.push({ frame, ms: now - previous }); mixer.update(Math.min((now - previous) / 1000, .1)); } previous = now;
      if (frame === 30) request();
      if (ready && !applied) { events.applyFrame = frame; events.applyAt = performance.now() - start; const t = performance.now(); apply(); events.applyCpuMs = performance.now() - t; applied = true; }
      const t = performance.now(); renderer.render(scene, camera); renderCpu.push({ frame, ms: performance.now() - t });
      frame++;
      if (frame < frames || (!applied && frame < 1200)) requestAnimationFrame(tick);
      else {
        if (!applied) return reject(Error('Timed out waiting for materials'));
        if (mode === 'async' && !(events.applyAt >= events.compileResolved)) return reject(Error('Material applied before compile resolved'));
        resolve({ mode, backend: 'WebGPU', adapter: { vendor: info.vendor, architecture: info.architecture, device: info.device, description: info.description }, intervals, renderCpu, events, errors, gpuCalls: gpuCalls.map(call => ({ ...call, at: call.at - start })) });
        renderer.dispose();
      }
    }
    requestAnimationFrame(tick);
  });
}
