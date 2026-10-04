// Runs only when the executable receives --smoke-report PATH. Normal play is untouched.
(async () => {
  if (window.__desktopSmokeStarted) return;
  window.__desktopSmokeStarted = true;
  const report = {ok: false, origin: location.origin, userAgent: navigator.userAgent, secureContext: isSecureContext, checks: {}, errors: []};
  const consoleError = console.error;
  console.error = (...args) => {report.errors.push(args.map(String).join(' ')); consoleError.apply(console, args);};
  const fail = event => report.errors.push(event.message || String(event.reason));
  addEventListener('error', fail); addEventListener('unhandledrejection', fail);
  const timeout = setTimeout(() => finish(new Error('Desktop smoke timed out')), 180000);
  let finished = false;
  async function finish(error) {
    if (finished) return;
    finished = true;
    clearTimeout(timeout);
    if (error) report.errors.push(String(error));
    report.ok = !error && report.errors.length === 0;
    await window.__TAURI_INTERNALS__.invoke('desktop_smoke_report', {report});
  }
  async function checkVisibility(fixture) {
    const transitions=[],wait=ms=>new Promise(resolve=>setTimeout(resolve,ms));
    report.checks.visibility={passed:false,phase:'visible-baseline',transitions};
    document.addEventListener('visibilitychange',()=>transitions.push({state:document.visibilityState,at:performance.now()}));
    const until=async predicate=>{const deadline=performance.now()+20000;while(!predicate()){if(performance.now()>deadline)throw Error('Native visibility transition absent');await wait(100);}};
    const core=s=>Object.fromEntries(['day','time','elapsed','rng','ledger','plants','structures','workers','crates','tasks','spells','cooldowns','raid','nightPlan','dayPlan','result','completedNights','postgame','commandIds','villages','suppressed'].map(key=>[key,s[key]]));
    const sample=({resume=true}={})=>{
      if(!document.querySelector('#save'))document.querySelector('#menuButton').click();
      const save=document.querySelector('#save');if(!save)throw Error('Pause/save UI missing');save.click();
      const snapshot=JSON.parse(localStorage.getItem('wild-guardians:slot:'+fixture.slotId));
      if(snapshot.slotId!==fixture.slotId)throw Error('Wrong visibility slot');
      if(resume)document.querySelector('#resume').click();
      return snapshot;
    };
    if(document.hidden)throw Error('Visibility fixture starts hidden');
    const before=sample();await wait(2000);const advancing=sample();
    if(advancing.elapsed<=before.elapsed||advancing.pauses.some(p=>p!=='menu'))throw Error('Visible fixture does not advance freely');
    if(!advancing.raid||!advancing.spells.some(s=>s.kind==='shield'&&s.remaining>0))throw Error('Visibility fixture lost active raid or magic');
    report.checks.visibility.phase='minimize';
    report.checks.visibility.nativeMinimized=await window.__TAURI_INTERNALS__.invoke('desktop_smoke_minimize');
    if(!report.checks.visibility.nativeMinimized)throw Error('Native window did not minimize');
    await until(()=>document.hidden);
    report.checks.visibility.phase='hidden-interval';
    // Saving briefly opens the menu; close it so hidden is the sole blocker
    // during the measured interval. Retain the menu only at its end.
    const hiddenStart=sample(),hiddenAt=performance.now();
    if(!hiddenStart.pauses.includes('hidden')||!hiddenStart.pauses.includes('menu'))throw Error('Hidden/menu pauses not stacked');
    await wait(3500);
    if(!document.hidden)throw Error('Native hidden interval too short');
    const hiddenEnd=sample({resume:false}),hiddenMs=performance.now()-hiddenAt;
    if(JSON.stringify(core(hiddenStart))!==JSON.stringify(core(hiddenEnd)))throw Error('Game progressed while genuinely hidden');
    report.checks.visibility.phase='restore';
    await until(()=>!document.hidden);
    const visibleMenu=sample({resume:false});
    if(visibleMenu.pauses.includes('hidden')||!visibleMenu.pauses.includes('menu'))throw Error('Native restore released the wrong pause');
    if(JSON.stringify(core(hiddenEnd))!==JSON.stringify(core(visibleMenu)))throw Error('Game advanced behind retained menu');
    report.checks.visibility.phase='resume';
    document.querySelector('#resume').click();const resumedAt=performance.now();await wait(2000);const resumed=sample();
    const delta=resumed.elapsed-visibleMenu.elapsed,visibleMs=performance.now()-resumedAt;
    if(delta<=0||delta>visibleMs/1000*5+.5)throw Error('Visible game failed to resume or caught up hidden time');
    if(!transitions.some(t=>t.state==='hidden')||!transitions.some(t=>t.state==='visible'))throw Error('Real visibility events missing');
    return {passed:true,transitions,hiddenMs,visibleMs,resumedSimulatedSeconds:delta,hiddenStart:core(hiddenStart),hiddenEnd:core(hiddenEnd),visibleMenuPauses:visibleMenu.pauses,scope:'Real native minimization and restoration. Hidden is the sole blocker during the measured interval; menu is retained at its end to test stacked pauses on restoration. Save buttons intentionally add notices, so comparison covers simulation fields and excludes savedAt, notices, tutorial presentation and their nextId counter. No document.hidden override or synthetic visibilitychange.'};
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
    const fixture = await window.__TAURI_INTERNALS__.invoke('desktop_smoke_fixture');
    if (fixture) {localStorage.setItem('wild-guardians:slot:'+fixture.slotId,fixture.snapshot);send({action:'load-slot',slotId:fixture.slotId});}
    else send({action: 'start', biome: 'gran-canon', culture: 'mapungubwe'});
    const worldEnd = performance.now() + 90000;
    while (document.querySelector('#stage')?.getAttribute('aria-busy') !== 'false' && performance.now() < worldEnd) await new Promise(resolve => setTimeout(resolve, 100));
    if (document.querySelector('#stage')?.getAttribute('aria-busy') !== 'false') throw Error('Production world did not finish loading');
    await new Promise(resolve => setTimeout(resolve, 1000));
    const world = document.querySelector('#world');
    if (!world || world.width === 0 || world.height === 0) throw Error('Production world canvas missing');
    report.checks.world = {biome: 'gran-canon', culture: 'mapungubwe', width: world.width, height: world.height};
    await new Promise(resolve => requestAnimationFrame(resolve));
    report.worldPng = world.toDataURL('image/png');
    if (fixture) report.checks.visibility = await checkVisibility(fixture);
    report.checks.saveKeys = Object.keys(localStorage).filter(key => key.startsWith('wild-guardians:'));
    await finish();
  } catch (error) { await finish(error); }
})();
