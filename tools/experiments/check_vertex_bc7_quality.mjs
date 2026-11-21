import { createRequire } from 'node:module';
import { readFile, writeFile } from 'node:fs/promises';
import { basename, join } from 'node:path';

const [root, previewPath] = process.argv.slice(2);
if (!root || !previewPath) throw Error('Usage: node check_vertex_bc7_quality.mjs <pilot-root> <preview.glb>');
const { chromium } = createRequire(import.meta.url)(process.env.PLAYWRIGHT_MODULE ?? 'playwright');
const browser = await chromium.launch({ channel: 'msedge', headless: true });
try {
  const page = await browser.newPage({ viewport: { width: 1000, height: 1500 } }), errors = [];
  page.on('pageerror', error => errors.push(String(error)));
  page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
  page.on('requestfailed', request => errors.push(`${request.url()}: ${request.failure()?.errorText}`));
  await page.route('**/bc7-page', route => route.fulfill({ status: 200, contentType: 'text/html', body: '<!doctype html><body></body>' }));
  await page.route('**/bc7-fixture/*/*', async route => {
    const parts = new URL(route.request().url()).pathname.split('/'), variant = parts.at(-2), name = basename(parts.at(-1));
    if (!['webp', 'bc7', 'common'].includes(variant) || !/^[\w.-]+$/.test(name)) throw Error('Invalid fixture path');
    const path = variant === 'common' ? previewPath : join(root, variant, name);
    const type = name.endsWith('.gltf') || name.endsWith('.json') ? 'application/json' : name.endsWith('.webp') ? 'image/webp' : 'application/octet-stream';
    await route.fulfill({ status: 200, contentType: type, body: await readFile(path) });
  });
  await page.goto(`${process.env.WG_BASE_URL ?? 'http://127.0.0.1:5175'}/bc7-page`);
  const result = await page.evaluate(async ({ beastToon, beastShadow, animated }) => {
    const { THREE, WebGPURenderer, GLTFLoader, MeshoptDecoder, KTX2Loader, shadow } = await import('/tests/browser/vertex-three-runtime.js');
    const { makeStableVertexMaterials } = await import('/tests/browser/vertex-stable-material.js');
    const { createBeastToonOutput, prepareWebGpuFurAttribute } = await import('/tests/browser/vertex-beast-toon.js');
    if (beastShadow && !beastToon) throw Error('Shadow candidate requires beast toon');
    const renderer = new WebGPURenderer({ antialias: false }); await renderer.init();
    if (!renderer.backend?.isWebGPUBackend || !renderer.hasFeature('texture-compression-bc')) throw Error('Native BC7 WebGPU required');
    renderer.setSize(384, 384, false); renderer.outputColorSpace = THREE.SRGBColorSpace; renderer.toneMapping = THREE.NoToneMapping;
    const sun = new THREE.DirectionalLight(0xfff0d4, 3); sun.position.set(-6, 12, 9);
    if (beastShadow) { renderer.shadowMap.enabled = true; sun.castShadow = true; sun.shadow.mapSize.set(1024, 1024); }
    const visibility = beastShadow ? shadow(sun).r : null, toon = beastToon ? createBeastToonOutput({ visibility }) : null;
    const furToon = toon ? createBeastToonOutput({ fur: true, night: toon.night, sun: toon.sun, visibility }) : null;
    const device = renderer.backend.device, failures = []; device.addEventListener('uncapturederror', e => failures.push(e.error.message)); device.pushErrorScope('validation');
    const ktx = new KTX2Loader().setTranscoderPath('/node_modules/three/examples/jsm/libs/basis/').detectSupport(renderer);
    const loader = new GLTFLoader().setMeshoptDecoder(MeshoptDecoder); loader.register(parser => ({ name: 'WG_native_ktx2', loadTexture(index) { const ext = parser.json.textures[index].extensions?.WG_native_ktx2; return ext ? parser.loadTextureImage(index, ext.source, ktx) : null; } }));
    const preview = await loader.loadAsync('/bc7-fixture/common/preview.glb'), mapping = await (await fetch('/bc7-fixture/webp/mapping.json')).json(), assignments = [];
    for (const variant of ['webp', 'bc7']) {
      const materials = await loader.loadAsync(`/bc7-fixture/${variant}/materials.gltf`), stable = await makeStableVertexMaterials(renderer, preview, materials, mapping, { toonOutput: toon ? object => prepareWebGpuFurAttribute(object) ? furToon.output : toon.output : null });
      const textures = await stable.resolveFinal(materials); stable.apply();
      if (variant === 'bc7' && textures.some(texture => !texture.isCompressedTexture)) throw Error('Expected compressed textures');
      const bindings = []; preview.scene.traverse(object => { if (object.isMesh) bindings.push({ object, material: object.material }); }); assignments.push(bindings);
    }
    const scene = new THREE.Scene(); scene.background = new THREE.Color(0x777777); scene.add(new THREE.HemisphereLight(0xe7f0e7, 0x70624e, 2)); scene.add(sun); scene.add(preview.scene);
    if (animated) { const mixer = new THREE.AnimationMixer(preview.scene), clip = preview.animations[0]; if (!clip) throw Error('Missing animation'); mixer.clipAction(clip).play(); mixer.setTime(.37); preview.scene.updateMatrixWorld(true); }
    const box = new THREE.Box3().setFromObject(preview.scene), center = box.getCenter(new THREE.Vector3()), size = box.getSize(new THREE.Vector3()), radius = Math.max(size.x, size.y, size.z, .01), camera = new THREE.PerspectiveCamera(35, 1, radius / 1000, radius * 20);
    let blocker;
    if (beastShadow) { Object.assign(sun.shadow.camera, { left: -radius * 2, right: radius * 2, top: radius * 2, bottom: -radius * 2, near: .01, far: 50 }); sun.shadow.camera.layers.enable(1); sun.shadow.camera.updateProjectionMatrix(); preview.scene.traverse(object => { if (object.isMesh) object.receiveShadow = true; }); blocker = new THREE.Mesh(new THREE.BoxGeometry(radius * .42, radius * .42, radius * .42), new THREE.MeshStandardMaterial({ color: 0x4b4a44 })); blocker.position.copy(center).add(sun.position.clone().normalize().multiplyScalar(radius * .8)); blocker.layers.set(1); blocker.castShadow = true; scene.add(blocker); }
    const target = new THREE.RenderTarget(384, 384, { depthBuffer: true }); target.texture.colorSpace = THREE.SRGBColorSpace; renderer.setRenderTarget(target); const stats = [];
    for (const [view, direction] of [[1.5, 1, 2.5], [-2.5, 1, 1.5]].entries()) {
      camera.position.copy(center).add(new THREE.Vector3(...direction).normalize().multiplyScalar(radius * 2.5)); camera.lookAt(center); camera.updateMatrixWorld(true);
      const pixels = []; for (const bindings of assignments) { for (const b of bindings) b.object.material = b.material; renderer._nodes.nodeFrame.update(); renderer.render(scene, camera); pixels.push(Uint8Array.from(await renderer.readRenderTargetPixelsAsync(target, 0, 0, 384, 384))); }
      const background = (383 * 384 + 383) * 4;
      let count = 0, total = 0, over = 0, max = 0; for (let i = 0; i < pixels[0].length; i += 4) { if (pixels[0][i] === pixels[0][background] && pixels[0][i + 1] === pixels[0][background + 1] && pixels[0][i + 2] === pixels[0][background + 2]) continue; count++; let local = 0; for (let c = 0; c < 3; c++) { const d = Math.abs(pixels[0][i+c] - pixels[1][i+c]); total += d; local = Math.max(local, d); max = Math.max(max, d); } if (local > 20) over++; }
      let shadowAffectedPixels = null;
      if (beastShadow) {
        for (const b of assignments[0]) b.object.material = b.material;
        blocker.castShadow = false; sun.shadow.needsUpdate = true; renderer._nodes.nodeFrame.update(); renderer.render(scene, camera); const unshadowed = Uint8Array.from(await renderer.readRenderTargetPixelsAsync(target, 0, 0, 384, 384)); blocker.castShadow = true; sun.shadow.needsUpdate = true;
        shadowAffectedPixels = 0; for (let i = 0; i < unshadowed.length; i += 4) if (Math.max(Math.abs(pixels[0][i]-unshadowed[i]), Math.abs(pixels[0][i+1]-unshadowed[i+1]), Math.abs(pixels[0][i+2]-unshadowed[i+2])) > 3) shadowAffectedPixels++;
      }
      stats.push({ view, foregroundPixels: count, meanAbsoluteRgb: total / (3 * count), fractionOver20: over / count, max, shadowAffectedPixels });
      const canvas = document.createElement('canvas'); canvas.width = 768; canvas.height = 384; const ctx = canvas.getContext('2d'); for (const [i, bytes] of pixels.entries()) ctx.putImageData(new ImageData(new Uint8ClampedArray(bytes), 384, 384), i * 384, 0); document.body.append(`WebP / BC7: vista ${view}`, canvas, document.createElement('br'));
    }
    await device.queue.onSubmittedWorkDone(); const error = await device.popErrorScope(); if (error) failures.push(error.message);
    const transcoders = performance.getEntriesByType('resource').filter(entry => /basis_transcoder\.(js|wasm)/.test(entry.name)).map(entry => entry.name);
    ktx.dispose(); renderer.dispose(); return { backend: 'WebGPU', beastToon, beastShadow, animated, stats, failures, transcoders };
  }, { beastToon: process.env.WG_BEAST_TOON === '1', beastShadow: process.env.WG_BEAST_SHADOW === '1', animated: process.env.WG_ANIMATED === '1' });
  if (errors.length || result.failures.length || result.transcoders.length || result.stats.some(x => x.foregroundPixels < 100 || !Number.isFinite(x.meanAbsoluteRgb))) throw Error(JSON.stringify({ errors, result }));
  if (result.beastShadow && result.stats.every(x => !x.shadowAffectedPixels)) throw Error('Shadow control did not affect either view');
  if (process.env.WG_OUTPUT) await writeFile(process.env.WG_OUTPUT, JSON.stringify(result, null, 2));
  if (process.env.WG_SCREENSHOT) await page.screenshot({ path: process.env.WG_SCREENSHOT, fullPage: true });
  console.log(JSON.stringify(result));
} finally { await browser.close(); }
