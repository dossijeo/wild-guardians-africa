import fs from 'node:fs';
import {createRequire} from 'node:module';
const {chromium}=createRequire(import.meta.url)(process.env.PLAYWRIGHT_MODULE??'playwright');
const biome=process.env.REVIEW_BIOME??'manglares',browser=await chromium.launch({channel:'msedge',headless:true});
try{
 const page=await browser.newPage({viewport:{width:1280,height:720}}),errors=[];
 page.on('pageerror',e=>errors.push(String(e)));
 await page.route('**/spatial-savanna.wasm*',route=>new URL(route.request().url()).search?route.continue():route.fulfill({path:'.cache/spatial-dynamic-test.wasm',contentType:'application/wasm'}));
 await page.goto('http://127.0.0.1:5175/tests/browser/guardian-combat.html?biome='+encodeURIComponent(biome)+'&culture=mapungubwe&lightingReview&productionFarWarm&wildEngineThreads=0&depthGroundProxy&treeReview');
 await page.waitForFunction(()=>window.treeReview&&document.querySelector('#status')?.textContent.includes('"ready": true'),null,{timeout:180000});
 const result=await page.evaluate(async()=>{
  const {GpuTimer}=await import('/tests/browser/gpu-timer.js'),r=window.treeReview,w=r.world,pass=w.destructionPass,review=window.depthGroundReview,gl=w.renderer.getContext(),ext=gl.getExtension('WEBGL_debug_renderer_info');
  r.setManual(true);const center=r.state.structures.find(s=>s.kind==='center'),height=r.nav.field.surface(center.x,center.z);
  w.controls.target.set(center.x,height+1,center.z);w.camera.position.set(center.x+20,height+12,center.z+20);w.controls.update();w.scene.updateMatrixWorld(true);w.camera.updateMatrixWorld(true);
  const raf=()=>new Promise(resolve=>requestAnimationFrame(resolve)),rows=[];
  for(const proxy of [false,true,true,false]){
   review.enabled=proxy;for(let i=0;i<12;i++){pass.captureDepth(w.camera,w.scene);await raf();}
   const timer=new GpuTimer(gl,64),cpu=[];
   try{
    for(let i=0;i<60;i++){await raf();const t=performance.now(),active=timer.begin(i);pass.captureDepth(w.camera,w.scene);if(active)timer.end();cpu.push(performance.now()-t);}
    for(let i=0;i<120&&timer.pending.length;i++){await raf();timer.poll();}
    const gpu=timer.report(),sorted=cpu.slice().sort((a,b)=>a-b);rows.push({proxy,meshes:review.meshes,cpu:{mean:cpu.reduce((a,b)=>a+b,0)/cpu.length,p95:sorted[Math.floor(sorted.length*.95)],max:sorted.at(-1),samples:cpu},gpu});
   }finally{timer.dispose();}
  }
  return {authority:r.authority,network:r.state.mangroveNetwork??false,renderer:ext?gl.getParameter(ext.UNMASKED_RENDERER_WEBGL):gl.getParameter(gl.RENDERER),rows};
 });
 const out=`docs/lighting/tree-near-retexture/performance/${biome}-ground-depth-proxy-benchmark.json`;fs.writeFileSync(out,JSON.stringify({...result,errors},null,2));
 console.log(JSON.stringify({authority:result.authority,network:result.network,renderer:result.renderer,rows:result.rows.map(row=>({proxy:row.proxy,meshes:row.meshes,cpu:{mean:row.cpu.mean,p95:row.cpu.p95,max:row.cpu.max},gpuSupported:row.gpu.supported,gpuSamples:row.gpu.samples.length,gpuMean:row.gpu.samples.length?row.gpu.samples.reduce((a,b)=>a+b.ms,0)/row.gpu.samples.length:null})),errors}));
 if(errors.length)process.exitCode=1;
}finally{await browser.close();}
