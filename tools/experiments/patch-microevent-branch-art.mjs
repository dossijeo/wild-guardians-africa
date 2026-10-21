import sharp from 'sharp';
import {execFileSync} from 'node:child_process';

// Preserve every reviewed sprite outside branch cell 59, including atlas alpha.
const fresh = await sharp('assets-source/microevents/lowpoly-atlas.png').ensureAlpha().raw().toBuffer();
const base = await sharp(execFileSync('git', ['show', 'cd6c9af0d:public/content/microevents/atlas.webp'])).ensureAlpha().raw().toBuffer();
for (let y = 0; y < 64; y++) {
  const offset = ((7 * 64 + y) * 512 + 3 * 64) * 4;
  fresh.copy(base, offset, offset, offset + 64 * 4);
}
await sharp(base, {raw: {width: 512, height: 512, channels: 4}}).png().toFile('assets-source/microevents/lowpoly-atlas.png');
