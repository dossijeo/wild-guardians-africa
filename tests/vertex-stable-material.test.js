import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { makeStableVertexMaterials } from './browser/vertex-stable-material.js';

const sourceHash = 'a'.repeat(64);
function setup() {
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute([0, 0, 0], 3));
  geometry.setAttribute('normal', new THREE.Float32BufferAttribute([0, 1, 0], 3));
  geometry.setAttribute('color', new THREE.Uint8BufferAttribute([100, 100, 100, 255], 4, true));
  const mesh = new THREE.Mesh(geometry, new THREE.MeshStandardMaterial());
  const scene = new THREE.Group(); scene.add(mesh);
  const parser = { json: { asset: { extras: { wgVertexPreviewSourceSha256: sourceHash } } }, associations: new Map([[mesh, { meshes: 0, primitives: 0 }]]) };
  const preview = { scene, parser }, mapping = { sourceSha256: sourceHash, primitives: [{ mesh: 0, primitive: 0, material: 0, colorAccessor: null }] };
  const material = new THREE.MeshStandardMaterial(); material.map = new THREE.Texture(); material.normalMap = new THREE.Texture();
  const asset = (value, hash = sourceHash) => ({ parser: { json: { asset: { extras: { wgVertexPreviewSourceSha256: hash } } }, getDependency: () => Promise.resolve(value) } });
  const renderer = { library: { fromMaterial: source => source.clone() } };
  return { preview, mapping, material, asset, renderer, mesh };
}

test('stable material refuses premature or mismatched texture application', async () => {
  const x = setup(), stable = await makeStableVertexMaterials(x.renderer, x.preview, x.asset(x.material), x.mapping);
  const placeholder = x.mesh.material.map;
  assert.throws(() => stable.apply(), /not ready/);
  await assert.rejects(stable.resolveFinal(x.asset(x.material, 'b'.repeat(64))), /source mismatch/);
  assert.throws(() => stable.apply(), /not ready/);
  assert.equal(x.mesh.material.map, placeholder);
  const incomplete = x.material.clone(); incomplete.normalMap = null;
  await assert.rejects(stable.resolveFinal(x.asset(incomplete)), /missing/);
  assert.throws(() => stable.apply(), /not ready/);
  assert.equal(x.mesh.material.map, placeholder);
  const textures = await stable.resolveFinal(x.asset(x.material));
  assert.equal(textures.length, 2);
  stable.apply();
  assert.equal(x.mesh.material.map, x.material.map);
  assert.equal(x.mesh.material.normalMap, x.material.normalMap);
});

test('texture blending requires a resolved material and accepts only finite proportions', async () => {
  const x = setup(), stable = await makeStableVertexMaterials(x.renderer, x.preview, x.asset(x.material), x.mapping);
  assert.throws(() => stable.setBlend(.5), /not ready/);
  await stable.resolveFinal(x.asset(x.material));
  assert.throws(() => stable.setBlend(.5), /not applied/);
  assert.throws(() => stable.apply({ blend: NaN }), /Invalid texture blend/);
  stable.apply({ blend: 0 });
  assert.equal(x.mesh.material.normalScale.x, 0);
  stable.setBlend(.5); assert.equal(x.mesh.material.normalScale.x, .5);
  stable.setBlend(1); assert.equal(x.mesh.material.normalScale.x, 1);
  assert.throws(() => stable.setBlend(1.1), /Invalid texture blend/);
  stable.cancel(); assert.throws(() => stable.setBlend(.5), /cancelled/);
});

test('cancellation prevents in-flight and later application', async () => {
  const x = setup(), stable = await makeStableVertexMaterials(x.renderer, x.preview, x.asset(x.material), x.mapping);
  const placeholder = x.mesh.material.map; let finish;
  const pendingAsset = x.asset(x.material);
  pendingAsset.parser.getDependency = () => new Promise(resolve => { finish = resolve; });
  const pending = stable.resolveFinal(pendingAsset); stable.cancel(); finish(x.material);
  await assert.rejects(pending, /cancelled/);
  assert.throws(() => stable.apply(), /cancelled/);
  await assert.rejects(stable.resolveFinal(x.asset(x.material)), /cancelled/);
  assert.equal(x.mesh.material.map, placeholder);
});

test('a preview from another source is rejected before material creation', async () => {
  const x = setup(); x.preview.parser.json.asset.extras.wgVertexPreviewSourceSha256 = 'b'.repeat(64);
  const material = x.mesh.material;
  await assert.rejects(makeStableVertexMaterials(x.renderer, x.preview, x.asset(x.material), x.mapping), /source mismatch/);
  assert.equal(x.mesh.material, material);
});

test('a late previous load cannot replace the newest textures', async () => {
  const x = setup(), stable = await makeStableVertexMaterials(x.renderer, x.preview, x.asset(x.material), x.mapping);
  let finish;
  const stale = x.asset(x.material); stale.parser.getDependency = () => new Promise(resolve => { finish = resolve; });
  const pending = stable.resolveFinal(stale);
  const newest = x.material.clone(); newest.map = new THREE.Texture(); newest.normalMap = new THREE.Texture();
  await stable.resolveFinal(x.asset(newest));
  finish(x.material);
  await assert.rejects(pending, /superseded/);
  stable.apply();
  assert.equal(x.mesh.material.map, newest.map);
});

test('a malformed later primitive leaves the whole scene unchanged', async () => {
  const x = setup(), firstMaterial = x.mesh.material, badGeometry = x.mesh.geometry.clone();
  badGeometry.deleteAttribute('color');
  const bad = new THREE.Mesh(badGeometry, new THREE.MeshStandardMaterial()); x.preview.scene.add(bad);
  x.preview.parser.associations.set(bad, { meshes: 1, primitives: 0 });
  x.mapping.primitives.push({ mesh: 1, primitive: 0, material: 0, colorAccessor: null });
  const badMaterial = bad.material;
  await assert.rejects(makeStableVertexMaterials(x.renderer, x.preview, x.asset(x.material), x.mapping), /Missing baked/);
  assert.equal(x.mesh.material, firstMaterial);
  assert.equal(x.mesh.geometry.getAttribute('wgOriginalColor'), undefined);
  assert.equal(bad.material, badMaterial);
});
