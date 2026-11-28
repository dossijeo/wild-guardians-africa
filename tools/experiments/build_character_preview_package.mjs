import { execFile } from 'node:child_process';
import { createHash } from 'node:crypto';
import { cp, mkdir, mkdtemp, readFile, realpath, readdir, rm, stat, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { basename, isAbsolute, join, relative, resolve } from 'node:path';
import { promisify } from 'node:util';

// Builds an isolated pilot package. Existing game assets are never changed.
const [id, outputArg] = process.argv.slice(2);
if (!['hyena', 'buffalo', 'lion', 'rhino', 'warthog', 'youngMale', 'olderMale', 'olderFemale', 'youngFemale'].includes(id) || !outputArg) throw Error('Usage: node build_character_preview_package.mjs <hyena|buffalo|lion|rhino|warthog|youngMale|olderMale|olderFemale|youngFemale> <new-output-directory>');
const run = promisify(execFile), output = resolve(outputArg), tempRoot = await realpath(tmpdir());
const scratch = await mkdtemp(join(tempRoot, 'wg-character-package-'));
const actualScratch = await realpath(scratch), rel = relative(tempRoot, actualScratch);
if (!rel || rel.startsWith('..') || isAbsolute(rel) || !basename(actualScratch).startsWith('wg-character-package-')) throw Error('Unexpected temporary directory');
const payload = join(actualScratch, 'package');
async function command(script, ...args) {
  const result = await run(process.execPath, [script, ...args], { cwd: process.cwd(), maxBuffer: 4 * 1024 * 1024 });
  if (result.stderr.trim()) process.stderr.write(result.stderr);
  return result.stdout;
}
const hash = data => createHash('sha256').update(data).digest('hex');
try {
  await mkdir(payload);
  const plain = join(actualScratch, 'preview-uncompressed.glb'), compressed = join(payload, 'preview.glb'), sourceMaterials = join(actualScratch, 'source-materials');
  await command('tools/experiments/pack_vertex_color_preview.mjs', id, plain);
  await command('tools/compress_web_assets.mjs', '--candidate', plain, compressed);
  await rm(`${compressed}.compression.json`, { force: true });
  await command('tools/experiments/extract_vertex_preview_materials.mjs', id, sourceMaterials);
  const pilot = JSON.parse(await command('tools/experiments/build_vertex_bc7_pilot.mjs', sourceMaterials, payload));
  const variants = {};
  for (const variant of ['webp', 'bc7']) {
    const directory = join(payload, variant), files = [];
    for (const name of (await readdir(directory)).sort()) {
      const path = join(directory, name), data = await readFile(path);
      files.push({ path: `${variant}/${name}`, bytes: data.length, sha256: hash(data) });
    }
    variants[variant] = { requires: variant === 'bc7' ? ['texture-compression-bc'] : [], files };
  }
  const preview = await readFile(compressed);
  const manifest = { schemaVersion: 1, id, sourceModel: pilot.model, preview: { path: 'preview.glb', bytes: preview.length, sha256: hash(preview), requires: ['EXT_meshopt_compression'] }, variants };
  await writeFile(join(payload, 'package.json'), `${JSON.stringify(manifest, null, 2)}\n`);
  // Do not overwrite an existing package. Only the verified temporary scratch
  // tree is recursively removed; the caller's output path is never deleted.
  await mkdir(output);
  await cp(payload, output, { recursive: true, force: false, errorOnExist: true });
  console.log(JSON.stringify({ output, id, previewBytes: preview.length, webpBytes: variants.webp.files.reduce((sum, file) => sum + file.bytes, 0), bc7Bytes: variants.bc7.files.reduce((sum, file) => sum + file.bytes, 0), sourceRuntimeBytes: (await stat(join('public', pilot.model))).size }));
} finally {
  await rm(actualScratch, { recursive: true, force: true });
}
