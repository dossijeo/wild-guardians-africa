// Runs only when the executable receives --smoke-report PATH. Normal play is untouched.
(async () => {
  if (window.__desktopSmokeStarted) return;
  window.__desktopSmokeStarted = true;
  const report = {ok: false, origin: location.origin, userAgent: navigator.userAgent, secureContext: isSecureContext, checks: {}, errors: []};
  const fail = event => report.errors.push(event.message || String(event.reason));
  addEventListener('error', fail); addEventListener('unhandledrejection', fail);
  const timeout = setTimeout(() => finish(new Error('Desktop smoke timed out')), 180000);
  async function finish(error) {
    clearTimeout(timeout);
    if (error) report.errors.push(String(error));
    report.ok = !error && report.errors.length === 0;
    await window.__TAURI_INTERNALS__.invoke('desktop_smoke_report', {report});
  }
  try {
    const load = async path => { const response = await fetch(new URL(path, location.href)); if (!response.ok) throw Error(`${path}: ${response.status}`); return response; };
    const manifest = await (await load('content/web-assets.json')).json();
    const {decodeWebGlb} = await import(new URL('runtime/glb-legacy.js', location.href));
    report.checks.models = [];
    // Decode every shipped culture, worker and beast using the production WASM decoder.
    for (const model of manifest.records) {
      const decoded = await decodeWebGlb(await (await load(model.runtime)).arrayBuffer());
      if (new DataView(decoded).getUint32(0, true) !== 0x46546c67) throw Error('Invalid decoded GLB');
      report.checks.models.push(model.runtime);
    }
    const canvas = document.createElement('canvas'), gl = canvas.getContext('webgl2');
    if (!gl) throw Error('WebGL 2 unavailable');
    report.checks.webgl2 = true; gl.getExtension('WEBGL_lose_context')?.loseContext();
    const blob = URL.createObjectURL(new Blob(['postMessage(42)'], {type: 'text/javascript'}));
    const worker = new Worker(blob);
    await new Promise((resolve, reject) => {worker.onmessage = event => event.data === 42 ? resolve() : reject(Error('Worker reply')); worker.onerror = reject;});
    worker.terminate(); URL.revokeObjectURL(blob); report.checks.worker = true;
    const bank = await (await load('content/sfx.json')).json();
    const context = new AudioContext();
    const audio = await context.decodeAudioData(await (await load(`assets/${bank.items[0].sha256}.mp3`)).arrayBuffer());
    report.checks.audioSeconds = audio.duration; await context.close();
    localStorage.setItem('wild-guardians:desktop-smoke', 'roundtrip');
    if (localStorage.getItem('wild-guardians:desktop-smoke') !== 'roundtrip') throw Error('Storage failed');
    localStorage.removeItem('wild-guardians:desktop-smoke'); report.checks.storage = true;
    const end = performance.now() + 60000;
    while (!document.querySelector('#app iframe') && performance.now() < end) await new Promise(resolve => setTimeout(resolve, 100));
    const menu = document.querySelector('#app iframe');
    if (!menu) throw Error('Native menu iframe did not appear');
    report.checks.menu = menu.src;
    const send = data => dispatchEvent(new MessageEvent('message', {origin: location.origin, source: menu.contentWindow, data: {type: 'wild-guardians:menu', ...data}}));
    send({action: 'settings-change', settings: {quality: 'muy_baja', sfx: 0, music: 0}});
    send({action: 'start', biome: 'gran-canon', culture: 'mapungubwe'});
    const worldEnd = performance.now() + 90000;
    while (document.querySelector('#stage')?.getAttribute('aria-busy') !== 'false' && performance.now() < worldEnd) await new Promise(resolve => setTimeout(resolve, 100));
    if (document.querySelector('#stage')?.getAttribute('aria-busy') !== 'false') throw Error('Production world did not finish loading');
    await new Promise(resolve => setTimeout(resolve, 1000));
    const world = document.querySelector('#world');
    if (!world || world.width === 0 || world.height === 0) throw Error('Production world canvas missing');
    report.checks.world = {biome: 'gran-canon', culture: 'mapungubwe', width: world.width, height: world.height};
    report.checks.saveKeys = Object.keys(localStorage).filter(key => key.startsWith('wild-guardians:'));
    await finish();
  } catch (error) { await finish(error); }
})();
