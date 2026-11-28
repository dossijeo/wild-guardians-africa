import { createRequire } from 'node:module';
import { readFile, writeFile } from 'node:fs/promises';
import { basename, join } from 'node:path';

const [id, directory, previewPath] = process.argv.slice(2);
if (!id || !directory || !previewPath) throw Error('Usage: node check_vertex_african_toon_gap.mjs <id> <materials-dir> <preview.glb>');
if (!['hyena', 'lion', 'warthog', 'buffalo', 'rhino'].includes(id)) throw Error('This control uses beast-specific lighting');
const manifest = JSON.parse(await readFile('public/qa/vertex-color-preview/manifest.json', 'utf8'));
const entry = manifest.assets.find(value => value.id === id); if (!entry) throw Error('Unknown asset');
const sourceUrl = '/assets/' + entry.sourceSha256 + '.glb';
const { chromium } = createRequire(import.meta.url)(process.env.PLAYWRIGHT_MODULE ?? 'playwright');
const browser = await chromium.launch({ channel: 'msedge', headless: true });
try {
  const page = await browser.newPage({ viewport: { width: 1000, height: 1500 } }), errors = [];
  page.on('pageerror', error => errors.push(String(error)));
  page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
  page.on('requestfailed', request => errors.push(`${request.url()}: ${request.failure()?.errorText}`));
  await page.route('**/toon-gap-page', route => route.fulfill({ status: 200, contentType: 'text/html', body: '<!doctype html><body></body>' }));
  await page.route('**/hydration-files/*', async route => {
    const name = basename(new URL(route.request().url()).pathname); if (!/^[\w.-]+$/.test(name)) throw Error('Invalid file name');
    const path = name === 'preview.glb' ? previewPath : join(directory, name);
    const type = name.endsWith('.gltf') || name.endsWith('.json') ? 'application/json' : name.endsWith('.png') ? 'image/png' : name.endsWith('.jpg') ? 'image/jpeg' : 'application/octet-stream';
    await route.fulfill({ status: 200, contentType: type, body: await readFile(path) });
  });
  await page.goto(`${process.env.WG_BASE_URL ?? 'http://127.0.0.1:5175'}/toon-gap-page`);
  const result = await page.evaluate(async ({ sourceUrl, id, candidate, animated, disableFur, shadows, gpuShadows }) => {
    if (gpuShadows && (!shadows || !candidate)) throw Error('GPU shadow control requires both reference shadows and the TSL candidate');
    const { THREE, WebGPURenderer, GLTFLoader, shadow } = await import('/tests/browser/vertex-three-runtime.js');
    const { AfricanToon } = await import('/src/rendering/african-toon.js');
    const { installNativeShadow } = await import('/src/rendering/native-shadow.js');
    const { makeStableVertexMaterials } = await import('/tests/browser/vertex-stable-material.js');
    const { createBeastToonOutput, prepareWebGpuFurAttribute } = await import('/tests/browser/vertex-beast-toon.js');
    const loader = new GLTFLoader(), preview = await loader.loadAsync('/hydration-files/preview.glb'), reference = await loader.loadAsync(sourceUrl);
    const materialAsset = await loader.loadAsync('/hydration-files/materials.gltf'), mapping = await (await fetch('/hydration-files/mapping.json')).json();
    const glRenderer = new THREE.WebGLRenderer({ antialias: false }), gpuRenderer = new WebGPURenderer({ antialias: false }); await gpuRenderer.init();
    if (!gpuRenderer.backend?.isWebGPUBackend) throw Error('WebGPU backend required');
    const failures = [], device = gpuRenderer.backend.device; device.addEventListener('uncapturederror', e => failures.push(e.error.message)); device.pushErrorScope('validation');
    for (const renderer of [glRenderer, gpuRenderer]) { renderer.setSize(384, 384, false); renderer.outputColorSpace = THREE.SRGBColorSpace; renderer.toneMapping = THREE.NoToneMapping; }
    const sun = new THREE.DirectionalLight(0xfff0d4, 3); sun.position.set(-6, 12, 9);
    const gpuSun = sun.clone(); gpuSun.visible = false;
    const stable = await makeStableVertexMaterials(gpuRenderer, preview, materialAsset, mapping); await stable.resolveFinal(materialAsset); stable.apply();
    const bindings = () => { const result = []; preview.scene.traverse(object => { if (object.isMesh) result.push({ object, material: object.material }); }); return result; };
    const standardBindings = bindings(); let toonBindings, candidateToon;
    if (candidate) {
      const visibility = gpuShadows ? shadow(gpuSun).r : null;
      candidateToon = createBeastToonOutput({ visibility });
      const furToon = createBeastToonOutput({ fur: true, night: candidateToon.night, sun: candidateToon.sun, visibility });
      const alternative = await makeStableVertexMaterials(gpuRenderer, preview, materialAsset, mapping, { toonOutput: object => !disableFur && id === 'buffalo' && prepareWebGpuFurAttribute(object) ? furToon.output : candidateToon.output }); await alternative.resolveFinal(materialAsset); alternative.apply(); toonBindings = bindings();
    }
    const scene = new THREE.Scene(); scene.background = new THREE.Color(0x777777); scene.add(new THREE.HemisphereLight(0xe7f0e7, 0x70624e, 2)); scene.add(sun); if (gpuShadows) scene.add(gpuSun);
    if (animated) {
      const refClip = reference.animations[0], previewClip = preview.animations.find(clip => clip.name === refClip?.name);
      if (!refClip || !previewClip) throw Error('Matching animation clip missing');
      for (const [root, clip] of [[reference.scene, refClip], [preview.scene, previewClip]]) { const mixer = new THREE.AnimationMixer(root); mixer.clipAction(clip).play(); mixer.setTime(.37); root.updateMatrixWorld(true); }
    }
    scene.add(reference.scene); const box = new THREE.Box3().setFromObject(reference.scene), center = box.getCenter(new THREE.Vector3()), size = box.getSize(new THREE.Vector3()), radius = Math.max(size.x, size.y, size.z, .01);
    let blocker;
    if (shadows) {
      glRenderer.shadowMap.enabled = true; sun.castShadow = true; sun.shadow.mapSize.set(1024, 1024);
      Object.assign(sun.shadow.camera, { left: -radius * 2, right: radius * 2, top: radius * 2, bottom: -radius * 2, near: .01, far: 50 }); sun.shadow.camera.updateProjectionMatrix();
      reference.scene.traverse(object => { if (object.isMesh) object.receiveShadow = true; });
      if (gpuShadows) { gpuRenderer.shadowMap.enabled = true; gpuSun.castShadow = true; gpuSun.shadow.mapSize.set(1024, 1024); Object.assign(gpuSun.shadow.camera, { left: -radius * 2, right: radius * 2, top: radius * 2, bottom: -radius * 2, near: .01, far: 50 }); gpuSun.shadow.camera.updateProjectionMatrix(); preview.scene.traverse(object => { if (object.isMesh) object.receiveShadow = true; }); }
      blocker = new THREE.Mesh(new THREE.BoxGeometry(radius * .42, radius * .42, radius * .42), new THREE.MeshStandardMaterial({ color: 0x4b4a44 }));
      blocker.position.copy(center).add(sun.position.clone().normalize().multiplyScalar(radius * .8)); blocker.castShadow = true; scene.add(blocker);
    }
    const camera = new THREE.PerspectiveCamera(35, 1, radius / 1000, radius * 20); camera.position.copy(center).add(new THREE.Vector3(1.5, 1, 2.5).normalize().multiplyScalar(radius * 2.5)); camera.lookAt(center); camera.updateMatrixWorld(true);
    const glTarget = new THREE.WebGLRenderTarget(384, 384), gpuTarget = new THREE.RenderTarget(384, 384, { depthBuffer: true }); glTarget.texture.colorSpace = gpuTarget.texture.colorSpace = THREE.SRGBColorSpace; glRenderer.setRenderTarget(glTarget); gpuRenderer.setRenderTarget(gpuTarget);
    const glPixels = () => { glRenderer.render(scene, camera); const pixels = new Uint8Array(384 * 384 * 4); glRenderer.readRenderTargetPixels(glTarget, 0, 0, 384, 384, pixels); const flipped = new Uint8Array(pixels.length), stride = 384 * 4; for (let row = 0; row < 384; row++) flipped.set(pixels.subarray(row * stride, (row + 1) * stride), (383 - row) * stride); return flipped; };
    const gpuPixels = async () => { gpuRenderer._nodes.nodeFrame.update(); gpuRenderer.render(scene, camera); return Uint8Array.from(await gpuRenderer.readRenderTargetPixelsAsync(gpuTarget, 0, 0, 384, 384)); };
    const toon = new AfricanToon({ visualSearch: '' }), cases = [];
    const releaseShadow = shadows ? installNativeShadow(glRenderer, sun, toon.shadowUniforms) : null;
    for (const style of ['standard-control', 'toon-day', 'toon-night']) {
      if (style === 'toon-day') reference.scene.traverse(object => { if (object.isMesh) { object.material.userData.beastSurface = true; object.material.userData.warthogSurface = id === 'warthog'; object.material.userData.furLightingMask = id === 'buffalo' && !!object.geometry.getAttribute('_fur_light'); toon.material(object.material); } });
      toon.update(style === 'toon-night' ? 1 : 0, sun, 'sabana');
      for (const binding of candidate && style !== 'standard-control' ? toonBindings : standardBindings) binding.object.material = binding.material;
      if (candidateToon) candidateToon.night.value = style === 'toon-night' ? 1 : 0;
      const original = glPixels(); scene.remove(reference.scene); scene.add(preview.scene); if (gpuShadows) { sun.visible = false; gpuSun.visible = true; } const stablePixels = await gpuPixels();
      let gpuShadowChangedPixels = null;
      if (shadows && gpuShadows && style === 'toon-day') {
        blocker.castShadow = false; gpuSun.shadow.needsUpdate = true; const noShadow = await gpuPixels(); blocker.castShadow = true; gpuSun.shadow.needsUpdate = true;
        gpuShadowChangedPixels = 0; for (let i = 0; i < stablePixels.length; i += 4) if (Math.max(Math.abs(stablePixels[i]-noShadow[i]), Math.abs(stablePixels[i+1]-noShadow[i+1]), Math.abs(stablePixels[i+2]-noShadow[i+2])) > 3) gpuShadowChangedPixels++;
      }
      if (gpuShadows) { sun.visible = true; gpuSun.visible = false; } scene.remove(preview.scene); scene.add(reference.scene);
      const backgroundIndex = (383 * 384 + 383) * 4;
      let foreground = 0, sum = 0, over = 0; for (let i = 0; i < original.length; i += 4) { if (original[i] === original[backgroundIndex] && original[i+1] === original[backgroundIndex+1] && original[i+2] === original[backgroundIndex+2]) continue; foreground++; let local = 0; for (let c = 0; c < 3; c++) { const d = Math.abs(original[i+c] - stablePixels[i+c]); sum += d; local = Math.max(local, d); } if (local > 20) over++; }
      let shadowChangedPixels = null;
      if (shadows && style === 'toon-day') {
        blocker.castShadow = false; sun.shadow.needsUpdate = true; const noShadow = glPixels(); blocker.castShadow = true; sun.shadow.needsUpdate = true;
        shadowChangedPixels = 0; for (let i = 0; i < original.length; i += 4) if (Math.max(Math.abs(original[i]-noShadow[i]), Math.abs(original[i+1]-noShadow[i+1]), Math.abs(original[i+2]-noShadow[i+2])) > 3) shadowChangedPixels++;
      }
      cases.push({ style, foreground, meanAbsoluteRgb: sum / (3 * foreground), fractionOver20: over / foreground, shadowChangedPixels, gpuShadowChangedPixels });
      const canvas = document.createElement('canvas'); canvas.width = 768; canvas.height = 384; const ctx = canvas.getContext('2d'); ctx.putImageData(new ImageData(new Uint8ClampedArray(original), 384, 384), 0, 0); ctx.putImageData(new ImageData(new Uint8ClampedArray(stablePixels), 384, 384), 384, 0); document.body.append(`${style}: WebGL / WebGPU`, canvas, document.createElement('br'));
    }
    await device.queue.onSubmittedWorkDone(); const validation = await device.popErrorScope(); if (validation) failures.push(validation.message);
    const glError = glRenderer.getContext().getError(); releaseShadow?.(); glRenderer.dispose(); gpuRenderer.dispose(); return { backend: 'WebGL2 vs WebGPU', id, candidate, animated, disableFur, shadows, gpuShadows, cases, failures, glError };
  }, { sourceUrl, id, candidate: process.env.WG_TOON_CANDIDATE === '1', animated: process.env.WG_ANIMATED === '1', disableFur: process.env.WG_DISABLE_FUR === '1', shadows: process.env.WG_SHADOWS === '1', gpuShadows: process.env.WG_GPU_SHADOWS === '1' });
  if (errors.length || result.failures.length || result.glError || result.cases.some(row => row.foreground < 100 || !Number.isFinite(row.meanAbsoluteRgb))) throw Error(JSON.stringify({ errors, result }));
  if (result.shadows && !result.cases.find(row => row.style === 'toon-day')?.shadowChangedPixels) throw Error('Shadow control was not detected in WebGL');
  if (result.gpuShadows && !result.cases.find(row => row.style === 'toon-day')?.gpuShadowChangedPixels) throw Error('Shadow control was not detected in WebGPU');
  if (process.env.WG_OUTPUT) await writeFile(process.env.WG_OUTPUT, JSON.stringify(result, null, 2));
  if (process.env.WG_SCREENSHOT) await page.screenshot({ path: process.env.WG_SCREENSHOT, fullPage: true });
  console.log(JSON.stringify(result));
} finally { await browser.close(); }
