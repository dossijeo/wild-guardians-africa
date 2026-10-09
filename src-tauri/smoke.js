// Observe the existing package model check; never fetch/read/decode twice.
async function observeDesktopModelLoad(path,load,decode,now=()=>performance.now()){
 const start=now(),response=await load(path),headers=now(),buffer=await response.arrayBuffer(),body=now(),decoded=await decode(buffer),end=now();
 return {decoded,stages:{path,start,headers,body,end,bytes:buffer.byteLength,fetchToHeadersMs:headers-start,bodyCollectionMs:body-headers,decodeMs:end-body,totalMs:end-start,scope:'Existing pre-world model check with no World renderer. Awaited wall times include dispatcher/processing delays; not physical disk, network or CPU measurements. One fetch/body/decode.'}};
}
// Smoke-only diagnostics. Observe existing RAF callbacks; never add a render loop.
function observeDesktopWorldLoading(win,doc,now=()=>performance.now()) {
 const nativeRaf=win.requestAnimationFrame,started=now(),frames={callbacks:0,distinctTimestamps:0,lastAt:null,maxIntervalMs:0,recent:[],callbackNames:{}},transitions=[];
 let stopped=false,last='';const previousSpan=win.__desktopSmokeLoadingSpan,active=[],recentSpans=[],modelSpans=[],programIdentities=[],configIdentities=[],spanTotals={};let programIdentityDropped=0;
 const spans=span=>{if(stopped)return;const index=active.findIndex(x=>x.label===span.label&&x.start===span.start);if(index>=0)active.splice(index,1);if(span.label==='loading-config-identity')configIdentities.push(span);if(span.label==='loading-program-identity'){for(const identity of span.identities){if(programIdentities.length<1024)programIdentities.push({at:span.start,...identity});else programIdentityDropped++;}}if(span.label.startsWith('asset-gltf-')){modelSpans.push(span);if(modelSpans.length>128)modelSpans.shift();}recentSpans.push(span);if(recentSpans.length>128)recentSpans.shift();const totals=spanTotals[span.label]??={calls:0,totalMs:0,maxMs:0,failures:0,scope:span.scope};totals.calls++;totals.totalMs+=span.duration;totals.maxMs=Math.max(totals.maxMs,span.duration);totals.failures+=span.failed?1:0;};
 spans.onBegin=span=>{if(!stopped)active.push(span);};win.__desktopSmokeLoadingSpan=spans;
 let menuNextAt=0,menuSamples=0,lastMenuSample=null;
 // At most 16 scalar reads, two seconds apart, from the currently attached menu.
 const menuRender=()=>{try{const frame=doc.querySelector('#native-menu');if(!frame?.isConnected){lastMenuSample=null;return null;}const at=now();if(at>=menuNextAt&&menuSamples<16){menuNextAt=at+2000;menuSamples++;const state=frame.contentWindow?.WildGuardiansMenu?.getState?.();lastMenuSample=state?{at,renderCount:state.renderCount,state:state.state,section:state.section}:null;}return lastMenuSample;}catch{return null;}};
 const snapshot=()=>({menuRender:menuRender(),visibility:doc.visibilityState,hidden:doc.hidden,focused:doc.hasFocus(),stageBusy:doc.querySelector('#stage')?.getAttribute('aria-busy')??null,overlay:!!doc.querySelector('#world-loading'),progress:doc.querySelector('[role="progressbar"]')?.getAttribute('aria-valuenow')??null,phase:doc.querySelector('.interactive-loading-title')?.textContent??null,failure:doc.querySelector('.loading-failure')?.textContent??null,canvas:doc.querySelector('#world')?{width:doc.querySelector('#world').width,height:doc.querySelector('#world').height}:null,menu:!!doc.querySelector('#app iframe')});
 const wrapped=function(callback){return nativeRaf.call(win,function(stamp){if(!stopped){frames.callbacks++;const name=callback.name||'(anonymous)';frames.callbackNames[name]=(frames.callbackNames[name]??0)+1;if(stamp!==frames.lastAt){if(frames.lastAt!==null)frames.maxIntervalMs=Math.max(frames.maxIntervalMs,stamp-frames.lastAt);frames.lastAt=stamp;frames.distinctTimestamps++;frames.recent.push(stamp);if(frames.recent.length>128)frames.recent.shift();}}return callback(stamp);});};
 win.requestAnimationFrame=wrapped;
 return {sample(){const state=snapshot(),key=JSON.stringify(state);if(key!==last){last=key;transitions.push({at:now(),...state});if(transitions.length>80)transitions.shift();}return {elapsedMs:now()-started,current:state,rafDelivery:frames,transitions,spans:{active:active.map(x=>({...x,elapsedMs:now()-x.start})),recent:recentSpans,models:modelSpans,configIdentities,programIdentities,programIdentityDropped,totals:spanTotals,scope:"Nested/awaited durations are diagnostic and overlap; do not sum as exclusive CPU/GPU work."},scope:'Smoke DOM/visibility snapshots and all existing RAF callbacks only; names may be minified and counts include preparation callbacks; no extra RAF, GPU query, simulated state or readiness override.'};},stop(){stopped=true;if(win.requestAnimationFrame===wrapped)win.requestAnimationFrame=nativeRaf;if(win.__desktopSmokeLoadingSpan===spans)win.__desktopSmokeLoadingSpan=previousSpan;}};
}

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
  let finished = false, worldLoadingObserver = null;
  async function finish(error) {
    if (finished) return;
    finished = true;
    clearTimeout(timeout);
    if(worldLoadingObserver){report.checks.productionLoading=worldLoadingObserver.sample();worldLoadingObserver.stop();}
    if (error) report.errors.push(String(error));
    try{const gl=document.querySelector('#world')?.getContext('webgl2');if(gl){const debug=gl.getExtension('WEBGL_debug_renderer_info');report.checks.worldGraphicsIdentity={vendor:gl.getParameter(gl.VENDOR),renderer:gl.getParameter(gl.RENDERER),unmaskedVendor:debug?gl.getParameter(debug.UNMASKED_VENDOR_WEBGL):null,unmaskedRenderer:debug?gl.getParameter(debug.UNMASKED_RENDERER_WEBGL):null,parallelShaderCompileSupported:gl.getSupportedExtensions()?.includes('KHR_parallel_shader_compile')??false,contextLost:gl.isContextLost(),scope:'One final read of existing World context identity/capabilities; no render/query timer or readiness change.'};}}catch(error){report.checks.worldGraphicsIdentity={unavailable:String(error)};}
    report.checks.modelResources=performance.getEntriesByType('resource').filter(entry=>/\.glb(?:$|\?)/.test(entry.name)).map(entry=>Object.fromEntries(['name','startTime','fetchStart','responseStart','responseEnd','duration','transferSize','encodedBodySize','decodedBodySize','initiatorType','nextHopProtocol','responseStatus'].map(key=>[key,entry[key]??null])));
    report.ok = !error && report.errors.length === 0;
    await window.__TAURI_INTERNALS__.invoke('desktop_smoke_report', {report});
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
    const load = async path => { const response = await fetch(new URL(path, location.href)); if (!response.ok) throw Error(`${path}: ${response.status}`); return response; };
    const manifest = await (await load('content/web-assets.json')).json();
    const {decodeWebGlb} = await import(new URL('runtime/glb-legacy.js', location.href));
    report.checks.models = [];report.checks.modelPreflightStages=[];
    // Decode every shipped culture, worker and beast using the production WASM decoder.
    const models = manifest.records.filter(record => record.source.endsWith('.glb') && record.runtime.endsWith('.glb'));
    if (!models.length) throw Error('No runtime models in package manifest');
    for (const model of models) {
      const {decoded,stages}=await observeDesktopModelLoad(model.runtime,load,decodeWebGlb);report.checks.modelPreflightStages.push(stages);
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
    window.__desktopSmokeLoadingPollWitness=true;
    window.__desktopSmokeParallelDioramaAssets=false;window.__desktopSmokeCollectiveLoadingPrograms=false;window.__desktopSmokeParallelLoadingPrograms=false;
    report.checks.loadingRecipe={sharedGroundClip:window.__desktopSmokeSharedGroundClip===true,collectiveReadiness:false,parallelReadiness:false,parallelDioramaAssets:false,animalPrefetch:window.__desktopSmokeAnimalPrefetch===true,pauseLoadingMenu:window.__desktopSmokePauseLoadingMenu===true,scope:'Normal production loading pipeline; explicit smoke-only shared ground/menu pause/animal prefetch options recorded above.'};
    worldLoadingObserver=observeDesktopWorldLoading(window,document);
    report.checks.productionLoading=worldLoadingObserver.sample();
    if (fixture) {localStorage.setItem('wild-guardians:slot:'+fixture.slotId,fixture.snapshot);send({action:'load-slot',slotId:fixture.slotId});}
    else send({action: 'start', biome: 'gran-canon', culture: 'mapungubwe'});
    const worldEnd = performance.now() + 90000;
    while (document.querySelector('#stage')?.getAttribute('aria-busy') !== 'false' && performance.now() < worldEnd) {report.checks.productionLoading=worldLoadingObserver.sample();await new Promise(resolve => setTimeout(resolve, 100));}
    report.checks.productionLoading=worldLoadingObserver.sample();
    if (document.querySelector('#stage')?.getAttribute('aria-busy') !== 'false') throw Error('Production world did not finish loading');
    report.checks.worldReadyAt=performance.now();
    if(window.__desktopSmokeSharedGroundClip===true){try{report.checks.groundClipBinding=window.__desktopSmokeGroundClipProbe();}finally{delete window.__desktopSmokeGroundClipProbe;}}
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
