import test from 'node:test';import assert from 'node:assert/strict';import {webPackagePlugin} from '../tools/web-package.mjs';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';

test('development close never rewrites the production package',()=>{
 const plugin=webPackagePlugin();plugin.configResolved({command:'serve',root:'nonexistent-test-root',build:{outDir:'dist'}});assert.doesNotThrow(()=>plugin.closeBundle());
});

test('release stages selected static files without overwriting the generated bundle', async t => {
  const root = await mkdtemp(join(tmpdir(), 'wg-public-stage-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  async function write(path, text) {
    const file = join(root, path);
    await mkdir(dirname(file), { recursive: true });
    await writeFile(file, text);
  }
  for (const manifest of ['web-assets', 'audio-runtime', 'sfx-runtime', 'image-runtime']) {
    const records = manifest === 'web-assets' ? [{ source: 'assets/original.glb', runtime: 'assets/web/optimized.glb' }] : [];
    await write(`content/manifests/${manifest}.json`, JSON.stringify({ records }));
  }
  await write('public/assets/original.glb', 'original model');
  await write('public/assets/web/optimized.glb', 'optimized model');
  await write('public/index.html', 'static page');
  await write('public/qa/fixture.bin', 'development fixture');

  for (const retainQaFixtures of [false, true]) {
    const outDir = retainQaFixtures ? 'qa-dist' : 'dist';
    const plugin = webPackagePlugin({ retainQaFixtures });
    assert.deepEqual(plugin.config({}, { command: 'build' }), { build: { copyPublicDir: false } });
    plugin.configResolved({ command: 'build', root, publicDir: join(root, 'public'), build: { outDir } });
    await write(`${outDir}/index.html`, 'generated page');
    plugin.writeBundle({ dir: join(root, outDir) }, { 'index.html': {} });
    assert.equal(await readFile(join(root, outDir, 'assets/web/optimized.glb'), 'utf8'), 'optimized model');
    assert.equal(await readFile(join(root, outDir, 'index.html'), 'utf8'), 'generated page');
    await assert.rejects(readFile(join(root, outDir, 'assets/original.glb')), { code: 'ENOENT' });
    const fixture = readFile(join(root, outDir, 'qa/fixture.bin'), 'utf8');
    if (retainQaFixtures) assert.equal(await fixture, 'development fixture');
    else await assert.rejects(fixture, { code: 'ENOENT' });
  }
  assert.equal(await readFile(join(root, 'public/assets/original.glb'), 'utf8'), 'original model');
});
