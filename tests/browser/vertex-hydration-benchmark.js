import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { prepareHydration } from './vertex-preview-hydrate.js';

// Isolated diagnostic, not a game performance benchmark.
export async function runHydrationBenchmark({ mode = 'hydrate', frames = 180, sourceUrl = '' } = {}) {
  const assetStart = performance.now();
  const loader = new GLTFLoader();
  const preview = await loader.loadAsync(mode === 'textured' ? sourceUrl : '/hydration-files/preview.glb');
  const assetLoadMs = performance.now() - assetStart;
  const scene = new THREE.Scene(); scene.background = new THREE.Color(0x777777); scene.add(preview.scene);
  scene.add(new THREE.HemisphereLight(0xe7f0e7, 0x70624e, 2));
  const sun = new THREE.DirectionalLight(0xfff0d4, 3); sun.position.set(-6, 12, 9); scene.add(sun);
  const box = new THREE.Box3().setFromObject(preview.scene), center = box.getCenter(new THREE.Vector3()), size = box.getSize(new THREE.Vector3());
  const radius = Math.max(size.x, size.y, size.z, .01), camera = new THREE.PerspectiveCamera(35, 1, radius / 1000, radius * 20);
  camera.position.copy(center).add(new THREE.Vector3(1.5, 1, 2.5).normalize().multiplyScalar(radius * 2.5)); camera.lookAt(center);
  const renderer = new THREE.WebGLRenderer({ antialias: true }); renderer.setSize(512, 512); document.body.replaceChildren(renderer.domElement);
  const gl = renderer.getContext(), debug = gl.getExtension('WEBGL_debug_renderer_info');
  const gpu = debug ? gl.getParameter(debug.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER);
  const timer = gl.getExtension('EXT_disjoint_timer_query_webgl2'), pendingQueries = [], gpuRender = [];
  const textures = new Set();
  preview.scene.traverse(object => { if (!object.isMesh) return; for (const material of Array.isArray(object.material) ? object.material : [object.material]) for (const value of Object.values(material)) if (value?.isTexture) textures.add(value); });
  const textureDimensions = [...textures].map(texture => ({ width: texture.image?.width ?? null, height: texture.image?.height ?? null, compressed: !!texture.isCompressedTexture, mipmaps: texture.generateMipmaps }));
  const mixer = new THREE.AnimationMixer(preview.scene);
  if (preview.animations.length) mixer.clipAction(preview.animations[0]).play();
  const intervals = [], cpuRender = [], events = {}, startTime = performance.now();
  let frame = 0, previous = 0, ready = null, failure = null, applied = false;
  function loadMaterials() {
    events.loadStarted = performance.now() - startTime;
    Promise.all([loader.loadAsync('/hydration-files/materials.gltf'), fetch('/hydration-files/mapping.json').then(r => r.json())])
      .then(async ([materials, mapping]) => {
        events.loadDecoded = performance.now() - startTime;
        ready = await prepareHydration(preview, materials, mapping);
        events.prepared = performance.now() - startTime;
      }).catch(error => { failure = String(error?.stack ?? error); });
  }
  return await new Promise((resolve, reject) => {
    function tick(now) {
      if (failure) return reject(Error(failure));
      if (previous) { intervals.push({ frame, ms: now - previous }); mixer.update(Math.min((now - previous) / 1000, .1)); }
      previous = now;
      if (frame === 30 && mode === 'hydrate') loadMaterials();
      if (ready && !applied) {
        events.applyFrame = frame; const t = performance.now(); ready(); events.applyCpuMs = performance.now() - t; applied = true;
      }
      while (pendingQueries.length && gl.getQueryParameter(pendingQueries[0].query, gl.QUERY_RESULT_AVAILABLE)) {
        const item = pendingQueries.shift();
        if (!gl.getParameter(timer.GPU_DISJOINT_EXT)) gpuRender.push({ frame: item.frame, ms: gl.getQueryParameter(item.query, gl.QUERY_RESULT) / 1e6 });
        gl.deleteQuery(item.query);
      }
      const query = timer && pendingQueries.length < 16 ? gl.createQuery() : null;
      if (query) gl.beginQuery(timer.TIME_ELAPSED_EXT, query);
      const t = performance.now(); renderer.render(scene, camera); cpuRender.push({ frame, ms: performance.now() - t });
      if (query) { gl.endQuery(timer.TIME_ELAPSED_EXT); pendingQueries.push({ frame, query }); }
      frame++;
      if (frame < frames || (mode === 'hydrate' && !applied && frame < 1200)) requestAnimationFrame(tick);
      else {
        const memory = { ...renderer.info.memory }, programs = renderer.info.programs.length;
        for (const item of pendingQueries) gl.deleteQuery(item.query);
        renderer.dispose();
        if (mode === 'hydrate' && !applied) return reject(Error('Materials did not load'));
        resolve({ mode, gpu, gpuTimerAvailable: !!timer, gpuRender, browser: navigator.userAgent, assetLoadMs, textureDimensions, intervals, cpuRender, events, memory, programs, durationMs: performance.now() - startTime });
      }
    }
    requestAnimationFrame(tick);
  });
}
