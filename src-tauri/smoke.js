// Runs only when the executable receives --smoke-report PATH. Normal play is untouched.
(async () => {
  if (window.__desktopSmokeStarted) return;
  window.__desktopSmokeStarted = true;
  const report = {ok: false, origin: location.origin, userAgent: navigator.userAgent, secureContext: isSecureContext, checks: {}, errors: []};
  const consoleError = console.error;
  console.error = (...args) => {report.errors.push(args.map(String).join(' ')); consoleError.apply(console, args);};
  const fail = event => report.errors.push(event.message || String(event.reason));
  addEventListener('error', fail); addEventListener('unhandledrejection', fail);
  const timeout = setTimeout(() => finish(new Error('Desktop smoke timed out')), 720000);
  let finished = false;
  let worldStartedAt = null;
  let worldReadyAt = null;
  async function finish(error) {
    if (finished) return;
    finished = true;
    clearTimeout(timeout);
    if (error) report.errors.push(String(error));
    report.checks.loadingRecipe={cropPairOverlap:window.__desktopSmokeCropPairOverlap===true};
    if (window.__desktopSmokeLoadingTrace === true) {
      try { report.checks.nativeLoadingTrace = window.__wildGuardiansNativeLoadingTrace?.report ?? {available:false}; }
      catch (traceError) { report.checks.nativeLoadingTrace = {available:false,error:String(traceError)}; }
    }
    // Read presentation state only. This is diagnostic context, not proof of
    // readiness or a GPU measurement; do not acquire another WebGL context.
    try {
      const stage = document.querySelector('#stage'), world = document.querySelector('#world');
      const progress = document.querySelector('.interactive-loading-track');
      report.checks.loadingAtFinish = {
        worldWaitMs: worldStartedAt === null ? null : (worldReadyAt ?? performance.now()) - worldStartedAt,
        readyGateReached: worldReadyAt !== null,
        stageBusy: stage?.getAttribute('aria-busy') ?? null,
        displayedProgress: progress?.getAttribute('aria-valuenow') ?? null,
        phaseLabel: document.querySelector('.interactive-loading-title')?.textContent ?? null,
        visibility: document.visibilityState, focused: document.hasFocus(),
        canvas: world ? {width: world.width, height: world.height} : null,
        scope: 'Presentation snapshot only; displayed progress and canvas dimensions do not establish world readiness or GPU identity.'
      };
    } catch (observationError) {
      report.checks.loadingObservationError = String(observationError);
    }
    if (window.__desktopSmokeVisualCapture === true) {
      const visual = window.__wildGuardiansLoadingVisualQa?.report;
      report.checks.loadingVisual = visual ?? {available: false, scope: 'Visual capture requested; application collector was not installed.'};
      if (window.__desktopSmokeVisualPlant === true) {
        const action = visual?.plantAction;
        const additional = visual?.frames?.find(frame => frame.label === 'additional-plant' && frame.plants?.length === 5);
        if (!action?.result || action.afterCount !== 5 || action.logicalPlantsUnchanged !== true || !additional) {
          report.errors.push('Requested synthetic loading plant evidence is missing or failed');
        }
        if (window.__desktopSmokeVisualPlantProgress65 === true) {
          const before = visual?.frames?.find(frame=>frame.label==='preplant');
          const mid = visual?.frames?.find(frame=>frame.label==='catchup-mid');
          const mature = visual?.frames?.find(frame=>frame.label==='mature');
          if (!before || before.progress<.65 || before.plants.length!==4 || action?.progress<.65 || !mid || mid.plants.length!==5 || !(mid.plants[4].growth>0 && mid.plants[4].growth<mid.plants[0].growth) || !mature || mature.plants.length!==5 || !mature.plants.every(plant=>plant.growth===mature.plants[0].growth)) {
            report.errors.push('Natural-progress65 planting/catch-up evidence is missing or failed');
          }
        }
      }
      // Never turn a missing/empty capture into positive visual evidence. Keep
      // preflight errors intact and leave ordinary timing runs unchanged.
      if (!error && (!visual || !visual.frames?.length)) report.errors.push('Requested loading visual evidence is missing');
      report.checks.loadingVisualRunScope = 'Opt-in PNG readback/encoding overhead; not a loading-time or GPU benchmark. Frames are existing diorama canvas, not a composited HUD screenshot.';
    }
    if(window.__desktopSmokeCoverage===true&&!report.checks.worldSelection)report.checks.worldSelection={requested:window.__desktopSmokeSelection,actual:window.__wildGuardiansSmokeCoverage??null};
    report.ok = !error && report.errors.length === 0;
    await window.__TAURI_INTERNALS__.invoke('desktop_smoke_report', {report});
  }
  function checkSmokeCoveragePreview(selection,preview) {
    if(preview?.biome!==selection.biome||preview?.culture!==selection.culture)throw Error('Fixture preview does not match requested smoke selection');
  }
  function checkSmokeCoverageReady(selection,observation,fixture) {
    if(observation?.phase!=='ready'||observation.actual?.biome!==selection.biome||observation.actual?.culture!==selection.culture||(fixture&&observation.actual.slotId!==fixture.slotId))throw Error('Actual ready world does not match smoke selection');
  }
  async function listFixtureForSmoke(menu,fixture,send) {
    const target=menu.contentWindow;
    if(!target)throw Error('Fixture menu window is missing');
    return await new Promise((resolve,reject)=>{
      let settled=false,timer;
      const cleanup=()=>{target.removeEventListener('message',receive);clearTimeout(timer);};
      const end=(error,slot)=>{if(settled)return;settled=true;cleanup();if(error)reject(error);else resolve({listed:true,slotId:slot.slotId,preview:{day:slot.day,time:slot.time,biome:slot.biome,culture:slot.culture},scope:'Actual App listedSaves response, not manually decoded fixture clock.'});};
      const receive=event=>{
        if(event.origin!==location.origin||event.source!==window||event.data?.type!=='wild-guardians:menu-data'||!Array.isArray(event.data.slots))return;
        if(menu.contentWindow!==target||document.querySelector('#app iframe')!==menu){end(Error('Fixture menu was replaced'));return;}
        const slot=event.data.slots.find(slot=>slot?.slotId===fixture.slotId);
        if(slot)end(null,slot);
      };
      target.addEventListener('message',receive);
      timer=setTimeout(()=>end(Error('Fixture slot did not appear in actual menu save list')),10000);
      try{send({action:'request-saves'});}catch(error){end(error);}
    });
  }
  async function checkVisibility(fixture) {
    const transitions=[],wait=ms=>new Promise(resolve=>setTimeout(resolve,ms));
    report.checks.visibility={passed:false,phase:'visible-baseline',transitions};
    document.addEventListener('visibilitychange',()=>transitions.push({state:document.visibilityState,at:performance.now()}));
    const until=async predicate=>{const deadline=performance.now()+20000;while(!predicate()){if(performance.now()>deadline)throw Error('Native visibility transition absent');await wait(100);}};
    const core=s=>Object.fromEntries(['day','time','elapsed','rng','ledger','plants','structures','workers','crates','tasks','spells','cooldowns','raid','nightPlan','dayPlan','result','completedNights','postgame','commandIds','villages','suppressed'].map(key=>[key,s[key]]));
    const readSlot=()=>new Promise((resolve,reject)=>{
      const request=indexedDB.open('wild-guardians-saves',1);
      request.onerror=()=>reject(request.error);
      request.onsuccess=()=>{
        const db=request.result,tx=db.transaction('slots','readonly'),get=tx.objectStore('slots').get(fixture.slotId);let text=null;
        get.onsuccess=()=>{text=get.result?.primary??null;};
        tx.oncomplete=()=>{db.close();resolve(text);};tx.onabort=()=>{db.close();reject(tx.error);};
      };
    });
    const sample=async({resume=true}={})=>{
      const previous=await readSlot();
      if(!document.querySelector('#save'))document.querySelector('#menuButton').click();
      const save=document.querySelector('#save');if(!save)throw Error('Pause/save UI missing');save.click();
      const deadline=performance.now()+20000;let text=await readSlot();
      while(!text||text===previous){if(performance.now()>deadline)throw Error('IndexedDB save did not commit');await wait(50);text=await readSlot();}
      const snapshot=JSON.parse(text);
      report.checks.saveBackend='IndexedDB';
      if(snapshot.slotId!==fixture.slotId)throw Error('Wrong visibility slot');
      if(resume)document.querySelector('#resume').click();
      return snapshot;
    };
    if(document.hidden)throw Error('Visibility fixture starts hidden');
    const before=await sample();await wait(2000);const advancing=await sample();
    if(advancing.elapsed<=before.elapsed||advancing.pauses.some(p=>p!=='menu'))throw Error('Visible fixture does not advance freely');
    if(!advancing.raid||!advancing.spells.some(s=>s.kind==='shield'&&s.remaining>0))throw Error('Visibility fixture lost active raid or magic');
    report.checks.visibility.phase='minimize';
    report.checks.visibility.nativeMinimized=await window.__TAURI_INTERNALS__.invoke('desktop_smoke_minimize');
    if(!report.checks.visibility.nativeMinimized)throw Error('Native window did not minimize');
    await until(()=>document.hidden);
    report.checks.visibility.phase='hidden-interval';
    // Saving briefly opens the menu; close it so hidden is the sole blocker
    // during the measured interval. Retain the menu only at its end.
    const hiddenStart=await sample(),hiddenAt=performance.now();
    if(!hiddenStart.pauses.includes('hidden')||!hiddenStart.pauses.includes('menu'))throw Error('Hidden/menu pauses not stacked');
    await wait(300000);
    if(!document.hidden)throw Error('Native hidden interval too short');
    const hiddenEnd=await sample({resume:false}),hiddenMs=performance.now()-hiddenAt;
    if(JSON.stringify(core(hiddenStart))!==JSON.stringify(core(hiddenEnd)))throw Error('Game progressed while genuinely hidden');
    report.checks.visibility.phase='restore';
    await until(()=>!document.hidden);
    const visibleMenu=await sample({resume:false});
    if(visibleMenu.pauses.includes('hidden')||!visibleMenu.pauses.includes('menu'))throw Error('Native restore released the wrong pause');
    if(JSON.stringify(core(hiddenEnd))!==JSON.stringify(core(visibleMenu)))throw Error('Game advanced behind retained menu');
    report.checks.visibility.phase='resume';
    document.querySelector('#resume').click();const resumedAt=performance.now();await wait(2000);const resumed=await sample();
    const delta=resumed.elapsed-visibleMenu.elapsed,visibleMs=performance.now()-resumedAt;
    const maxScale=visibleMenu.raid&&resumed.raid&&visibleMenu.raid.id===resumed.raid.id?1:5;
    if(delta<=0||delta>visibleMs/1000*maxScale+.1)throw Error('Visible game failed to resume or caught up hidden time');
    if(!transitions.some(t=>t.state==='hidden')||!transitions.some(t=>t.state==='visible'))throw Error('Real visibility events missing');
    return {passed:true,transitions,hiddenMs,visibleMs,resumedSimulatedSeconds:delta,hiddenStart:core(hiddenStart),hiddenEnd:core(hiddenEnd),visibleMenuPauses:visibleMenu.pauses,scope:'Real native minimization and restoration. Hidden is the sole blocker during the measured interval; menu is retained at its end to test stacked pauses on restoration. Save buttons intentionally add notices, so comparison covers simulation fields and excludes savedAt, notices, tutorial presentation and their nextId counter. No document.hidden override or synthetic visibilitychange.'};
  }
  try {
    if (window.__desktopSmokeCoverageError) throw Error(window.__desktopSmokeCoverageError);
    const selection=window.__desktopSmokeSelection??{biome:'gran-canon',culture:'mapungubwe'};
    if (!['sabana','gran-rio','manglares','volcanes','gran-canon','desierto'].includes(selection.biome)||!['mapungubwe','saheliana','suajili','musgum','etiope'].includes(selection.culture)) throw Error('Invalid smoke world selection');
    const load = async path => { const response = await fetch(new URL(path, location.href)); if (!response.ok) throw Error(`${path}: ${response.status}`); return response; };
    const manifest = await (await load('content/web-assets.json')).json();
    const {decodeWebGlb} = await import(new URL('runtime/glb-legacy.js', location.href));
    report.checks.models = [];
    // Decode every shipped culture, worker and beast using the production WASM decoder.
    const models = manifest.records.filter(record => record.source.endsWith('.glb') && record.runtime.endsWith('.glb'));
    if (!models.length) throw Error('No runtime models in package manifest');
    for (const model of models) {
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
    const variants = new Map(manifest.records.map(record => [record.source, record.runtime]));
    const runtime = path => variants.get(path.replace(/^\//, '')) ?? path;
    const bank = await (await load(runtime('content/sfx.json'))).json();
    const context = new AudioContext();
    const sample = bank.items[0], audioUrl = runtime(sample.audio.url);
    const audio = await context.decodeAudioData(await (await load(audioUrl)).arrayBuffer());
    report.checks.audio = {id: sample.id, url: audioUrl, seconds: audio.duration, channels: audio.numberOfChannels, sampleRate: audio.sampleRate};
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
    if (fixture) {
      localStorage.setItem('wild-guardians:slot:'+fixture.slotId,fixture.snapshot);
      report.checks.fixtureMenuList=await listFixtureForSmoke(menu,fixture,send);
      if(window.__desktopSmokeCoverage===true)checkSmokeCoveragePreview(selection,report.checks.fixtureMenuList.preview);
      send({action:'load-slot',slotId:fixture.slotId});
    }
    else send({action: 'start', biome: selection.biome, culture: selection.culture});
    worldStartedAt = performance.now();
    const worldEnd = worldStartedAt + 90000;
    while (document.querySelector('#stage')?.getAttribute('aria-busy') !== 'false' && performance.now() < worldEnd) await new Promise(resolve => setTimeout(resolve, 100));
    if (document.querySelector('#stage')?.getAttribute('aria-busy') !== 'false') throw Error('Production world did not finish loading');
    worldReadyAt = performance.now();
    await new Promise(resolve => setTimeout(resolve, 1000));
    const world = document.querySelector('#world');
    if (!world || world.width === 0 || world.height === 0) throw Error('Production world canvas missing');
    const restored=report.checks.fixtureMenuList?.preview;
    report.checks.world = {biome: restored?.biome??selection.biome, culture: restored?.culture??selection.culture, width: world.width, height: world.height, provenance:restored?'actual menu save preview':'requested NewGame selection'};
    if(window.__desktopSmokeCoverage===true){
      const observation=window.__wildGuardiansSmokeCoverage;
      report.checks.worldSelection={requested:selection,restoredPreview:restored??null,actual:observation??null,scope:'Scalar App configuration/ready provenance; no synthetic clock or saved crops.'};
      checkSmokeCoverageReady(selection,observation,fixture);
    }
    await new Promise(resolve => requestAnimationFrame(resolve));
    report.worldPng = world.toDataURL('image/png');
    if (fixture) report.checks.visibility = await checkVisibility(fixture);
    report.checks.saveKeys = Object.keys(localStorage).filter(key => key.startsWith('wild-guardians:'));
    await finish();
  } catch (error) { await finish(error); }
})();
