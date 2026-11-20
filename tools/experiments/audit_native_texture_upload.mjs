import { createRequire } from 'node:module';
import { readFile } from 'node:fs/promises';

const { chromium } = createRequire(import.meta.url)(process.env.PLAYWRIGHT_MODULE ?? 'playwright');
const browser = await chromium.launch({ channel: 'msedge', headless: true, args: ['--enable-unsafe-webgpu'] });
const base = process.env.QA_BASE_URL ?? 'http://127.0.0.1:5218';
const errors = [];
let watchdog;
try {
  const page = await browser.newPage();
  page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
  page.on('pageerror', error => errors.push(error.message));
  await page.route(base + '/native-texture-physical-audit', route => route.fulfill({ contentType: 'text/html', body: '<link rel="icon" href="data:,"><canvas width="32" height="32"></canvas>' }));
  await page.route(base + '/native-texture-physical-owner.js', async route => route.fulfill({ contentType: 'text/javascript', body: await readFile(new URL('../../tests/browser/fixtures/native-texture-upload-audit-worker.js', import.meta.url), 'utf8') }));
  if (process.env.QA_BASELINE_HOST) await page.route('**/src/rendering/remote-webgpu-host.js', async route => route.fulfill({ contentType: 'text/javascript', body: await readFile(process.env.QA_BASELINE_HOST, 'utf8') }));
  await page.goto(base + '/native-texture-physical-audit');
  const result = await Promise.race([page.evaluate(async () => {
    const { createRemoteWebGpuClient } = await import('/src/rendering/remote-webgpu-client.js');
    const worker = new Worker('/native-texture-physical-owner.js', { type: 'module' });
    const channel = new MessageChannel(), requests = new Map(), errors = [];
    let nextId = 0, client;
    worker.onmessage = ({ data: { id, result, error } }) => {
      const request = requests.get(id);
      requests.delete(id);
      if (error) request.reject(Error(error)); else request.resolve(result);
    };
    worker.onerror = event => { for (const { reject } of requests.values()) reject(Error(event.message)); };
    const rpc = (op, args = {}, transfer = []) => new Promise((resolve, reject) => {
      const id = ++nextId;
      requests.set(id, { resolve, reject });
      worker.postMessage({ id, op, ...args }, transfer);
    });
    try {
      const canvas = document.querySelector('canvas').transferControlToOffscreen();
      const adapter = await rpc('init', { canvas, port: channel.port2 }, [canvas, channel.port2]);
      client = createRemoteWebGpuClient({ port: channel.port1, capabilities: { width: 32, height: 32, format: 'bgra8unorm' }, onError: error => errors.push(error.message) });
      const { device, context } = client;
      context.configure({ device, format: 'bgra8unorm' });
      const descriptor = { size: [1, 64], format: 'rgba8unorm', usage: 23 };
      const texture = device.createTexture({ ...descriptor, label: 'written-sampled-texture' });
      const neighbor = device.createTexture({ ...descriptor, label: 'unchanged-sampled-texture' });
      const uniform = device.createBuffer({ size: 16, usage: 72 });
      const shader = device.createShaderModule({ code: `
        @group(0) @binding(0) var written: texture_2d<f32>;
        @group(0) @binding(1) var unchanged: texture_2d<f32>;
        @vertex fn vert(@builtin(vertex_index) i:u32)->@builtin(position) vec4f {
          let p = array(vec2f(-1,-1), vec2f(3,-1), vec2f(-1,3)); return vec4f(p[i],0,1);
        }
        @fragment fn frag()->@location(0) vec4f {
          return vec4f(textureLoad(written,vec2i(0,10),0).r, textureLoad(unchanged,vec2i(0,10),0).r, 0, 1);
        }` });
      const pipeline = await device.createRenderPipelineAsync({ layout: 'auto', vertex: { module: shader, entryPoint: 'vert' }, fragment: { module: shader, entryPoint: 'frag', targets: [{ format: 'bgra8unorm' }] } });
      const group = device.createBindGroup({ layout: pipeline.getBindGroupLayout(0), entries: [{ binding: 0, resource: texture.createView() }, { binding: 1, resource: neighbor.createView() }] });
      const put = (target, start, rows, value) => device.queue.writeTexture({ texture: target, origin: [0, start, 0] }, new Uint8Array(rows * 4).fill(value), { bytesPerRow: 4 }, [1, rows]);
      function draw(update) {
        client.beginFrame();
        update?.();
        const encoder = device.createCommandEncoder();
        const pass = encoder.beginRenderPass({ colorAttachments: [{ view: context.getCurrentTexture().createView(), loadOp: 'clear', storeOp: 'store' }] });
        pass.setPipeline(pipeline); pass.setBindGroup(0, group); pass.draw(3); pass.end();
        device.queue.submit([encoder.finish()]);
        const receipt = client.endFrame(); receipt.catch(() => {});
        return receipt;
      }
      async function waitPending() {
        for (let i = 0; i < 200; i++) {
          const info = await rpc('inspect');
          if (info.failed) throw Error(JSON.stringify(info));
          if (info.pendingSequence) return info;
          await new Promise(resolve => setTimeout(resolve, 10));
        }
        throw Error('No admitted pending frame');
      }
      const first = draw(() => { put(texture, 0, 64, 1); put(neighbor, 0, 64, 2); });
      await waitPending(); await rpc('present'); await first;
      const pending = draw(() => put(texture, 10, 1, 3));
      const before = await waitPending(), beforeClient = client.inspect().resourcesCreated;
      put(texture, 20, 1, 9);
      device.queue.writeBuffer(uniform, 0, new Uint32Array([7]));
      let fenceError = null;
      try { await device.queue.onSubmittedWorkDone(); } catch (error) { fenceError = error.message; }
      const after = await rpc('inspect');
      if (fenceError) return { adapter, before, after, fenceError, errors };
      const read = await rpc('read'), afterClient = client.inspect().resourcesCreated;
      await rpc('present'); await pending;
      const oldAfterPending = (await rpc('read')).written[0];
      const last = draw(); await waitPending(); await rpc('present'); await last;
      await device.queue.onSubmittedWorkDone();
      const final = await rpc('inspect');
      function matches(rows, expected) { return rows.every((rgba, row) => rgba.every(channel => channel === expected(row))); }
      const pass = after.textureForks === 1 && after.bindingForks === 2 && !after.stagedOperations && before.resources === after.resources && beforeClient === afterClient && read.written.length === 2 && read.unchanged.length === 1 && matches(read.written[0], () => 1) && matches(read.written[1], row => row === 10 ? 3 : row === 20 ? 9 : 1) && matches(oldAfterPending, row => row === 10 ? 3 : 1) && matches(read.unchanged[0], () => 2) && final.activeSequence > before.pendingSequence && !final.failed && !final.validationErrors.length && !final.errors.length && !errors.length;
      return { pass, adapter, before, after, final, beforeClient, afterClient, checkedPhysicalTexels: { oldBeforePresentation: read.written[0].length, new: read.written[1].length, oldAfterPresentation: oldAfterPending.length, unchanged: read.unchanged[0].length }, errors };
    } finally { client?.dispose(); await rpc('dispose'); worker.terminate(); }
  }), new Promise((_, reject) => { watchdog = setTimeout(() => reject(Error('Physical texture upload deadline')), 30000); })]);
  console.log(JSON.stringify({ ...result, errorsInPage: errors }));
  const expected = process.env.QA_BASELINE_HOST ? /uncommitted/.test(result.fenceError ?? '') : result.pass && !errors.length;
  if (!expected) process.exitCode = 1;
} finally { clearTimeout(watchdog); await browser.close(); }
