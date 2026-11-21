import fs from 'node:fs';import {createRequire} from 'node:module';
const {chromium}=createRequire(import.meta.url)(process.env.PLAYWRIGHT_MODULE??'playwright');
const out='docs/lighting/tree-near-retexture/mangrove-wild-engine';fs.mkdirSync(out,{recursive:true});
const browser=await chromium.launch({channel:'msedge',headless:true});
try{
 const page=await browser.newPage({viewport:{width:1280,height:720},deviceScaleFactor:1}),errors=[];
 page.on('pageerror',e=>{errors.push(String(e));console.log('ERROR',String(e));});
 await page.goto('http://127.0.0.1:5175/tests/browser/guardian-combat.html?lightingReview&biome=manglares&culture=mapungubwe&characterLod=auto&treeReview',{waitUntil:'domcontentloaded'});
 console.log('loading native mangrove island network');
 await page.waitForFunction(()=>window.treeReview&&document.querySelector('#status')?.textContent.includes('"ready": true'),null,{timeout:420000});
 const proof=await page.evaluate(()=>{const r=window.treeReview;if(r.authority!=='spatial-wasm'||r.state.mangroveNetwork!==true||r.state.mangroveSettlementVersion!==2||!r.world.spatialSession||!r.world.farVegetation)throw Error('Expected native island world with horizon');r.setManual(true);return {authority:r.authority,mangroveNetwork:r.state.mangroveNetwork,settlementVersion:r.state.mangroveSettlementVersion,worldVersion:r.state.wildEngineWorldVersion,seed:r.state.seed,farAttached:true,village:r.state.villages[0],network:r.nav.mangroveNetwork?.()};});
 fs.writeFileSync(`${out}/world-proof.json`,JSON.stringify(proof,null,2)+'\n');
 await page.addStyleTag({content:'header,body>button{display:none!important}'});
 const records=[];
 for(const view of ['islands','near'])for(const phase of ['day','night']){
  await page.evaluate(async({view,phase})=>{
   const r=window.treeReview,w=r.world;r.state.time=phase==='day'?150:400;
   w.setCameraExclusion(false);w.camera.zoom=1;w.camera.updateProjectionMatrix();
   let x,y,z;
   if(view==='islands'){const v=r.state.villages[0];x=v.x;z=v.z;y=r.nav.field.surface(x,z)+3;w.camera.position.set(x+95,y+95,z+100);}
   else{const v=r.state.villages[0],candidates=[...w.chunks.values()].flatMap(g=>(g.userData.lodBatches??[]).filter(b=>b.slot===0&&b.prototype.nearTextureDistance).flatMap(b=>b.instances.map(p=>({p,b,d:Math.hypot(p.x-v.x,p.z-v.z)})))).sort((a,b)=>a.d-b.d);if(!candidates.length)throw Error('No native near tree');const {p,b}=candidates[0];x=p.x;z=p.z;y=p.y+b.prototype.centerY*p.sy;w.camera.position.set(x+10,y+4,z+10);}
   w.controls.target.set(x,y,z);w.updateCamera=()=>{w.camera.lookAt(w.controls.target);w.camera.updateMatrixWorld();};
   const {globalFrameScheduler,globalFrameSchedulerEnabled}=await import('/src/app/global-frame-scheduler.js');
   r.step=async()=>{const now=await new Promise(resolve=>requestAnimationFrame(resolve));if(globalFrameSchedulerEnabled())globalFrameScheduler.beginFrame(now);w.render(0);if(globalFrameSchedulerEnabled())await globalFrameScheduler.endFrame();};
   for(let i=0;i<120;i++)await r.step();
  },{view,phase});
  for(const [lot,enabled]of [false,true,true,false].entries()){
   const result=await page.evaluate(async enabled=>{
    const r=window.treeReview,w=r.world,{GpuTimer}=await import('/tests/browser/gpu-timer.js');
    for(const g of w.chunks.values())for(const b of g.userData.lodBatches??[])if(b.levels[0].userData.nearTextureDistance){b.prototype.nearTextureDistance=enabled?b.levels[0].userData.nearTextureDistance:-1;b.key=null;}
    for(let i=0;i<90;i++)await r.step();
    const snapshot=JSON.stringify(r.state),camera=w.camera.position.toArray(),gpu=new GpuTimer(w.renderer.getContext()),rows=[],previousAuto=w.renderer.info.autoReset;w.renderer.info.autoReset=false;
    for(let i=0;i<180;i++){await new Promise(resolve=>requestAnimationFrame(resolve));w.renderer.info.reset();const timed=gpu.begin(i),start=performance.now();w.render(0);const cpu=performance.now()-start;if(timed)gpu.end();rows.push({cpu,calls:w.renderer.info.render.calls,triangles:w.renderer.info.render.triangles,hidden:document.hidden});}
    for(let i=0;i<30&&gpu.pending.length;i++){await new Promise(resolve=>requestAnimationFrame(resolve));gpu.poll();}
    const gpuReport=gpu.report();gpu.dispose();w.renderer.info.autoReset=previousAuto;
    const summary=values=>{const a=[...values].sort((a,b)=>a-b);return {count:a.length,mean:a.reduce((x,y)=>x+y,0)/a.length,p95:a[Math.ceil(a.length*.95)-1]};};
    return {cpu:summary(rows.map(r=>r.cpu)),gpu:summary(gpuReport.samples.map(s=>s.ms)),gpuReport,triangles:summary(rows.map(r=>r.triangles)),calls:summary(rows.map(r=>r.calls)),nearInstances:[...w.chunks.values()].flatMap(g=>g.userData.lodBatches??[]).filter(b=>b.levels[0].userData.nearTextureDistance).reduce((n,b)=>n+b.meshes[0].count,0),camera,cameraStable:JSON.stringify(camera)===JSON.stringify(w.camera.position.toArray()),simulationUnchanged:snapshot===JSON.stringify(r.state),hidden:rows.some(r=>r.hidden),errors:[...r.errors,...w.farVegetation.adapters.flatMap(a=>a.stats.errors)],viewport:[w.canvas.width,w.canvas.height]};
   },enabled);
   records.push({view,phase,lot,enabled,...result});fs.writeFileSync(`${out}/benchmark.json`,JSON.stringify({scope:'Native Wild Engine mangrove island network and far horizon. Frozen-state rendering ABBA; both texture sets resident. Not live simulation FPS.',proof,records,errors},null,2)+'\n');
   if(result.errors.length||errors.length||result.hidden||!result.cameraStable||!result.simulationUnchanged||result.gpu.count!==180||result.gpuReport.disjointEvents)throw Error('Invalid native mangrove block');
   if(lot===1)await page.screenshot({path:`${out}/${view}-${phase}.png`});
   console.log(view,phase,lot,'CPU',result.cpu.mean.toFixed(2),'GPU',result.gpu.mean.toFixed(2),'near',result.nearInstances);
  }
 }
}finally{await browser.close();}
