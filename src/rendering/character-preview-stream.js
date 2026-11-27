import { selectCharacterPreviewVariant } from './character-preview-package.js';

const MANIFEST_LIMIT = 1024 * 1024;
const encoder = new TextDecoder('utf-8', { fatal: true });
const abortError = () => new DOMException('Character preview cancelled', 'AbortError');

async function readBounded(response, limit, signal) {
  if (!response.ok) throw Error(`Character package HTTP ${response.status}`);
  const declared = Number(response.headers.get('content-length'));
  if (Number.isFinite(declared) && declared > limit) throw Error('Character package response exceeds limit');
  if (!response.body) {
    const data = new Uint8Array(await response.arrayBuffer());
    if (data.length > limit) throw Error('Character package response exceeds limit');
    if (signal.aborted) throw abortError();
    return data;
  }
  const reader = response.body.getReader(), chunks = []; let length = 0;
  try {
    while (true) {
      if (signal.aborted) throw abortError();
      const { value, done } = await reader.read(); if (done) break;
      length += value.byteLength;
      if (length > limit) { await reader.cancel(); throw Error('Character package response exceeds limit'); }
      chunks.push(value);
    }
  } finally { reader.releaseLock(); }
  if (signal.aborted) throw abortError();
  const data = new Uint8Array(length); let offset = 0;
  for (const chunk of chunks) { data.set(chunk, offset); offset += chunk.byteLength; }
  return data;
}

// Allocate one output buffer per resource so the data Worker can transfer each
// texture independently, including on the raw-byte fallback path.
async function unpackStoredFiles(encoded, storage, files, signal) {
  if (encoded.byteLength !== storage.bytes) throw Error('Stored character resource size mismatch');
  if (storage.encoding === 'identity') {
    let offset = 0;
    return files.map(file => {
      const bytes = encoded.slice(offset, offset + file.bytes);
      offset += file.bytes;
      return bytes;
    });
  }

  const buffers = files.map(file => new Uint8Array(file.bytes));
  const reader = new Blob([encoded]).stream().pipeThrough(new DecompressionStream('gzip')).getReader();
  let index = 0, offset = 0;
  try {
    while (true) {
      if (signal.aborted) throw abortError();
      const { value, done } = await reader.read();
      if (done) break;
      let start = 0;
      while (start < value.byteLength) {
        const bytes = buffers[index];
        if (!bytes) throw Error('Stored character resource exceeds decoded size');
        const size = Math.min(value.byteLength - start, bytes.byteLength - offset);
        bytes.set(value.subarray(start, start + size), offset);
        start += size;
        offset += size;
        if (offset === bytes.byteLength) { index++; offset = 0; }
      }
    }
  } catch (error) {
    await reader.cancel().catch(() => {});
    throw error;
  } finally { reader.releaseLock(); }
  if (signal.aborted) throw abortError();
  if (index !== buffers.length) throw Error('Stored character resource is truncated');
  return buffers;
}

// Use from a Worker: hashing, parsing and asset bytes must not burden the UI.
// Texture bytes are not fetched until loadTextures() is explicitly requested.
export async function openCharacterPreviewStream(packageUrl, { features = [], signal, fetchImpl = globalThis.fetch, subtle = globalThis.crypto?.subtle } = {}) {
  if (typeof document !== 'undefined') throw Error('Character preview preparation requires a Worker');
  if (typeof fetchImpl !== 'function' || !subtle?.digest) throw Error('Required package APIs unavailable');
  const url = new URL(packageUrl, globalThis.location?.href), controller = new AbortController();
  const cancel = () => controller.abort();
  if (signal?.aborted) throw abortError();
  signal?.addEventListener('abort', cancel, { once: true });
  try {
    const manifestBytes = await readBounded(await fetchImpl(url.href, { signal: controller.signal, redirect: 'error' }), MANIFEST_LIMIT, controller.signal);
    const manifest = JSON.parse(encoder.decode(manifestBytes)), variant = selectCharacterPreviewVariant(manifest, features);
    const files = new Map(variant.files.map(file => [file.path, file]));
    const jsonPath = `${variant.name}/materials.gltf`, mappingPath = `${variant.name}/mapping.json`;
    const bankFiles = variant.textureBank ? variant.files.filter(file => file.path.endsWith(variant.name === 'bc7' ? '.ktx2' : '.webp')) : null;
    let closed = false; const validMetadata = new WeakSet();
    const assertOpen = () => { if (closed || controller.signal.aborted) throw abortError(); };
    async function download(resource, loadSignal) {
      assertOpen();
      if (loadSignal.aborted) throw abortError();
      const target = new URL(resource.path, url);
      if (target.origin !== url.origin) throw Error('Character package escaped its origin');
      return readBounded(await fetchImpl(target.href, { signal: loadSignal, redirect: 'error' }), resource.bytes, loadSignal);
    }
    async function verify(file, data, loadSignal) {
      if (data.length !== file.bytes) throw Error(`Character file size mismatch: ${file.path}`);
      const digest = Array.from(new Uint8Array(await subtle.digest('SHA-256', data))).map(byte => byte.toString(16).padStart(2, '0')).join('');
      assertOpen(); if (loadSignal.aborted) throw abortError();
      if (digest !== file.sha256) throw Error(`Character file hash mismatch: ${file.path}`);
      return data;
    }
    async function load(file, loadSignal = controller.signal) {
      return verify(file, await download(file, loadSignal), loadSignal);
    }
    return {
      id: manifest.id, variant: variant.name,
      async loadPreview() {
        const file = manifest.preview;
        if (!file.stored) return load(file);
        const signal = controller.signal;
        const encoded = await download(file.stored, signal);
        const [bytes] = await unpackStoredFiles(encoded, file.stored, [file], signal);
        return verify(file, bytes, signal);
      },
      async loadMetadata() {
        const [materialBytes, mappingBytes] = await Promise.all([load(files.get(jsonPath)), load(files.get(mappingPath))]);
        assertOpen();
        const materials = JSON.parse(encoder.decode(materialBytes)), mapping = JSON.parse(encoder.decode(mappingBytes));
        const source = manifest.sourceModel.match(/\/([a-f0-9]{64})\.glb$/)?.[1];
        if (!source || mapping.id !== manifest.id || mapping.sourceSha256 !== source || materials.asset?.extras?.wgVertexPreviewSourceSha256 !== source) throw Error('Character package source mismatch');
        const texturePaths = (materials.images ?? []).map(image => {
          if (typeof image.uri !== 'string' || !/^[a-zA-Z0-9._-]+$/.test(image.uri) || image.uri === '.' || image.uri === '..') throw Error('Invalid character texture URI');
          const path = `${variant.name}/${image.uri}`;
          if (!files.has(path)) throw Error('Unlisted character texture');
          return path;
        });
        if (!texturePaths.length || texturePaths.length > 16 || new Set(texturePaths).size !== texturePaths.length) throw Error('Invalid character texture list');
        if (bankFiles && (bankFiles.length !== texturePaths.length || bankFiles.some(file => !texturePaths.includes(file.path)))) {
          throw Error('Mixed standalone and banked character textures');
        }
        const metadata = Object.freeze({ materials, mapping, texturePaths: Object.freeze(texturePaths) }); validMetadata.add(metadata); return metadata;
      },
      async loadTextures(metadata) {
        assertOpen();
        if (!metadata || !validMetadata.has(metadata)) throw Error('Invalid character texture request');
        const batch = new AbortController(), cancelBatch = () => batch.abort();
        controller.signal.addEventListener('abort', cancelBatch, { once: true });
        try {
          if (bankFiles) {
            const encoded = await download(variant.textureBank, batch.signal);
            const bytes = await unpackStoredFiles(encoded, variant.textureBank, bankFiles, batch.signal);
            const data = new Map(await Promise.all(bankFiles.map(async (file, i) => [file.path, await verify(file, bytes[i], batch.signal)])));
            return new Map(metadata.texturePaths.map(path => [path, data.get(path)]));
          }
          const entries = await Promise.all(metadata.texturePaths.map(async path => [path, await load(files.get(path), batch.signal)]));
          assertOpen(); return new Map(entries);
        } catch (error) {
          batch.abort(); throw error;
        } finally { controller.signal.removeEventListener('abort', cancelBatch); }
      },
      close() { if (closed) return; closed = true; cancel(); signal?.removeEventListener('abort', cancel); },
    };
  } catch (error) { cancel(); signal?.removeEventListener('abort', cancel); throw error; }
}
