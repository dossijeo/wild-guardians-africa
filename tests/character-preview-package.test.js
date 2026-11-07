import test from 'node:test';
import assert from 'node:assert/strict';
import { selectCharacterPreviewVariant } from '../src/rendering/character-preview-package.js';

const file = path => ({ path, bytes: 1, sha256: 'a'.repeat(64) });
const sample = () => ({ schemaVersion: 1, id: 'buffalo', sourceModel: 'assets/web/model.glb', preview: file('preview.glb'), variants: { webp: { requires: [], files: [file('webp/materials.gltf'), file('webp/mapping.json'), file('webp/color.webp')] }, bc7: { requires: ['texture-compression-bc'], files: [file('bc7/materials.gltf'), file('bc7/mapping.json'), file('bc7/color.ktx2')] } } });

test('selects BC7 only with device support and otherwise retains WebP', () => {
  const packageData = sample();
  assert.equal(selectCharacterPreviewVariant(packageData, new Set(['texture-compression-bc'])).name, 'bc7');
  assert.equal(selectCharacterPreviewVariant(packageData, new Set()).name, 'webp');
  delete packageData.variants.bc7;
  assert.equal(selectCharacterPreviewVariant(packageData, new Set(['texture-compression-bc'])).name, 'webp');
});

test('rejects unsafe paths, corrupt metadata and incomplete fallback', () => {
  for (const mutate of [
    value => { value.preview.path = '../model.glb'; },
    value => { value.variants.bc7.files[0].sha256 = 'bad'; },
    value => { value.variants.webp.files.pop(); value.variants.webp.files.pop(); },
    value => { value.variants.webp.files.push(value.variants.webp.files[0]); },
    value => { value.variants.bc7.requires = []; },
    value => { value.variants.bc7.files.pop(); },
  ]) {
    const value = sample(); mutate(value);
    assert.throws(() => selectCharacterPreviewVariant(value, new Set(['texture-compression-bc'])));
  }
});
