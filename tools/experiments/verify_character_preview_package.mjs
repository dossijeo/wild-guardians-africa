import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { read, VK_FORMAT_BC7_SRGB_BLOCK, VK_FORMAT_BC7_UNORM_BLOCK } from 'three/addons/libs/ktx-parse.module.js';
import { selectCharacterPreviewVariant } from '../../src/rendering/character-preview-package.js';
import { readGlb } from '../glb-container.mjs';

const [directoryArg] = process.argv.slice(2);
if (!directoryArg) throw Error('Usage: node verify_character_preview_package.mjs <package-directory>');
const directory = resolve(directoryArg), manifest = JSON.parse(await readFile(join(directory, 'package.json'), 'utf8'));
for (const features of [[], ['texture-compression-bc']]) selectCharacterPreviewVariant(manifest, features);
const expectedSource = manifest.sourceModel.match(/\/([a-f0-9]{64})\.glb$/)?.[1];
if (!expectedSource) throw Error('Invalid source model identity');
async function verify(file) {
  const bytes = await readFile(join(directory, file.path));
  if (bytes.length !== file.bytes || createHash('sha256').update(bytes).digest('hex') !== file.sha256) throw Error(`Integrity failure: ${file.path}`);
  return bytes;
}
const preview = readGlb(await verify(manifest.preview)).json;
if (preview.asset?.extras?.wgVertexPreviewSourceSha256 !== expectedSource || !preview.extensionsRequired?.includes('EXT_meshopt_compression') || (preview.images?.length ?? 0) !== 0) throw Error('Invalid preview source or contents');
const variants = {};
for (const name of ['webp', 'bc7']) {
  const data = new Map();
  for (const file of manifest.variants[name].files) data.set(file.path, await verify(file));
  const materials = JSON.parse(data.get(`${name}/materials.gltf`)), mapping = JSON.parse(data.get(`${name}/mapping.json`));
  if (mapping.sourceSha256 !== expectedSource || mapping.id !== manifest.id || materials.asset?.extras?.wgVertexPreviewSourceSha256 !== expectedSource) throw Error(`Mismatched ${name} source`);
  const images = [];
  for (const image of materials.images ?? []) {
    const path = `${name}/${image.uri}`, bytes = data.get(path);
    if (!bytes) throw Error(`Unlisted image: ${path}`);
    if (name === 'webp') {
      if (bytes.subarray(0, 4).toString('ascii') !== 'RIFF' || bytes.subarray(8, 12).toString('ascii') !== 'WEBP') throw Error('Invalid WebP image');
    } else {
      const imageData = read(new Uint8Array(bytes));
      if (![VK_FORMAT_BC7_SRGB_BLOCK, VK_FORMAT_BC7_UNORM_BLOCK].includes(imageData.vkFormat) || imageData.supercompressionScheme !== 0 || !imageData.levels.length) throw Error('Invalid BC7 image');
    }
    images.push(path);
  }
  if (!images.length) throw Error(`No ${name} images`);
  variants[name] = { files: data.size, images: images.length };
}
console.log(JSON.stringify({ id: manifest.id, previewBytes: manifest.preview.bytes, source: expectedSource, variants }));
