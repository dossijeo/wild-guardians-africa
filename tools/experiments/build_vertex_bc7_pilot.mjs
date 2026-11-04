import { createHash } from 'node:crypto';
import { copyFile, mkdir, readFile, writeFile } from 'node:fs/promises';
import { basename, join } from 'node:path';
import { read, VK_FORMAT_BC7_SRGB_BLOCK, VK_FORMAT_BC7_UNORM_BLOCK } from 'three/addons/libs/ktx-parse.module.js';
import { readGlb } from '../glb-container.mjs';

// Offline QA fixture: compare the same already-converted runtime WebP images
// with their native BC7 sidecars. Never modifies source assets.
const [baseDirectory, outputRoot] = process.argv.slice(2);
if (!baseDirectory || !outputRoot) throw Error('Usage: node build_vertex_bc7_pilot.mjs <original-materials-dir> <output-root>');
const metadata = JSON.parse(await readFile(join(baseDirectory, 'materials.gltf'), 'utf8'));
const mapping = JSON.parse(await readFile(join(baseDirectory, 'mapping.json'), 'utf8'));
if (!['hyena', 'buffalo'].includes(mapping.id) || !/^[a-f0-9]{64}$/.test(mapping.sourceSha256 ?? '')) throw Error('Pilot supports known hyena and buffalo sources only');
const report = JSON.parse(await readFile('.cache/ktx2-native/glb/report.json', 'utf8'));
const model = `assets/web/${mapping.sourceSha256}.glb`;
const runtime = readGlb(await readFile(`public/${model}`)).json;
if (JSON.stringify(runtime.materials) !== JSON.stringify(metadata.materials) || runtime.images.length !== metadata.images.length || runtime.textures.length !== metadata.textures.length) throw Error('Runtime material layout differs from source');
for (const [index, entry] of metadata.textures.entries()) {
  const optimized = runtime.textures[index], imageIndex = optimized?.extensions?.EXT_texture_webp?.source ?? optimized?.source;
  if (entry.source !== imageIndex || entry.sampler !== optimized?.sampler) throw Error(`Runtime texture mapping differs at ${index}`);
}
const records = [];
for (let index = 0; index < metadata.images.length; index++) {
  const candidates = report.records.filter(row => row.uses?.some(use => use.model === model && use.imageIndex === index));
  if (candidates.length !== 1) throw Error(`Missing unique native sidecar for image ${index}`);
  const row = candidates[0], source = await readFile(row.source), native = await readFile(row.output);
  if (createHash('sha256').update(source).digest('hex') !== row.sha256) throw Error('Runtime source hash mismatch');
  const ktx = read(new Uint8Array(native));
  if (ktx.vkFormat !== (row.kind === 'color' ? VK_FORMAT_BC7_SRGB_BLOCK : VK_FORMAT_BC7_UNORM_BLOCK) || ktx.pixelWidth !== row.width || ktx.pixelHeight !== row.height || !ktx.levels.length || ktx.supercompressionScheme !== 0) throw Error('Invalid native BC7 sidecar');
  records.push({ index, source: row.source, native: row.output, kind: row.kind, width: row.width, height: row.height, sourceBytes: source.length, nativeBytes: native.length, levels: ktx.levels.length, nativeSha256: createHash('sha256').update(native).digest('hex') });
}
for (const variant of ['webp', 'bc7']) {
  const directory = join(outputRoot, variant); await mkdir(directory, { recursive: true });
  const gltf = structuredClone(metadata);
  for (const row of records) {
    const file = variant === 'webp' ? row.source : row.native;
    await copyFile(file, join(directory, basename(file)));
    gltf.images[row.index] = { uri: basename(file) };
  }
  if (variant === 'bc7') {
    for (const texture of gltf.textures) { if (!Number.isInteger(texture.source)) throw Error('Unexpected source texture'); texture.extensions = { ...texture.extensions, WG_native_ktx2: { source: texture.source } }; delete texture.source; }
    gltf.extensionsUsed = [...new Set([...(gltf.extensionsUsed ?? []), 'WG_native_ktx2'])];
    gltf.extensionsRequired = [...new Set([...(gltf.extensionsRequired ?? []), 'WG_native_ktx2'])];
  }
  await writeFile(join(directory, 'materials.gltf'), JSON.stringify(gltf));
  await copyFile(join(baseDirectory, 'mapping.json'), join(directory, 'mapping.json'));
}
console.log(JSON.stringify({ model, records, outputRoot }));
