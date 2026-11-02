import {createRequire} from 'node:module';
import {writeFile} from 'node:fs/promises';
const require=createRequire(import.meta.url),{chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const browser=await chromium.launch({channel:'msedge',headless:true});
try{
 const page=await browser.newPage({viewport:{width:1280,height:720}}),errors=[];page.on('pageerror',e=>errors.push(String(e)));
 await page.goto('http://127.0.0.1:5175/tests/browser/guardian-combat.html?biome=manglares&culture=mapungubwe&lightingReview&productionFarWarm&treeReview&recoveryDay&wildEngineThreads=0');
 await page.waitForFunction(()=>window.treeReview&&document.querySelector('#status')?.textContent.includes('"ready": true'),null,{timeout:180000});await page.locator('#stress').evaluate(e=>e.click());await page.waitForFunction(()=>{const r=window.treeReview;return r.state.raid?.animals.length===20&&r.state.raid.animals.every(a=>r.world.mixers.has(a.id));},null,{timeout:120000});
 const report=await page.evaluate(async()=>{
  const r=window.treeReview,w=r.world;if(r.authority!=='spatial-wasm'||!r.state.mangroveNetwork)throw Error('Wrong scene');r.setManual(true);
  const {GpuTimer}=await import('/tests/browser/gpu-timer.js'),gl=w.renderer.getContext(),ext=gl.getExtension('WEBGL_debug_renderer_info'),raf=()=>new Promise(requestAnimationFrame),original=w.updateActor,timer=new GpuTimer(gl,64),runs=[],images=[],poses=[];let skip=false,calls=0;
  w.updateActor=function(entity,dt,type){if(skip&&type==='animal'){calls++;return;}return original.call(this,entity,dt,type);};
  const stats=a=>{const s=[...a].sort((x,y)=>x-y),p=q=>s[Math.floor((s.length-1)*q)];return {count:s.length,p50:p(.5),p95:p(.95),p99:p(.99),max:s.at(-1)};};
  const pixels=()=>{const a=new Uint8Array(gl.drawingBufferWidth*gl.drawingBufferHeight*4);gl.readPixels(0,0,gl.drawingBufferWidth,gl.drawingBufferHeight,gl.RGBA,gl.UNSIGNED_BYTE,a);let hash=2166136261;for(const v of a)hash=Math.imul(hash^v,16777619)>>>0;return {hash,data:a};};
  const pose=()=>{const out=[];for(const a of r.state.raid.animals){const root=w.objects.get(a.id),rig=w.mixers.get(a.id);root.updateWorldMatrix(true,true);out.push(...root.matrixWorld.elements);rig.model.traverse(b=>{if(b.isBone)out.push(...b.matrixWorld.elements);});}return out;};
  try{
   for(let i=0;i<30;i++){await raf();w.render(0);}
   for(const mode of ['reference','skip','skip','reference']){
    skip=mode==='skip';calls=0;const rows=[],frames=[];
    for(let i=0;i<75;i++){const at=await raf();frames.push(at);const start=performance.now(),timed=timer.begin(i);w.render(0);if(timed)timer.end();timer.poll();rows.push(performance.now()-start);}
    const image=pixels();images.push(image.data);poses.push(pose());for(let i=0;i<20&&timer.pending.length;i++){await raf();timer.poll();}const gpu=timer.report();timer.samples.length=0;
    runs.push({mode,skippedCalls:calls,imageHash:image.hash,renderMs:stats(rows),frameMs:stats(frames.slice(1).map((t,i)=>t-frames[i])),gpuMs:gpu.samples.length?stats(gpu.samples.map(x=>x.ms)):null});
   }
   const comparisons=[[0,1],[1,2],[0,3]].map(([a,b])=>{let changedPixels=0,maxChannel=0,sum=0,poseMax=0,changedPose=0;for(let i=0;i<images[a].length;i+=4){let changed=false;for(let j=0;j<4;j++){const d=Math.abs(images[a][i+j]-images[b][i+j]);sum+=d;maxChannel=Math.max(maxChannel,d);changed||=d!==0;}if(changed)changedPixels++;}if(poses[a].length!==poses[b].length)throw Error('Different bone counts');for(let i=0;i<poses[a].length;i++){const d=Math.abs(poses[a][i]-poses[b][i]);if(d)changedPose++;poseMax=Math.max(poseMax,d);}return {a,b,changedPixels,totalPixels:images[a].length/4,maxChannel,meanChannelDifference:sum/images[a].length,changedPoseValues:changedPose,maxPoseMatrixDifference:poseMax};});
   return {runs,comparisons,pixelsEqual:new Set(runs.map(x=>x.imageHash)).size===1,renderer:ext?gl.getParameter(ext.UNMASKED_RENDERER_WEBGL):gl.getParameter(gl.RENDERER),animals:r.state.raid.animals.length,sceneErrors:r.errors};
  }finally{w.updateActor=original;timer.dispose();}
 });
 if(errors.length||report.sceneErrors.length)throw Error(JSON.stringify({errors,report}));
 report.scope='Single headless Edge session; frozen mangrove scene, camera and elapsed time with 20 animals. Unsafe experimental unconditional skip for animals; pixel readback after each block only, no production integration, moving camera, animation, interactions or simulation.';
 await writeFile('docs/lighting/tree-near-retexture/performance/mangrove-frozen-animal-skip-pose-audit.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2));
}finally{await browser.close();}
