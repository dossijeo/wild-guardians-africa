import {chromium} from 'playwright';
import {readFile,writeFile} from 'node:fs/promises';
import {globalClosureQuery} from './global-closure-recipe-20261022.mjs';
const threaded=process.env.WG_THREADS!=='0',benchmark=process.env.WG_THREAD_BENCH==='1';
const fixture=JSON.parse(await readFile('docs/qa/global-visual-lab/manglares-populated-frozen-20261022/native-fixture.json','utf8'));
const browser=await chromium.launch({channel:'chrome',headless:true});
const page=await browser.newPage({viewport:{width:1280,height:720}}),errors=[];
page.on('pageerror',e=>errors.push(e.message));
page.on('console',m=>{if(m.type()==='error'||m.type()==='warning'){errors.push(m.text());console.log(m.text().slice(0,500));}});
try{
 await page.addInitScript(text=>{localStorage.setItem('wild-guardians:slot:opening',text);localStorage.setItem('wild-guardians:settings',JSON.stringify({quality:'media',farVegetation:true}));},fixture.timing.navigationContext.state);
 await page.route('**/src/rendering/scene.js*',async route=>{const r=await route.fetch();const s=await r.text();if(!s.includes('this.raycaster=new'))throw Error('Missing world observation anchor');await route.fulfill({response:r,body:s.replace('this.raycaster=new','globalThis.qaThreadWorld=this;this.raycaster=new')});});
 await page.goto(`http://127.0.0.1:${process.env.WG_THREAD_PORT??5192}/?`+globalClosureQuery('manglares')+'&mangroveFerns=holly&groundCache=fixed512&wildEngineThreads='+(threaded?'1':'0'));
 await page.waitForSelector('#native-menu',{timeout:60000});
 const frame=page.frames().find(f=>f.url().includes('/menu/'))??await page.waitForEvent('framenavigated',{predicate:f=>f.url().includes('/menu/'),timeout:60000});
 await frame.waitForLoadState('load');await frame.waitForFunction(()=>document.body.innerText.toUpperCase().includes('JUEGO NUEVO'));
 await frame.evaluate(()=>parent.postMessage({type:'wild-guardians:menu',action:'load-slot',slotId:'opening'},location.origin));
 for(let attempt=0;attempt<18;attempt++){
  const diagnostic=await page.evaluate(()=>({text:document.body.innerText.slice(-1200),stage:document.querySelector('#stage')?.getAttribute('aria-busy'),runtime:globalThis.qaThreadWorld?.spatialSession?.runtime,chunks:globalThis.qaThreadWorld?.chunks?.size,stream:globalThis.qaThreadWorld?.chunkStream?.summary(),isolated:crossOriginIsolated}));
  console.log(JSON.stringify(diagnostic));
  await writeFile('docs/qa/wild-engine-pthreads/thread-game-loading.json',JSON.stringify({attempt,diagnostic,errors},null,2)+'\n');
  if(diagnostic.runtime&&diagnostic.chunks>=9&&diagnostic.stage==='false')break;
  if(attempt===17)throw Error('Game readiness deadline exceeded; see thread-game-loading.json');
  await page.waitForTimeout(10000);
 }
 const result=await page.evaluate(async()=>{const w=qaThreadWorld;await w.whenChunksReady();return {isolated:crossOriginIsolated,runtime:w.spatialSession.runtime,stream:w.chunkStream.summary(),native:w.spatialSession.core.metrics(),chunks:w.chunks.size,stage:document.querySelector('#stage')?.getAttribute('aria-busy'),elapsed:w.state.elapsed,renderer:w.renderer.getContext().getParameter(w.renderer.getContext().RENDERER)};});
 if(result.runtime.backend!==(threaded?'pthreads':'standalone'))throw Error(JSON.stringify(result));
 if(benchmark)result.streaming=await page.evaluate(async()=>{
  const w=qaThreadWorld,core=w.spatialSession.core;
  const gameUrl=performance.getEntriesByType('resource').map(e=>e.name).find(n=>new URL(n).pathname==='/src/simulation/game.js');
  if(!gameUrl)throw Error('Missing canonical simulation module');
  (await import(gameUrl)).pause(w.state,'menu');
  w.updateCamera=()=>{w.camera.lookAt(w.controls.target);w.camera.updateMatrixWorld();};
  const rows={generate:[],admit:[],publish:[],install:[],nativeCompute:[],frames:[]};
  const wrap=(object,name,key)=>{const original=object[name];object[name]=function(...args){const t=performance.now();try{return original.apply(this,args);}finally{rows[key].push(performance.now()-t);}};return ()=>{object[name]=original;};};
  const restore=[wrap(core,'addChunk','generate'),wrap(w,'installChunk','install')];
  if(core.preparation){restore.push(wrap(core.preparation,'start','admit'),wrap(core.preparation,'publish','publish'));const publish=core.preparation.publish;core.preparation.publish=(...a)=>{rows.nativeCompute.push(core.preparation.metric(1));return publish(...a);};}
  const frame=()=>new Promise(r=>requestAnimationFrame(r));
  for(let i=0;i<60;i++)await frame();
  const origin=w.controls.target.clone(),camera=w.camera.position.clone();
  const baseline=core.metrics(),initialCreated=w.chunkStream.stats.created;
  let last=await frame();
  try{
   for(let i=0;i<180;i++){
    const displacement=Math.min(96,i*.8);
    w.controls.target.copy(origin);w.controls.target.x+=displacement;
    w.camera.position.copy(camera);w.camera.position.x+=displacement;
    const now=await frame();rows.frames.push(now-last);last=now;
   }
   const deadline=performance.now()+60000;
   while(w.chunkStream.summary().busy||w.chunkStream.summary().queued){if(performance.now()>deadline)throw Error('Stream completion deadline');const now=await frame();rows.frames.push(now-last);last=now;}
  }finally{for(const undo of restore)undo();}
  const summary=values=>{const sorted=[...values].sort((a,b)=>a-b);return {count:values.length,mean:values.reduce((a,b)=>a+b,0)/(values.length||1),p95:sorted[Math.floor((sorted.length-1)*.95)]??null,max:sorted.at(-1)??null};};
  const gl=w.renderer.getContext(),debug=gl.getExtension('WEBGL_debug_renderer_info');
  return {scope:'Paused simulation, continuous 96m camera travel at fixed per-frame steps after 60 warm frames. CPU/RAF only; not GPU or active simulation acceptance.',hardware:debug?gl.getParameter(debug.UNMASKED_RENDERER_WEBGL):null,baseline,final:core.metrics(),created:w.chunkStream.stats.created-initialCreated,summary:Object.fromEntries(Object.entries(rows).map(([k,v])=>[k,summary(v)])),rows};
 });
 await writeFile(process.env.WG_THREAD_REPORT??'docs/qa/wild-engine-pthreads/thread-game.json',JSON.stringify({scope:'Loaded populated Mangroves game in Chrome, initial stream. Not ABAB performance acceptance.',result,errors},null,2)+'\n');
 console.log(JSON.stringify({result,errors}));
}finally{await browser.close();}
