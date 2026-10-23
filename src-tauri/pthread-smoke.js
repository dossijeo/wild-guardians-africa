// Opt-in packaged-runtime check. This does not replace full-game desktop QA.
(async () => {
  if (window.__pthreadSmokeStarted) return;
  window.__pthreadSmokeStarted = true;
  const report = {ok:false, scope:'Packaged pthread runtime in native Tauri/WebView2; not full-game acceptance', origin:location.origin, userAgent:navigator.userAgent, isolated:crossOriginIsolated, secure:isSecureContext, rows:[], errors:[]};
  const wait=()=>new Promise(resolve=>setTimeout(resolve,1));
  const until=async predicate=>{const deadline=performance.now()+30000;while(!predicate()){if(performance.now()>deadline)throw Error('Native pthread timeout');await wait();}};
  let runtime;
  try {
    if(!crossOriginIsolated||typeof SharedArrayBuffer==='undefined')throw Error('Shared WASM memory unavailable in desktop origin');
    const {default:factory}=await import(new URL('wild-engine/spatial-threaded.mjs',location.href));
    const memory=new WebAssembly.Memory({initial:256,maximum:8192,shared:true});
    runtime=await factory({wasmMemory:memory});
    if(runtime.HEAPU8.buffer!==memory.buffer)throw Error('Runtime did not adopt supplied shared memory');
    for(let biome=0;biome<6;biome++){
      runtime._spatial_generate_biome(712,biome,0,0);
      runtime._spatial_build_nav_profile(1,.28,1);
      const start=performance.now(),id=runtime._spatial_prepare_start(1,0);
      if(id<=0)throw Error('Job rejected');
      let ticks=0;
      while(runtime._spatial_prepare_status()!==3){
        if(performance.now()-start>30000)throw Error('Generation timeout');
        ticks++;await wait();
      }
      const worker=runtime._spatial_prepare_metric(0),computeMs=runtime._spatial_prepare_metric(1);
      const t=performance.now(),published=runtime._spatial_prepare_publish(id),publishMs=performance.now()-t;
      if(worker!==1||published<=0)throw Error('No native worker publication');
      report.rows.push({biome,worker,computeMs,publishMs,published,ticks,bytes:memory.buffer.byteLength});
      runtime._spatial_prepare_release();
    }
  } catch(error) {report.errors.push(String(error));}
  finally {
    if(runtime)try{
      runtime._spatial_prepare_shutdown();
      await until(()=>runtime._spatial_prepare_status()===5&&runtime.PThread.unusedWorkers.length===1);
      runtime._spatial_prepare_release();runtime.PThread.terminateAllThreads();
    }catch(error){report.errors.push(String(error));}
    report.ok=report.errors.length===0&&report.rows.length===6;
    await window.__TAURI_INTERNALS__.invoke('desktop_smoke_report',{report});
  }
})();
