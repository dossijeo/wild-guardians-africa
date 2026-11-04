import { createRequire } from 'node:module';
import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

const ids = process.argv.slice(2);
if (!ids.length) throw Error('Usage: node check_vertex_detail_atlas.mjs <asset-id> [asset-id ...]');
const manifest = JSON.parse(await readFile('public/qa/vertex-color-preview/manifest.json', 'utf8'));
const assets = ids.map(id => { const entry = manifest.assets.find(value => value.id === id); if (!entry) throw Error(`Unknown asset ${id}`); return { id, url: id === 'guardian' ? '/content/guardian/' + 'guardian.glb' : '/assets/' + entry.sourceSha256 + '.glb' }; });
const { chromium } = createRequire(import.meta.url)(process.env.PLAYWRIGHT_MODULE ?? 'playwright');
const browser = await chromium.launch({ channel: 'msedge', headless: true });
try {
  const page = await browser.newPage({ viewport: { width: 1000, height: 1600 } }), errors = [];
  page.on('pageerror', error => errors.push(String(error)));
  page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
  page.on('requestfailed', request => errors.push(`${request.url()}: ${request.failure()?.errorText}`));
  await page.route('**/detail-atlas-page', route => route.fulfill({ status: 200, contentType: 'text/html', body: '<!doctype html><body></body>' }));
  await page.route('**/detail-preview/*.glb', async route => {
    const id = new URL(route.request().url()).pathname.split('/').pop().replace(/\.glb$/, '');
    if (!ids.includes(id)) throw Error('Unknown preview');
    await route.fulfill({ status: 200, contentType: 'model/gltf-binary', body: await readFile(join(process.env.TEMP, `wg-${id}-preview.glb`)) });
  });
  await page.goto(`${process.env.WG_BASE_URL ?? 'http://127.0.0.1:5175'}/detail-atlas-page`);
  const result = await page.evaluate(async ({ assets, tileSize }) => {
    const THREE = await import('/node_modules/three/build/three.module.js');
    const { GLTFLoader } = await import('/node_modules/three/examples/jsm/loaders/GLTFLoader.js');
    const { buildDetailAtlas } = await import('/tests/browser/vertex-detail-atlas.js');
    const loader = new GLTFLoader(), models = [];
    for (const asset of assets) models.push({ id: asset.id, original: await loader.loadAsync(asset.url), preview: await loader.loadAsync(`/detail-preview/${asset.id}.glb`) });
    const renderer = new THREE.WebGLRenderer({ antialias: false }); renderer.setSize(256, 256); renderer.outputColorSpace = THREE.SRGBColorSpace; renderer.toneMapping = THREE.NoToneMapping;
    const detail = buildDetailAtlas(renderer, models, { tileSize }), scene = new THREE.Scene(); scene.background = new THREE.Color(0x777777);
    scene.add(new THREE.HemisphereLight(0xe7f0e7, 0x70624e, 2)); const sun = new THREE.DirectionalLight(0xfff0d4, 3); sun.position.set(-6, 12, 9); scene.add(sun);
    const target = new THREE.WebGLRenderTarget(256, 256); target.texture.colorSpace = THREE.SRGBColorSpace; renderer.setRenderTarget(target);
    const stats = [];
    for (const model of models) {
      scene.add(model.original.scene); const box = new THREE.Box3().setFromObject(model.original.scene), center = box.getCenter(new THREE.Vector3()), size = box.getSize(new THREE.Vector3()), radius = Math.max(size.x, size.y, size.z, .01);
      const camera = new THREE.PerspectiveCamera(35, 1, radius / 1000, radius * 20);
      function render() { renderer.render(scene, camera); const pixels = new Uint8Array(256 * 256 * 4); renderer.readRenderTargetPixels(target, 0, 0, 256, 256, pixels); return pixels; }
      for (const [view, direction] of [[1.5, 1, 2.5], [-2.5, 1, 1.5]].entries()) {
        camera.position.copy(center).add(new THREE.Vector3(...direction).normalize().multiplyScalar(radius * 2.5)); camera.lookAt(center);
        const original = render(); scene.remove(model.original.scene); scene.add(model.preview.scene); const atlas = render();
        const saved = detail.atlas.image.data.slice(); detail.atlas.image.data.fill(128); detail.atlas.needsUpdate = true; const vertex = render(); detail.atlas.image.data.set(saved); detail.atlas.needsUpdate = true;
        scene.remove(model.preview.scene); scene.add(model.original.scene);
        let count = 0, total = 0, vertexTotal = 0, over = 0; for (let i = 0; i < original.length; i += 4) { if (original[i] === original[0] && original[i + 1] === original[1] && original[i + 2] === original[2]) continue; count++; let local = 0; for (let c = 0; c < 3; c++) { const d = Math.abs(original[i + c] - atlas[i + c]); total += d; vertexTotal += Math.abs(original[i + c] - vertex[i + c]); local = Math.max(local, d); } if (local > 20) over++; }
        stats.push({ id: model.id, view, foregroundPixels: count, meanAbsoluteRgb: total / (count * 3), vertexMeanAbsoluteRgb: vertexTotal / (count * 3), fractionOver20: over / count });
        const canvas = document.createElement('canvas'); canvas.width = 512; canvas.height = 256; const ctx = canvas.getContext('2d');
        for (const [j, bytes] of [original, atlas].entries()) { const flipped = new Uint8ClampedArray(bytes.length); for (let row = 0; row < 256; row++) flipped.set(bytes.subarray(row * 1024, (row + 1) * 1024), (255 - row) * 1024); ctx.putImageData(new ImageData(flipped, 256, 256), j * 256, 0); }
        document.body.append(`${model.id} vista ${view} (original / atlas)`, canvas, document.createElement('br'));
      }
      scene.remove(model.original.scene);
    }
    const gl = renderer.getContext(), debug = gl.getExtension('WEBGL_debug_renderer_info');
    return { atlas: { width: detail.width, height: detail.height, bytes: detail.bytes, primitives: detail.primitives, tileSize: detail.tileSize }, stats, renderer: debug ? gl.getParameter(debug.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER) };
  }, { assets, tileSize: Number(process.env.WG_TILE_SIZE ?? 256) });
  if (errors.length || result.stats.length !== assets.length * 2 || result.stats.some(value => !Number.isFinite(value.meanAbsoluteRgb) || value.foregroundPixels < 100)) throw Error(JSON.stringify({ errors, result }));
  if (process.env.WG_SCREENSHOT) await page.screenshot({ path: process.env.WG_SCREENSHOT, fullPage: true });
  if (process.env.WG_OUTPUT) await writeFile(process.env.WG_OUTPUT, JSON.stringify(result, null, 2));
  console.log(JSON.stringify(result));
} finally { await browser.close(); }
