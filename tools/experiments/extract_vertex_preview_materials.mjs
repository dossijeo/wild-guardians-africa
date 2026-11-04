import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

// Material-only glTF for the vertex-color experiment; no geometry is duplicated.
const [id, output] = process.argv.slice(2);
if (!id || !output) throw Error('Usage: node extract_vertex_preview_materials.mjs <asset-id> <output-directory>');
const manifest = JSON.parse(await readFile('public/qa/vertex-color-preview/manifest.json', 'utf8'));
const entry = manifest.assets.find(asset => asset.id === id);
if (!entry) throw Error(`Unknown asset: ${id}`);
const source = await readFile(entry.source);
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
if (hash(source) !== entry.sourceSha256) throw Error('Source differs from baked data');
if (source.readUInt32LE(0) !== 0x46546c67 || source.readUInt32LE(4) !== 2) throw Error('Expected GLB 2');
const length = source.readUInt32LE(12);
const original = JSON.parse(source.subarray(20, 20 + length).toString('utf8'));
const header = 20 + length;
if (source.readUInt32LE(header + 4) !== 0x004e4942) throw Error('Missing BIN chunk');
const bin = source.subarray(header + 8, header + 8 + source.readUInt32LE(header));
await mkdir(output, { recursive: true });
let imageBytes = 0;
const images = [];
for (const image of original.images ?? []) {
  const view = original.bufferViews[image.bufferView];
  const extension = { 'image/png': 'png', 'image/jpeg': 'jpg', 'image/webp': 'webp' }[image.mimeType];
  if (!view || view.buffer !== 0 || !extension || image.uri || view.extensions) throw Error('Unsupported image');
  const start = view.byteOffset ?? 0;
  if (start + view.byteLength > bin.length) throw Error('Image exceeds buffer');
  const data = bin.subarray(start, start + view.byteLength), name = `${hash(data)}.${extension}`;
  await writeFile(join(output, name), data); imageBytes += data.length;
  images.push({ ...image, bufferView: undefined, mimeType: undefined, uri: name });
}
const materials = { asset: { version: '2.0' }, scene: 0, scenes: [{ nodes: [] }], materials: original.materials ?? [], textures: original.textures ?? [], samplers: original.samplers ?? [], images };
if (original.extensionsUsed) materials.extensionsUsed = original.extensionsUsed;
if (original.extensionsRequired) materials.extensionsRequired = original.extensionsRequired;
const primitives = original.meshes.flatMap((mesh, meshIndex) => mesh.primitives.map((primitive, primitiveIndex) => ({ mesh: meshIndex, primitive: primitiveIndex, material: primitive.material ?? null, colorAccessor: primitive.attributes.COLOR_0 ?? null })));
await writeFile(join(output, 'materials.gltf'), `${JSON.stringify(materials)}\n`);
await writeFile(join(output, 'mapping.json'), `${JSON.stringify({ id, sourceSha256: entry.sourceSha256, primitives })}\n`);
console.log(JSON.stringify({ id, images: images.length, imageBytes, materials: materials.materials.length, primitives: primitives.length }));
