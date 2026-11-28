import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { prepareWebGpuFurAttribute } from './browser/vertex-beast-toon.js';

test('fur mask expands normalized interleaved bytes without changing the original', () => {
  const bytes = new Uint8Array([0, 12, 13, 14, 128, 22, 23, 24, 255, 32, 33, 34]);
  const source = new THREE.InterleavedBufferAttribute(new THREE.InterleavedBuffer(bytes, 4), 1, 0, true);
  const geometry = new THREE.BufferGeometry(); geometry.setAttribute('_fur_light', source);
  const mesh = new THREE.Mesh(geometry, new THREE.MeshBasicMaterial());
  assert.equal(prepareWebGpuFurAttribute(mesh), true);
  const result = geometry.getAttribute('wgFurLight');
  assert.equal(result.count, 3);
  for (let i = 0; i < 3; i++) assert.ok(Math.abs(result.getX(i) - source.getX(i)) < 1e-7);
  assert.equal(geometry.getAttribute('_fur_light'), source);
  assert.equal(prepareWebGpuFurAttribute(mesh), true);
  assert.equal(geometry.getAttribute('wgFurLight'), result);
  assert.equal(prepareWebGpuFurAttribute(new THREE.Mesh(new THREE.BufferGeometry())), false);
});
