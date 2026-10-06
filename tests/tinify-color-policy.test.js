import test from 'node:test';
import assert from 'node:assert/strict';
import sharp from 'sharp';
import {createHash} from 'node:crypto';
import {requireTinifyColorInput} from '../tools/tinify-color-policy.mjs';

async function record(bytes) {
 const m = await sharp(bytes, {animated: true}).metadata();
 return {distributed: true, requiresExactPixels: false, roles: ['color'], sha256: createHash('sha256').update(bytes).digest('hex'), format: m.format, width: m.width, height: m.height, alpha: m.hasAlpha, pages: m.pages ?? 1};
}
const image = () => sharp({create: {width: 4, height: 3, channels: 4, background: '#40802080'}});

test('ordinary RGBA8 color images pass with actual dimensions and transparency', async () => {
 for (const format of ['png', 'jpeg', 'webp']) {
  const bytes = await image()[format]().toBuffer();
  const metadata = await requireTinifyColorInput(await record(bytes), bytes);
  assert.equal(metadata.width, 4); assert.equal(metadata.height, 3);
  assert.equal(metadata.hasAlpha, format !== 'jpeg');
 }
});
test('data, mixed roles, unknown and undistributed files cannot reach an upload', async () => {
 const bytes = await image().png().toBuffer(), item = await record(bytes);
 for (const change of [{roles: ['color', 'normal']}, {roles: ['unclassified']}, {roles: []}, {requiresExactPixels: true}, {distributed: false}]) await assert.rejects(requireTinifyColorInput({...item, ...change}, bytes), /reviewed distributed/);
});
test('profiled JPEG needs explicit color review before an upload is attempted', async () => {
 const bytes = await image().withIccProfile('srgb').jpeg().toBuffer();
 assert((await sharp(bytes).metadata()).icc);
 await assert.rejects(requireTinifyColorInput(await record(bytes), bytes), /color-profile review/);
});
test('16-bit PNG cannot be silently reduced to eight bits by color optimization', async () => {
 const bytes = await image().toColourspace('rgb16').png().toBuffer();
 assert.equal((await sharp(bytes).metadata()).bitsPerSample, 16);
 await assert.rejects(requireTinifyColorInput(await record(bytes), bytes), /depth\/color-space review/);
});
test('oriented image cannot be uploaded before reviewing its placement', async () => {
 const bytes = await image().withMetadata({orientation: 6}).jpeg().toBuffer();
 assert.equal((await sharp(bytes).metadata()).orientation, 6);
 await assert.rejects(requireTinifyColorInput(await record(bytes), bytes), /orientation review/);
});
test('stale hashes and metadata are rejected even with a valid color classification', async () => {
 const bytes = await image().webp().toBuffer(), item = await record(bytes);
 await assert.rejects(requireTinifyColorInput({...item, sha256: '0'.repeat(64)}, bytes), /stale/);
 await assert.rejects(requireTinifyColorInput({...item, width: 5}, bytes), /metadata/);
 await assert.rejects(requireTinifyColorInput({...item, format: 'png'}, bytes), /format/);
});
