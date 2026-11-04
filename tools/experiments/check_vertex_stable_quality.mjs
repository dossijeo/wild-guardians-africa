import { createRequire } from 'node:module';
import { readFile, writeFile } from 'node:fs/promises';
import { basename, join } from 'node:path';

const [id, directory, previewPath] = process.argv.slice(2);
if (!id || !directory || !previewPath) throw Error('Usage: node check_vertex_stable_quality.mjs <id> <materials-dir> <preview.glb>');
const manifest = JSON.parse(await readFile('public/qa/vertex-color-preview/manifest.json', 'utf8'));
const entry = manifest.assets.find(asset => asset.id === id); if (!entry) throw Error('Unknown asset');
const sourceUrl = id === 'guardian' ? '/content/guardian/' + 'guardian.glb' : '/assets/' + entry.sourceSha256 + '.glb';
const { chromium } = createRequire(import.meta.url)(process.env.PLAYWRIGHT_MODULE ?? 'playwright');
const browser = await chromium.launch({ channel: 'msedge', headless: true });
try {
  const page = await browser.newPage({ viewport: { width: 1000, height: 1500 } }), errors = [];
  page.on('pageerror', error => errors.push(String(error)));
  page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
  page.on('requestfailed', request => errors.push(`${request.url()}: ${request.failure()?.errorText}`));
  await page.route('**/hydration-page', route => route.fulfill({ status: 200, contentType: 'text/html', body: '<!doctype html><body></body>' }));
  await page.route('**/hydration-files/*', async route => {
    const name = basename(new URL(route.request().url()).pathname);
    if (!/^[\w.-]+$/.test(name)) throw Error('Invalid file');
    const file = name === 'preview.glb' ? previewPath : join(directory, name);
    const type = name.endsWith('.gltf') || name.endsWith('.json') ? 'application/json' : name.endsWith('.png') ? 'image/png' : name.endsWith('.jpg') ? 'image/jpeg' : 'application/octet-stream';
    await route.fulfill({ status: 200, contentType: type, body: await readFile(file) });
  });
  await page.goto(`${process.env.WG_BASE_URL ?? 'http://127.0.0.1:5175'}/hydration-page`);
  const result = await page.evaluate(async sourceUrl => {
    const THREE = await import('/node_modules/three/build/three.module.js');
    const { WebGPURenderer } = await import('/node_modules/three/build/three.webgpu.js');
    const { GLTFLoader } = await import('/node_modules/three/examples/jsm/loaders/GLTFLoader.js');
    const { makeStableVertexMaterials } = await import('/tests/browser/vertex-stable-material.js');
    const loader = new GLTFLoader(), preview = await loader.loadAsync('/hydration-files/preview.glb');
    const materialAsset = await loader.loadAsync('/hydration-files/materials.gltf'), mapping = await (await fetch('/hydration-files/mapping.json')).json();
    const reference = await loader.loadAsync(sourceUrl);
    const renderer = new WebGPURenderer({ antialias: false }); await renderer.init(); if (!renderer.backend?.isWebGPUBackend) throw Error('WebGPU required');
    const device = renderer.backend.device, failures = []; device.addEventListener('uncapturederror', e => failures.push(e.error.message)); device.pushErrorScope('validation');
    renderer.setSize(384, 384, false); renderer.outputColorSpace = THREE.SRGBColorSpace; renderer.toneMapping = THREE.NoToneMapping;
    const stable = await makeStableVertexMaterials(renderer, preview, materialAsset, mapping);
    await stable.resolveFinal(materialAsset);
    const scene = new THREE.Scene(); scene.background = new THREE.Color(0x777777); scene.add(new THREE.HemisphereLight(0xe7f0e7, 0x70624e, 2)); const sun = new THREE.DirectionalLight(0xfff0d4, 3); sun.position.set(-6, 12, 9); scene.add(sun);
    scene.add(reference.scene); const box = new THREE.Box3().setFromObject(reference.scene), center = box.getCenter(new THREE.Vector3()), size = box.getSize(new THREE.Vector3()), radius = Math.max(size.x, size.y, size.z, .01);
    const camera = new THREE.PerspectiveCamera(35, 1, radius / 1000, radius * 20), target = new THREE.RenderTarget(384, 384, { depthBuffer: true }); target.texture.colorSpace = THREE.SRGBColorSpace; renderer.setRenderTarget(target);
    const results = [];
    for (const [view, direction] of [[1.5, 1, 2.5], [-2.5, 1, 1.5]].entries()) {
      camera.position.copy(center).add(new THREE.Vector3(...direction).normalize().multiplyScalar(radius * 2.5)); camera.lookAt(center); camera.updateMatrixWorld(true);
      renderer._nodes.nodeFrame.update(); renderer.render(scene, camera); const original = Uint8Array.from(await renderer.readRenderTargetPixelsAsync(target, 0, 0, 384, 384));
      scene.remove(reference.scene); scene.add(preview.scene); stable.apply(); renderer._nodes.nodeFrame.update(); renderer.render(scene, camera); const result = Uint8Array.from(await renderer.readRenderTargetPixelsAsync(target, 0, 0, 384, 384));
      let count = 0, total = 0, over = 0, max = 0; for (let i = 0; i < original.length; i += 4) { if (original[i] === original[0] && original[i+1] === original[1] && original[i+2] === original[2]) continue; count++; let local = 0; for (let c = 0; c < 3; c++) { const d = Math.abs(original[i+c] - result[i+c]); total += d; local = Math.max(local, d); max = Math.max(max, d); } if (local > 20) over++; }
      results.push({ view, pixels: count, meanAbsoluteRgb: total / (3 * count), fractionOver20: over / count, max });
      const canvas = document.createElement('canvas'); canvas.width = 768; canvas.height = 384; const ctx = canvas.getContext('2d');
      ctx.putImageData(new ImageData(new Uint8ClampedArray(original), 384, 384), 0, 0); ctx.putImageData(new ImageData(new Uint8ClampedArray(result), 384, 384), 384, 0); document.body.append(`original / estable: vista ${view}`, canvas, document.createElement('br'));
      scene.remove(preview.scene); scene.add(reference.scene);
    }
    await device.queue.onSubmittedWorkDone(); const error = await device.popErrorScope(); if (error) failures.push(error.message); renderer.dispose();
    return { backend: 'WebGPU', results, failures };
  }, sourceUrl);
  if (errors.length || result.failures.length || result.results.some(x => x.pixels < 100)) throw Error(JSON.stringify({ errors, result }));
  if (process.env.WG_OUTPUT) await writeFile(process.env.WG_OUTPUT, JSON.stringify(result, null, 2));
  if (process.env.WG_SCREENSHOT) await page.screenshot({ path: process.env.WG_SCREENSHOT, fullPage: true });
  console.log(JSON.stringify(result));
} finally { await browser.close(); }
