import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash, webcrypto } from 'node:crypto';
import { openCharacterPreviewStream } from '../src/rendering/character-preview-stream.js';

const hash = data => createHash('sha256').update(data).digest('hex');
function fixture() {
  const source = 'a'.repeat(64), files = new Map(), callLog = [];
  const add = (path, body) => { const bytes = Buffer.from(body); files.set(path, bytes); return { path, bytes: bytes.length, sha256: hash(bytes) }; };
  const preview = add('preview.glb', 'geometry');
  const variant = name => {
    const uri = name === 'bc7' ? 'tex.ktx2' : 'tex.webp';
    const materials = JSON.stringify({ asset: { version: '2.0', extras: { wgVertexPreviewSourceSha256: source } }, images: [{ uri }] });
    const mapping = JSON.stringify({ id: 'buffalo', sourceSha256: source, primitives: [] });
    return { requires: name === 'bc7' ? ['texture-compression-bc'] : [], files: [add(`${name}/materials.gltf`, materials), add(`${name}/mapping.json`, mapping), add(`${name}/${uri}`, 'texture')] };
  };
  const manifest = { schemaVersion: 1, id: 'buffalo', sourceModel: `assets/web/${source}.glb`, preview, variants: { webp: variant('webp'), bc7: variant('bc7') } };
  files.set('package.json', Buffer.from(JSON.stringify(manifest)));
  async function fetchImpl(url, { signal }) {
    if (signal.aborted) throw new DOMException('aborted', 'AbortError');
    const path = new URL(url).pathname.replace(/^\/pkg\//, ''); callLog.push(path);
    return files.has(path) ? new Response(files.get(path)) : new Response('', { status: 404 });
  }
  return { files, manifest, callLog, fetchImpl };
}
const open = (x, options = {}) => openCharacterPreviewStream('https://example.test/pkg/package.json', { fetchImpl: x.fetchImpl, subtle: webcrypto.subtle, ...options });

test('loads geometry and metadata first; fetches only the selected textures on demand', async () => {
  const x = fixture(), stream = await open(x, { features: ['texture-compression-bc'] });
  assert.equal(stream.variant, 'bc7');
  assert.equal(Buffer.from(await stream.loadPreview()).toString(), 'geometry');
  const metadata = await stream.loadMetadata();
  assert.equal(x.callLog.some(path => /\.(webp|ktx2)$/.test(path)), false);
  const textures = await stream.loadTextures(metadata);
  assert.deepEqual([...textures.keys()], ['bc7/tex.ktx2']);
  assert.equal(Buffer.from(textures.get('bc7/tex.ktx2')).toString(), 'texture');
  stream.close(); await assert.rejects(stream.loadPreview(), { name: 'AbortError' });
});

test('rejects changed content before returning any textures', async () => {
  const x = fixture(), stream = await open(x), metadata = await stream.loadMetadata();
  x.files.set('webp/tex.webp', Buffer.from('corrupt'));
  await assert.rejects(stream.loadTextures(metadata), /hash mismatch/);
  await assert.rejects(stream.loadTextures({ texturePaths: ['webp/tex.webp'] }), /Invalid character texture request/);
  stream.close();
});

test('closing aborts in-flight fetch and prevents late publication', async () => {
  const x = fixture(), originalFetch = x.fetchImpl;
  x.fetchImpl = (url, options) => new URL(url).pathname.endsWith('preview.glb')
    ? new Promise((resolve, reject) => options.signal.addEventListener('abort', () => reject(new DOMException('aborted', 'AbortError')), { once: true }))
    : originalFetch(url, options);
  const stream = await open(x), pending = stream.loadPreview(); stream.close();
  await assert.rejects(pending, { name: 'AbortError' });
});

test('rejects an image outside the declared package', async () => {
  const x = fixture(), name = 'webp/materials.gltf';
  const material = JSON.parse(x.files.get(name)); material.images[0].uri = '../escape.webp';
  const bytes = Buffer.from(JSON.stringify(material)); x.files.set(name, bytes);
  Object.assign(x.manifest.variants.webp.files.find(file => file.path === name), { bytes: bytes.length, sha256: hash(bytes) });
  x.files.set('package.json', Buffer.from(JSON.stringify(x.manifest)));
  const stream = await open(x); await assert.rejects(stream.loadMetadata(), /Invalid character texture URI/); stream.close();
});

test('a failed texture cancels its concurrent downloads without closing the stream', async () => {
  const x = fixture(), name = 'webp/materials.gltf';
  const material = JSON.parse(x.files.get(name)); material.images.push({ uri: 'pending.webp' });
  const bytes = Buffer.from(JSON.stringify(material)); x.files.set(name, bytes);
  Object.assign(x.manifest.variants.webp.files.find(file => file.path === name), { bytes: bytes.length, sha256: hash(bytes) });
  const pendingBytes = Buffer.from('pending'); x.files.set('webp/pending.webp', pendingBytes);
  x.manifest.variants.webp.files.push({ path: 'webp/pending.webp', bytes: pendingBytes.length, sha256: hash(pendingBytes) });
  x.files.set('package.json', Buffer.from(JSON.stringify(x.manifest)));
  const originalFetch = x.fetchImpl; let cancelled = false;
  x.fetchImpl = (url, options) => new URL(url).pathname.endsWith('pending.webp')
    ? new Promise((resolve, reject) => options.signal.addEventListener('abort', () => { cancelled = true; reject(new DOMException('aborted', 'AbortError')); }, { once: true }))
    : originalFetch(url, options);
  const stream = await open(x), metadata = await stream.loadMetadata();
  x.files.set('webp/tex.webp', Buffer.from('corrupt'));
  await assert.rejects(stream.loadTextures(metadata), /hash mismatch/);
  assert.equal(cancelled, true);
  assert.equal(Buffer.from(await stream.loadPreview()).toString(), 'geometry');
  stream.close();
});
