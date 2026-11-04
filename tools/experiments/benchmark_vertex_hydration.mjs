import { createRequire } from 'node:module';
import { readFile, writeFile } from 'node:fs/promises';
import { basename, join } from 'node:path';

const [directory, previewPath, id] = process.argv.slice(2);
if (!directory || !previewPath) throw Error('Usage: node benchmark_vertex_hydration.mjs <materials-dir> <preview.glb> [asset-id]');
const manifest = JSON.parse(await readFile('public/qa/vertex-color-preview/manifest.json', 'utf8'));
const asset = manifest.assets.find(entry => entry.id === id);
if (id && !asset) throw Error('Unknown asset');
const sourceUrl = id === 'guardian' ? '/content/guardian/' + 'guardian.glb' : '/assets/' + asset?.sourceSha256 + '.glb';
const { chromium } = createRequire(import.meta.url)(process.env.PLAYWRIGHT_MODULE ?? 'playwright');
const browser = await chromium.launch({ channel: 'msedge', headless: true });
const observations = [];
try {
  const webgpu = process.env.WG_WEBGPU === '1';
  const modes = process.env.WG_MODES ? process.env.WG_MODES.split(',') : webgpu ? (process.env.WG_MATCH_TARGET === '1' ? ['async', 'target', 'target', 'async'] : ['direct', 'async', 'async', 'direct']) : id ? ['control', 'textured', 'textured', 'control'] : ['control', 'hydrate', 'hydrate', 'control'];
  const runs = process.env.WG_COUNTS ? process.env.WG_COUNTS.split(',').map(count => ({ mode: 'stable', variant: null, count: Number(count) })) : process.env.WG_VARIANTS ? process.env.WG_VARIANTS.split(',').map(variant => ({ mode: 'stable', variant })) : modes.map(mode => ({ mode, variant: null }));
  for (const { mode, variant, count = Number(process.env.WG_ACTOR_COUNT ?? 1) } of runs) {
    if (variant && !['webp', 'bc7'].includes(variant)) throw Error(`Invalid variant ${variant}`);
    const materialDirectory = variant ? join(directory, variant) : directory;
    const nativeBc7 = variant ? variant === 'bc7' : process.env.WG_NATIVE_BC7 === '1';
    const context = await browser.newContext({ viewport: { width: 512, height: 512 } });
    const page = await context.newPage(), errors = [];
    page.on('pageerror', error => errors.push(String(error)));
    page.on('requestfailed', request => errors.push(`${request.url()}: ${request.failure()?.errorText}`));
    await page.route('**/hydration-page', route => route.fulfill({ status: 200, contentType: 'text/html', body: '<!doctype html><body></body>' }));
    await page.route('**/hydration-files/*', async route => {
      const name = basename(new URL(route.request().url()).pathname);
      if (!/^[\w.-]+$/.test(name)) throw Error('Invalid filename');
      const file = name === 'preview.glb' ? previewPath : join(materialDirectory, name);
      const type = name.endsWith('.gltf') || name.endsWith('.json') ? 'application/json' : name.endsWith('.png') ? 'image/png' : name.endsWith('.jpg') ? 'image/jpeg' : name.endsWith('.webp') ? 'image/webp' : 'application/octet-stream';
      await route.fulfill({ status: 200, contentType: type, body: await readFile(file) });
    });
    await page.route('**/hydration-package/**', async route => {
      const path = new URL(route.request().url()).pathname.replace(/^\/hydration-package\//, '');
      if (!/^(?:package\.json|preview\.glb|(?:webp|bc7)\/[\w.-]+)$/.test(path)) throw Error('Invalid package path');
      const type = path.endsWith('.gltf') || path.endsWith('.json') ? 'application/json' : path.endsWith('.webp') ? 'image/webp' : 'application/octet-stream';
      await route.fulfill({ status: 200, contentType: type, body: await readFile(join(directory, path)) });
    });
    await page.goto(`${process.env.WG_BASE_URL ?? 'http://127.0.0.1:5175'}/hydration-page`);
    const result = webgpu
      ? process.env.WG_RENDER_WORKER === '1'
        ? await page.evaluate(async ({ mode, nativeBc7, count, beastToon, beastShadow, autoVariant, disableBc7, verifiedStream, captureBlend }) => (await import('/tests/browser/vertex-webgpu-worker-host.js')).runWorkerSwap(mode, nativeBc7, count, beastToon, beastShadow, autoVariant, disableBc7, verifiedStream, captureBlend), { mode, nativeBc7, count, beastToon: process.env.WG_BEAST_TOON === '1', beastShadow: process.env.WG_BEAST_SHADOW === '1', autoVariant: process.env.WG_AUTO_VARIANT === '1', disableBc7: process.env.WG_DISABLE_BC7 === '1', verifiedStream: process.env.WG_VERIFIED_STREAM === '1', captureBlend: !!process.env.WG_BLEND_CAPTURE_PREFIX })
        : await page.evaluate(async ({ mode, captureShaders, nativeBc7, count, beastToon, beastShadow, autoVariant, disableBc7 }) => (await import('/tests/browser/vertex-webgpu-swap.js')).runVertexWebGpuSwap({ mode, captureShaders, nativeBc7, count, beastToon, beastShadow, autoVariant, disableBc7 }), { mode, captureShaders: process.env.WG_CAPTURE_SHADERS === '1', nativeBc7, count, beastToon: process.env.WG_BEAST_TOON === '1', beastShadow: process.env.WG_BEAST_SHADOW === '1', autoVariant: process.env.WG_AUTO_VARIANT === '1', disableBc7: process.env.WG_DISABLE_BC7 === '1' })
      : await page.evaluate(async ({ mode, sourceUrl }) => (await import('/tests/browser/vertex-hydration-benchmark.js')).runHydrationBenchmark({ mode, sourceUrl }), { mode, sourceUrl });
    if (errors.length) throw Error(JSON.stringify(errors));
    if (process.env.WG_BLEND_CAPTURE_PREFIX) {
      if (observations.length || result.captures.length !== 4) throw Error('Blend capture requires exactly one run and four frames');
      for (const capture of result.captures) await writeFile(`${process.env.WG_BLEND_CAPTURE_PREFIX}-${capture.level}.png`, Buffer.from(capture.bytes));
      delete result.captures;
    }
    if (process.env.WG_SCREENSHOT && observations.length === 0) await page.screenshot({ path: process.env.WG_SCREENSHOT });
    observations.push({ ...result, variant }); await context.close();
  }
  let transferProbe;
  if (webgpu && process.env.WG_TRANSFER_PROBE === '1') {
    const page = await browser.newPage();
    await page.route('**/hydration-page', route => route.fulfill({ status: 200, contentType: 'text/html', body: '<!doctype html><body></body>' }));
    await page.goto(`${process.env.WG_BASE_URL ?? 'http://127.0.0.1:5175'}/hydration-page`);
    transferProbe = await page.evaluate(async () => (await import('/tests/browser/vertex-webgpu-worker-host.js')).probeWebGpuTransfer());
    await page.close();
  }
  const json = JSON.stringify({ note: `Headless controlled ${webgpu ? 'WebGPU' : 'WebGL'} experiment; local Playwright routes; contexts isolated but process and driver caches may be warm.`, observations, transferProbe }, null, 2);
  if (process.env.WG_OUTPUT) await writeFile(process.env.WG_OUTPUT, json); else console.log(json);
} finally { await browser.close(); }
