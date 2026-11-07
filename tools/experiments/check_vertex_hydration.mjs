import { createRequire } from 'node:module';
import { readFile } from 'node:fs/promises';
import { basename, join } from 'node:path';

const [id, directory, previewPath] = process.argv.slice(2);
if (!id || !directory || !previewPath) throw Error('Usage: node check_vertex_hydration.mjs <id> <materials-directory> <preview.glb>');
const manifest = JSON.parse(await readFile('public/qa/vertex-color-preview/manifest.json', 'utf8'));
const entry = manifest.assets.find(asset => asset.id === id);
if (!entry) throw Error('Unknown asset');
const { chromium } = createRequire(import.meta.url)(process.env.PLAYWRIGHT_MODULE ?? 'playwright');
const browser = await chromium.launch({ channel: 'msedge', headless: true });
try {
  const page = await browser.newPage({ viewport: { width: 768, height: 256 } });
  const errors = [];
  page.on('pageerror', error => errors.push(String(error)));
  page.on('requestfailed', request => errors.push(`${request.url()}: ${request.failure()?.errorText}`));
  await page.route('**/hydration-page', route => route.fulfill({ status: 200, contentType: 'text/html', body: '<!doctype html><body></body>' }));
  await page.route('**/hydration-files/*', async route => {
    const name = basename(new URL(route.request().url()).pathname);
    if (!/^[\w.-]+$/.test(name)) throw Error('Invalid file name');
    const path = name === 'preview.glb' ? previewPath : join(directory, name);
    const type = name.endsWith('.gltf') || name.endsWith('.json') ? 'application/json' : name.endsWith('.png') ? 'image/png' : name.endsWith('.jpg') ? 'image/jpeg' : 'application/octet-stream';
    await route.fulfill({ status: 200, contentType: type, body: await readFile(path) });
  });
  await page.goto(`${process.env.WG_BASE_URL ?? 'http://127.0.0.1:5175'}/hydration-page`);
  const sourceUrl = id === 'guardian' ? '/content/guardian/' + 'guardian.glb' : '/assets/' + entry.sourceSha256 + '.glb';
  const result = await page.evaluate(async sourceUrl => {
    const THREE = await import('/node_modules/three/build/three.module.js');
    const { GLTFLoader } = await import('/node_modules/three/examples/jsm/loaders/GLTFLoader.js');
    const { prepareHydration } = await import('/tests/browser/vertex-preview-hydrate.js');
    const loader = new GLTFLoader();
    const preview = await loader.loadAsync('/hydration-files/preview.glb');
    const geometry = []; preview.scene.traverse(o => { if (o.isMesh) geometry.push(o.geometry); });
    const scene = new THREE.Scene(); scene.background = new THREE.Color(0x777777); scene.add(preview.scene);
    scene.add(new THREE.HemisphereLight(0xe7f0e7, 0x70624e, 2));
    const sun = new THREE.DirectionalLight(0xfff0d4, 3); sun.position.set(-6, 12, 9); scene.add(sun);
    const box = new THREE.Box3().setFromObject(preview.scene), center = box.getCenter(new THREE.Vector3()), size = box.getSize(new THREE.Vector3());
    const radius = Math.max(size.x, size.y, size.z, .01), camera = new THREE.PerspectiveCamera(35, 1, radius / 1000, radius * 20);
    camera.position.copy(center).add(new THREE.Vector3(1.5, 1, 2.5).normalize().multiplyScalar(radius * 2.5)); camera.lookAt(center);
    const renderer = new THREE.WebGLRenderer({ antialias: false }); renderer.setSize(256, 256); renderer.outputColorSpace = THREE.SRGBColorSpace; renderer.toneMapping = THREE.NoToneMapping;
    const target = new THREE.WebGLRenderTarget(256, 256); target.texture.colorSpace = THREE.SRGBColorSpace; renderer.setRenderTarget(target);
    function pixels() { renderer.render(scene, camera); const data = new Uint8Array(256 * 256 * 4); renderer.readRenderTargetPixels(target, 0, 0, 256, 256, data); return data; }
    const provisional = pixels();
    const materialAsset = await loader.loadAsync('/hydration-files/materials.gltf');
    const mapping = await (await fetch('/hydration-files/mapping.json')).json();
    const apply = await prepareHydration(preview, materialAsset, mapping); apply();
    const hydrated = pixels();
    const after = []; preview.scene.traverse(o => { if (o.isMesh) after.push(o.geometry); });
    const sameGeometry = geometry.length === after.length && geometry.every((value, index) => value === after[index]);
    // The full original is loaded only as an independent reference for this test.
    const reference = await loader.loadAsync(sourceUrl); scene.remove(preview.scene); scene.add(reference.scene);
    const original = pixels();
    let foreground = 0, difference = 0, max = 0, changed = 0;
    for (let i = 0; i < original.length; i += 4) {
      if (original[i] === original[0] && original[i + 1] === original[1] && original[i + 2] === original[2]) continue;
      foreground++;
      for (let c = 0; c < 3; c++) { const delta = Math.abs(original[i + c] - hydrated[i + c]); difference += delta; max = Math.max(max, delta); if (provisional[i + c] !== hydrated[i + c]) changed++; }
    }
    const display = document.createElement('canvas'); display.width = 768; display.height = 256;
    const context = display.getContext('2d');
    // WebGL readback is bottom-up; flip rows for the saved comparison.
    for (const [index, bytes] of [provisional, hydrated, original].entries()) {
      const flipped = new Uint8ClampedArray(bytes.length);
      for (let row = 0; row < 256; row++) flipped.set(bytes.subarray(row * 1024, (row + 1) * 1024), (255 - row) * 1024);
      context.putImageData(new ImageData(flipped, 256, 256), index * 256, 0);
    }
    document.body.replaceChildren(display);
    return { sameGeometry, foreground, changedChannels: changed, meanAbsoluteRgb: difference / (foreground * 3), maxChannelDifference: max, meshes: geometry.length, animations: preview.animations.length };
  }, sourceUrl);
  if (errors.length || !result.sameGeometry || result.foreground < 100 || !result.changedChannels || result.meanAbsoluteRgb > 1) throw Error(JSON.stringify({ errors, result }));
  if (process.env.WG_SCREENSHOT) await page.screenshot({ path: process.env.WG_SCREENSHOT });
  console.log(JSON.stringify({ id, ...result }));
} finally { await browser.close(); }
