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
  const result = await page.evaluate(async ({ sourceUrl, animated, shadows, isolate, nativeColor }) => {
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
    const stable = await makeStableVertexMaterials(renderer, preview, materialAsset, mapping, { nativeColor });
    await stable.resolveFinal(materialAsset);
    const scene = new THREE.Scene(); scene.background = new THREE.Color(0x777777); scene.add(new THREE.HemisphereLight(0xe7f0e7, 0x70624e, 2)); const sun = new THREE.DirectionalLight(0xfff0d4, 3); sun.position.set(-6, 12, 9); scene.add(sun);
    scene.add(reference.scene); const box = new THREE.Box3().setFromObject(reference.scene), center = box.getCenter(new THREE.Vector3()), size = box.getSize(new THREE.Vector3()), radius = Math.max(size.x, size.y, size.z, .01);
    if (shadows) {
      renderer.shadowMap.enabled = true; sun.castShadow = true; sun.shadow.mapSize.set(1024, 1024);
      Object.assign(sun.shadow.camera, { left: -radius * 2, right: radius * 2, top: radius * 2, bottom: -radius * 2, near: .01, far: 50 });
      for (const root of [reference.scene, preview.scene]) root.traverse(object => { if (object.isMesh) object.castShadow = true; });
      const floor = new THREE.Mesh(new THREE.PlaneGeometry(radius * 8, radius * 8), new THREE.MeshStandardMaterial({ color: 0x777777, roughness: 1 }));
      floor.rotation.x = -Math.PI / 2; floor.position.y = box.min.y - .01; floor.receiveShadow = true; scene.add(floor);
    }
    const mixers = [reference, preview].map(asset => { const mixer = new THREE.AnimationMixer(asset.scene); const clip = asset.animations[0]; if (animated && !clip) throw Error('Animation missing'); if (animated) mixer.clipAction(clip).play(); return mixer; });
    const camera = new THREE.PerspectiveCamera(35, 1, radius / 1000, radius * 20), target = new THREE.RenderTarget(384, 384, { depthBuffer: true }); target.texture.colorSpace = THREE.SRGBColorSpace; renderer.setRenderTarget(target);
    const results = [];
    const views = animated ? [[1.5, 1, 2.5, 0], [-2.5, 1, 1.5, .37], [1.5, 1, 2.5, .83]] : [[1.5, 1, 2.5, 0], [-2.5, 1, 1.5, 0]];
    for (const [view, [x, y, z, time]] of views.entries()) {
      for (const mixer of mixers) mixer.setTime(time);
      const direction = [x, y, z];
      camera.position.copy(center).add(new THREE.Vector3(...direction).normalize().multiplyScalar(radius * 2.5)); camera.lookAt(center); camera.updateMatrixWorld(true);
      scene.remove(reference.scene); renderer._nodes.nodeFrame.update(); renderer.render(scene, camera); const background = Uint8Array.from(await renderer.readRenderTargetPixelsAsync(target, 0, 0, 384, 384)); scene.add(reference.scene);
      renderer._nodes.nodeFrame.update(); renderer.render(scene, camera); const original = Uint8Array.from(await renderer.readRenderTargetPixelsAsync(target, 0, 0, 384, 384));
      scene.remove(reference.scene); scene.add(preview.scene); stable.apply(); renderer._nodes.nodeFrame.update(); renderer.render(scene, camera); const result = Uint8Array.from(await renderer.readRenderTargetPixelsAsync(target, 0, 0, 384, 384));
      let count = 0, total = 0, over = 0, max = 0; for (let i = 0; i < original.length; i += 4) { if (original[i] === background[i] && original[i+1] === background[i+1] && original[i+2] === background[i+2]) continue; count++; let local = 0; for (let c = 0; c < 3; c++) { const d = Math.abs(original[i+c] - result[i+c]); total += d; local = Math.max(local, d); max = Math.max(max, d); } if (local > 20) over++; }
      results.push({ view, time, pixels: count, meanAbsoluteRgb: total / (3 * count), fractionOver20: over / count, max });
      const canvas = document.createElement('canvas'); canvas.width = 768; canvas.height = 384; const ctx = canvas.getContext('2d');
      ctx.putImageData(new ImageData(new Uint8ClampedArray(original), 384, 384), 0, 0); ctx.putImageData(new ImageData(new Uint8ClampedArray(result), 384, 384), 384, 0); document.body.append(`original / estable: vista ${view}`, canvas, document.createElement('br'));
      scene.remove(preview.scene); scene.add(reference.scene);
    }
    const isolated = [], materialAudit = [];
    if (nativeColor) {
      const originals = new Map(); reference.scene.traverse(object => { const a = reference.parser.associations.get(object); if (object.isMesh && a) originals.set(`${a.meshes}:${a.primitives ?? 0}`, object); });
      const describe = material => ({ type: material.type, color: material.color?.toArray(), roughness: material.roughness, metalness: material.metalness, side: material.side, vertexColors: material.vertexColors, vectors: Object.fromEntries(Object.entries(material).filter(([, value]) => value?.isColor || value?.isVector2 || value?.isVector3).map(([name, value]) => [name, value.toArray()])), scalars: Object.fromEntries(Object.entries(material).filter(([, value]) => ['number', 'boolean', 'string'].includes(typeof value))), maps: Object.fromEntries(Object.entries(material).filter(([, value]) => value?.isTexture).map(([name, value]) => [name, { colorSpace: value.colorSpace, flipY: value.flipY, channel: value.channel, wrapS: value.wrapS, wrapT: value.wrapT, magFilter: value.magFilter, minFilter: value.minFilter, offset: value.offset.toArray(), repeat: value.repeat.toArray(), rotation: value.rotation, width: value.image?.width, height: value.image?.height }])) });
      const digest = attr => { if (!attr) return null; const data = attr.array; let hash = 2166136261; const raw = new Uint8Array(data.buffer, data.byteOffset, data.byteLength); for (const value of raw) hash = Math.imul(hash ^ value, 16777619); return { count: attr.count, itemSize: attr.itemSize, hash: (hash >>> 0).toString(16) }; };
      const imageDigest = texture => { if (!texture?.image) return null; const canvas = document.createElement('canvas'); canvas.width = canvas.height = 128; const ctx = canvas.getContext('2d'); ctx.drawImage(texture.image, 0, 0, 128, 128); const data = ctx.getImageData(0, 0, 128, 128).data; let hash = 2166136261; for (const value of data) hash = Math.imul(hash ^ value, 16777619); return (hash >>> 0).toString(16); };
      preview.scene.traverse(object => { const a = preview.parser.associations.get(object); if (!object.isMesh || !a) return; const key = `${a.meshes}:${a.primitives ?? 0}`, original = originals.get(key); if (original) materialAudit.push({ key, original: describe(original.material), stable: describe(object.material), imageHashes: Object.fromEntries(['map', 'normalMap', 'roughnessMap', 'metalnessMap'].map(name => [name, { original: imageDigest(original.material[name]), stable: imageDigest(object.material[name]) }])), attributes: Object.fromEntries(['position', 'normal', 'uv', 'tangent', 'skinIndex', 'skinWeight'].map(name => [name, { original: digest(original.geometry.getAttribute(name)), stable: digest(object.geometry.getAttribute(name)) }])) }); });
    }
    if (isolate) {
      const objects = asset => { const values = new Map(); asset.scene.traverse(object => { if (!object.isMesh) return; const a = asset.parser.associations.get(object); if (a) values.set(`${a.meshes}:${a.primitives ?? 0}`, object); }); return values; };
      const originals = objects(reference), variants = objects(preview);
      const previous = [...originals.values(), ...variants.values()].map(object => ({ object, visible: object.visible }));
      const hide = () => { for (const item of previous) item.object.visible = false; };
      const read = async () => { renderer._nodes.nodeFrame.update(); renderer.render(scene, camera); return Uint8Array.from(await renderer.readRenderTargetPixelsAsync(target, 0, 0, 384, 384)); };
      hide(); const empty = await read();
      for (const [key, original] of originals) {
        const variant = variants.get(key); if (!variant) throw Error(`Missing primitive ${key}`);
        hide(); original.visible = true; const a = await read();
        scene.remove(reference.scene); scene.add(preview.scene); hide(); variant.visible = true; const b = await read(); scene.remove(preview.scene); scene.add(reference.scene);
        let pixels = 0, diff = 0; for (let i = 0; i < a.length; i += 4) { if (a[i] === empty[i] && a[i + 1] === empty[i + 1] && a[i + 2] === empty[i + 2]) continue; pixels++; for (let c = 0; c < 3; c++) diff += Math.abs(a[i + c] - b[i + c]); }
        if (pixels) isolated.push({ key, name: original.name, material: original.material.name, pixels, meanAbsoluteRgb: diff / (3 * pixels), totalDifference: diff });
      }
      for (const item of previous) item.object.visible = item.visible;
      isolated.sort((a, b) => b.totalDifference - a.totalDifference);
    }
    await device.queue.onSubmittedWorkDone(); const error = await device.popErrorScope(); if (error) failures.push(error.message); renderer.dispose();
    return { backend: 'WebGPU', animated, shadows, nativeColor, clip: animated ? reference.animations[0].name : null, results, isolated, materialAudit, failures };
  }, { sourceUrl, animated: process.env.WG_ANIMATED === '1', shadows: process.env.WG_SHADOWS === '1', isolate: process.env.WG_ISOLATE_MESH === '1', nativeColor: process.env.WG_NATIVE_COLOR === '1' });
  if (errors.length || result.failures.length || result.results.some(x => x.pixels < 100)) throw Error(JSON.stringify({ errors, result }));
  if (process.env.WG_OUTPUT) await writeFile(process.env.WG_OUTPUT, JSON.stringify(result, null, 2));
  if (process.env.WG_SCREENSHOT) await page.screenshot({ path: process.env.WG_SCREENSHOT, fullPage: true });
  console.log(JSON.stringify(result));
} finally { await browser.close(); }
