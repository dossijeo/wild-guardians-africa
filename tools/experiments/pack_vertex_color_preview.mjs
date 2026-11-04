import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';

// Offline, deliberately limited GLB prototype. The authoritative asset is untouched.
const [id, output] = process.argv.slice(2);
if (!id || !output) throw Error('Usage: node pack_vertex_color_preview.mjs <asset-id> <output.glb>');
const manifest = JSON.parse(await readFile('public/qa/vertex-color-preview/manifest.json', 'utf8'));
const entry = manifest.assets.find(asset => asset.id === id);
if (!entry) throw Error(`Unknown asset: ${id}`);
const source = await readFile(entry.source);
const digest = bytes => createHash('sha256').update(bytes).digest('hex');
if (digest(source) !== entry.sourceSha256) throw Error('Source checksum differs from baked colors');
const colors = await readFile(`public/qa/vertex-color-preview/${entry.file}`);
if (digest(colors) !== entry.sha256 || colors.length !== entry.bytes) throw Error('Invalid baked colors');
if (source.readUInt32LE(0) !== 0x46546c67 || source.readUInt32LE(4) !== 2) throw Error('Expected GLB 2');
const jsonLength = source.readUInt32LE(12);
const json = JSON.parse(source.subarray(20, 20 + jsonLength).toString('utf8'));
const binHeader = 20 + jsonLength;
if (source.readUInt32LE(binHeader + 4) !== 0x004e4942) throw Error('Missing BIN chunk');
const bin = source.subarray(binHeader + 8, binHeader + 8 + source.readUInt32LE(binHeader));
if (json.buffers?.length !== 1 || json.buffers[0].uri) throw Error('Only one embedded buffer is supported');
if (json.extensionsUsed?.some(ext => ext.includes('compression') || ext.includes('meshopt'))) throw Error('Compressed buffer views are not supported');
const imageViews = new Set((json.images ?? []).map(image => {
  if (image.bufferView == null || image.uri) throw Error('Only embedded images are supported');
  return image.bufferView;
}));
// Remove material texture references, including those inside material extensions.
function removeTextureReferences(value) {
  if (!value || typeof value !== 'object') return;
  for (const key of Object.keys(value)) {
    if (key === 'extensions' && value[key]?.KHR_texture_transform) throw Error('Unsupported texture transform');
    if (/texture$/i.test(key)) delete value[key];
    else removeTextureReferences(value[key]);
  }
}
for (const material of json.materials ?? []) removeTextureReferences(material);
delete json.images; delete json.textures; delete json.samplers;

// Reject image data referenced by non-image structures rather than silently
// corrupting an asset. Rewrite all ordinary bufferView references together.
const viewMap = new Map();
const oldViews = json.bufferViews;
json.bufferViews = [];
const chunks = [];
let offset = 0;
function append(bytes) {
  const padding = (4 - offset % 4) % 4;
  if (padding) { chunks.push(Buffer.alloc(padding)); offset += padding; }
  const start = offset; chunks.push(bytes); offset += bytes.length; return start;
}
for (const [index, view] of oldViews.entries()) {
  if (imageViews.has(index)) continue;
  if (view.buffer !== 0 || view.extensions) throw Error(`Unsupported buffer view ${index}`);
  const start = view.byteOffset ?? 0;
  if (start + view.byteLength > bin.length) throw Error('Buffer view outside BIN chunk');
  viewMap.set(index, json.bufferViews.length);
  json.bufferViews.push({ ...view, byteOffset: append(bin.subarray(start, start + view.byteLength)) });
}
function remapViews(value) {
  if (!value || typeof value !== 'object') return;
  for (const [key, child] of Object.entries(value)) {
    if (key === 'bufferView') {
      if (!viewMap.has(child)) throw Error(`Unexpected reference to removed image view ${child}`);
      value[key] = viewMap.get(child);
    } else remapViews(child);
  }
}
remapViews(json);
const records = new Map(entry.primitives.map(record => [`${record.mesh}:${record.primitive}`, record]));
const coloredMaterials = new Set();
for (const [meshIndex, mesh] of json.meshes.entries()) {
  for (const [primitiveIndex, primitive] of mesh.primitives.entries()) {
    const record = records.get(`${meshIndex}:${primitiveIndex}`);
    if (!record) continue;
    if (json.accessors[primitive.attributes.POSITION].count !== record.vertices) throw Error('Vertex count differs');
    const rgba = Buffer.alloc(record.vertices * 4, 255);
    for (let i = 0; i < record.vertices; i++) colors.copy(rgba, i * 4, record.offset + i * 3, record.offset + i * 3 + 3);
    const bufferView = json.bufferViews.length;
    json.bufferViews.push({ buffer: 0, byteOffset: append(rgba), byteLength: rgba.length, target: 34962 });
    const accessor = json.accessors.length;
    json.accessors.push({ bufferView, componentType: 5121, normalized: true, count: record.vertices, type: 'VEC4' });
    primitive.attributes.COLOR_0 = accessor;
    coloredMaterials.add(primitive.material);
  }
}
for (const [meshIndex, mesh] of json.meshes.entries()) for (const [primitiveIndex, primitive] of mesh.primitives.entries()) {
  if (coloredMaterials.has(primitive.material) && !records.has(`${meshIndex}:${primitiveIndex}`)) throw Error('Colored material also used by an unbaked primitive');
}
for (const index of coloredMaterials) json.materials[index].pbrMetallicRoughness.baseColorFactor = [1, 1, 1, 1];
json.buffers[0].byteLength = offset;
const jsonBytes = Buffer.from(JSON.stringify(json));
const jsonPadding = (4 - jsonBytes.length % 4) % 4;
const binPadding = (4 - offset % 4) % 4;
const header = Buffer.alloc(12), jsonHeader = Buffer.alloc(8), binChunkHeader = Buffer.alloc(8);
header.writeUInt32LE(0x46546c67); header.writeUInt32LE(2, 4);
header.writeUInt32LE(12 + 8 + jsonBytes.length + jsonPadding + 8 + offset + binPadding, 8);
jsonHeader.writeUInt32LE(jsonBytes.length + jsonPadding); jsonHeader.writeUInt32LE(0x4e4f534a, 4);
binChunkHeader.writeUInt32LE(offset + binPadding); binChunkHeader.writeUInt32LE(0x004e4942, 4);
const packed = Buffer.concat([header, jsonHeader, jsonBytes, Buffer.alloc(jsonPadding, 0x20), binChunkHeader, ...chunks, Buffer.alloc(binPadding)]);
await writeFile(output, packed);
console.log(JSON.stringify({ id, sourceBytes: source.length, previewBytes: packed.length, removedImageViews: imageViews.size, coloredPrimitives: records.size, animations: json.animations?.length ?? 0, sha256: digest(packed) }));
