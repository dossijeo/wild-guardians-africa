import {createRequire} from 'node:module';
import {writeFile} from 'node:fs/promises';
const require=createRequire(import.meta.url),{chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const browser=await chromium.launch({channel:'msedge',headless:true});
try{
 const detailed=process.env.PROFILE_ACTORS==='1',page=await browser.newPage({viewport:{width:1280,height:720}}),errors=[];page.on('pageerror',e=>errors.push(String(e)));
 await page.goto('http://127.0.0.1:5175/tests/browser/guardian-combat.html?biome=manglares&culture=mapungubwe&lightingReview&productionFarWarm&treeReview&recoveryDay&wildEngineThreads=0');
 await page.waitForFunction(()=>window.treeReview&&document.querySelector('#status')?.textContent.includes('"ready": true'),null,{timeout:180000});await page.locator('#stress').evaluate(e=>e.click());await page.waitForFunction(()=>{const r=window.treeReview;return r.state.raid?.animals.length===20&&r.state.raid.animals.every(a=>r.world.mixers.has(a.id));},null,{timeout:120000});
 const report=await page.evaluate(async detailed=>{
  const r=window.treeReview,w=r.world;if(r.authority!=='spatial-wasm'||!r.state.mangroveNetwork)throw Error('Wrong scene');r.setManual(true);
  const {GpuTimer}=await import('/tests/browser/gpu-timer.js'),gl=w.renderer.getContext(),ext=gl.getExtension('WEBGL_debug_renderer_info'),timer=new GpuTimer(gl,64),raf=()=>new Promise(requestAnimationFrame),rows=[],originals=[],previousSupport=w.terrainSupportStats;let spans={},actorCalls=0;if(detailed)w.terrainSupportStats={ms:0,calls:0};
  for(const [owner,name,label] of [...(detailed?[[w,'sync','sync'],[w,'updateActor','actors']]:[]),[w.renderer.shadowMap,'render','shadow'],[w.destructionPass,'render','destruction'],[w.sky,'render','sky'],[w.renderer,'render','renderer']]){if(!owner||typeof owner[name]!=='function')continue;const original=owner[name];originals.push([owner,name,original]);owner[name]=function(...args){const start=performance.now();try{return original.apply(this,args);}finally{const key=label==='renderer'?(args[0]===w.scene?'rendererWorld':'rendererAux'):label;spans[key]=(spans[key]??0)+performance.now()-start;if(label==='actors')actorCalls++;}};}
  try{
   for(let i=0;i<30;i++){await raf();w.render(0);}
   for(let i=0;i<100;i++){
    const at=await raf(),start=performance.now(),stages=[],iterator=w.renderFrameUpdates(0);spans={};actorCalls=0;if(detailed){w.terrainSupportStats.ms=0;w.terrainSupportStats.calls=0;}const timed=timer.begin(i);
    for(;;){const t=performance.now(),next=iterator.next();stages.push(performance.now()-t);if(next.done)break;}const draw=performance.now();w.drawRenderFrame();const drawMs=performance.now()-draw;if(timed)timer.end();timer.poll();
    rows.push({at,renderMs:performance.now()-start,drawMs,stages,spans:{...spans},actorCalls,terrainSupport:{ms:w.terrainSupportStats?.ms??0,calls:w.terrainSupportStats?.calls??0},triangles:w.renderer.info.render.triangles,drawCalls:w.renderer.info.render.calls});
   }
   for(let i=0;i<30&&timer.pending.length;i++){await raf();timer.poll();}const gpu=timer.report();
   const stats=a=>{const v=[...a].sort((x,y)=>x-y),p=q=>v[Math.floor((v.length-1)*q)];return {p50:p(.5),p95:p(.95),p99:p(.99),max:v.at(-1)};};
   return {renderer:ext?gl.getParameter(ext.UNMASKED_RENDERER_WEBGL):gl.getParameter(gl.RENDERER),mangroveNetwork:r.state.mangroveNetwork,animals:r.state.raid.animals.length,frames:rows.length,renderMs:stats(rows.map(x=>x.renderMs)),drawMs:stats(rows.map(x=>x.drawMs)),stages:Array.from({length:rows[0].stages.length},(_,i)=>stats(rows.map(x=>x.stages[i]))),spans:Object.fromEntries(['sync','actors','shadow','destruction','sky','rendererWorld','rendererAux'].map(k=>[k,stats(rows.map(x=>x.spans[k]??0))])),actorCalls:stats(rows.map(x=>x.actorCalls)),terrainSupportMs:stats(rows.map(x=>x.terrainSupport.ms)),terrainSupportCalls:stats(rows.map(x=>x.terrainSupport.calls)),gpu:{reason:gpu.reason,count:gpu.samples.length,ms:gpu.samples.length?stats(gpu.samples.map(x=>x.ms)):null},drawCalls:stats(rows.map(x=>x.drawCalls)),triangles:stats(rows.map(x=>x.triangles)),sceneErrors:r.errors};
  }finally{for(const [owner,name,original] of originals)owner[name]=original;w.terrainSupportStats=previousSupport;timer.dispose();}
 },detailed);
 if(errors.length||report.sceneErrors.length)throw Error(JSON.stringify({errors,report}));
 report.scope='One Edge headless session with frozen mangrove-islands WorldScene and 20 test animals. Nested CPU spans overlap; GPU timing covers full frame. No simulation, UI, audio, camera motion, comparative optimization or campaign.';
 await writeFile(`docs/lighting/tree-near-retexture/performance/mangrove-crowd-frozen-${detailed?'actor-profile':'render-stages'}.json`,JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2));
}finally{await browser.close();}
