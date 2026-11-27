import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, unlinkSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { gzipSync } from 'node:zlib';
import {
  ANIMAL_ATTACK_BAKES, BAKE_BANK_DIRECTORY, MAX_BAKE_BANK_BYTES, MAX_BAKE_MEMBER_BYTES,
  WORKER_BAKE_DIRECTORIES, animalBakePath, workerBakePath
} from '../src/rendering/baked-animation-assets.js';
import { BAKED_WORKER_WALK_PROFILES } from '../src/rendering/baked-worker-walk-profiles.js';
import { ANIMAL_ACTIONS } from '../src/simulation/animal-actions-data.js';

export const bakedAnimationSources = new Map([
  ...BAKED_WORKER_WALK_PROFILES.map(profile => [profile, Object.keys(WORKER_BAKE_DIRECTORIES)
    .map(clip => [clip, workerBakePath(profile, clip)])]),
  ...Object.keys(ANIMAL_ACTIONS.animals).map(species => [species, ['Walking', 'Running', ...ANIMAL_ATTACK_BAKES]
    .map(clip => [clip, animalBakePath(species, clip)])])
]);

export function packageBakedAnimations(root) {
  const stats = { actors: bakedAnimationSources.size, clips: 0, sourceBytes: 0, packedBytes: 0 };
  mkdirSync(resolve(root, BAKE_BANK_DIRECTORY), { recursive: true });
  for (const [profile, sources] of bakedAnimationSources) {
    const output = resolve(root, BAKE_BANK_DIRECTORY, profile);
    const clips = {}, chunks = [], inputs = [];
    let offset = 0;
    for (const [clip, path] of sources) {
      const jsonPath = resolve(root, path + '.json');
      const binPath = resolve(root, path + '.bin');
      const json = readFileSync(jsonPath);
      const meta = JSON.parse(json);
      const binary = readFileSync(binPath);
      const digest = createHash('sha256').update(binary).digest('hex');
      if (meta.species !== profile || meta.clip !== clip || meta.byteLength !== binary.length || meta.sha256 !== digest) {
        throw Error(`Invalid authored animation ${path}`);
      }

      const metadata = Buffer.from(JSON.stringify(meta));
      const size = Buffer.alloc(4);
      size.writeUInt32LE(metadata.length);
      const decodedBytes = size.length + metadata.length + binary.length;
      if (decodedBytes > MAX_BAKE_MEMBER_BYTES) throw Error(`Baked animation too large ${path}`);
      const encoded = gzipSync(Buffer.concat([size, metadata, binary]));
      clips[clip] = { offset, length: encoded.length, decodedBytes };
      chunks.push(encoded);
      inputs.push(jsonPath, binPath);
      offset += encoded.length;
      stats.clips++;
      stats.sourceBytes += json.length + binary.length;
    }
    if (offset > MAX_BAKE_BANK_BYTES) throw Error(`Baked animation bank too large ${profile}`);
    const index = JSON.stringify({ version: 1, bytes: offset, clips });
    writeFileSync(output + '.json', index);
    writeFileSync(output + '.bin', Buffer.concat(chunks, offset));
    stats.packedBytes += Buffer.byteLength(index) + offset;
    for (const input of inputs) unlinkSync(input);
  }
  return stats;
}
