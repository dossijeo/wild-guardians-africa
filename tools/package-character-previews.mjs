import { createHash } from 'node:crypto';
import { readFileSync, unlinkSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { gzipSync } from 'node:zlib';
import { selectCharacterPreviewVariant } from '../src/rendering/character-preview-package.js';
import { bakedAnimationSources } from './package-baked-animations.mjs';

export function packageCharacterPreviews(root) {
  const stats = { actors: bakedAnimationSources.size, sourceFiles: 0, packedFiles: 0, sourceBytes: 0, packedBytes: 0 };
  for (const profile of bakedAnimationSources.keys()) {
    const directory = resolve(root, 'content/character-preview', profile);
    const manifestPath = resolve(directory, 'package.json');
    const sourceManifest = readFileSync(manifestPath);
    const manifest = JSON.parse(sourceManifest);
    if (manifest.id !== profile) throw Error(`Wrong character package for ${profile}`);
    selectCharacterPreviewVariant(manifest, ['texture-compression-bc']);
    selectCharacterPreviewVariant(manifest, []);

    const inputs = [];
    function readSource(record) {
      const file = resolve(directory, record.path);
      const raw = readFileSync(file);
      if (raw.length !== record.bytes || createHash('sha256').update(raw).digest('hex') !== record.sha256) {
        throw Error(`Invalid authored character resource ${profile}/${record.path}`);
      }
      return { file, raw };
    }
    function store(sources, path, { compress = true, skipIfRaw = false } = {}) {
      const raw = Buffer.concat(sources.map(source => source.raw));
      const gzip = compress ? gzipSync(raw) : null;
      const compressed = gzip && gzip.length < raw.length;
      if (!compressed && skipIfRaw) return null;
      const data = compressed ? gzip : raw;
      writeFileSync(resolve(directory, path), data);
      inputs.push(...sources.map(source => source.file));
      stats.sourceFiles += sources.length;
      stats.packedFiles++;
      stats.sourceBytes += raw.length;
      stats.packedBytes += data.length;
      return { path, bytes: data.length, encoding: compressed ? 'gzip' : 'identity' };
    }

    const preview = store([readSource(manifest.preview)], `${manifest.preview.path}.gz`, { skipIfRaw: true });
    if (preview) manifest.preview.stored = preview;
    for (const [name, extension] of [['bc7', '.ktx2'], ['webp', '.webp']]) {
      const variant = manifest.variants[name];
      const textures = variant.files.filter(file => file.path.endsWith(extension));
      variant.textureBank = store(textures.map(readSource), `${name}/textures.bin`, { compress: name === 'bc7' });
    }
    selectCharacterPreviewVariant(manifest, ['texture-compression-bc']);
    const output = JSON.stringify(manifest);
    writeFileSync(manifestPath, output);
    stats.sourceBytes += sourceManifest.length;
    stats.packedBytes += Buffer.byteLength(output);
    for (const input of inputs) unlinkSync(input);
  }
  return stats;
}
