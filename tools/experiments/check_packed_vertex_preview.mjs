import { createRequire } from 'node:module';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import validator from 'gltf-validator';

const file = process.argv[2];
if (!file) throw Error('Usage: node check_packed_vertex_preview.mjs <preview.glb>');
const bytes = await readFile(file);
const validation = await validator.validateBytes(new Uint8Array(bytes));
if (validation.issues.numErrors) throw Error(JSON.stringify(validation.issues));
const { chromium } = createRequire(import.meta.url)(process.env.PLAYWRIGHT_MODULE ?? 'playwright');
const browser = await chromium.launch({ channel: 'msedge', headless: true });
try {
  const page = await browser.newPage({ viewport: { width: 512, height: 512 } });
  const failures = [];
  page.on('pageerror', error => failures.push(String(error)));
  page.on('requestfailed', request => failures.push(`${request.url()}: ${request.failure()?.errorText}`));
  await page.route('**/packed-preview.glb', route => route.fulfill({ status: 200, contentType: 'model/gltf-binary', body: bytes }));
  await page.route('**/packed-test-page', route => route.fulfill({ status: 200, contentType: 'text/html', body: '<!doctype html><body></body>' }));
  await page.goto(`${process.env.WG_BASE_URL ?? 'http://127.0.0.1:5175'}/packed-test-page`);
  const result = await page.evaluate(async () => {
    const THREE = await import('/node_modules/three/build/three.module.js');
    const { GLTFLoader } = await import('/node_modules/three/examples/jsm/loaders/GLTFLoader.js');
    const asset = await new GLTFLoader().loadAsync('/packed-preview.glb');
    const scene = new THREE.Scene(); scene.background = new THREE.Color(0x777777); scene.add(asset.scene);
    scene.add(new THREE.HemisphereLight(0xffffff, 0x777777, 2));
    const sun = new THREE.DirectionalLight(0xffffff, 2); sun.position.set(2, 4, 3); scene.add(sun);
    const box = new THREE.Box3().setFromObject(asset.scene), center = box.getCenter(new THREE.Vector3()), size = box.getSize(new THREE.Vector3());
    const radius = Math.max(size.x, size.y, size.z); const camera = new THREE.PerspectiveCamera(35, 1, radius / 1000, radius * 20);
    camera.position.copy(center).add(new THREE.Vector3(1.5, 1, 2.5).normalize().multiplyScalar(radius * 2.5)); camera.lookAt(center);
    let meshes = 0, colored = 0, skinned = 0, textures = 0;
    asset.scene.traverse(object => { if (!object.isMesh) return; meshes++; if (object.geometry.attributes.color) colored++; if (object.isSkinnedMesh) skinned++; for (const value of Object.values(object.material)) if (value?.isTexture) textures++; });
    const renderer = new THREE.WebGLRenderer({ antialias: true }); renderer.setSize(512, 512); document.body.replaceChildren(renderer.domElement);
    const mixer = new THREE.AnimationMixer(asset.scene); if (asset.animations.length) { mixer.clipAction(asset.animations[0]).play(); mixer.update(0.1); }
    renderer.render(scene, camera);
    return { meshes, colored, skinned, textures, animations: asset.animations.length, renderer: renderer.getContext().getParameter(renderer.getContext().RENDERER) };
  });
  if (failures.length || !result.meshes || !result.colored || !result.skinned || !result.animations || result.textures) throw Error(JSON.stringify({ failures, result }));
  if (process.env.WG_SCREENSHOT) await page.screenshot({ path: resolve(process.env.WG_SCREENSHOT) });
  console.log(JSON.stringify({ ...result, bytes: bytes.length, validationErrors: validation.issues.numErrors, validationWarnings: validation.issues.numWarnings }));
} finally { await browser.close(); }
