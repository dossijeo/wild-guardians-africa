import fs from 'node:fs';
import {createRequire} from 'node:module';
const {chromium}=createRequire(import.meta.url)(process.env.PLAYWRIGHT_MODULE??'playwright'),browser=await chromium.launch({channel:'msedge',headless:true});
try{
 const page=await browser.newPage({viewport:{width:1280,height:720}}),errors=[];page.on('pageerror',e=>errors.push(String(e)));
 await page.goto('http://127.0.0.1:5175/tests/browser/guardian-combat.html?biome=manglares&culture=mapungubwe&lightingReview&productionFarWarm&treeReview&recoveryDay&wildEngineThreads=0');
 await page.waitForFunction(()=>window.treeReview&&document.querySelector('#status')?.textContent.includes('"ready": true'),null,{timeout:180000});
 await page.locator('#stress').evaluate(e=>e.click());
 const extra=Number(process.env.EXTRA_WORKERS??0);if(!Number.isInteger(extra)||extra<0||extra>20)throw Error('Invalid worker count');
 if(extra)await page.evaluate(count=>{const r=window.treeReview,base=r.state.workers[0];if(!base)throw Error('No worker template');for(let i=0;i<count;i++){const worker=structuredClone(base);Object.assign(worker,{id:'qa-support-worker-'+i,x:base.x+(i%4)*1.4,z:base.z+Math.floor(i/4)*1.4,status:'idle',taskId:null,path:null});r.state.workers.push(worker);}r.nav.setState(r.state);},extra);
 await page.waitForFunction(()=>{const r=window.treeReview;return r.state.raid?.animals.length===20&&r.state.raid.animals.every(a=>r.world.mixers.has(a.id))&&r.state.workers.filter(a=>a.status!=='home').every(a=>r.world.mixers.has(a.id));},null,{timeout:120000});
 const result=await page.evaluate(async()=>{
  const {GpuTimer}=await import('/tests/browser/gpu-timer.js'),r=window.treeReview,w=r.world,gl=w.renderer.getContext(),ext=gl.getExtension('WEBGL_debug_renderer_info'),animals=r.state.raid.animals,rows=[];r.setManual(true);
  const raf=()=>new Promise(resolve=>requestAnimationFrame(resolve)),base=r.state.elapsed;
  function frame(i,cached){r.state.elapsed=base+i/30;for(const a of animals){a.motionPhase=i/30;const rig=w.mixers.get(a.id);rig.cachedSkinning=cached?2:false;}const start=performance.now();w.sync(1/30);return performance.now()-start;}
  const sortStats=values=>{const s=values.slice().sort((a,b)=>a-b);return {count:s.length,mean:s.reduce((a,b)=>a+b,0)/s.length,p95:s[Math.floor(s.length*.95)],p99:s[Math.floor(s.length*.99)],max:s.at(-1)};};
  for(const cached of [false,true,true,false]){
   for(let i=0;i<20;i++){frame(i,cached);w.drawWorldFrame();await raf();}
   const timer=new GpuTimer(gl,64),cpu=[],draw=[],intervals=[],heights=[];let previous=null;
   try{
    for(let i=20;i<100;i++){
     const now=await raf();if(previous!==null)intervals.push(now-previous);previous=now;cpu.push(frame(i,cached));const t=performance.now(),active=timer.begin(i);w.drawWorldFrame();if(active)timer.end();draw.push(performance.now()-t);heights.push(animals.reduce((sum,a)=>sum+w.mixers.get(a.id).model.position.y,0));
    }
    for(let i=0;i<90&&timer.pending.length;i++){await raf();timer.poll();}
    const gpu=timer.report();rows.push({cached,cpu:sortStats(cpu),draw:sortStats(draw),intervals:sortStats(intervals),gpu,heights});
   }finally{timer.dispose();}
  }
  return {authority:r.authority,network:r.state.mangroveNetwork??false,renderer:ext?gl.getParameter(ext.UNMASKED_RENDERER_WEBGL):gl.getParameter(gl.RENDERER),species:animals.map(a=>a.species),workers:r.state.workers.length,rows};
 });
 const output=`docs/lighting/tree-near-retexture/performance/animal-ground-vertical-frozen${extra?'-workers'+extra:''}-abba.json`;fs.writeFileSync(output,JSON.stringify({...result,errors},null,2));
 const maxHeightDiff=Math.max(...result.rows[0].heights.map((x,i)=>Math.max(...result.rows.slice(1).map(row=>Math.abs(x-row.heights[i])))));
 console.log(JSON.stringify({authority:result.authority,network:result.network,renderer:result.renderer,species:result.species,workers:result.workers,maxHeightDiff,rows:result.rows.map(row=>({cached:row.cached,cpu:row.cpu,draw:row.draw,intervals:row.intervals,gpuSamples:row.gpu.samples.length,gpuReason:row.gpu.reason})),errors}));
 if(errors.length||!result.network||result.authority!=='spatial-wasm'||maxHeightDiff>1e-7)process.exitCode=1;
}finally{await browser.close();}
